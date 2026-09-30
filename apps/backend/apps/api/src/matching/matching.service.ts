import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@career-lens/db';
import { AiGatewayService } from '../ai/ai-gateway.service';

const SCORING_VERSION = 'match-v2-semantic';

export interface MatchResult {
  overallScore: number;
  matchingSkills: string[];
  missingRequired: string[];
  missingOptional: string[];
  experienceMismatch: { expectedYears?: number; actualYears?: number; gap: number };
  explanation: string;
  strengthAreas?: string[];
  personalizedImprovementPlan?: string[];
}

@Injectable()
export class MatchingService {
  private readonly logger = new Logger('MatchingService');

  // Weights sum to 1.0
  private readonly weights = {
    skillOverlap: 0.50,
    semanticSimilarity: 0.25,
    experience: 0.15,
    educationAndProjects: 0.10,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiGateway: AiGatewayService,
  ) {}

  private scoreSkillOverlap(
    resumeSkills: Set<string>,
    required: string[],
    optional: string[],
  ): { score: number; matching: string[]; missingRequired: string[]; missingOptional: string[] } {
    const matching = [...required, ...optional].filter((s) => resumeSkills.has(s.toLowerCase()));
    const missingRequired = required.filter((s) => !resumeSkills.has(s.toLowerCase()));
    const missingOptional = optional.filter((s) => !resumeSkills.has(s.toLowerCase()));

    const requiredScore = required.length
      ? (required.length - missingRequired.length) / required.length
      : 1;
    const optionalScore = optional.length
      ? (optional.length - missingOptional.length) / optional.length
      : 1;

    // Required skills dominate: 80% weight
    const score = requiredScore * 0.8 + optionalScore * 0.2;
    return { score, matching, missingRequired, missingOptional };
  }

  private scoreExperience(actualYears: number | undefined, seniority: string | null): {
    score: number;
    expectedYears?: number;
    actualYears?: number;
    gap: number;
  } {
    const expectedByLevel: Record<string, number> = {
      intern: 0,
      junior: 1,
      mid: 3,
      senior: 5,
      lead: 7,
      staff: 8,
      principal: 10,
    };
    const expectedYears = seniority ? (expectedByLevel[seniority.toLowerCase()] ?? 2) : 2;
    const actual = actualYears !== undefined && actualYears !== null ? actualYears : 2;

    const gap = expectedYears - actual;
    const score = gap <= 0 ? 1 : Math.max(0.2, 1 - gap / expectedYears);
    return { score, expectedYears, actualYears: actual, gap: Math.max(0, gap) };
  }

  private scoreEducationAndProjects(parsedText: string, jobDescription: string): number {
    const lower = parsedText.toLowerCase();
    let score = 0.5;

    // Education degree match
    if (lower.includes('bachelor') || lower.includes('b.s.') || lower.includes('b.tech') || lower.includes('computer science')) {
      score += 0.25;
    }
    if (lower.includes('master') || lower.includes('m.s.') || lower.includes('phd')) {
      score += 0.15;
    }

    // Project keywords overlap with job
    const jobWords = (jobDescription || '').toLowerCase().split(/\s+/).filter((w) => w.length > 5);
    const matchedWords = jobWords.filter((w) => lower.includes(w));
    if (matchedWords.length > 5) score += 0.1;

    return Math.min(1.0, score);
  }

  private async semanticSimilarity(resumeId: string, jobId: string): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ similarity: number }>>`
      SELECT 1 - (r.embedding <=> j.embedding) AS similarity
      FROM "DocumentChunk" r, "DocumentChunk" j
      WHERE r."resumeId" = ${resumeId} AND j."jobId" = ${jobId}
      ORDER BY similarity DESC
      LIMIT 1
    `;
    return rows[0]?.similarity ?? 0.65;
  }

  async computeMatch(userId: string, resumeId: string, jobId: string): Promise<MatchResult> {
    const [resume, job, profile] = await Promise.all([
      this.prisma.resume.findFirst({ where: { id: resumeId, userId } }),
      this.prisma.job.findUnique({ where: { id: jobId } }),
      this.prisma.profile.findUnique({ where: { userId } }),
    ]);
    if (!resume || !job) throw new NotFoundException('Resume or job not found.');

    const resumeSkills = new Set(
      ((resume.extractedSkills as string[] | null) ?? []).map((s) => s.toLowerCase()),
    );
    const required = (job.requiredSkills as string[]) || [];
    const optional = (job.optionalSkills as string[]) || [];

    const skillResult = this.scoreSkillOverlap(resumeSkills, required, optional);
    const experienceResult = this.scoreExperience(profile?.experienceYears ?? undefined, job.seniority);
    const eduProjectScore = this.scoreEducationAndProjects(resume.parsedText || '', job.description);
    const semantic = await this.semanticSimilarity(resumeId, jobId).catch(() => 0.65);

    const overallScore = Math.round(
      (skillResult.score * this.weights.skillOverlap +
        semantic * this.weights.semanticSimilarity +
        experienceResult.score * this.weights.experience +
        eduProjectScore * this.weights.educationAndProjects) *
        100,
    );

    // Identify strength areas
    const strengthAreas: string[] = [];
    if (skillResult.matching.length > 0) {
      strengthAreas.push(`Direct alignment on ${skillResult.matching.slice(0, 3).join(', ')}`);
    }
    if (experienceResult.gap === 0) {
      strengthAreas.push(`Meets or exceeds requested seniority level (${job.seniority || 'Mid/Senior'})`);
    }
    if (semantic >= 0.75) {
      strengthAreas.push('High semantic similarity in past project scopes and engineering context');
    }

    // Improvement Plan
    const personalizedImprovementPlan: string[] = [];
    if (skillResult.missingRequired.length > 0) {
      personalizedImprovementPlan.push(
        `High priority: Acquire and document hands-on experience with ${skillResult.missingRequired.slice(0, 2).join(' and ')}.`,
      );
    }
    if (experienceResult.gap > 0) {
      personalizedImprovementPlan.push(
        `Highlight architectural leadership and complexity to compensate for ${experienceResult.gap}-year seniority gap.`,
      );
    }
    if (skillResult.missingOptional.length > 0) {
      personalizedImprovementPlan.push(
        `Bonus points: Mention familiarity with secondary tech like ${skillResult.missingOptional.slice(0, 2).join(', ')}.`,
      );
    }

    let explanation = `Calculated match score: ${overallScore}%. Matches ${skillResult.matching.length} of ${
      required.length + optional.length
    } listed skills.`;

    try {
      const aiResult = await this.aiGateway.call<{ explanation: string }>({
        userId,
        feature: 'job-match-explanation',
        promptKey: 'match-explanation.v1',
        variables: {
          overallScore,
          matchingSkills: skillResult.matching,
          missingRequired: skillResult.missingRequired,
          missingOptional: skillResult.missingOptional,
          seniority: job.seniority,
          experienceGap: experienceResult.gap,
        },
        cacheable: false,
      });
      explanation = aiResult.explanation;
    } catch (err) {
      this.logger.warn(`AI explanation unavailable, falling back to data-driven text: ${(err as Error).message}`);
    }

    const result: MatchResult = {
      overallScore,
      matchingSkills: skillResult.matching,
      missingRequired: skillResult.missingRequired,
      missingOptional: skillResult.missingOptional,
      experienceMismatch: {
        expectedYears: experienceResult.expectedYears,
        actualYears: experienceResult.actualYears,
        gap: experienceResult.gap,
      },
      explanation,
      strengthAreas,
      personalizedImprovementPlan,
    };

    await this.prisma.jobMatch.upsert({
      where: { userId_jobId_resumeId: { userId, jobId, resumeId } },
      update: {
        overallScore: result.overallScore,
        matchingSkills: result.matchingSkills,
        missingRequired: result.missingRequired,
        missingOptional: result.missingOptional,
        experienceMismatch: result.experienceMismatch,
        explanation: result.explanation,
        scoringVersion: SCORING_VERSION,
      },
      create: {
        userId,
        jobId,
        resumeId,
        overallScore: result.overallScore,
        matchingSkills: result.matchingSkills,
        missingRequired: result.missingRequired,
        missingOptional: result.missingOptional,
        experienceMismatch: result.experienceMismatch,
        explanation: result.explanation,
        scoringVersion: SCORING_VERSION,
      },
    });

    return result;
  }
}
