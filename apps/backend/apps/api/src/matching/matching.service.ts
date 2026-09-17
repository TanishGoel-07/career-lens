import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@career-lens/db';
import { AiGatewayService } from '../ai/ai-gateway.service';

const SCORING_VERSION = 'match-v1'; // bump + benchmark before changing weights (architecture §9)

export interface MatchResult {
  overallScore: number;
  matchingSkills: string[];
  missingRequired: string[];
  missingOptional: string[];
  experienceMismatch: { expectedYears?: number; actualYears?: number; gap: number };
  explanation: string;
}

/**
 * Deterministic skill/experience scoring + (optional) semantic
 * similarity, blended with fixed weights. The LLM is used ONLY to
 * phrase `explanation` from the already-computed numbers — it never
 * produces `overallScore` itself (explicit master-prompt requirement:
 * "Do NOT use an LLM as the entire matching algorithm").
 *
 * `scoringVersion` is stamped on every result so weight/algorithm
 * changes can be benchmarked against a labeled set before rollout,
 * rather than silently changing everyone's historical scores' meaning.
 */
@Injectable()
export class MatchingService {
  private readonly logger = new Logger('MatchingService');

  // Weights sum to 1.0; documented here rather than scattered as magic
  // numbers so a benchmark run can be tied to a specific weight set.
  private readonly weights = { skillOverlap: 0.55, semanticSimilarity: 0.25, experience: 0.2 };

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

    // Required skills dominate: an 80% weight within this sub-score.
    const score = requiredScore * 0.8 + optionalScore * 0.2;
    return { score, matching, missingRequired, missingOptional };
  }

  private scoreExperience(actualYears: number | undefined, seniority: string | null): {
    score: number;
    expectedYears?: number;
    gap: number;
  } {
    const expectedByLevel: Record<string, number> = {
      junior: 1,
      mid: 3,
      senior: 6,
      staff: 9,
    };
    const expectedYears = seniority ? expectedByLevel[seniority.toLowerCase()] : undefined;
    if (expectedYears === undefined || actualYears === undefined) {
      return { score: 0.5, expectedYears, gap: 0 }; // neutral when data is missing — never fabricated
    }
    const gap = expectedYears - actualYears;
    const score = gap <= 0 ? 1 : Math.max(0, 1 - gap / expectedYears);
    return { score, expectedYears, gap: Math.max(0, gap) };
  }

  /**
   * Cosine similarity between resume and job embeddings, computed via
   * pgvector's `<=>` operator directly in SQL rather than pulling
   * vectors into Node — keeps this cheap even for many candidate jobs.
   */
  private async semanticSimilarity(resumeId: string, jobId: string): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ similarity: number }>>`
      SELECT 1 - (r.embedding <=> j.embedding) AS similarity
      FROM "DocumentChunk" r, "DocumentChunk" j
      WHERE r."resumeId" = ${resumeId} AND j."jobId" = ${jobId}
      ORDER BY similarity DESC
      LIMIT 1
    `;
    return rows[0]?.similarity ?? 0.5; // neutral fallback if embeddings aren't ready yet
  }

  async computeMatch(userId: string, resumeId: string, jobId: string): Promise<MatchResult> {
    const [resume, job] = await Promise.all([
      this.prisma.resume.findFirst({ where: { id: resumeId, userId } }),
      this.prisma.job.findUnique({ where: { id: jobId } }),
    ]);
    if (!resume || !job) throw new NotFoundException('Resume or job not found.');

    const resumeSkills = new Set(
      ((resume.extractedSkills as string[] | null) ?? []).map((s) => s.toLowerCase()),
    );
    const required = job.requiredSkills as string[];
    const optional = job.optionalSkills as string[];

    const skillResult = this.scoreSkillOverlap(resumeSkills, required, optional);
    const experienceResult = this.scoreExperience(undefined, job.seniority);
    const semantic = await this.semanticSimilarity(resumeId, jobId).catch(() => 0.5);

    const overallScore = Math.round(
      (skillResult.score * this.weights.skillOverlap +
        semantic * this.weights.semanticSimilarity +
        experienceResult.score * this.weights.experience) *
        100,
    );

    let explanation = `Matches ${skillResult.matching.length} of ${required.length + optional.length} listed skills.`;
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
        },
        cacheable: false,
      });
      explanation = aiResult.explanation;
    } catch (err) {
      this.logger.warn(`AI explanation unavailable, falling back to templated text: ${(err as Error).message}`);
    }

    const result: MatchResult = {
      overallScore,
      matchingSkills: skillResult.matching,
      missingRequired: skillResult.missingRequired,
      missingOptional: skillResult.missingOptional,
      experienceMismatch: { expectedYears: experienceResult.expectedYears, gap: experienceResult.gap },
      explanation,
    };

    await this.prisma.jobMatch.upsert({
      where: { userId_jobId_resumeId: { userId, jobId, resumeId } },
      update: { ...result, scoringVersion: SCORING_VERSION },
      create: { userId, jobId, resumeId, ...result, scoringVersion: SCORING_VERSION },
    });

    return result;
  }
}
