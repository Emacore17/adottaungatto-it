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
      'AUTH_DEV_HEADERS_ENABLED can be true only when NODE_ENV is development or test.',
    );
  });

  it('defaults dev headers auth to disabled unless explicitly enabled', () => {
    const env = loadApiEnv({
      ...process.env,
      NODE_ENV: 'development',
      API_HOST: '127.0.0.1',
      API_PORT: '3002',
      API_CORS_ALLOWED_ORIGINS: 'http://localhost:3000,http://localhost:3001',
      DATABASE_URL: 'postgresql://adottaungatto:adottaungatto@localhost:5432/adottaungatto',
      REDIS_URL: 'redis://localhost:6379',
      OPENSEARCH_URL: 'http://localhost:9200',
      MINIO_ENDPOINT: 'http://localhost:9000',
      MINIO_ACCESS_KEY: 'minio',
      MINIO_SECRET_KEY: 'minio123',
      KEYCLOAK_URL: 'http://localhost:8080',
      KEYCLOAK_REALM: 'adottaungatto',
      AUTH_DEV_HEADERS_ENABLED: undefined,
    });

    expect(env.AUTH_DEV_HEADERS_ENABLED).toBe(false);
  });

  it('rejects startup when Fastify body limit is too small for configured upload size', () => {
    const env = loadApiEnv({
      ...process.env,
      NODE_ENV: 'development',
      API_HOST: '127.0.0.1',
      API_PORT: '3002',
      API_CORS_ALLOWED_ORIGINS: 'http://localhost:3000,http://localhost:3001',
      DATABASE_URL: 'postgresql://adottaungatto:adottaungatto@localhost:5432/adottaungatto',
      REDIS_URL: 'redis://localhost:6379',
      OPENSEARCH_URL: 'http://localhost:9200',
      MINIO_ENDPOINT: 'http://localhost:9000',
      MINIO_ACCESS_KEY: 'minio',
      MINIO_SECRET_KEY: 'minio123',
      KEYCLOAK_URL: 'http://localhost:8080',
      KEYCLOAK_REALM: 'adottaungatto',
      MEDIA_UPLOAD_MAX_BYTES: '10485760',
      API_BODY_LIMIT_BYTES: '12000000',
    });

    expect(() => assertSafeApiRuntimeConfig(env)).toThrow('API_BODY_LIMIT_BYTES must be >=');
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
