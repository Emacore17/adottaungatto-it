import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PublicRateLimitGuard } from '../src/security/public-rate-limit.guard';

type UserRow = {
  id: string;
};

type ChallengeRow = {
  phoneE164: string;
  codeHash: string;
  attempts: number;
  verifiedAt: string | null;
};

type ProfileRow = {
  phoneE164: string | null;
  phoneVerifiedAt: string | null;
};

const integrationHeaders = {
  'x-auth-user-id': 'phone-integration-user',
  'x-auth-subject': 'phone-integration-user',
  'x-auth-email': 'phone-integration-user@example.test',
  'x-auth-roles': 'user',
  'x-forwarded-for': '198.51.100.77',
};

const integrationProviderSubject = 'phone-integration-user';
const integrationPhone = '+393331112233';

describe('Auth phone verification integration e2e (real service)', () => {
  let app: NestFastifyApplication;
  let pool: Pool;
  let previousTrustProxyValue: string | undefined;
  let previousRateLimitPrefix: string | undefined;

  const ensurePhoneVerificationSchema = async () => {
    await pool.query(`
      ALTER TABLE user_profiles
        ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;

      CREATE TABLE IF NOT EXISTS user_phone_verification_challenges (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
        phone_e164 VARCHAR(20) NOT NULL,
        code_hash VARCHAR(128) NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        expires_at TIMESTAMPTZ NOT NULL,
        verified_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT user_phone_verification_challenges_user_phone_unique UNIQUE (user_id, phone_e164)
      );

      CREATE INDEX IF NOT EXISTS idx_user_phone_verification_challenges_user_id
        ON user_phone_verification_challenges (user_id);

      CREATE INDEX IF NOT EXISTS idx_user_phone_verification_challenges_expires_at
        ON user_phone_verification_challenges (expires_at);
    `);
  };

  const findUserDatabaseId = async (): Promise<string | null> => {
    const userResult = await pool.query<UserRow>(
      `
        SELECT id::text AS "id"
        FROM app_users
        WHERE provider_subject = $1
        LIMIT 1;
      `,
      [integrationProviderSubject],
    );

    return userResult.rows[0]?.id ?? null;
  };

  const cleanupUserRows = async () => {
    const userDatabaseId = await findUserDatabaseId();
    if (!userDatabaseId) {
      return;
    }

    await pool.query('DELETE FROM user_phone_verification_challenges WHERE user_id = $1::bigint', [
      userDatabaseId,
    ]);
    await pool.query('DELETE FROM user_profiles WHERE user_id = $1::bigint', [userDatabaseId]);
    await pool.query('DELETE FROM user_security_events WHERE user_id = $1::bigint', [
      userDatabaseId,
    ]);
    await pool.query('DELETE FROM app_users WHERE id = $1::bigint', [userDatabaseId]);
  };

  beforeAll(async () => {
    previousTrustProxyValue = process.env.API_TRUST_PROXY_ENABLED;
    previousRateLimitPrefix = process.env.RATE_LIMIT_KEY_PREFIX;
    process.env.API_TRUST_PROXY_ENABLED = 'true';
    process.env.RATE_LIMIT_KEY_PREFIX = `rate_limit_auth_phone_integration_${Date.now().toString()}`;

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    await ensurePhoneVerificationSchema();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PublicRateLimitGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  }, 60_000);

  beforeEach(async () => {
    await cleanupUserRows();
  });

  afterAll(async () => {
    await cleanupUserRows();
    await app.close();
    await pool.end();
    process.env.API_TRUST_PROXY_ENABLED = previousTrustProxyValue;
    process.env.RATE_LIMIT_KEY_PREFIX = previousRateLimitPrefix;
  });

  it('requests and confirms phone verification end-to-end with persisted state', async () => {
    const requestResponse = await request(app.getHttpServer())
      .post('/v1/auth/phone-verification/request')
      .set(integrationHeaders)
      .send({
        phoneE164: integrationPhone,
      });

    expect(requestResponse.status).toBe(202);
    expect(requestResponse.body?.accepted).toBe(true);
    expect(requestResponse.body?.phoneE164).toBe(integrationPhone);
    expect(typeof requestResponse.body?.expiresInSeconds).toBe('number');

    const issuedCode = requestResponse.body?.devCode as string | undefined;
    expect(typeof issuedCode).toBe('string');
    expect(issuedCode).toMatch(/^\d+$/);
    if (!issuedCode) {
      throw new Error('devCode not available in test environment.');
    }

    const challengeResult = await pool.query<ChallengeRow>(
      `
        SELECT
          c.phone_e164 AS "phoneE164",
          c.code_hash AS "codeHash",
          c.attempts AS "attempts",
          c.verified_at::text AS "verifiedAt"
        FROM user_phone_verification_challenges c
        INNER JOIN app_users u ON u.id = c.user_id
        WHERE u.provider_subject = $1
          AND c.phone_e164 = $2
        LIMIT 1;
      `,
      [integrationProviderSubject, integrationPhone],
    );

    expect(challengeResult.rowCount).toBe(1);
    expect(challengeResult.rows[0]?.phoneE164).toBe(integrationPhone);
    expect(challengeResult.rows[0]?.attempts).toBe(0);
    expect(challengeResult.rows[0]?.verifiedAt).toBeNull();
    expect(challengeResult.rows[0]?.codeHash).not.toBe(issuedCode);

    const confirmResponse = await request(app.getHttpServer())
      .post('/v1/auth/phone-verification/confirm')
      .set(integrationHeaders)
      .send({
        phoneE164: integrationPhone,
        code: issuedCode,
      });

    expect(confirmResponse.status).toBe(200);
    expect(confirmResponse.body?.verified).toBe(true);
    expect(confirmResponse.body?.phoneE164).toBe(integrationPhone);
    expect(typeof confirmResponse.body?.verifiedAt).toBe('string');

    const profileResult = await pool.query<ProfileRow>(
      `
        SELECT
          p.phone_e164 AS "phoneE164",
          p.phone_verified_at::text AS "phoneVerifiedAt"
        FROM user_profiles p
        INNER JOIN app_users u ON u.id = p.user_id
        WHERE u.provider_subject = $1
        LIMIT 1;
      `,
      [integrationProviderSubject],
    );

    expect(profileResult.rowCount).toBe(1);
    expect(profileResult.rows[0]?.phoneE164).toBe(integrationPhone);
    expect(typeof profileResult.rows[0]?.phoneVerifiedAt).toBe('string');
  });

  it('increments challenge attempts on invalid confirmation code', async () => {
    const requestResponse = await request(app.getHttpServer())
      .post('/v1/auth/phone-verification/request')
      .set(integrationHeaders)
      .send({
        phoneE164: integrationPhone,
      });

    expect(requestResponse.status).toBe(202);
    const issuedCode = String(requestResponse.body?.devCode ?? '');
    expect(issuedCode).toMatch(/^\d+$/);

    const invalidCode =
      issuedCode.replaceAll(/\d/g, '0') === issuedCode
        ? issuedCode.replaceAll(/\d/g, '1')
        : issuedCode.replaceAll(/\d/g, '0');

    const invalidConfirmResponse = await request(app.getHttpServer())
      .post('/v1/auth/phone-verification/confirm')
      .set(integrationHeaders)
      .send({
        phoneE164: integrationPhone,
        code: invalidCode,
      });

    expect(invalidConfirmResponse.status).toBe(400);
    expect(String(invalidConfirmResponse.body?.message ?? '')).toContain('Invalid verification code');

    const challengeResult = await pool.query<ChallengeRow>(
      `
        SELECT
          c.attempts AS "attempts"
        FROM user_phone_verification_challenges c
        INNER JOIN app_users u ON u.id = c.user_id
        WHERE u.provider_subject = $1
          AND c.phone_e164 = $2
        LIMIT 1;
      `,
      [integrationProviderSubject, integrationPhone],
    );

    expect(challengeResult.rowCount).toBe(1);
    expect((challengeResult.rows[0]?.attempts ?? 0) >= 1).toBe(true);
  });

  it('returns 429 when challenge is already lockout-limited', async () => {
    const requestResponse = await request(app.getHttpServer())
      .post('/v1/auth/phone-verification/request')
      .set(integrationHeaders)
      .send({
        phoneE164: integrationPhone,
      });

    expect(requestResponse.status).toBe(202);
    const issuedCode = String(requestResponse.body?.devCode ?? '');
    expect(issuedCode).toMatch(/^\d+$/);

    const userDatabaseId = await findUserDatabaseId();
    expect(userDatabaseId).not.toBeNull();
    if (!userDatabaseId) {
      throw new Error('Integration user id not found.');
    }

    await pool.query(
      `
        UPDATE user_phone_verification_challenges
        SET
          attempts = 999,
          expires_at = NOW() + INTERVAL '5 minutes',
          updated_at = NOW()
        WHERE user_id = $1::bigint
          AND phone_e164 = $2;
      `,
      [userDatabaseId, integrationPhone],
    );

    const lockoutResponse = await request(app.getHttpServer())
      .post('/v1/auth/phone-verification/confirm')
      .set(integrationHeaders)
      .send({
        phoneE164: integrationPhone,
        code: issuedCode,
      });

    expect(lockoutResponse.status).toBe(429);
    expect(String(lockoutResponse.body?.message ?? '')).toContain(
      'Too many failed verification attempts.',
    );
    expect(typeof lockoutResponse.body?.retryAfterSeconds).toBe('number');
    expect((lockoutResponse.body?.retryAfterSeconds as number) > 0).toBe(true);
  });
});
