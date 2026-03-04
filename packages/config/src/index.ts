import { z } from 'zod';

type EnvSource = Record<string, string | undefined>;

const nodeEnvSchema = z.enum(['development', 'test', 'production']).default('development');

const baseSchema = z.object({
  NODE_ENV: nodeEnvSchema,
});

const parseOriginList = (value: string, fieldName: string, ctx: z.RefinementCtx): string[] => {
  const origins = value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (origins.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${fieldName} must contain at least one valid origin.`,
    });
    return z.NEVER;
  }

  const normalizedOrigins: string[] = [];
  for (const origin of origins) {
    try {
      normalizedOrigins.push(new URL(origin).origin);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${fieldName} contains an invalid origin: ${origin}`,
      });
      return z.NEVER;
    }
  }

  return Array.from(new Set(normalizedOrigins));
};

const webSchema = baseSchema.extend({
  NEXT_PUBLIC_APP_NAME: z.string().min(1, 'NEXT_PUBLIC_APP_NAME is required'),
  NEXT_PUBLIC_WEB_URL: z.string().url('NEXT_PUBLIC_WEB_URL must be a valid URL'),
  NEXT_PUBLIC_API_URL: z.string().url('NEXT_PUBLIC_API_URL must be a valid URL'),
  NEXT_PUBLIC_HOME_FEATURED_LIMIT: z.coerce.number().int().min(1).max(24).optional().default(9),
  NEXT_PUBLIC_USE_MOCKS: z
    .enum(['0', '1'])
    .optional()
    .default('1')
    .transform((value) => value === '1'),
  KEYCLOAK_URL: z.string().url('KEYCLOAK_URL must be a valid URL'),
  KEYCLOAK_REALM: z.string().min(1, 'KEYCLOAK_REALM is required'),
  KEYCLOAK_CLIENT_ID_WEB: z
    .string()
    .min(1, 'KEYCLOAK_CLIENT_ID_WEB is required')
    .optional()
    .default('adottaungatto-web'),
  WEB_SESSION_COOKIE_NAME: z
    .string()
    .min(1, 'WEB_SESSION_COOKIE_NAME is required')
    .optional()
    .default('adottaungatto_web_token'),
});

const adminSchema = baseSchema.extend({
  NEXT_PUBLIC_APP_NAME: z.string().min(1, 'NEXT_PUBLIC_APP_NAME is required'),
  NEXT_PUBLIC_ADMIN_URL: z.string().url('NEXT_PUBLIC_ADMIN_URL must be a valid URL'),
  NEXT_PUBLIC_API_URL: z.string().url('NEXT_PUBLIC_API_URL must be a valid URL'),
  NEXT_PUBLIC_USE_MOCKS: z
    .enum(['0', '1'])
    .optional()
    .default('1')
    .transform((value) => value === '1'),
  KEYCLOAK_URL: z.string().url('KEYCLOAK_URL must be a valid URL'),
  KEYCLOAK_REALM: z.string().min(1, 'KEYCLOAK_REALM is required'),
  KEYCLOAK_CLIENT_ID_ADMIN: z
    .string()
    .min(1, 'KEYCLOAK_CLIENT_ID_ADMIN is required')
    .optional()
    .default('adottaungatto-admin'),
  ADMIN_SESSION_COOKIE_NAME: z
    .string()
    .min(1, 'ADMIN_SESSION_COOKIE_NAME is required')
    .optional()
    .default('adottaungatto_admin_token'),
});

const apiSchema = baseSchema.extend({
  API_HOST: z.string().min(1, 'API_HOST is required'),
  API_PORT: z.coerce.number().int().min(1).max(65535),
  API_CORS_ALLOWED_ORIGINS: z
    .string()
    .optional()
    .default('http://localhost:3000,http://localhost:3001')
    .transform((value, ctx) => parseOriginList(value, 'API_CORS_ALLOWED_ORIGINS', ctx)),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  REDIS_URL: z.string().url('REDIS_URL must be a valid URL'),
  OPENSEARCH_URL: z.string().url('OPENSEARCH_URL must be a valid URL'),
  MINIO_ENDPOINT: z.string().url('MINIO_ENDPOINT must be a valid URL'),
  MINIO_ACCESS_KEY: z.string().min(1, 'MINIO_ACCESS_KEY is required'),
  MINIO_SECRET_KEY: z.string().min(1, 'MINIO_SECRET_KEY is required'),
  MINIO_BUCKET_LISTING_ORIGINALS: z
    .string()
    .min(1, 'MINIO_BUCKET_LISTING_ORIGINALS is required')
    .optional()
    .default('listing-originals'),
  MINIO_BUCKET_LISTING_THUMBS: z
    .string()
    .min(1, 'MINIO_BUCKET_LISTING_THUMBS is required')
    .optional()
    .default('listing-thumbs'),
  MEDIA_UPLOAD_MAX_BYTES: z.coerce
    .number()
    .int()
    .min(1024)
    .optional()
    .default(10 * 1024 * 1024),
  MEDIA_ALLOWED_MIME_TYPES: z
    .string()
    .optional()
    .default('image/jpeg,image/png,image/webp')
    .transform((value) =>
      value
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter((item) => item.length > 0),
    ),
  KEYCLOAK_URL: z.string().url('KEYCLOAK_URL must be a valid URL'),
  KEYCLOAK_REALM: z.string().min(1, 'KEYCLOAK_REALM is required'),
  KEYCLOAK_CLIENT_ID_WEB: z
    .string()
    .min(1, 'KEYCLOAK_CLIENT_ID_WEB is required')
    .optional()
    .default('adottaungatto-web'),
  KEYCLOAK_CLIENT_ID_ADMIN: z
    .string()
    .min(1, 'KEYCLOAK_CLIENT_ID_ADMIN is required')
    .optional()
    .default('adottaungatto-admin'),
  KEYCLOAK_CLIENT_ID_MOBILE: z
    .string()
    .min(1, 'KEYCLOAK_CLIENT_ID_MOBILE is required')
    .optional()
    .default('adottaungatto-mobile'),
  API_TRUST_PROXY_ENABLED: z
    .enum(['true', 'false'])
    .optional()
    .default('false')
    .transform((value) => value === 'true'),
  AUTH_DEV_HEADERS_ENABLED: z
    .enum(['true', 'false'])
    .optional()
    .default('true')
    .transform((value) => value === 'true'),
  RATE_LIMIT_KEY_PREFIX: z
    .string()
    .min(1, 'RATE_LIMIT_KEY_PREFIX is required')
    .optional()
    .default('rate_limit'),
  RATE_LIMIT_PUBLIC_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .min(1)
    .max(86_400)
    .optional()
    .default(60),
  RATE_LIMIT_PUBLIC_MAX_REQUESTS: z.coerce
    .number()
    .int()
    .min(1)
    .max(10_000)
    .optional()
    .default(120),
  RATE_LIMIT_SEARCH_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .min(1)
    .max(86_400)
    .optional()
    .default(60),
  RATE_LIMIT_SEARCH_MAX_REQUESTS: z.coerce
    .number()
    .int()
    .min(1)
    .max(10_000)
    .optional()
    .default(80),
  RATE_LIMIT_ANALYTICS_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .min(1)
    .max(86_400)
    .optional()
    .default(60),
  RATE_LIMIT_ANALYTICS_MAX_REQUESTS: z.coerce
    .number()
    .int()
    .min(1)
    .max(10_000)
    .optional()
    .default(120),
  RATE_LIMIT_CONTACT_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .min(1)
    .max(86_400)
    .optional()
    .default(60),
  RATE_LIMIT_CONTACT_MAX_REQUESTS: z.coerce
    .number()
    .int()
    .min(1)
    .max(10_000)
    .optional()
    .default(30),
  SEARCH_FALLBACK_MAX_STEPS: z.coerce.number().int().min(1).max(5).optional().default(5),
  MESSAGE_THREAD_CREATE_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .min(10)
    .max(86_400)
    .optional()
    .default(600),
  MESSAGE_THREAD_CREATE_MAX_REQUESTS: z.coerce
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .default(20),
  MESSAGE_MESSAGE_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .min(10)
    .max(86_400)
    .optional()
    .default(300),
  MESSAGE_MESSAGE_MAX_REQUESTS: z.coerce.number().int().min(1).max(500).optional().default(30),
  MESSAGE_DUPLICATE_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .min(10)
    .max(86_400)
    .optional()
    .default(120),
  MESSAGE_THREAD_MAX_MESSAGES: z.coerce
    .number()
    .int()
    .min(50)
    .max(50_000)
    .optional()
    .default(2_000),
  MESSAGE_THREAD_SLOWMODE_SECONDS: z.coerce
    .number()
    .int()
    .min(0)
    .max(300)
    .optional()
    .default(3),
  MESSAGE_MESSAGE_MAX_URLS: z.coerce.number().int().min(0).max(20).optional().default(4),
  MESSAGE_TYPING_EVENT_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .min(5)
    .max(300)
    .optional()
    .default(15),
  MESSAGE_TYPING_EVENT_MAX_REQUESTS: z.coerce
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .default(20),
  MESSAGE_TYPING_EVENT_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(3)
    .max(60)
    .optional()
    .default(6),
  MESSAGE_EMAIL_NOTIFICATIONS_ENABLED: z
    .enum(['true', 'false'])
    .optional()
    .default('true')
    .transform((value) => value === 'true'),
  MESSAGE_EMAIL_NOTIFICATION_MAX_ATTEMPTS: z.coerce
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .default(8),
});

const workerSchema = baseSchema.extend({
  WORKER_NAME: z.string().min(1, 'WORKER_NAME is required'),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  REDIS_URL: z.string().url('REDIS_URL must be a valid URL'),
  OPENSEARCH_URL: z.string().url('OPENSEARCH_URL must be a valid URL'),
  MINIO_ENDPOINT: z
    .string()
    .url('MINIO_ENDPOINT must be a valid URL')
    .optional()
    .default('http://localhost:9000'),
  MINIO_ACCESS_KEY: z.string().min(1, 'MINIO_ACCESS_KEY is required').optional().default('minio'),
  MINIO_SECRET_KEY: z
    .string()
    .min(1, 'MINIO_SECRET_KEY is required')
    .optional()
    .default('minio123'),
  MINIO_BUCKET_LISTING_ORIGINALS: z
    .string()
    .min(1, 'MINIO_BUCKET_LISTING_ORIGINALS is required')
    .optional()
    .default('listing-originals'),
  MINIO_BUCKET_LISTING_THUMBS: z
    .string()
    .min(1, 'MINIO_BUCKET_LISTING_THUMBS is required')
    .optional()
    .default('listing-thumbs'),
  MESSAGE_EMAIL_NOTIFICATIONS_ENABLED: z
    .enum(['true', 'false'])
    .optional()
    .default('true')
    .transform((value) => value === 'true'),
  MESSAGE_EMAIL_NOTIFICATION_MAX_ATTEMPTS: z.coerce
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .default(8),
  MESSAGE_NOTIFICATION_WORKER_POLL_MS: z.coerce
    .number()
    .int()
    .min(250)
    .max(60_000)
    .optional()
    .default(5_000),
  MESSAGE_NOTIFICATION_WORKER_BATCH_SIZE: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(10),
  MESSAGE_NOTIFICATION_WORKER_PROCESSING_TIMEOUT_SECONDS: z.coerce
    .number()
    .int()
    .min(30)
    .max(3_600)
    .optional()
    .default(300),
  SEARCH_INDEX_STALE_CLEANUP_ENABLED: z
    .enum(['true', 'false'])
    .optional()
    .default('true')
    .transform((value) => value === 'true'),
  SEARCH_INDEX_STALE_CLEANUP_POLL_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(86_400_000)
    .optional()
    .default(900_000),
  SEARCH_INDEX_STALE_RETAIN_INACTIVE_COUNT: z.coerce
    .number()
    .int()
    .min(0)
    .max(20)
    .optional()
    .default(1),
  RETENTION_CLEANUP_ENABLED: z
    .enum(['true', 'false'])
    .optional()
    .default('true')
    .transform((value) => value === 'true'),
  RETENTION_CLEANUP_POLL_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(86_400_000)
    .optional()
    .default(300_000),
  RETENTION_CLEANUP_DELETE_BATCH_SIZE: z.coerce
    .number()
    .int()
    .min(1)
    .max(10_000)
    .optional()
    .default(500),
  RETENTION_ANALYTICS_EVENTS_DAYS: z.coerce
    .number()
    .int()
    .min(0)
    .max(3_650)
    .optional()
    .default(90),
  RETENTION_ADMIN_AUDIT_LOGS_DAYS: z.coerce
    .number()
    .int()
    .min(0)
    .max(3_650)
    .optional()
    .default(365),
  RETENTION_NOTIFICATION_OUTBOX_SENT_DAYS: z.coerce
    .number()
    .int()
    .min(0)
    .max(3_650)
    .optional()
    .default(14),
  RETENTION_NOTIFICATION_OUTBOX_FAILED_DAYS: z.coerce
    .number()
    .int()
    .min(0)
    .max(3_650)
    .optional()
    .default(30),
  RETENTION_MESSAGE_THREADS_DELETED_DAYS: z.coerce
    .number()
    .int()
    .min(0)
    .max(3_650)
    .optional()
    .default(30),
  WEB_APP_URL: z
    .string()
    .url('WEB_APP_URL must be a valid URL')
    .optional()
    .default('http://localhost:3000'),
  SMTP_HOST: z.string().min(1, 'SMTP_HOST is required').optional().default('localhost'),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).optional().default(1025),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .optional()
    .default('false')
    .transform((value) => value === 'true'),
  SMTP_USERNAME: z.string().optional().default(''),
  SMTP_PASSWORD: z.string().optional().default(''),
  SMTP_FROM_EMAIL: z
    .string()
    .email('SMTP_FROM_EMAIL must be a valid email address')
    .optional()
    .default('notifiche@adottaungatto.local'),
  SMTP_FROM_NAME: z
    .string()
    .min(1, 'SMTP_FROM_NAME is required')
    .optional()
    .default('Adotta un Gatto'),
});

const formatZodError = (scope: string, issues: z.ZodIssue[]) => {
  const lines = issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : 'env';
    return `- ${path}: ${issue.message}`;
  });
  return `[${scope}] invalid environment variables:\n${lines.join('\n')}`;
};

const parseOrThrow = <TSchema extends z.ZodTypeAny>(
  scope: string,
  schema: TSchema,
  source: EnvSource,
): z.infer<TSchema> => {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new Error(formatZodError(scope, result.error.issues));
  }
  return result.data;
};

export type WebEnv = z.infer<typeof webSchema>;
export type AdminEnv = z.infer<typeof adminSchema>;
export type ApiEnv = z.infer<typeof apiSchema>;
export type WorkerEnv = z.infer<typeof workerSchema>;

export const loadWebEnv = (source: EnvSource = process.env): WebEnv =>
  parseOrThrow('web', webSchema, source);

export const loadAdminEnv = (source: EnvSource = process.env): AdminEnv =>
  parseOrThrow('admin', adminSchema, source);

export const loadApiEnv = (source: EnvSource = process.env): ApiEnv =>
  parseOrThrow('api', apiSchema, source);

export const loadWorkerEnv = (source: EnvSource = process.env): WorkerEnv =>
  parseOrThrow('worker', workerSchema, source);
