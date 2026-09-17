import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@career-lens/db';

/**
 * OwnershipGuard — the concrete defense against IDOR/BOLA described in
 * architecture doc §5.
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard, OwnershipGuard)
 *   @CheckOwnership({ model: 'resume', paramIdKey: 'id', ownerField: 'userId' })
 *   @Get(':id')
 *   getResume(@Param('id') id: string) { ... }
 *
 * It loads the resource by id BEFORE the controller handler runs and
 * rejects with 403 (never leaking a 404-vs-403 distinction that would
 * let an attacker enumerate other users' resource ids) unless
 * resource.[ownerField] === req.user.id, or the caller is an ADMIN.
 *
 * This is deliberately generic so every user-owned resource (resumes,
 * roadmaps, interview sessions, saved jobs, ...) gets the same
 * server-enforced check rather than each controller re-implementing it
 * (and inevitably forgetting one route).
 */
export interface OwnershipOptions {
  model: 'resume' | 'roadmap' | 'interviewSession' | 'savedJob' | 'targetRole' | 'codeSubmission';
  paramIdKey: string;
  ownerField?: string; // defaults to 'userId'
}

export const OWNERSHIP_KEY = 'ownership';
export const CheckOwnership = (options: OwnershipOptions) => SetMetadata(OWNERSHIP_KEY, options);

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<OwnershipOptions | undefined>(
      OWNERSHIP_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!options) return true; // route opted out deliberately

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const resourceId = request.params[options.paramIdKey];
    const ownerField = options.ownerField ?? 'userId';

    if (!user || !resourceId) {
      throw new ForbiddenException('Ownership could not be verified.');
    }

    // Admins may access any resource, but every such access is expected
    // to be logged by the calling admin controller (see admin module).
    if (user.role === 'ADMIN') return true;

    const delegate = (this.prisma as any)[options.model];
    const resource = await delegate.findUnique({ where: { id: resourceId } });

    if (!resource) {
      // Same response shape as "not yours" would produce, deliberately,
      // so existence of other users' resources can't be enumerated.
      throw new NotFoundException('Resource not found.');
    }

    if (resource[ownerField] !== user.id) {
      throw new ForbiddenException('You do not have access to this resource.');
    }

    request.resource = resource; // avoid a second fetch in the controller/service
    return true;
  }
}
