import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@career-lens/db';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

/**
 * Every route here requires JwtAuthGuard + RolesGuard('ADMIN') — no
 * admin endpoint is reachable without both (architecture §19). Every
 * mutating action additionally writes an AuditLog row.
 */
@ApiTags('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('resume-processing') private readonly resumeQueue: Queue,
    @InjectQueue('code-execution') private readonly codeQueue: Queue,
  ) {}

  @Get('users')
  listUsers(@Query('cursor') cursor?: string) {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, email: true, role: true, createdAt: true, emailVerifiedAt: true },
      orderBy: { id: 'asc' },
      take: 50,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
  }

  @Post('users/:id/promote')
  async promote(@CurrentUser() admin: AuthenticatedUser, @Param('id') targetUserId: string) {
    const updated = await this.prisma.user.update({ where: { id: targetUserId }, data: { role: 'ADMIN' } });
    await this.prisma.auditLog.create({
      data: { actorUserId: admin.id, action: 'PROMOTE_TO_ADMIN', targetType: 'User', targetId: targetUserId },
    });
    return updated;
  }

  @Get('jobs/failed')
  async failedJobs() {
    const [resumeFailed, codeFailed] = await Promise.all([
      this.resumeQueue.getFailed(0, 50),
      this.codeQueue.getFailed(0, 50),
    ]);
    return {
      resumeProcessing: resumeFailed.map((j) => ({ id: j.id, data: j.data, failedReason: j.failedReason })),
      codeExecution: codeFailed.map((j) => ({ id: j.id, data: j.data, failedReason: j.failedReason })),
    };
  }

  @Post('jobs/resume-processing/:jobId/retry')
  async retryResumeJob(@CurrentUser() admin: AuthenticatedUser, @Param('jobId') jobId: string) {
    const job = await this.resumeQueue.getJob(jobId);
    if (job) await job.retry();
    await this.prisma.auditLog.create({
      data: { actorUserId: admin.id, action: 'RETRY_JOB', targetType: 'ResumeProcessingJob', targetId: jobId },
    });
    return { retried: Boolean(job) };
  }

  @Get('ai/usage')
  async aiUsage() {
    const rows = await this.prisma.aiInteractionLog.groupBy({
      by: ['feature', 'provider'],
      _sum: { costUsd: true, inputTokens: true, outputTokens: true },
      _avg: { latencyMs: true },
      _count: true,
    });
    return rows;
  }

  @Get('audit-logs')
  auditLogs(@Query('cursor') cursor?: string) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
  }
}
