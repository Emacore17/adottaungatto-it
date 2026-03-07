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

const parseProviderAliasList = (
  value: string,
  fieldName: string,
  ctx: z.RefinementCtx,
): string[] => {
  const aliases = value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);

  if (aliases.length === 0) {
    return [];
  }

  const normalizedAliases: string[] = [];
  for (const alias of aliases) {
    if (!/^[a-z0-9][a-z0-9_-]{0,62}$/.test(alias)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${fieldName} contains an invalid provider alias: ${alias}`,
      });
      return z.NEVER;
    }

    normalizedAliases.push(alias);
  }

  return Array.from(new Set(normalizedAliases));
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
  KEYCLOAK_SOCIAL_PROVIDERS: z
    .string()
    .optional()
    .default('')
    .transform((value, ctx) =>
      parseProviderAliasList(value, 'KEYCLOAK_SOCIAL_PROVIDERS', ctx),
    ),
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
  API_BODY_LIMIT_BYTES: z.coerce
    .number()
    .int()
    .min(1_048_576)
    .max(104_857_600)
    .optional()
    .default(16_777_216),
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
  MINIO_BUCKET_USER_AVATARS: z
    .string()
    .min(1, 'MINIO_BUCKET_USER_AVATARS is required')
    .optional()
    .default('user-avatars'),
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
  AVATAR_UPLOAD_MAX_BYTES: z.coerce
    .number()
    .int()
    .min(1024)
    .optional()
    .default(2 * 1024 * 1024),
  AVATAR_ALLOWED_MIME_TYPES: z
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
  KEYCLOAK_SOCIAL_PROVIDERS: z
    .string()
    .optional()
    .default('')
    .transform((value, ctx) =>
      parseProviderAliasList(value, 'KEYCLOAK_SOCIAL_PROVIDERS', ctx),
    ),
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
  KEYCLOAK_GOOGLE_IDP_ENABLED: z
    .enum(['true', 'false'])
    .optional()
    .default('false')
    .transform((value) => value === 'true'),
  KEYCLOAK_GOOGLE_CLIENT_ID: z.string().optional().default(''),
  KEYCLOAK_GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  KEYCLOAK_GOOGLE_HOSTED_DOMAIN: z.string().optional().default(''),
  KEYCLOAK_GOOGLE_DEFAULT_SCOPES: z
    .string()
    .optional()
    .default('openid profile email'),
  KEYCLOAK_ADMIN_REALM: z
    .string()
    .min(1, 'KEYCLOAK_ADMIN_REALM is required')
    .optional()
    .default('master'),
  KEYCLOAK_ADMIN_CLIENT_ID: z
    .string()
    .min(1, 'KEYCLOAK_ADMIN_CLIENT_ID is required')
    .optional()
    .default('admin-cli'),
  KEYCLOAK_ADMIN: z.string().min(1, 'KEYCLOAK_ADMIN is required').optional().default('admin'),
  KEYCLOAK_ADMIN_PASSWORD: z
    .string()
    .min(1, 'KEYCLOAK_ADMIN_PASSWORD is required')
    .optional()
    .default('admin'),
  WEB_APP_URL: z
    .string()
    .url('WEB_APP_URL must be a valid URL')
    .optional()
    .default('http://localhost:3000'),
  API_TRUST_PROXY_ENABLED: z
    .enum(['true', 'false'])
    .optional()
    .default('false')
    .transform((value) => value === 'true'),
  AUTH_DEV_HEADERS_ENABLED: z
    .enum(['true', 'false'])
    .optional()
    .default('false')
    .transform((value) => value === 'true'),
  PHONE_VERIFICATION_CODE_LENGTH: z.coerce
    .number()
    .int()
    .min(4)
    .max(8)
    .optional()
    .default(6),
  PHONE_VERIFICATION_CODE_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(3_600)
    .optional()
    .default(600),
  PHONE_VERIFICATION_MAX_ATTEMPTS: z.coerce
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .default(5),
  PHONE_VERIFICATION_CODE_PEPPER: z
    .string()
    .min(8, 'PHONE_VERIFICATION_CODE_PEPPER must be at least 8 characters')
    .optional()
    .default('dev-phone-verification-pepper'),
  PHONE_VERIFICATION_DELIVERY_PROVIDER: z
    .enum(['console', 'webhook', 'twilio'])
    .optional()
    .default('console'),
  PHONE_VERIFICATION_DELIVERY_WEBHOOK_URL: z
    .string()
    .url('PHONE_VERIFICATION_DELIVERY_WEBHOOK_URL must be a valid URL')
    .optional()
    .or(z.literal(''))
    .default(''),
  PHONE_VERIFICATION_DELIVERY_WEBHOOK_AUTH_TOKEN: z
    .string()
    .optional()
    .default(''),
  PHONE_VERIFICATION_TWILIO_ACCOUNT_SID: z.string().optional().default(''),
  PHONE_VERIFICATION_TWILIO_AUTH_TOKEN: z.string().optional().default(''),
  PHONE_VERIFICATION_TWILIO_FROM_NUMBER: z.string().optional().default(''),
  PHONE_VERIFICATION_TWILIO_MESSAGING_SERVICE_SID: z.string().optional().default(''),
  PHONE_VERIFICATION_SMS_TEMPLATE: z
    .string()
    .min(1, 'PHONE_VERIFICATION_SMS_TEMPLATE is required')
    .optional()
    .default(
      'Il tuo codice di verifica AdottaUnGatto e {{code}}. Scade tra {{ttl_minutes}} minuti.',
    ),
  PHONE_VERIFICATION_DELIVERY_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(100)
    .max(30_000)
    .optional()
    .default(5_000),
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
  RATE_LIMIT_GEOGRAPHY_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .min(1)
    .max(86_400)
    .optional()
    .default(60),
  RATE_LIMIT_GEOGRAPHY_MAX_REQUESTS: z.coerce
    .number()
    .int()
    .min(1)
    .max(10_000)
    .optional()
    .default(100),
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
  RATE_LIMIT_AUTH_PASSWORD_RECOVERY_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .min(1)
    .max(86_400)
    .optional()
    .default(300),
  RATE_LIMIT_AUTH_PASSWORD_RECOVERY_MAX_REQUESTS: z.coerce
    .number()
    .int()
    .min(1)
    .max(10_000)
    .optional()
    .default(8),
  RATE_LIMIT_AUTH_EMAIL_VERIFICATION_RESEND_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .min(1)
    .max(86_400)
    .optional()
    .default(300),
  RATE_LIMIT_AUTH_EMAIL_VERIFICATION_RESEND_MAX_REQUESTS: z.coerce
    .number()
    .int()
    .min(1)
    .max(10_000)
    .optional()
    .default(12),
  RATE_LIMIT_AUTH_PHONE_VERIFICATION_REQUEST_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .min(1)
    .max(86_400)
    .optional()
    .default(300),
  RATE_LIMIT_AUTH_PHONE_VERIFICATION_REQUEST_MAX_REQUESTS: z.coerce
    .number()
    .int()
    .min(1)
    .max(10_000)
    .optional()
    .default(6),
  RATE_LIMIT_AUTH_PHONE_VERIFICATION_CONFIRM_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .min(1)
    .max(86_400)
    .optional()
    .default(300),
  RATE_LIMIT_AUTH_PHONE_VERIFICATION_CONFIRM_MAX_REQUESTS: z.coerce
    .number()
    .int()
    .min(1)
    .max(10_000)
    .optional()
    .default(12),
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
  KEYCLOAK_URL: z
    .string()
    .url('KEYCLOAK_URL must be a valid URL')
    .optional()
    .default('http://localhost:8080'),
  KEYCLOAK_REALM: z.string().min(1, 'KEYCLOAK_REALM is required').optional().default('adottaungatto'),
  KEYCLOAK_ADMIN_REALM: z
    .string()
    .min(1, 'KEYCLOAK_ADMIN_REALM is required')
    .optional()
    .default('master'),
  KEYCLOAK_ADMIN_CLIENT_ID: z
    .string()
    .min(1, 'KEYCLOAK_ADMIN_CLIENT_ID is required')
    .optional()
    .default('admin-cli'),
  KEYCLOAK_ADMIN: z.string().min(1, 'KEYCLOAK_ADMIN is required').optional().default('admin'),
  KEYCLOAK_ADMIN_PASSWORD: z
    .string()
    .min(1, 'KEYCLOAK_ADMIN_PASSWORD is required')
    .optional()
    .default('admin'),
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
  PROMOTIONS_LIFECYCLE_ENABLED: z
    .enum(['true', 'false'])
    .optional()
    .default('true')
    .transform((value) => value === 'true'),
  PROMOTIONS_LIFECYCLE_POLL_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(86_400_000)
    .optional()
    .default(60_000),
  PROMOTIONS_LIFECYCLE_BATCH_SIZE: z.coerce
    .number()
    .int()
    .min(1)
    .max(10_000)
    .optional()
    .default(500),
  PROMOTIONS_LIFECYCLE_MAX_BATCHES_PER_CYCLE: z.coerce
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .default(10),
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
  RETENTION_LISTING_CONTACT_REQUESTS_DAYS: z.coerce
    .number()
    .int()
    .min(0)
    .max(3_650)
    .optional()
    .default(180),
  RETENTION_PROMOTION_EVENTS_DAYS: z.coerce
    .number()
    .int()
    .min(0)
    .max(3_650)
    .optional()
    .default(365),
  RETENTION_MESSAGE_THREADS_INACTIVE_DAYS: z.coerce
    .number()
    .int()
    .min(0)
    .max(3_650)
    .optional()
    .default(120),
  USER_IDENTITY_RECONCILIATION_ENABLED: z
    .enum(['true', 'false'])
    .optional()
    .default('true')
    .transform((value) => value === 'true'),
  USER_IDENTITY_RECONCILIATION_POLL_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(86_400_000)
    .optional()
    .default(900_000),
  USER_IDENTITY_RECONCILIATION_BATCH_SIZE: z.coerce
    .number()
    .int()
    .min(1)
    .max(1_000)
    .optional()
    .default(100),
  USER_IDENTITY_RECONCILIATION_MAX_BATCHES_PER_CYCLE: z.coerce
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .default(10),
  OPS_ALERT_OUTBOX_PENDING_WARN: z.coerce
    .number()
    .int()
    .min(1)
    .max(1_000_000)
    .optional()
    .default(200),
  OPS_ALERT_OUTBOX_PROCESSING_STALE_CRITICAL: z.coerce
    .number()
    .int()
    .min(1)
    .max(1_000_000)
    .optional()
    .default(10),
  OPS_ALERT_OUTBOX_FAILED_LAST_HOUR_WARN: z.coerce
    .number()
    .int()
    .min(1)
    .max(1_000_000)
    .optional()
    .default(20),
  OPS_ALERT_OUTBOX_OLDEST_PENDING_SECONDS_WARN: z.coerce
    .number()
    .int()
    .min(1)
    .max(86_400_000)
    .optional()
    .default(900),
  OPS_ALERT_PROMOTIONS_DUE_WARN: z.coerce
    .number()
    .int()
    .min(1)
    .max(1_000_000)
    .optional()
    .default(50),
  OPS_ALERT_FAIL_ON: z.enum(['warning', 'critical']).optional().default('critical'),
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
