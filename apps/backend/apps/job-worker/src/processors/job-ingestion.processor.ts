import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@career-lens/db';

export interface RawJobPosting {
  source: string;
  externalId: string;
  title: string;
  company: string;
  description: string;
  requiredSkills: string[];
  optionalSkills: string[];
  location?: string;
  seniority?: string;
  postedAt?: string;
}

/**
 * Ingests a batch of normalized job postings from a source adapter
 * (the adapter itself — e.g. a specific job board's API client — is
 * intentionally NOT implemented here, since no real source/credentials
 * were provided; this processor is the stable seam an adapter plugs
 * into). Dedupe on (source, externalId) via upsert makes redelivery
 * safe (architecture §17 idempotency requirement).
 */
@Injectable()
@Processor('job-ingestion', { concurrency: 2 })
export class JobIngestionProcessor extends WorkerHost {
  private readonly logger = new Logger('JobIngestionProcessor');

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('embeddings') private readonly embeddingQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<{ postings: RawJobPosting[] }>): Promise<void> {
    for (const posting of job.data.postings) {
      const saved = await this.prisma.job.upsert({
        where: { source_externalId: { source: posting.source, externalId: posting.externalId } },
        update: {
          title: posting.title,
          company: posting.company,
          description: posting.description,
          requiredSkills: posting.requiredSkills,
          optionalSkills: posting.optionalSkills,
          location: posting.location,
          seniority: posting.seniority,
        },
        create: {
          source: posting.source,
          externalId: posting.externalId,
          title: posting.title,
          company: posting.company,
          description: posting.description,
          requiredSkills: posting.requiredSkills,
          optionalSkills: posting.optionalSkills,
          location: posting.location,
          seniority: posting.seniority,
          postedAt: posting.postedAt ? new Date(posting.postedAt) : undefined,
        },
      });

      await this.embeddingQueue.add(
        'embed-job',
        { jobId: saved.id },
        { attempts: 3, backoff: { type: 'exponential', delay: 3000 }, jobId: `embed-job_${saved.id}` },
      );
    }
    this.logger.log(`Ingested ${job.data.postings.length} job postings.`);
  }
}
