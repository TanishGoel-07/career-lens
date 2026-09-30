import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { StorageService } from './storage.service';
import { ResumesRepository } from './resumes.repository';
// @ts-ignore
import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import {
  normalizeText,
  computeDeterministicBreakdown,
  overallScoreFromBreakdown,
} from './deterministic-resume-analysis';

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
]);
const MAGIC_BYTES: Record<string, Buffer> = {
  pdf: Buffer.from('25504446', 'hex'), // %PDF
  docx: Buffer.from('504b0304', 'hex'), // ZIP local file header (docx is a zip)
};

@Injectable()
export class ResumesService {
  private readonly logger = new Logger('ResumesService');

  constructor(
    private readonly storage: StorageService,
    private readonly repo: ResumesRepository,
    private readonly config: ConfigService,
    @InjectQueue('resume-processing') private readonly queue: Queue,
  ) {}

  private extensionFor(mimeType: string): string {
    return mimeType.includes('pdf') ? '.pdf' : '.docx';
  }

  private validateMagicBytes(buffer: Buffer, mimeType: string) {
    const expected = mimeType.includes('pdf') ? MAGIC_BYTES.pdf : MAGIC_BYTES.docx;
    const actual = buffer.subarray(0, expected.length);
    if (!actual.equals(expected)) {
      throw new BadRequestException(
        'File contents do not match the declared file type. Upload rejected.',
      );
    }
  }

  private async extractText(buffer: Buffer, mimeType: string): Promise<string> {
    try {
      if (mimeType.includes('pdf')) {
        const result = await pdfParse(buffer);
        if (result?.text && result.text.trim().length > 10) {
          return result.text;
        }
      } else if (mimeType.includes('word') || mimeType.includes('docx')) {
        const result = await mammoth.extractRawText({ buffer });
        if (result?.value && result.value.trim().length > 10) {
          return result.value;
        }
      }
    } catch (err) {
      this.logger.warn(`Native parser extraction warning: ${(err as Error).message}`);
    }

    // Printable ASCII / UTF-8 fallback
    const rawString = buffer.toString('utf-8');
    const printable = rawString.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ');
    const cleaned = printable.replace(/\s+/g, ' ').trim();
    if (cleaned.length > 30) {
      return cleaned;
    }
    return rawString;
  }

  async upload(
    userId: string,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
  ) {
    const maxBytes = this.config.get<number>('MAX_RESUME_UPLOAD_MB', 8) * 1024 * 1024;

    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException('Only PDF and DOCX resumes are supported.');
    }
    if (file.size > maxBytes) {
      throw new BadRequestException(`File exceeds the maximum upload size of ${maxBytes / 1024 / 1024}MB.`);
    }
    this.validateMagicBytes(file.buffer, file.mimetype);

    const storageKey = await this.storage.save(file.buffer, this.extensionFor(file.mimetype));

    const resume = await this.repo.create({
      userId,
      originalFilename: file.originalname, // stored only as metadata, NEVER used as a path
      storageKey,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    });

    // Instant synchronous deterministic parsing & scoring (<200ms)
    // Ensures immediate response and zero buffering even if job-worker is running asynchronously
    try {
      const rawText = await this.extractText(file.buffer, file.mimetype);
      const normalized = normalizeText(rawText);
      if (normalized.length >= 15) {
        const breakdown = computeDeterministicBreakdown(normalized);
        const overallScore = overallScoreFromBreakdown(breakdown);

        await this.repo.persistParsed(resume.id, {
          parsedText: normalized,
          sections: breakdown.sections,
          extractedSkills: breakdown.extractedSkills,
        });

        await this.repo.saveEvaluation(resume.id, breakdown, overallScore);
        await this.repo.upsertUserSkills(userId, breakdown.extractedSkills);
      }
    } catch (err) {
      this.logger.warn(`Synchronous resume analysis fallback warning: ${(err as Error).message}`);
    }

    // Also queue for BullMQ background workers (AI analysis, vector embeddings)
    try {
      await this.queue.add(
        'parse-resume',
        { resumeId: resume.id },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 100,
          removeOnFail: false,
          jobId: `parse-resume_${resume.id}`,
        },
      );
    } catch (err) {
      this.logger.warn(`Queue enqueue warning: ${(err as Error).message}`);
    }

    return (await this.repo.findForUser(userId, resume.id)) || resume;
  }

  async getForUser(userId: string, resumeId: string) {
    const resume = await this.repo.findForUser(userId, resumeId);
    if (!resume) throw new NotFoundException('Resume not found.');
    return resume;
  }

  listForUser(userId: string) {
    return this.repo.listForUser(userId);
  }

  async getEvaluation(userId: string, resumeId: string) {
    const resume = await this.getForUser(userId, resumeId);
    let evaluation = await this.repo.latestEvaluation(resumeId);

    // If an evaluation does not exist yet (e.g. uploaded previously while worker was stopped),
    // compute and persist it immediately on the fly!
    if (!evaluation) {
      try {
        let text = resume.parsedText;
        if (!text) {
          const buffer = await this.storage.read(resume.storageKey);
          text = await this.extractText(buffer, resume.mimeType);
        }
        if (text && text.trim().length > 10) {
          const normalized = normalizeText(text);
          const breakdown = computeDeterministicBreakdown(normalized);
          const overallScore = overallScoreFromBreakdown(breakdown);

          await this.repo.persistParsed(resume.id, {
            parsedText: normalized,
            sections: breakdown.sections,
            extractedSkills: breakdown.extractedSkills,
          });

          evaluation = await this.repo.saveEvaluation(resume.id, breakdown, overallScore);
          await this.repo.upsertUserSkills(userId, breakdown.extractedSkills);
        }
      } catch (err) {
        this.logger.warn(`On-the-fly evaluation calculation warning: ${(err as Error).message}`);
      }
    }

    if (!evaluation) throw new NotFoundException('No evaluation available yet for this resume.');
    return evaluation;
  }
}
