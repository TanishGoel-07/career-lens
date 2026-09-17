import { Injectable } from '@nestjs/common';
import { PrismaService } from '@career-lens/db';

/**
 * Allow-listed context selection (architecture §14). This is the ONLY
 * place that assembles what the coach sees about a user, so "don't
 * send the entire database state to the model" is enforced in one
 * spot rather than trusted to every call site. Each field is a compact
 * summary, never a raw table dump.
 */
@Injectable()
export class CoachContextService {
  constructor(private readonly prisma: PrismaService) {}

  async buildContext(userId: string) {
    const [profile, latestResume, topMatches, topGaps, activeRoadmap] = await Promise.all([
      this.prisma.profile.findUnique({ where: { userId } }),
      this.prisma.resume.findFirst({
        where: { userId, status: 'COMPLETED' },
        orderBy: { createdAt: 'desc' },
        include: { evaluations: { orderBy: { createdAt: 'desc' }, take: 1 } },
      }),
      this.prisma.jobMatch.findMany({ where: { userId }, orderBy: { overallScore: 'desc' }, take: 3 }),
      this.prisma.skillGap.findMany({ where: { userId }, orderBy: { priority: 'desc' }, take: 5, include: { skill: true } }),
      this.prisma.roadmap.findFirst({ where: { userId, status: 'IN_PROGRESS' }, include: { modules: true } }),
    ]);

    return {
      profileSummary: profile
        ? { headline: profile.headline, experienceYears: profile.experienceYears }
        : null,
      resumeSummary: latestResume
        ? { overallScore: latestResume.evaluations[0]?.overallScore ?? null }
        : null,
      topJobMatches: topMatches.map((m) => ({ jobId: m.jobId, score: m.overallScore })),
      topSkillGaps: topGaps.map((g) => ({ skill: g.skill.name, priority: g.priority })),
      activeRoadmapProgress: activeRoadmap
        ? {
            total: activeRoadmap.modules.length,
            completed: activeRoadmap.modules.filter((m) => m.status === 'COMPLETED').length,
          }
        : null,
    };
  }
}
