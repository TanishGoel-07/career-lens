import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService, ResumeStatus, SkillSource } from '@career-lens/db';
import * as fs from 'fs/promises';
import * as path from 'path';
// @ts-ignore — no bundled types for pdf-parse
import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import {
  normalizeText,
  computeDeterministicBreakdown,
  overallScoreFromBreakdown,
} from '../deterministic-resume-analysis';

const STORAGE_PATH = path.resolve(process.env.STORAGE_LOCAL_PATH ?? './storage');

/**
 * Consumes the `resume-processing` queue (architecture §6/§17).
 * Idempotent: re-running for the same resumeId simply overwrites the
 * same row with the same deterministic result — no duplicate side
 * effects, so redelivery after a crash is always safe.
 */
@Injectable()
@Processor('resume-processing', { concurrency: 4 })
export class ResumeProcessor extends WorkerHost {
  private readonly logger = new Logger('ResumeProcessor');

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('ai-analysis') private readonly aiAnalysisQueue: Queue,
    @InjectQueue('embeddings') private readonly embeddingQueue: Queue,
  ) {
    super();
  }

  private async extractText(storageKey: string, mimeType: string): Promise<string> {
    const candidatePaths = [
      path.resolve(__dirname, '../../../../storage', storageKey),
      path.join(STORAGE_PATH, storageKey),
      path.resolve(process.cwd(), '../api/storage', storageKey),
      path.resolve(process.cwd(), '../../apps/api/storage', storageKey),
      path.resolve(process.cwd(), '../../storage', storageKey),
      path.resolve(process.cwd(), './storage', storageKey),
    ];

    let buffer: Buffer | null = null;
    for (const candidate of candidatePaths) {
      try {
        buffer = await fs.readFile(candidate);
        break;
      } catch {
        // try next candidate
      }
    }

    if (!buffer) {
      throw new Error(`File ${storageKey} not found in storage (checked ${candidatePaths[0]}).`);
    }

    if (mimeType.includes('pdf')) {
      const result = await pdfParse(buffer);
      return result.text;
    }
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  async process(job: Job<{ resumeId: string }>): Promise<void> {
    const { resumeId } = job.data;
    const resume = await this.prisma.resume.findUnique({ where: { id: resumeId } });
    if (!resume) {
      this.logger.warn(`Resume ${resumeId} no longer exists — skipping.`);
      return;
    }

    await this.prisma.resume.update({ where: { id: resumeId }, data: { status: ResumeStatus.PROCESSING } });

    try {
      const rawText = await this.extractText(resume.storageKey, resume.mimeType);
      const normalized = normalizeText(rawText);

      if (normalized.length < 50) {
        throw new Error('Extracted text is implausibly short — likely a malformed or image-only document.');
      }

      const breakdown = computeDeterministicBreakdown(normalized);
      const overallScore = overallScoreFromBreakdown(breakdown);

      await this.prisma.$transaction([
        this.prisma.resume.update({
          where: { id: resumeId },
          data: {
            parsedText: normalized,
            sections: breakdown.sections,
            extractedSkills: breakdown.extractedSkills,
            status: ResumeStatus.COMPLETED,
            failureReason: null,
          },
        }),
        this.prisma.resumeEvaluation.create({
          data: {
            resumeId,
            deterministicScoreBreakdown: {
              sectionsScore: breakdown.sectionsScore,
              keywordScore: breakdown.keywordScore,
              formattingScore: breakdown.formattingScore,
              impactScore: breakdown.impactScore,
            },
            overallScore,
          },
        }),
      ]);

      // Persist deterministic skills into UserSkill so the skill-gap
      // engine has real data to diff against (architecture §10).
      for (const skillName of breakdown.extractedSkills) {
        const skill = await this.prisma.skill.upsert({
          where: { name: skillName },
          update: {},
          create: { name: skillName },
        });
        await this.prisma.userSkill.upsert({
          where: { userId_skillId: { userId: resume.userId, skillId: skill.id } },
          update: {},
          create: { userId: resume.userId, skillId: skill.id, source: SkillSource.RESUME },
        });
      }

      // Chain: embeddings + AI qualitative feedback happen in their own
      // queues so a slow/failing AI call never blocks the fast
      // deterministic path from completing (architecture §12/§17).
      await this.aiAnalysisQueue.add(
        'analyze-resume',
        { resumeId },
        { attempts: 2, backoff: { type: 'exponential', delay: 5000 }, jobId: `analyze-resume_${resumeId}` },
      );
      await this.embeddingQueue.add(
        'embed-resume',
        { resumeId },
        { attempts: 3, backoff: { type: 'exponential', delay: 3000 }, jobId: `embed-resume_${resumeId}` },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown parsing error';
      await this.prisma.resume.update({
        where: { id: resumeId },
        data: { status: ResumeStatus.FAILED, failureReason: message },
      });
      throw err; // rethrow so BullMQ's retry/backoff policy applies
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`resume-processing job ${job.id} failed: ${err.message}`);
  }
}
