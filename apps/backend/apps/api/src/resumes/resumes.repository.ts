import { Injectable } from '@nestjs/common';
import { PrismaService, ResumeStatus } from '@career-lens/db';

@Injectable()
export class ResumesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    userId: string;
    originalFilename: string;
    storageKey: string;
    mimeType: string;
    sizeBytes: number;
  }) {
    return this.prisma.resume.create({ data });
  }

  // Always scoped by userId — repository-level defense in depth per §5,
  // independent of the OwnershipGuard already applied at the route.
  findForUser(userId: string, resumeId: string) {
    return this.prisma.resume.findFirst({ where: { id: resumeId, userId, deletedAt: null } });
  }

  listForUser(userId: string) {
    return this.prisma.resume.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  updateStatus(id: string, status: ResumeStatus, failureReason?: string) {
    return this.prisma.resume.update({ where: { id }, data: { status, failureReason } });
  }

  persistParsed(
    id: string,
    data: { parsedText: string; sections: unknown; extractedSkills: unknown },
  ) {
    return this.prisma.resume.update({
      where: { id },
      data: { ...(data as any), status: ResumeStatus.COMPLETED },
    });
  }

  latestEvaluation(resumeId: string) {
    return this.prisma.resumeEvaluation.findFirst({
      where: { resumeId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
