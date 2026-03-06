import type { ApiEnv } from '@adottaungatto/config';

const base64InflationMultiplier = 4 / 3;
const uploadJsonEnvelopeHeadroomBytes = 256 * 1024;

export const assertSafeApiRuntimeConfig = (env: ApiEnv): void => {
  if (
    env.AUTH_DEV_HEADERS_ENABLED &&
    env.NODE_ENV !== 'development' &&
    env.NODE_ENV !== 'test'
  ) {
    throw new Error(
      'AUTH_DEV_HEADERS_ENABLED can be true only when NODE_ENV is development or test.',
    );
  }

  const minimumBodyLimitBytes =
    Math.ceil(env.MEDIA_UPLOAD_MAX_BYTES * base64InflationMultiplier) +
    uploadJsonEnvelopeHeadroomBytes;
  if (env.API_BODY_LIMIT_BYTES < minimumBodyLimitBytes) {
    throw new Error(
      `API_BODY_LIMIT_BYTES must be >= ${minimumBodyLimitBytes.toString()} when MEDIA_UPLOAD_MAX_BYTES=${env.MEDIA_UPLOAD_MAX_BYTES.toString()}.`,
    );
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
