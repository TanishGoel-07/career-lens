import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { StorageService } from './storage.service';
import { ResumesRepository } from './resumes.repository';

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

    // Expensive parsing always happens off the request path (§6/§17).
    await this.queue.add(
      'parse-resume',
      { resumeId: resume.id },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: false, // failed jobs stay visible for the admin dead-letter view
        jobId: `parse-resume_${resume.id}`, // idempotency: re-enqueue is a no-op for BullMQ
      },
    );

    return resume;
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
    await this.getForUser(userId, resumeId); // enforces ownership before touching evaluation table
    const evaluation = await this.repo.latestEvaluation(resumeId);
    if (!evaluation) throw new NotFoundException('No evaluation available yet for this resume.');
    return evaluation;
  }
}
