import type { ApiEnv } from '@adottaungatto/config';

export const assertSafeApiRuntimeConfig = (env: ApiEnv): void => {
  if (env.NODE_ENV === 'production' && env.AUTH_DEV_HEADERS_ENABLED) {
    throw new Error('AUTH_DEV_HEADERS_ENABLED must be false when NODE_ENV=production.');
  }
};

export const createCorsOriginResolver =
  (env: ApiEnv) =>
  (origin: string | undefined, callback: (error: Error | null, allow: boolean) => void): void => {
    if (!origin) {
      callback(null, true);
      return;
    }

    let normalizedOrigin: string;
    try {
      normalizedOrigin = new URL(origin).origin;
    } catch {
      callback(null, false);
      return;
    }

    callback(null, env.API_CORS_ALLOWED_ORIGINS.includes(normalizedOrigin));
  };
