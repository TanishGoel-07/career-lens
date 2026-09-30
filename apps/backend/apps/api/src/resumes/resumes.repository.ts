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

  saveEvaluation(
    resumeId: string,
    breakdown: {
      sectionsScore: number;
      keywordScore: number;
      formattingScore: number;
      impactScore: number;
      technicalDepthScore: number;
      readabilityScore: number;
      missingSkills: string[];
      missingKeywords: string[];
      weakBullets: any[];
      lineFeedback: any[];
      rewrittenResume: string;
    },
    overallScore: number,
  ) {
    return this.prisma.resumeEvaluation.create({
      data: {
        resumeId,
        deterministicScoreBreakdown: {
          sectionsScore: breakdown.sectionsScore,
          keywordScore: breakdown.keywordScore,
          formattingScore: breakdown.formattingScore,
          impactScore: breakdown.impactScore,
          technicalDepthScore: breakdown.technicalDepthScore,
          readabilityScore: breakdown.readabilityScore,
        },
        overallScore,
        technicalDepthScore: breakdown.technicalDepthScore,
        formattingScore: breakdown.formattingScore,
        readabilityScore: breakdown.readabilityScore,
        keywordScore: breakdown.keywordScore,
        impactScore: breakdown.impactScore,
        missingSkills: breakdown.missingSkills,
        missingKeywords: breakdown.missingKeywords,
        weakBullets: breakdown.weakBullets as any,
        lineFeedback: breakdown.lineFeedback as any,
        rewrittenResume: breakdown.rewrittenResume,
      },
    });
  }

  async upsertUserSkills(userId: string, skills: string[]) {
    for (const skillName of skills) {
      try {
        const skill = await this.prisma.skill.upsert({
          where: { name: skillName },
          update: {},
          create: { name: skillName },
        });
        await this.prisma.userSkill.upsert({
          where: { userId_skillId: { userId, skillId: skill.id } },
          update: {},
          create: { userId, skillId: skill.id, source: 'RESUME' as any },
        });
      } catch {
        // non-blocking
      }
    }
  }
}
