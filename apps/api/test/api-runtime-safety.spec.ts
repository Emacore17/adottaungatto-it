import { loadApiEnv } from '@adottaungatto/config';
import {
  assertSafeApiRuntimeConfig,
  createCorsOriginResolver,
} from '../src/security/api-runtime-safety';

const evaluateCorsOrigin = async (origin: string | undefined, envOverrides: Record<string, string>) => {
  const env = loadApiEnv({
    ...process.env,
    API_HOST: '127.0.0.1',
    API_PORT: '3002',
    DATABASE_URL: 'postgresql://adottaungatto:adottaungatto@localhost:5432/adottaungatto',
    REDIS_URL: 'redis://localhost:6379',
    OPENSEARCH_URL: 'http://localhost:9200',
    MINIO_ENDPOINT: 'http://localhost:9000',
    MINIO_ACCESS_KEY: 'minio',
    MINIO_SECRET_KEY: 'minio123',
    KEYCLOAK_URL: 'http://localhost:8080',
    KEYCLOAK_REALM: 'adottaungatto',
    ...envOverrides,
  });

  return await new Promise<boolean>((resolve, reject) => {
    createCorsOriginResolver(env)(origin, (error, allow) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(allow);
    });
  });
};

describe('api runtime safety', () => {
  it('rejects production startup when dev headers are enabled', () => {
    const env = loadApiEnv({
      ...process.env,
      NODE_ENV: 'production',
      API_HOST: '127.0.0.1',
      API_PORT: '3002',
      API_CORS_ALLOWED_ORIGINS: 'https://app.example.com',
      DATABASE_URL: 'postgresql://adottaungatto:adottaungatto@localhost:5432/adottaungatto',
      REDIS_URL: 'redis://localhost:6379',
      OPENSEARCH_URL: 'http://localhost:9200',
      MINIO_ENDPOINT: 'http://localhost:9000',
      MINIO_ACCESS_KEY: 'minio',
      MINIO_SECRET_KEY: 'minio123',
      KEYCLOAK_URL: 'http://localhost:8080',
      KEYCLOAK_REALM: 'adottaungatto',
      AUTH_DEV_HEADERS_ENABLED: 'true',
    });

    expect(() => assertSafeApiRuntimeConfig(env)).toThrow(
      'AUTH_DEV_HEADERS_ENABLED must be false when NODE_ENV=production.',
    );
  });

  it('allows no-origin requests for server-to-server calls', async () => {
    const allowed = await evaluateCorsOrigin(undefined, {
      API_CORS_ALLOWED_ORIGINS: 'http://localhost:3000,http://localhost:3001',
    });

    expect(allowed).toBe(true);
  });

  it('allows configured browser origins', async () => {
    const allowed = await evaluateCorsOrigin('http://localhost:3001', {
      API_CORS_ALLOWED_ORIGINS: 'http://localhost:3000,http://localhost:3001',
    });

    expect(allowed).toBe(true);
  });

  it('rejects origins outside the allowlist', async () => {
    const allowed = await evaluateCorsOrigin('https://evil.example.com', {
      API_CORS_ALLOWED_ORIGINS: 'http://localhost:3000,http://localhost:3001',
    });

    expect(allowed).toBe(false);
  });
});
