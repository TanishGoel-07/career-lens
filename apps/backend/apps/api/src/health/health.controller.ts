import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '@career-lens/db';
import Redis from 'ioredis';
import { Inject } from '@nestjs/common';
import { REDIS_CLIENT } from '../redis/redis.constants';

/**
 * Liveness (/health) vs readiness (/readiness) distinguished per
 * architecture §23: liveness answers "is the process up", readiness
 * answers "can it actually serve traffic" (DB + Redis reachable).
 */
@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Get('health')
  liveness() {
    return { status: 'ok' };
  }

  @Get('readiness')
  async readiness(@Res() res: Response) {
    const checks: Record<string, boolean> = {};

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch {
      checks.database = false;
    }

    try {
      checks.redis = (await this.redis.ping()) === 'PONG';
    } catch {
      checks.redis = false;
    }

    const ready = Object.values(checks).every(Boolean);
    res.status(ready ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json({ ready, checks });
  }
}
