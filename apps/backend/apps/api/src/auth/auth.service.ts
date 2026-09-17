import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '@career-lens/db';
import { TokensService, IssuedTokens } from './tokens.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
  ) {}

  async register(dto: RegisterDto): Promise<{ userId: string }> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      // Deliberately generic — doesn't reveal whether the email exists
      // for login vs. never having existed at all, beyond what's
      // unavoidable for a registration flow.
      throw new ConflictException('Unable to register with the provided details.');
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash }, // role omitted -> defaults to USER
    });

    // TODO: enqueue email-verification send (job-worker "notifications" queue).
    return { userId: user.id };
  }

  async login(dto: LoginDto, ip?: string): Promise<IssuedTokens> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.tokens.issueNewSession(user, ip);
  }

  async refresh(rawRefreshToken: string, ip?: string): Promise<IssuedTokens> {
    try {
      return await this.tokens.rotate(rawRefreshToken, ip);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'REFRESH_FAILED';
      // All refresh failures collapse to the same 401 for the client —
      // internally we distinguish reuse-detected vs. expired vs. unknown
      // for logging/alerting, but the client doesn't need (or should
      // get) that granularity.
      throw new UnauthorizedException(
        message === 'REFRESH_TOKEN_REUSE_DETECTED'
          ? 'Session invalidated for security reasons. Please log in again.'
          : 'Refresh token is invalid or expired.',
      );
    }
  }

  async logout(rawRefreshToken: string): Promise<void> {
    await this.tokens.revokeFamilyByToken(rawRefreshToken);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.tokens.revokeAllSessionsForUser(userId);
  }
}
