import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@career-lens/db';
import { TokensService } from './tokens.service';

describe('TokensService', () => {
  let service: TokensService;
  let jwt: { sign: jest.Mock };
  let config: { get: jest.Mock };
  let prisma: {
    refreshToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    jwt = { sign: jest.fn().mockReturnValue('mock_jwt_token') };
    config = {
      get: jest.fn((key: string, defaultVal?: any) => {
        if (key === 'JWT_REFRESH_TTL_DAYS') return 30;
        if (key === 'JWT_ACCESS_TTL') return '15m';
        if (key === 'JWT_ACCESS_SECRET') return 'test-secret';
        return defaultVal;
      }),
    };
    prisma = {
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'rt-1' }),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'rt-1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((promises) => Promise.all(promises)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokensService,
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TokensService>(TokensService);
  });

  describe('issueNewSession', () => {
    it('should mint an accessToken and persist a hashed refreshToken', async () => {
      const user = { id: 'u1', role: 'USER' as const, tokenVersion: 1 };
      const tokens = await service.issueNewSession(user, '127.0.0.1');

      expect(jwt.sign).toHaveBeenCalled();
      expect(prisma.refreshToken.create).toHaveBeenCalled();
      expect(tokens.accessToken).toBe('mock_jwt_token');
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresIn).toBe(900);
    });
  });

  describe('rotate', () => {
    it('should rotate cleanly when token is valid and unrevoked', async () => {
      const existingTokenRow = {
        id: 'old-rt-id',
        userId: 'u1',
        familyId: 'fam-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 1000000),
      };
      prisma.refreshToken.findUnique
        .mockResolvedValueOnce(existingTokenRow) // first lookup for existing
        .mockResolvedValueOnce({ id: 'new-rt-id' }); // lookup for new row

      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        role: 'USER',
        tokenVersion: 1,
        deletedAt: null,
      });

      const next = await service.rotate('old-token-value', '127.0.0.1');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'old-rt-id' },
          data: expect.objectContaining({ replacedByTokenId: 'new-rt-id' }),
        }),
      );
      expect(next.accessToken).toBe('mock_jwt_token');
    });

    it('should detect reuse and revoke entire family if revoked token is re-presented', async () => {
      const revokedTokenRow = {
        id: 'old-rt-id',
        userId: 'u1',
        familyId: 'compromised-fam',
        revokedAt: new Date(Date.now() - 5000),
        expiresAt: new Date(Date.now() + 1000000),
      };
      prisma.refreshToken.findUnique.mockResolvedValue(revokedTokenRow);

      await expect(service.rotate('stolen-token-value')).rejects.toThrow('REFRESH_TOKEN_REUSE_DETECTED');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { familyId: 'compromised-fam', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should throw REFRESH_TOKEN_EXPIRED if token has expired', async () => {
      const expiredRow = {
        id: 'expired-rt-id',
        userId: 'u1',
        familyId: 'fam-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 10000),
      };
      prisma.refreshToken.findUnique.mockResolvedValue(expiredRow);

      await expect(service.rotate('expired-token')).rejects.toThrow('REFRESH_TOKEN_EXPIRED');
    });
  });

  describe('revokeFamilyByToken', () => {
    it('should revoke all tokens in family', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        familyId: 'fam-xyz',
      });

      await service.revokeFamilyByToken('some-token');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { familyId: 'fam-xyz', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('revokeAllSessionsForUser', () => {
    it('should revoke all refresh tokens and increment tokenVersion', async () => {
      await service.revokeAllSessionsForUser('u1');

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});
