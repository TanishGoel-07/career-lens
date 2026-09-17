import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { PrismaService } from '@career-lens/db';
import { AiGatewayService } from '../ai/ai-gateway.service';

describe('MatchingService', () => {
  let service: MatchingService;
  let prisma: {
    resume: { findFirst: jest.Mock };
    job: { findUnique: jest.Mock };
    jobMatch: { upsert: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let aiGateway: { call: jest.Mock };

  beforeEach(async () => {
    prisma = {
      resume: { findFirst: jest.fn() },
      job: { findUnique: jest.fn() },
      jobMatch: { upsert: jest.fn() },
      $queryRaw: jest.fn(),
    };
    aiGateway = {
      call: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchingService,
        { provide: PrismaService, useValue: prisma },
        { provide: AiGatewayService, useValue: aiGateway },
      ],
    }).compile();

    service = module.get<MatchingService>(MatchingService);
  });

  it('should throw NotFoundException if resume is missing', async () => {
    prisma.resume.findFirst.mockResolvedValue(null);
    prisma.job.findUnique.mockResolvedValue({ id: 'job-1' });

    await expect(service.computeMatch('u1', 'res-1', 'job-1')).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException if job is missing', async () => {
    prisma.resume.findFirst.mockResolvedValue({ id: 'res-1' });
    prisma.job.findUnique.mockResolvedValue(null);

    await expect(service.computeMatch('u1', 'res-1', 'job-1')).rejects.toThrow(NotFoundException);
  });

  it('should compute deterministic score, identify matching and missing skills', async () => {
    prisma.resume.findFirst.mockResolvedValue({
      id: 'res-1',
      userId: 'u1',
      extractedSkills: ['TypeScript', 'Node.js', 'PostgreSQL'],
    });

    prisma.job.findUnique.mockResolvedValue({
      id: 'job-1',
      title: 'Full-Stack Developer',
      requiredSkills: ['TypeScript', 'Node.js', 'Redis'],
      optionalSkills: ['PostgreSQL', 'Docker'],
      seniority: 'mid',
    });

    // Semantic similarity query returns 0.8
    prisma.$queryRaw.mockResolvedValue([{ similarity: 0.8 }]);

    aiGateway.call.mockResolvedValue({
      explanation: 'Candidate has strong foundational backend skills with minor gaps in Redis and Docker.',
    });

    const result = await service.computeMatch('u1', 'res-1', 'job-1');

    expect(result.matchingSkills).toEqual(
      expect.arrayContaining(['TypeScript', 'Node.js', 'PostgreSQL']),
    );
    expect(result.missingRequired).toEqual(['Redis']);
    expect(result.missingOptional).toEqual(['Docker']);
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.explanation).toContain('Candidate has strong foundational backend skills');
    expect(prisma.jobMatch.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ scoringVersion: 'match-v1' }),
      }),
    );
  });

  it('should fallback gracefully to template explanation if AI gateway throws', async () => {
    prisma.resume.findFirst.mockResolvedValue({
      id: 'res-1',
      userId: 'u1',
      extractedSkills: ['TypeScript'],
    });

    prisma.job.findUnique.mockResolvedValue({
      id: 'job-1',
      requiredSkills: ['TypeScript'],
      optionalSkills: [],
      seniority: 'junior',
    });

    prisma.$queryRaw.mockResolvedValue([]);
    aiGateway.call.mockRejectedValue(new Error('AI rate limit exceeded'));

    const result = await service.computeMatch('u1', 'res-1', 'job-1');

    expect(result.explanation).toContain('Matches 1 of 1 listed skills.');
  });
});
