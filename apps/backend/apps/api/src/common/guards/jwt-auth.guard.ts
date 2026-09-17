import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Verifies the access-token JWT signature/expiry (delegated to
 * JwtStrategy) and additionally checks the token's `tokenVersion` claim
 * against the current DB value — see JwtStrategy for why this matters
 * (instant global logout / revocation).
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: unknown, user: unknown) {
    if (err || !user) {
      throw new UnauthorizedException('Invalid or expired access token.');
    }
    return user;
  }

  getRequest(context: ExecutionContext) {
    return context.switchToHttp().getRequest();
  }
}
