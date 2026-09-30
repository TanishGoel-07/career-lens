import { Injectable, Logger } from '@nestjs/common';
import { PrismaService, Prisma } from '@career-lens/db';

export interface RetrievedChunk {
  id: string;
  content: string;
  similarity: number;
  metadata: unknown;
  ownerType: string;
}

export interface RagResponse {
  answer: string;
  citations: Array<{ id: string; snippet: string; score: number }>;
}

@Injectable()
export class RagService {
  private readonly logger = new Logger('RagService');
  private readonly similarityThreshold = 0.50;
  private readonly topK = 4;

  constructor(private readonly prisma: PrismaService) {}

  async embed(text: string): Promise<number[]> {
    const dim = 1536;
    if (process.env.MOCK_EMBEDDINGS === 'true' || !process.env.OPENAI_API_KEY) {
      // Deterministic fallback vector
      const vec = new Array(dim).fill(0);
      for (let i = 0; i < text.length; i++) {
        vec[i % dim] += (text.charCodeAt(i) % 100) / 100;
      }
      return vec;
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
      });
      if (!response.ok) throw new Error(`OpenAI embedding failed: ${response.status}`);
      const data = (await response.json()) as any;
      return data.data[0].embedding;
    } catch (err: any) {
      this.logger.warn(`Embedding API call failed: ${err.message}. Using deterministic fallback.`);
      const vec = new Array(dim).fill(0);
      for (let i = 0; i < text.length; i++) {
        vec[i % dim] += (text.charCodeAt(i) % 100) / 100;
      }
      return vec;
    }
  }

  async retrieve(
    queryEmbedding: number[],
    ownerType?: 'RESUME' | 'JOB',
    ownerId?: string,
  ): Promise<RetrievedChunk[]> {
    const vectorLiteral = `[${queryEmbedding.join(',')}]`;

    try {
      const rows = await this.prisma.$queryRaw<
        Array<{ id: string; content: string; metadata: unknown; similarity: number; ownerType: string }>
      >`
        SELECT id, content, metadata, "ownerType", 1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
        FROM "DocumentChunk"
        WHERE 1 = 1
          ${ownerType ? Prisma.sql`AND "ownerType" = ${ownerType}` : Prisma.empty}
          ${ownerId ? Prisma.sql`AND ("resumeId" = ${ownerId} OR "jobId" = ${ownerId})` : Prisma.empty}
        ORDER BY similarity DESC
        LIMIT ${this.topK}
      `;

      return rows.map((r) => ({
        id: r.id,
        content: r.content,
        similarity: Math.round(r.similarity * 100) / 100,
        metadata: r.metadata,
        ownerType: r.ownerType,
      }));
    } catch {
      return [];
    }
  }

  async queryKnowledge(query: string, ownerType?: 'RESUME' | 'JOB', ownerId?: string): Promise<RagResponse> {
    const embedding = await this.embed(query);
    const chunks = await this.retrieve(embedding, ownerType, ownerId);

    if (chunks.length === 0) {
      return {
        answer: 'No directly relevant resume or job sections matched your query with sufficient confidence.',
        citations: [],
      };
    }

    const citations = chunks.map((c) => ({
      id: c.id,
      snippet: c.content.slice(0, 150) + '...',
      score: c.similarity,
    }));

    const answer =
      `Based on retrieved documentation [Citations: ${citations.map((_, i) => `[${i + 1}]`).join(', ')}]: ` +
      chunks.map((c) => c.content).join('\n\n').slice(0, 500);

    return { answer, citations };
  }
}
