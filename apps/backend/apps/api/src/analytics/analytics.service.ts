import { Injectable } from '@nestjs/common';
import { PrismaService } from '@career-lens/db';

export interface UserAnalyticsSummary {
  atsScoreTrends: Array<{ date: string; score: number; filename: string }>;
  currentAtsScore: number;
  skillProgression: {
    totalSkillsAcquired: number;
    targetRoleSkillsTotal: number;
    coveragePercentage: number;
  };
  roadmapVelocity: {
    totalModules: number;
    completedModules: number;
    completionPercentage: number;
  };
  codingPerformance: {
    totalSolved: number;
    easySolved: number;
    mediumSolved: number;
    hardSolved: number;
    submissionsCount: number;
  };
  interviewPerformance: {
    sessionsCompleted: number;
    averageScore: number;
  };
  githubIntelligence: {
    profileScore: number;
    portfolioScore: number;
    verifiedSkillsCount: number;
  } | null;
  dynamicNextBestAction: {
    title: string;
    description: string;
    targetView: 'resume' | 'practice' | 'skills' | 'roadmap' | 'assistant';
  };
}

export interface AdminAnalyticsSummary {
  totalUsers: number;
  totalResumes: number;
  averageAtsScore: number;
  totalCodeSubmissions: number;
  codePassRatePercentage: number;
  totalInterviewSessions: number;
  topDemandedSkills: Array<{ skill: string; jobCount: number }>;
  topTargetRoles: Array<{ role: string; count: number }>;
  aiUsageSummary: {
    totalCalls: number;
    totalCostUsd: number;
    totalTokens: number;
    avgLatencyMs: number;
  };
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserAnalytics(userId: string): Promise<UserAnalyticsSummary> {
    const [
      resumes,
      userSkills,
      targetRoles,
      roadmaps,
      codeSubmissions,
      interviewAnswers,
      githubProfile,
      verifiedSkills,
      skillGaps,
    ] = await Promise.all([
      this.prisma.resume.findMany({
        where: { userId, status: 'COMPLETED' },
        include: { evaluations: { orderBy: { createdAt: 'desc' }, take: 1 } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.userSkill.findMany({ where: { userId } }),
      this.prisma.targetRole.findMany({
        where: { userId },
        include: { roleSkills: true },
      }),
      this.prisma.roadmap.findMany({
        where: { userId },
        include: { modules: true },
      }),
      this.prisma.codeSubmission.findMany({ where: { userId } }),
      this.prisma.interviewAnswer.findMany({
        where: { question: { session: { userId } } },
        select: { score: true },
      }),
      this.prisma.gitHubProfile.findUnique({ where: { userId } }),
      this.prisma.verifiedSkill.findMany({ where: { userId } }),
      this.prisma.skillGap.findMany({
        where: { userId },
        orderBy: { priority: 'desc' },
        include: { skill: true },
      }),
    ]);

    // ATS Score Trends
    const atsScoreTrends = resumes
      .map((r: any) => {
        const evalRow = r.evaluations[0];
        return evalRow
          ? {
              date: r.createdAt.toISOString().slice(0, 10),
              score: evalRow.overallScore,
              filename: r.originalFilename,
            }
          : null;
      })
      .filter((t: any): t is { date: string; score: number; filename: string } => Boolean(t));

    const latestAts = atsScoreTrends.length > 0 ? atsScoreTrends[atsScoreTrends.length - 1].score : 0;

    // Skill coverage
    const targetRoleSkills = targetRoles.flatMap((tr: any) => tr.roleSkills);
    const targetTotal = Math.max(targetRoleSkills.length, 1);
    const coveragePercentage = Math.min(100, Math.round((userSkills.length / targetTotal) * 100));

    // Roadmap velocity
    const allModules = roadmaps.flatMap((r: any) => r.modules);
    const completedModules = allModules.filter((m: any) => m.status === 'COMPLETED').length;
    const roadmapPercentage =
      allModules.length > 0 ? Math.round((completedModules / allModules.length) * 100) : 0;

    // Coding performance
    const solvedSubmissions = codeSubmissions.filter((s: any) => s.status === 'COMPLETED');
    const solvedIds = new Set(solvedSubmissions.map((s: any) => s.problemId).filter(Boolean));

    // Interview performance
    const scoredAnswers = interviewAnswers.filter((a: any) => typeof a.score === 'number');
    const avgInterview =
      scoredAnswers.length > 0
        ? Math.round(scoredAnswers.reduce((sum: number, a: any) => sum + (a.score || 0), 0) / scoredAnswers.length)
        : 0;

    // Dynamic Next Best Action
    let dynamicNextBestAction: {
      title: string;
      description: string;
      targetView: 'resume' | 'practice' | 'skills' | 'roadmap' | 'assistant';
    } = {
      title: 'Upload your latest resume to establish baseline ATS intelligence',
      description: 'Run our deterministic and AI evaluation to uncover high-impact keyword and formatting opportunities.',
      targetView: 'resume',
    };

    if (resumes.length === 0) {
      dynamicNextBestAction = {
        title: 'Evaluate your resume for ATS scoring',
        description: 'Upload your PDF/DOCX to get detailed line-by-line feedback and quantified impact analysis.',
        targetView: 'resume',
      };
    } else if (skillGaps.length > 0) {
      const topGap = skillGaps[0];
      dynamicNextBestAction = {
        title: `Bridge top priority skill gap: ${topGap.skill.name}`,
        description: `Unlocking ${topGap.skill.name} has high priority to maximize alignment with your target roles.`,
        targetView: 'roadmap',
      };
    } else if (solvedIds.size < 3) {
      dynamicNextBestAction = {
        title: 'Practice LeetCode-grade algorithmic problems',
        description: 'Complete Two Sum or Valid Parentheses in our isolated Docker execution sandbox to prove DSA competency.',
        targetView: 'practice',
      };
    } else if (scoredAnswers.length === 0) {
      dynamicNextBestAction = {
        title: 'Test your technical interview readiness',
        description: 'Simulate a live Behavioral STAR or System Design interview with multi-dimensional scoring.',
        targetView: 'assistant',
      };
    }

    return {
      atsScoreTrends,
      currentAtsScore: latestAts,
      skillProgression: {
        totalSkillsAcquired: userSkills.length,
        targetRoleSkillsTotal: targetRoleSkills.length,
        coveragePercentage,
      },
      roadmapVelocity: {
        totalModules: allModules.length,
        completedModules,
        completionPercentage: roadmapPercentage,
      },
      codingPerformance: {
        totalSolved: solvedIds.size,
        easySolved: Math.min(solvedIds.size, 2),
        mediumSolved: Math.max(0, solvedIds.size - 2),
        hardSolved: 0,
        submissionsCount: codeSubmissions.length,
      },
      interviewPerformance: {
        sessionsCompleted: scoredAnswers.length,
        averageScore: avgInterview,
      },
      githubIntelligence: githubProfile
        ? {
            profileScore: githubProfile.profileScore,
            portfolioScore: githubProfile.portfolioScore,
            verifiedSkillsCount: verifiedSkills.length,
          }
        : null,
      dynamicNextBestAction,
    };
  }

  async getAdminAnalytics(): Promise<AdminAnalyticsSummary> {
    const [
      userCount,
      resumeEvals,
      codeSubmissions,
      interviewSessions,
      jobs,
      targetRoles,
      aiLogs,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.resumeEvaluation.findMany({ select: { overallScore: true } }),
      this.prisma.codeSubmission.findMany({ select: { status: true } }),
      this.prisma.interviewSession.count(),
      this.prisma.job.findMany({ select: { requiredSkills: true } }),
      this.prisma.targetRole.findMany({ select: { title: true } }),
      this.prisma.aiInteractionLog.findMany({
        select: { costUsd: true, inputTokens: true, outputTokens: true, latencyMs: true },
      }),
    ]);

    const avgAts =
      resumeEvals.length > 0
        ? Math.round(resumeEvals.reduce((s: number, e: any) => s + e.overallScore, 0) / resumeEvals.length)
        : 0;

    const completedSubs = codeSubmissions.filter((s: any) => s.status === 'COMPLETED').length;
    const passRate =
      codeSubmissions.length > 0 ? Math.round((completedSubs / codeSubmissions.length) * 100) : 0;

    // Top Demanded Skills
    const skillCounts: Record<string, number> = {};
    for (const j of jobs) {
      const skills = (j.requiredSkills as string[]) || [];
      for (const s of skills) {
        skillCounts[s] = (skillCounts[s] || 0) + 1;
      }
    }
    const topDemandedSkills = Object.entries(skillCounts)
      .map(([skill, jobCount]) => ({ skill, jobCount }))
      .sort((a, b) => b.jobCount - a.jobCount)
      .slice(0, 10);

    // Top Target Roles
    const roleCounts: Record<string, number> = {};
    for (const r of targetRoles as any[]) {
      roleCounts[r.title] = (roleCounts[r.title] || 0) + 1;
    }
    const topTargetRoles = Object.entries(roleCounts)
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // AI Usage
    const totalCost = aiLogs.reduce((s: number, l: any) => s + Number(l.costUsd || 0), 0);
    const totalTokens = aiLogs.reduce((s: number, l: any) => s + l.inputTokens + l.outputTokens, 0);
    const avgLatency =
      aiLogs.length > 0 ? Math.round(aiLogs.reduce((s: number, l: any) => s + l.latencyMs, 0) / aiLogs.length) : 0;

    return {
      totalUsers: userCount,
      totalResumes: resumeEvals.length,
      averageAtsScore: avgAts,
      totalCodeSubmissions: codeSubmissions.length,
      codePassRatePercentage: passRate,
      totalInterviewSessions: interviewSessions,
      topDemandedSkills,
      topTargetRoles,
      aiUsageSummary: {
        totalCalls: aiLogs.length,
        totalCostUsd: Math.round(totalCost * 1000) / 1000,
        totalTokens,
        avgLatencyMs: avgLatency,
      },
    };
  }
}
