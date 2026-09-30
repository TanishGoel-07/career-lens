import { Injectable } from '@nestjs/common';
import { PrismaService } from '@career-lens/db';

export interface UserCareerContext {
  profileSummary: {
    fullName?: string | null;
    headline?: string | null;
    experienceYears?: number | null;
    learningPaceHoursPerWeek?: number | null;
  } | null;
  resumeSummary: {
    overallScore: number | null;
    impactScore: number | null;
    technicalDepthScore: number | null;
    extractedSkills: string[];
    weakBulletsCount: number;
    missingSkills: string[];
  } | null;
  topJobMatches: Array<{ jobId: string; score: number }>;
  topSkillGaps: Array<{ skill: string; priority: number; difficulty: number }>;
  activeRoadmapProgress: {
    total: number;
    completed: number;
    nextMilestone: string | null;
  } | null;
  codingPracticeStats: {
    totalSubmissions: number;
    completedCount: number;
  };
  interviewPerformance: {
    totalSessions: number;
    averageScore: number;
  };
  githubIntelligence: {
    profileScore: number;
    topLanguages: any;
    verifiedSkillsCount: number;
  } | null;
}

@Injectable()
export class CoachContextService {
  constructor(private readonly prisma: PrismaService) {}

  async buildContext(userId: string): Promise<UserCareerContext> {
    const [
      profile,
      latestResume,
      topMatches,
      topGaps,
      activeRoadmap,
      codingSubmissions,
      interviewAnswers,
      githubProfile,
      verifiedSkills,
    ] = await Promise.all([
      this.prisma.profile.findUnique({ where: { userId } }),
      this.prisma.resume.findFirst({
        where: { userId, status: 'COMPLETED' },
        orderBy: { createdAt: 'desc' },
        include: { evaluations: { orderBy: { createdAt: 'desc' }, take: 1 } },
      }),
      this.prisma.jobMatch.findMany({ where: { userId }, orderBy: { overallScore: 'desc' }, take: 3 }),
      this.prisma.skillGap.findMany({
        where: { userId },
        orderBy: { priority: 'desc' },
        take: 6,
        include: { skill: true },
      }),
      this.prisma.roadmap.findFirst({
        where: { userId, status: 'IN_PROGRESS' },
        include: { modules: { orderBy: { orderIndex: 'asc' } } },
      }),
      this.prisma.codeSubmission.findMany({ where: { userId } }),
      this.prisma.interviewAnswer.findMany({
        where: { question: { session: { userId } } },
        select: { score: true },
      }),
      this.prisma.gitHubProfile.findUnique({ where: { userId } }),
      this.prisma.verifiedSkill.findMany({ where: { userId } }),
    ]);

    const latestEval = latestResume?.evaluations?.[0];
    const nextIncompleteModule = activeRoadmap?.modules?.find((m: any) => m.status !== 'COMPLETED');

    const completedCoding = codingSubmissions.filter((s: any) => s.status === 'COMPLETED').length;

    const scoredAnswers = interviewAnswers.filter((a: any) => typeof a.score === 'number');
    const avgInterviewScore =
      scoredAnswers.length > 0
        ? Math.round(scoredAnswers.reduce((sum: number, a: any) => sum + (a.score || 0), 0) / scoredAnswers.length)
        : 70;

    return {
      profileSummary: profile
        ? {
            fullName: profile.fullName,
            headline: profile.headline,
            experienceYears: profile.experienceYears,
            learningPaceHoursPerWeek: profile.learningPaceHoursPerWeek,
          }
        : null,
      resumeSummary: latestResume
        ? {
            overallScore: latestEval?.overallScore ?? null,
            impactScore: latestEval?.impactScore ?? null,
            technicalDepthScore: latestEval?.technicalDepthScore ?? null,
            extractedSkills: (latestResume.extractedSkills as string[]) || [],
            weakBulletsCount: ((latestEval?.weakBullets as any[]) || []).length,
            missingSkills: (latestEval?.missingSkills as string[]) || [],
          }
        : null,
      topJobMatches: topMatches.map((m: any) => ({ jobId: m.jobId, score: m.overallScore })),
      topSkillGaps: topGaps.map((g: any) => ({
        skill: g.skill.name,
        priority: g.priority,
        difficulty: g.difficulty,
      })),
      activeRoadmapProgress: activeRoadmap
        ? {
            total: activeRoadmap.modules.length,
            completed: activeRoadmap.modules.filter((m: any) => m.status === 'COMPLETED').length,
            nextMilestone: nextIncompleteModule?.title || null,
          }
        : null,
      codingPracticeStats: {
        totalSubmissions: codingSubmissions.length,
        completedCount: completedCoding,
      },
      interviewPerformance: {
        totalSessions: interviewAnswers.length,
        averageScore: avgInterviewScore,
      },
      githubIntelligence: githubProfile
        ? {
            profileScore: githubProfile.profileScore,
            topLanguages: githubProfile.topLanguages,
            verifiedSkillsCount: verifiedSkills.length,
          }
        : null,
    };
  }
}
