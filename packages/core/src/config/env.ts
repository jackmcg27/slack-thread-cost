import { z } from 'zod';

const envSchema = z.object({
  SLACK_BOT_TOKEN: z.string().min(1).optional(),
  SLACK_APP_TOKEN: z.string().min(1).optional(),
  SLACK_SIGNING_SECRET: z.string().optional(),

  DATABASE_URL: z.string().min(1),

  CLASSIFICATION_PROVIDER: z.enum(['manual', 'denodo']).default('manual'),
  CLASSIFICATION_MAPPING_FILE: z.string().optional(),
  DEFAULT_CLASSIFICATION_CODE: z.string().optional(),

  DENODO_BASE_URL: z.string().optional(),
  DENODO_AUTH_TYPE: z.enum(['basic', 'token']).default('basic'),
  DENODO_USERNAME: z.string().optional(),
  DENODO_PASSWORD: z.string().optional(),
  DENODO_TOKEN: z.string().optional(),
  DENODO_VIEW_NAME: z.string().optional(),
  DENODO_LOOKUP_COLUMN: z.enum(['email', 'slack_user_id']).default('email'),
  DENODO_CLASSIFICATION_COLUMN: z.string().optional(),
  DENODO_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),

  TRACKED_CHANNELS: z.string().optional(),

  DASHBOARD_PORT: z.coerce.number().int().positive().default(3000),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/**
 * Validates process.env once and caches the result. Fails fast with a
 * readable error listing every missing/invalid var, rather than letting
 * a bad config surface as a confusing runtime failure later.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cached) return cached;

  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  cached = parsed.data;
  return cached;
}
