import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@career-lens/db';
import {
  AiGatewayService,
  AiBudgetExceededError,
  AiOutputValidationError,
} from './ai-gateway.service';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { AiProvider } from './providers/ai-provider.interface';

describe('AiGatewayService', () => {
  let service: AiGatewayService;
  let mockProvider: jest.Mocked<AiProvider>;
  let mockRedis: {
    get: jest.Mock;
    set: jest.Mock;
    incrby: jest.Mock;
    expire: jest.Mock;
  };
  let mockPrisma: {
    aiInteractionLog: { create: jest.Mock };
  };
  let mockConfig: {
    get: jest.Mock;
  };

  beforeEach(async () => {
    mockProvider = {
      name: 'mock',
      complete: jest.fn(),
    };

    mockRedis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      incrby: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
    };

    mockPrisma = {
      aiInteractionLog: {
        create: jest.fn().mockResolvedValue({ id: 'log-1' }),
      },
    };

    mockConfig = {
      get: jest.fn((key: string, def?: any) => {
        if (key === 'AI_DAILY_TOKEN_BUDGET_PER_USER') return 100000;
        return def;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiGatewayService,
        { provide: 'AI_PROVIDERS', useValue: [mockProvider] },
        { provide: 'AI_FALLBACK_ORDER', useValue: ['mock'] },
        { provide: ConfigService, useValue: mockConfig },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<AiGatewayService>(AiGatewayService);
  });

  it('should return cached response if cacheable and exists in redis', async () => {
    const cachedData = {
      explanation: 'Precomputed match explanation from cache',
    };
    mockRedis.get.mockResolvedValueOnce(JSON.stringify(cachedData));

    const result = await service.call({
      userId: 'u1',
      feature: 'test',
      promptKey: 'match-explanation.v1',
      variables: { overallScore: 85 },
      cacheable: true,
    });

    expect(result).toEqual(cachedData);
    expect(mockProvider.complete).not.toHaveBeenCalled();
  });

  it('should throw AiBudgetExceededError if user daily tokens exceed limit', async () => {
    // Current usage is already at 99900 out of 100000
    mockRedis.get.mockResolvedValueOnce('99900');

    await expect(
      service.call({
        userId: 'u1',
        feature: 'test',
        promptKey: 'match-explanation.v1',
        variables: { overallScore: 85 },
      }),
    ).rejects.toThrow(AiBudgetExceededError);

    expect(mockProvider.complete).not.toHaveBeenCalled();
  });

  it('should call provider, validate schema, record usage, and persist log', async () => {
    mockRedis.get.mockResolvedValueOnce('100'); // budget ok

    mockProvider.complete.mockResolvedValue({
      text: JSON.stringify({ explanation: 'Valid explanation that meets schema' }),
      inputTokens: 120,
      outputTokens: 40,
      model: 'mock-v1',
    });

    const result = await service.call<{ explanation: string }>({
      userId: 'u1',
      feature: 'job-matching',
      promptKey: 'match-explanation.v1',
      variables: { overallScore: 90 },
      cacheable: true,
    });

    expect(result.explanation).toBe('Valid explanation that meets schema');
    expect(mockProvider.complete).toHaveBeenCalled();
    expect(mockRedis.incrby).toHaveBeenCalledWith(expect.stringContaining('ai-budget:u1'), 160);
    expect(mockPrisma.aiInteractionLog.create).toHaveBeenCalled();
    expect(mockRedis.set).toHaveBeenCalled();
  });

  it('should retry once and throw AiOutputValidationError if provider returns invalid JSON schema', async () => {
    mockRedis.get.mockResolvedValueOnce('100');

    // Return invalid schema both times
    mockProvider.complete.mockResolvedValue({
      text: JSON.stringify({ wrongField: 123 }),
      inputTokens: 50,
      outputTokens: 20,
      model: 'mock-v1',
    });

    await expect(
      service.call({
        userId: 'u1',
        feature: 'test',
        promptKey: 'match-explanation.v1',
        variables: { overallScore: 90 },
      }),
    ).rejects.toThrow(AiOutputValidationError);

    expect(mockProvider.complete).toHaveBeenCalledTimes(2);
  });
});
