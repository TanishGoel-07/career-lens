import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@career-lens/db';

const CHUNK_SIZE_CHARS = 2000; // ~500 tokens
const CHUNK_OVERLAP_CHARS = 200; // ~50 tokens, per architecture §13

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE_CHARS, text.length);
    chunks.push(text.slice(start, end));
    start += CHUNK_SIZE_CHARS - CHUNK_OVERLAP_CHARS;
  }
  return chunks;
}

/**
 * Embeds resume/job text into DocumentChunk rows for RAG + semantic
 * matching (architecture §13). Embedding-model call is abstracted
 * behind `embed()` so swapping providers/models doesn't touch chunking
 * logic; a MOCK_EMBEDDINGS env flag lets this run deterministically in
 * dev/test without an API key (hash-based pseudo-embedding, clearly
 * NOT semantically meaningful — only for exercising the pipeline).
 */
@Injectable()
@Processor('embeddings', { concurrency: 4 })
export class EmbeddingProcessor extends WorkerHost {
  private readonly logger = new Logger('EmbeddingProcessor');

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private async embed(text: string): Promise<number[]> {
    if (process.env.MOCK_EMBEDDINGS === 'true' || !process.env.OPENAI_API_KEY) {
      // Deterministic pseudo-embedding for tests/local dev only.
      const dim = 1536;
      const vec = new Array(dim).fill(0);
      for (let i = 0; i < text.length; i++) {
        vec[i % dim] += text.charCodeAt(i) / 1000;
      }
      return vec;
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
    });
    if (!response.ok) throw new Error(`Embedding request failed: ${response.status}`);
    const data = (await response.json()) as any;
    return data.data[0].embedding;
  }

  async process(job: Job<{ resumeId?: string; jobId?: string }>): Promise<void> {
    const { resumeId, jobId } = job.data;

    const text = resumeId
      ? (await this.prisma.resume.findUnique({ where: { id: resumeId } }))?.parsedText
      : (await this.prisma.job.findUnique({ where: { id: jobId } }))?.description;

    if (!text) {
      this.logger.warn(`No text found for embedding job ${job.id} — skipping.`);
      return;
    }

    if (resumeId) {
      await this.prisma.documentChunk.deleteMany({ where: { resumeId } });
    } else if (jobId) {
      await this.prisma.documentChunk.deleteMany({ where: { jobId } });
    }

    const chunks = chunkText(text);
    for (const [i, content] of chunks.entries()) {
      const embedding = await this.embed(content);
      const vectorLiteral = `[${embedding.join(',')}]`;
      await this.prisma.$executeRaw`
        INSERT INTO "DocumentChunk" (id, "ownerType", "resumeId", "jobId", content, embedding, metadata, "createdAt")
        VALUES (gen_random_uuid(), ${resumeId ? 'RESUME' : 'JOB'}, ${resumeId ?? null}, ${jobId ?? null},
                ${content}, ${vectorLiteral}::vector, ${{ chunkIndex: i }}::jsonb, now())
      `;
    }
  }
}
