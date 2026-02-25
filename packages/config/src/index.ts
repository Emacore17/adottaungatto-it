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
});

const adminSchema = baseSchema.extend({
  NEXT_PUBLIC_APP_NAME: z.string().min(1, 'NEXT_PUBLIC_APP_NAME is required'),
  NEXT_PUBLIC_ADMIN_URL: z.string().url('NEXT_PUBLIC_ADMIN_URL must be a valid URL'),
  NEXT_PUBLIC_API_URL: z.string().url('NEXT_PUBLIC_API_URL must be a valid URL'),
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
  KEYCLOAK_URL: z.string().url('KEYCLOAK_URL must be a valid URL'),
  KEYCLOAK_REALM: z.string().min(1, 'KEYCLOAK_REALM is required'),
});

const workerSchema = baseSchema.extend({
  WORKER_NAME: z.string().min(1, 'WORKER_NAME is required'),
  REDIS_URL: z.string().url('REDIS_URL must be a valid URL'),
  OPENSEARCH_URL: z.string().url('OPENSEARCH_URL must be a valid URL'),
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
