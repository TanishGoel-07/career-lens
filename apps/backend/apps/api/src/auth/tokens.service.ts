import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService, User } from '@career-lens/db';
import { randomBytes, createHash } from 'crypto';
import { v4 as uuid } from 'uuid';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Owns refresh-token issuance, rotation, and reuse detection.
 *
 * Design (architecture doc §4):
 *  - Refresh tokens are opaque random strings; only their SHA-256 hash
 *    is stored, so a DB read/leak alone can't be replayed as a token.
 *  - Each token belongs to a `familyId`. On every successful refresh,
 *    the presented token is marked used (revokedAt set) and linked via
 *    replacedByTokenId to its successor — a hash chain, not just a flag.
 *  - If a token whose hash matches a row that is ALREADY revoked is
 *    presented again, that's a replay of a stolen/rotated token: the
 *    entire family is revoked immediately and the caller must
 *    re-authenticate. This bounds the damage of a leaked refresh token
 *    to a single successful reuse before the family is killed.
 */
@Injectable()
export class TokensService {
  private readonly refreshTtlMs: number;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const days = this.config.get<number>('JWT_REFRESH_TTL_DAYS', 30);
    this.refreshTtlMs = days * 24 * 60 * 60 * 1000;
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private signAccessToken(user: Pick<User, 'id' | 'role' | 'tokenVersion'>): {
    token: string;
    expiresIn: number;
  } {
    const ttl = this.config.get<string>('JWT_ACCESS_TTL', '15m');
    const token = this.jwt.sign(
      { sub: user.id, role: user.role, tokenVersion: user.tokenVersion },
      { secret: this.config.get<string>('JWT_ACCESS_SECRET'), expiresIn: ttl },
    );
    // Rough seconds-until-expiry for the client; exact value isn't
    // security-critical, just UX (when to proactively refresh).
    const expiresIn = /^(\d+)m$/.exec(ttl) ? Number(/^(\d+)m$/.exec(ttl)![1]) * 60 : 900;
    return { token, expiresIn };
  }

  /** Issues a brand-new access+refresh pair, starting a new token family. */
  async issueNewSession(
    user: Pick<User, 'id' | 'role' | 'tokenVersion'>,
    createdByIp?: string,
  ): Promise<IssuedTokens> {
    const familyId = uuid();
    return this.mintPair(user, familyId, createdByIp);
  }

  private async mintPair(
    user: Pick<User, 'id' | 'role' | 'tokenVersion'>,
    familyId: string,
    createdByIp?: string,
  ): Promise<IssuedTokens> {
    const { token: accessToken, expiresIn } = this.signAccessToken(user);

    const rawRefresh = randomBytes(48).toString('hex');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hash(rawRefresh),
        familyId,
        expiresAt: new Date(Date.now() + this.refreshTtlMs),
        createdByIp,
      },
    });

    return { accessToken, refreshToken: rawRefresh, expiresIn };
  }

  /**
   * Rotates a refresh token. Throws on: unknown token, expired token,
   * or reuse of an already-revoked token (in which case the whole
   * family is revoked as a side effect before throwing).
   */
  async rotate(rawRefreshToken: string, createdByIp?: string): Promise<IssuedTokens> {
    const tokenHash = this.hash(rawRefreshToken);
    const existing = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!existing) {
      throw new Error('UNKNOWN_REFRESH_TOKEN');
    }

    if (existing.revokedAt) {
      // Reuse of a rotated/revoked token — treat as compromise.
      await this.prisma.refreshToken.updateMany({
        where: { familyId: existing.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new Error('REFRESH_TOKEN_REUSE_DETECTED');
    }

    if (existing.expiresAt < new Date()) {
      throw new Error('REFRESH_TOKEN_EXPIRED');
    }

    const user = await this.prisma.user.findUnique({ where: { id: existing.userId } });
    if (!user || user.deletedAt) {
      throw new Error('USER_NOT_FOUND');
    }

    const next = await this.mintPair(user, existing.familyId, createdByIp);

    const newHash = this.hash(next.refreshToken);
    const newRow = await this.prisma.refreshToken.findUnique({ where: { tokenHash: newHash } });
    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date(), replacedByTokenId: newRow?.id },
    });

    return next;
  }

  /** Revokes a single family (normal logout). */
  async revokeFamilyByToken(rawRefreshToken: string): Promise<void> {
    const tokenHash = this.hash(rawRefreshToken);
    const row = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!row) return;
    await this.prisma.refreshToken.updateMany({
      where: { familyId: row.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** "Logout everywhere": revokes every family + bumps tokenVersion so
   *  outstanding access tokens are rejected immediately by JwtStrategy. */
  async revokeAllSessionsForUser(userId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { tokenVersion: { increment: 1 } },
      }),
    ]);
  }
}
