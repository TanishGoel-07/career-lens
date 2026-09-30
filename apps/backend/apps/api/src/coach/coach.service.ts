import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@career-lens/db';
import { AiGatewayService } from '../ai/ai-gateway.service';
import { CoachContextService, UserCareerContext } from './coach-context.service';

const MAX_HISTORY_MESSAGES = 10;

export interface GoalReadinessAnalysis {
  targetRoleOrCompany: string;
  readinessScore: number;
  missingSkills: string[];
  missingProjects: string[];
  dsaReadiness: {
    status: 'READY' | 'NEEDS_WORK' | 'CRITICAL_GAP';
    score: number;
    recommendedFocus: string[];
  };
  interviewReadiness: {
    verbalScore: number;
    codingScore: number;
    recommendation: string;
  };
  timelineEstimateWeeks: number;
  weeklyPlan: Array<{
    week: number;
    theme: string;
    focusAreas: string[];
    actionItems: string[];
  }>;
}

@Injectable()
export class CoachService {
  constructor(
    private readonly context: CoachContextService,
    private readonly aiGateway: AiGatewayService,
    private readonly prisma: PrismaService,
  ) {}

  private analyzeGoalQuery(
    message: string,
    context: UserCareerContext,
  ): GoalReadinessAnalysis | null {
    const lower = message.toLowerCase();
    const isGoal =
      lower.includes('want') ||
      lower.includes('target') ||
      lower.includes('aiming') ||
      lower.includes('interview at') ||
      lower.includes('internship') ||
      lower.includes('google') ||
      lower.includes('meta') ||
      lower.includes('amazon') ||
      lower.includes('microsoft') ||
      lower.includes('apple') ||
      lower.includes('netflix') ||
      lower.includes('uber') ||
      lower.includes('senior') ||
      lower.includes('sde');

    if (!isGoal) return null;

    // Detect target
    let target = 'Tier-1 Tech SDE Role';
    if (lower.includes('google')) target = 'Google SDE';
    else if (lower.includes('meta')) target = 'Meta Software Engineer';
    else if (lower.includes('amazon')) target = 'Amazon SDE';
    else if (lower.includes('internship')) target = 'Top-tier SDE Internship';

    const resumeScore = context.resumeSummary?.overallScore ?? 65;
    const impactScore = context.resumeSummary?.impactScore ?? 50;
    const techDepthScore = context.resumeSummary?.technicalDepthScore ?? 50;
    const solvedCount = context.codingPracticeStats.completedCount;
    const interviewAvg = context.interviewPerformance.averageScore;

    // Multi-factor readiness score (0-100)
    const readinessScore = Math.min(
      95,
      Math.max(
        35,
        Math.round(
          resumeScore * 0.35 +
            Math.min(100, (solvedCount / 15) * 100) * 0.25 +
            interviewAvg * 0.25 +
            (techDepthScore / 100) * 15,
        ),
      ),
    );

    // Identify missing skills & projects
    const allKnownSkills = new Set(
      (context.resumeSummary?.extractedSkills || []).map((s) => s.toLowerCase()),
    );
    const standardSdeSkills = ['system design', 'distributed systems', 'concurrency', 'docker', 'postgresql', 'redis'];
    const missingSkills = standardSdeSkills.filter((s) => !allKnownSkills.has(s));

    const missingProjects = [
      'High-throughput distributed cache / rate limiter with Redis and Docker',
      'End-to-end full-stack application with PostgreSQL indexing, transactions, and CI/CD',
    ];

    const dsaScore = Math.min(100, Math.round((solvedCount / 10) * 100));
    const dsaStatus = dsaScore >= 80 ? 'READY' : dsaScore >= 40 ? 'NEEDS_WORK' : 'CRITICAL_GAP';

    const timelineWeeks = readinessScore >= 80 ? 4 : readinessScore >= 60 ? 8 : 12;

    const weeklyPlan = [
      {
        week: 1,
        theme: 'Core Algorithmic Patterns & DSA Fundamentals',
        focusAreas: ['Two Pointers', 'Sliding Window', 'Hash Tables'],
        actionItems: [
          'Complete 5 medium problems in CareerLens Coding Practice',
          'Benchmark runtime and analyze space complexity',
        ],
      },
      {
        week: 2,
        theme: 'Tree, Graph Traversal & Dynamic Programming',
        focusAreas: ['BFS / DFS', 'Topological Sort', 'Memoization'],
        actionItems: [
          'Practice Graph cycle detection and DAG sequencing',
          'Review recurrence relations for 1D/2D DP',
        ],
      },
      {
        week: 3,
        theme: 'Production System Design & Scalability',
        focusAreas: ['Distributed Caching', 'Database Sharding', 'Rate Limiting'],
        actionItems: [
          'Design distributed token bucket rate limiter',
          'Analyze failure modes, cache invalidation, and replication',
        ],
      },
      {
        week: 4,
        theme: 'Resume Optimization & Behavioral STAR Stories',
        focusAreas: ['Google XYZ Resume Formula', 'STAR Conflict Scenarios'],
        actionItems: [
          'Rewrite resume bullet points with quantified latency/scale metrics',
          'Run 2 AI Mock Behavioral Interview sessions',
        ],
      },
    ];

    return {
      targetRoleOrCompany: target,
      readinessScore,
      missingSkills,
      missingProjects,
      dsaReadiness: {
        status: dsaStatus,
        score: dsaScore,
        recommendedFocus: ['Graphs & Trees', 'Dynamic Programming', 'Heap / Priority Queue'],
      },
      interviewReadiness: {
        verbalScore: interviewAvg,
        codingScore: dsaScore,
        recommendation:
          readinessScore >= 75
            ? 'Candidate is competitive. Polish live coding communication and system design tradeoffs.'
            : 'Focus 70% of weekly effort on algorithmic pattern recognition and Dockerized portfolio proof of work.',
      },
      timelineEstimateWeeks: timelineWeeks,
      weeklyPlan,
    };
  }

  async getOrCreateSession(userId: string, sessionId?: string) {
    if (sessionId) {
      const existing = await this.prisma.coachSession.findUnique({
        where: { id: sessionId },
        include: { messages: { orderBy: { createdAt: 'asc' }, take: MAX_HISTORY_MESSAGES } },
      });
      if (existing && existing.userId === userId) {
        return existing;
      }
    }

    return this.prisma.coachSession.create({
      data: {
        userId,
        title: 'Career Strategy Session',
      },
      include: { messages: true },
    });
  }

  async listSessions(userId: string) {
    return this.prisma.coachSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  async getSessionMessages(userId: string, sessionId: string) {
    const session = await this.prisma.coachSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!session || session.userId !== userId) {
      throw new NotFoundException('Session not found.');
    }
    return session.messages;
  }

  async chat(userId: string, requestedSessionId: string, message: string) {
    const session = await this.getOrCreateSession(userId, requestedSessionId);
    const context = await this.context.buildContext(userId);

    // Save user message
    await this.prisma.coachMessage.create({
      data: {
        sessionId: session.id,
        role: 'user',
        content: message,
      },
    });

    // Check if this query is a target goal request
    const goalAnalysis = this.analyzeGoalQuery(message, context);

    // Pull previous conversation turns for conversational memory
    const history = await this.prisma.coachMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });
    const recentTurns = history.reverse().map((h) => `${h.role}: ${h.content}`).join('\n');

    let responseText: string;

    try {
      const aiReply = await this.aiGateway.call<{ text: string }>({
        userId,
        feature: 'career-coach',
        promptKey: 'career-coach.v1',
        variables: {
          message,
          context,
          recentConversationHistory: recentTurns,
          goalIntelligence: goalAnalysis,
        },
        cacheable: false,
      });
      responseText = aiReply.text;
    } catch {
      if (goalAnalysis) {
        responseText =
          `Targeting ${goalAnalysis.targetRoleOrCompany} — Here is your personalized Career Intelligence Assessment:\n\n` +
          `• Overall Readiness Score: ${goalAnalysis.readinessScore}/100\n` +
          `• DSA Readiness: ${goalAnalysis.dsaReadiness.status} (${goalAnalysis.dsaReadiness.score}% benchmarked)\n` +
          `• Priority Skill Gaps: ${goalAnalysis.missingSkills.join(', ') || 'System Design, Microservices'}\n` +
          `• Recommended Timeline: ${goalAnalysis.timelineEstimateWeeks} Weeks\n\n` +
          `Weekly Action Plan:\n` +
          goalAnalysis.weeklyPlan
            .map((wp) => `Week ${wp.week} (${wp.theme}):\n  - ${wp.actionItems.join('\n  - ')}`)
            .join('\n\n');
      } else {
        responseText =
          `Based on your profile and verified progress (Resume: ${context.resumeSummary?.overallScore ?? 75}/100, ` +
          `Active Gaps: ${context.topSkillGaps.map((g) => g.skill).slice(0, 3).join(', ') || 'System Design'}), ` +
          `your highest leverage next step is completing your current roadmap module: "${context.activeRoadmapProgress?.nextMilestone || 'Distributed Architecture'}".`;
      }
    }

    // Save assistant reply with metadata
    const assistantMsg = await this.prisma.coachMessage.create({
      data: {
        sessionId: session.id,
        role: 'assistant',
        content: responseText,
        metadata: (goalAnalysis as any) ?? null,
      },
    });

    // Touch session updatedAt
    await this.prisma.coachSession.update({
      where: { id: session.id },
      data: { updatedAt: new Date() },
    });

    return {
      sessionId: session.id,
      reply: { text: responseText },
      metadata: goalAnalysis,
      messageId: assistantMsg.id,
    };
  }
}
