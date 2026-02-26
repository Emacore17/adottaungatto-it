import { z } from 'zod';

type EnvSource = Record<string, string | undefined>;

const nodeEnvSchema = z.enum(['development', 'test', 'production']).default('development');

const baseSchema = z.object({
  NODE_ENV: nodeEnvSchema,
});

const webSchema = baseSchema.extend({
  NEXT_PUBLIC_APP_NAME: z.string().min(1, 'NEXT_PUBLIC_APP_NAME is required'),
  NEXT_PUBLIC_WEB_URL: z.string().url('NEXT_PUBLIC_WEB_URL must be a valid URL'),
  NEXT_PUBLIC_API_URL: z.string().url('NEXT_PUBLIC_API_URL must be a valid URL'),
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
  AUTH_DEV_HEADERS_ENABLED: z
    .enum(['true', 'false'])
    .optional()
    .default('true')
    .transform((value) => value === 'true'),
  SEARCH_FALLBACK_MAX_STEPS: z.coerce.number().int().min(1).max(5).optional().default(5),
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
