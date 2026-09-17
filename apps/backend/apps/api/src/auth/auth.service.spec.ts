import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { TokensService } from './tokens.service';
import { PrismaService } from '@career-lens/db';
import * as argon2 from 'argon2';

jest.mock('argon2');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
  };
  let tokens: {
    issueNewSession: jest.Mock;
    rotate: jest.Mock;
    revokeFamilyByToken: jest.Mock;
    revokeAllSessionsForUser: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    tokens = {
      issueNewSession: jest.fn(),
      rotate: jest.fn(),
      revokeFamilyByToken: jest.fn(),
      revokeAllSessionsForUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: TokensService, useValue: tokens },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should throw ConflictException if user already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'test@example.com' });

      await expect(
        service.register({ email: 'test@example.com', password: 'Password123!' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should hash password and create new user when valid', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (argon2.hash as jest.Mock).mockResolvedValue('hashed_pw');
      prisma.user.create.mockResolvedValue({ id: 'new-user-123', email: 'test@example.com' });

      const result = await service.register({
        email: 'test@example.com',
        password: 'Password123!',
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { email: 'test@example.com', passwordHash: 'hashed_pw' },
      });
      expect(result).toEqual({ userId: 'new-user-123' });
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'unknown@example.com', password: 'pw' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is soft-deleted', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'test@example.com',
        deletedAt: new Date(),
      });

      await expect(
        service.login({ email: 'test@example.com', password: 'pw' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password hash does not match', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'test@example.com',
        passwordHash: 'hash',
        deletedAt: null,
      });
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return issued tokens when credentials match', async () => {
      const mockUser = {
        id: 'u1',
        email: 'test@example.com',
        passwordHash: 'hash',
        deletedAt: null,
      };
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      tokens.issueNewSession.mockResolvedValue({
        accessToken: 'acc_token',
        refreshToken: 'ref_token',
        expiresIn: 900,
      });

      const result = await service.login({ email: 'test@example.com', password: 'correct' }, '127.0.0.1');

      expect(tokens.issueNewSession).toHaveBeenCalledWith(mockUser, '127.0.0.1');
      expect(result.accessToken).toBe('acc_token');
    });
  });

  describe('refresh', () => {
    it('should throw UnauthorizedException when rotate fails', async () => {
      tokens.rotate.mockRejectedValue(new Error('REFRESH_TOKEN_REUSE_DETECTED'));

      await expect(service.refresh('stolen-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should return fresh tokens on successful rotation', async () => {
      tokens.rotate.mockResolvedValue({
        accessToken: 'new_acc',
        refreshToken: 'new_ref',
        expiresIn: 900,
      });

      const result = await service.refresh('valid-token');
      expect(result.accessToken).toBe('new_acc');
    });
  });

  describe('logout', () => {
    it('should revoke family by token', async () => {
      await service.logout('some-token');
      expect(tokens.revokeFamilyByToken).toHaveBeenCalledWith('some-token');
    });
  });

  describe('logoutAll', () => {
    it('should revoke all sessions for user', async () => {
      await service.logoutAll('user-id');
      expect(tokens.revokeAllSessionsForUser).toHaveBeenCalledWith('user-id');
    });
  });
});
