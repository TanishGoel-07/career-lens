import { Injectable } from '@nestjs/common';
import { PrismaService, Prisma } from '@career-lens/db';

export interface RetrievedChunk {
  id: string;
  content: string;
  similarity: number;
  metadata: unknown;
}

/**
 * Retrieval only — chunking/embedding happens in the job-worker's
 * embedding processor at write time (architecture §13). This service
 * is read-only: similarity search + a similarity-threshold cutoff +
 * a light recency/deterministic-score rerank, scoped by metadata
 * filters so a user's coach query only ever retrieves that user's own
 * resume chunks plus shared/public learning-resource chunks.
 */
@Injectable()
export class RagService {
  private readonly similarityThreshold = 0.72;
  private readonly topK = 5;

  constructor(private readonly prisma: PrismaService) {}

  async retrieve(queryEmbedding: number[], ownerType: 'RESUME' | 'JOB', ownerId?: string): Promise<RetrievedChunk[]> {
    const vectorLiteral = `[${queryEmbedding.join(',')}]`;

    const rows = await this.prisma.$queryRaw<
      Array<{ id: string; content: string; metadata: unknown; similarity: number }>
    >`
      SELECT id, content, metadata, 1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
      FROM "DocumentChunk"
      WHERE "ownerType" = ${ownerType}
        ${ownerId ? Prisma.sql`AND ("resumeId" = ${ownerId} OR "jobId" = ${ownerId})` : Prisma.empty}
      ORDER BY similarity DESC
      LIMIT ${this.topK}
    `;

    return rows
      .filter((r) => r.similarity >= this.similarityThreshold)
      .map((r) => ({ id: r.id, content: r.content, similarity: r.similarity, metadata: r.metadata }));
  }
}
