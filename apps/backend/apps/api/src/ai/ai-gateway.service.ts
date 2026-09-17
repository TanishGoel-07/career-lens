import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@career-lens/db';
import Redis from 'ioredis';
import { createHash } from 'crypto';
import { z } from 'zod';
import { AiProvider } from './providers/ai-provider.interface';
import { PROMPTS, PromptKey } from './prompt-registry';
import { REDIS_CLIENT } from '../redis/redis.constants';

export class AiBudgetExceededError extends Error {}
export class AiOutputValidationError extends Error {}

export interface AiCallOptions {
  userId?: string;
  feature: string;
  promptKey: PromptKey;
  variables: Record<string, unknown>;
  cacheable?: boolean;
  cacheTtlSeconds?: number;
}

/**
 * Single entry point for every AI-backed feature (architecture §12).
 * Nothing else in the codebase calls a provider SDK directly.
 *
 * Responsibilities:
 *   1. Enforce a per-user daily token budget BEFORE dispatching (cost
 *      control, not just after-the-fact monitoring).
 *   2. Check the Redis cache for cacheable calls.
 *   3. Build the prompt from the versioned registry.
 *   4. Call the configured provider with retry + timeout + fallback.
 *   5. Validate the response against the feature's zod schema — a
 *      response that doesn't parse is retried once, then thrown as a
 *      structured AiOutputValidationError. Nothing unvalidated is ever
 *      returned to a caller or persisted.
 *   6. Persist AiInteractionLog (tokens, cost, latency, cache hit).
 */
@Injectable()
export class AiGatewayService {
  private readonly logger = new Logger('AiGateway');

  constructor(
    @Inject('AI_PROVIDERS') private readonly providers: AiProvider[],
    @Inject('AI_FALLBACK_ORDER') private readonly fallbackOrder: string[],
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  private cacheKey(promptKey: string, variables: Record<string, unknown>): string {
    const hash = createHash('sha256').update(JSON.stringify(variables)).digest('hex');
    return `ai-cache:${promptKey}:${hash}`;
  }

  private async checkBudget(userId: string, estimatedTokens: number): Promise<void> {
    const budget = this.config.get<number>('AI_DAILY_TOKEN_BUDGET_PER_USER', 100000);
    const dayKey = `ai-budget:${userId}:${new Date().toISOString().slice(0, 10)}`;
    const used = Number((await this.redis.get(dayKey)) ?? 0);
    if (used + estimatedTokens > budget) {
      throw new AiBudgetExceededError('Daily AI usage budget exceeded for this user.');
    }
  }

  private async recordUsage(userId: string, tokens: number): Promise<void> {
    const dayKey = `ai-budget:${userId}:${new Date().toISOString().slice(0, 10)}`;
    await this.redis.incrby(dayKey, tokens);
    await this.redis.expire(dayKey, 60 * 60 * 26);
  }

  private buildUserPrompt(variables: Record<string, unknown>): string {
    return JSON.stringify(variables);
  }

  async call<T>(options: AiCallOptions): Promise<T> {
    const prompt = PROMPTS[options.promptKey];
    const schema = prompt.schema as z.ZodType<T>;
    const cacheKey = this.cacheKey(options.promptKey, options.variables);

    if (options.cacheable) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const parsedCache = schema.safeParse(JSON.parse(cached));
        if (parsedCache.success) return parsedCache.data;
      }
    }

    const estimatedTokens = Math.ceil(JSON.stringify(options.variables).length / 3) + 300;
    if (options.userId) {
      await this.checkBudget(options.userId, estimatedTokens);
    }

    const userPrompt = this.buildUserPrompt(options.variables);
    const providerOrder = this.fallbackOrder
      .map((name) => this.providers.find((p) => p.name === name))
      .filter((p): p is AiProvider => Boolean(p));

    let lastError: unknown;
    for (const provider of providerOrder) {
      const start = Date.now();
      try {
        const result = await this.withTimeout(
          provider.complete({ systemPrompt: prompt.systemPrompt, userPrompt }),
          20_000,
        );
        const latencyMs = Date.now() - start;

        let parsed: z.SafeParseReturnType<unknown, T>;
        try {
          parsed = schema.safeParse(JSON.parse(result.text));
        } catch {
          parsed = { success: false } as z.SafeParseReturnType<unknown, T>;
        }

        if (!parsed.success) {
          this.logger.warn(
            `Provider ${provider.name} returned output failing schema for ${options.promptKey}; retrying once.`,
          );
          const retry = await provider.complete({ systemPrompt: prompt.systemPrompt, userPrompt });
          const retryParsed = schema.safeParse(JSON.parse(retry.text));
          if (!retryParsed.success) {
            throw new AiOutputValidationError(
              `Provider ${provider.name} output failed schema validation twice for ${options.promptKey}.`,
            );
          }
          parsed = retryParsed;
        }

        await this.persistLog(options, provider, result, latencyMs, false);
        if (options.userId) await this.recordUsage(options.userId, result.inputTokens + result.outputTokens);
        if (options.cacheable) {
          await this.redis.set(cacheKey, JSON.stringify(parsed.data), 'EX', options.cacheTtlSeconds ?? 3600);
        }
        return parsed.data;
      } catch (err) {
        lastError = err;
        this.logger.warn(`Provider ${provider.name} failed for ${options.promptKey}: ${(err as Error).message}`);
        continue; // fall through to next provider
      }
    }

    throw lastError instanceof Error ? lastError : new Error('All AI providers failed.');
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('AI_TIMEOUT')), ms)),
    ]);
  }

  private async persistLog(
    options: AiCallOptions,
    provider: AiProvider,
    result: { inputTokens: number; outputTokens: number; model: string },
    latencyMs: number,
    cacheHit: boolean,
  ) {
    // Rough placeholder cost model per 1K tokens; real per-model pricing
    // should be injected via config once finance signs off on numbers —
    // deliberately not hardcoded as a "real" cost claim here.
    const costPer1kInput = 0.00015;
    const costPer1kOutput = 0.0006;
    const costUsd =
      (result.inputTokens / 1000) * costPer1kInput + (result.outputTokens / 1000) * costPer1kOutput;

    await this.prisma.aiInteractionLog.create({
      data: {
        userId: options.userId,
        feature: options.feature,
        promptVersion: options.promptKey,
        provider: provider.name,
        model: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costUsd,
        latencyMs,
        cacheHit,
      },
    });
  }
}
