import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@career-lens/db';

interface AccessTokenPayload {
  sub: string;
  role: 'USER' | 'ADMIN';
  tokenVersion: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET'),
    });
  }

  /**
   * Re-reads the user on every request (not just trusting the JWT
   * payload) so that a role change, soft-delete, or "logout everywhere"
   * (tokenVersion bump) takes effect immediately rather than waiting
   * for the 15-minute access-token TTL to expire. This is the
   * concrete mechanism behind "never trust frontend authorization" /
   * instant revocation in the architecture doc.
   */
  async validate(payload: AccessTokenPayload) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('User no longer exists.');
    }
    if (user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Session has been revoked. Please log in again.');
    }
    return { id: user.id, role: user.role };
  }
}
