import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AUTH_SECURITY_EVENT } from '../src/auth/security-events.constants';
import { AuthPhoneVerificationService } from '../src/auth/services/auth-phone-verification.service';
import { AuthSecurityEventsService } from '../src/auth/services/auth-security-events.service';
import { PublicRateLimitGuard } from '../src/security/public-rate-limit.guard';

const authenticatedUserHeaders = {
  'x-auth-user-id': 'user-phone-1',
  'x-auth-email': 'user-phone-1@example.test',
  'x-auth-roles': 'user',
  'x-forwarded-for': '198.51.100.78',
};

describe('Auth phone verification endpoints', () => {
  let app: NestFastifyApplication;
  let previousTrustProxyValue: string | undefined;
  let previousRateLimitPrefix: string | undefined;

  const requestPhoneVerification = vi.fn(
    async ({ phoneE164 }: { phoneE164?: string | null; user: unknown }) => ({
      accepted: true as const,
      message: 'If the phone number is eligible, a verification code has been issued.',
      phoneE164: phoneE164 ?? '+393331112233',
      expiresInSeconds: 600,
      devCode: '123456',
    }),
  );

  const confirmPhoneVerification = vi.fn(
    async ({ phoneE164 }: { phoneE164?: string | null; user: unknown; code: string }) => ({
      verified: true as const,
      phoneE164: phoneE164 ?? '+393331112233',
      verifiedAt: new Date().toISOString(),
    }),
  );

  const recordBestEffort = vi.fn(async () => undefined);
  const createIdentifierHash = vi.fn(() => 'phone-hash');

  beforeAll(async () => {
    previousTrustProxyValue = process.env.API_TRUST_PROXY_ENABLED;
    previousRateLimitPrefix = process.env.RATE_LIMIT_KEY_PREFIX;
    process.env.API_TRUST_PROXY_ENABLED = 'true';
    process.env.RATE_LIMIT_KEY_PREFIX = `rate_limit_auth_phone_e2e_${Date.now().toString()}`;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PublicRateLimitGuard)
      .useValue({
        canActivate: () => true,
      })
      .overrideProvider(AuthPhoneVerificationService)
      .useValue({
        requestPhoneVerification,
        confirmPhoneVerification,
      })
      .overrideProvider(AuthSecurityEventsService)
      .useValue({
        recordBestEffort,
        createIdentifierHash,
      })
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
    process.env.API_TRUST_PROXY_ENABLED = previousTrustProxyValue;
    process.env.RATE_LIMIT_KEY_PREFIX = previousRateLimitPrefix;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires auth for phone verification request', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/auth/phone-verification/request')
      .send({
        phoneE164: '+393331112233',
      });

    expect(response.status).toBe(401);
    expect(requestPhoneVerification).not.toHaveBeenCalled();
  });

  it('accepts phone verification request for authenticated users', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/auth/phone-verification/request')
      .set(authenticatedUserHeaders)
      .send({
        phoneE164: '+393331112233',
      });

    expect(response.status).toBe(202);
    expect(response.body.accepted).toBe(true);
    expect(response.body.phoneE164).toBe('+393331112233');
    expect(requestPhoneVerification).toHaveBeenCalledWith({
      user: expect.objectContaining({
        providerSubject: 'user-phone-1',
      }),
      phoneE164: '+393331112233',
    });
    expect(recordBestEffort).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: AUTH_SECURITY_EVENT.PHONE_VERIFICATION_REQUESTED,
      }),
    );
  });

  it('validates phoneE164 payload type when provided', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/auth/phone-verification/request')
      .set(authenticatedUserHeaders)
      .send({
        phoneE164: 393331112233,
      });

    expect(response.status).toBe(400);
    expect(requestPhoneVerification).not.toHaveBeenCalled();
  });

  it('requires auth for phone verification confirm', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/auth/phone-verification/confirm')
      .send({
        code: '123456',
      });

    expect(response.status).toBe(401);
    expect(confirmPhoneVerification).not.toHaveBeenCalled();
  });

  it('accepts phone verification confirm for authenticated users', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/auth/phone-verification/confirm')
      .set(authenticatedUserHeaders)
      .send({
        phoneE164: '+393331112233',
        code: '123456',
      });

    expect(response.status).toBe(200);
    expect(response.body.verified).toBe(true);
    expect(confirmPhoneVerification).toHaveBeenCalledWith({
      user: expect.objectContaining({
        providerSubject: 'user-phone-1',
      }),
      phoneE164: '+393331112233',
      code: '123456',
    });
    expect(recordBestEffort).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: AUTH_SECURITY_EVENT.PHONE_VERIFICATION_CONFIRMED,
      }),
    );
  });

  it('validates confirm payload when code is missing', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/auth/phone-verification/confirm')
      .set(authenticatedUserHeaders)
      .send({
        phoneE164: '+393331112233',
      });

    expect(response.status).toBe(400);
    expect(confirmPhoneVerification).not.toHaveBeenCalled();
  });
});
