import { z } from 'zod';

/**
 * Fail fast on missing/malformed env vars at boot rather than at the
 * first request that happens to touch the missing value (architecture
 * doc §5 "configuration" requirement).
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().default(30),

  AI_PROVIDER: z.enum(['openai', 'gemini', 'mock']).default('mock'),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  AI_DAILY_TOKEN_BUDGET_PER_USER: z.coerce.number().default(100000),

  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_PATH: z.string().default('./storage'),
  MAX_RESUME_UPLOAD_MB: z.coerce.number().default(8),

  SANDBOX_TIMEOUT_MS: z.coerce.number().default(8000),
  SANDBOX_MEMORY_MB: z.coerce.number().default(256),

  FRONTEND_ORIGIN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment configuration — see log above.');
  }
  return parsed.data;
}
