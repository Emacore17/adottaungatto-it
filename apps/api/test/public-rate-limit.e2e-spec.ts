import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { vi } from 'vitest';
import { AnalyticsService } from '../src/analytics/analytics.service';
import { AppModule } from '../src/app.module';
import { AuthSecurityEventsService } from '../src/auth/services/auth-security-events.service';
import { AuthPhoneVerificationService } from '../src/auth/services/auth-phone-verification.service';
import { AuthRecoveryService } from '../src/auth/services/auth-recovery.service';
import { GeographyService } from '../src/geography/geography.service';
import { UsersService } from '../src/users/users.service';

describe('Public rate limit guard', () => {
  let app: NestFastifyApplication;
  const previousAnalyticsMax = process.env.RATE_LIMIT_ANALYTICS_MAX_REQUESTS;
  const previousAnalyticsWindow = process.env.RATE_LIMIT_ANALYTICS_WINDOW_SECONDS;
  const previousGeographyMax = process.env.RATE_LIMIT_GEOGRAPHY_MAX_REQUESTS;
  const previousGeographyWindow = process.env.RATE_LIMIT_GEOGRAPHY_WINDOW_SECONDS;
  const previousAuthPasswordRecoveryMax =
    process.env.RATE_LIMIT_AUTH_PASSWORD_RECOVERY_MAX_REQUESTS;
  const previousAuthPasswordRecoveryWindow =
    process.env.RATE_LIMIT_AUTH_PASSWORD_RECOVERY_WINDOW_SECONDS;
  const previousAuthEmailVerificationResendMax =
    process.env.RATE_LIMIT_AUTH_EMAIL_VERIFICATION_RESEND_MAX_REQUESTS;
  const previousAuthEmailVerificationResendWindow =
    process.env.RATE_LIMIT_AUTH_EMAIL_VERIFICATION_RESEND_WINDOW_SECONDS;
  const previousAuthPhoneVerificationRequestMax =
    process.env.RATE_LIMIT_AUTH_PHONE_VERIFICATION_REQUEST_MAX_REQUESTS;
  const previousAuthPhoneVerificationRequestWindow =
    process.env.RATE_LIMIT_AUTH_PHONE_VERIFICATION_REQUEST_WINDOW_SECONDS;
  const previousAuthPhoneVerificationConfirmMax =
    process.env.RATE_LIMIT_AUTH_PHONE_VERIFICATION_CONFIRM_MAX_REQUESTS;
  const previousAuthPhoneVerificationConfirmWindow =
    process.env.RATE_LIMIT_AUTH_PHONE_VERIFICATION_CONFIRM_WINDOW_SECONDS;
  const previousRateLimitPrefix = process.env.RATE_LIMIT_KEY_PREFIX;

  const trackPublicEvent = vi.fn(async () => ({
    id: 'event-1',
    eventType: 'contact_clicked',
    actorUserId: null,
    listingId: '101',
    source: 'web_public',
    metadata: {},
    createdAt: new Date().toISOString(),
  }));
  const geographySearch = vi.fn(async (query: string, _limit: number) => [
    {
      type: 'comune',
      id: '101',
      name: query,
      label: 'Torino (TO)',
      secondaryLabel: 'Comune - Torino, Piemonte',
      istatCode: '001272',
      regionId: '1',
      provinceId: '11',
      comuneId: '101',
      regionName: 'Piemonte',
      provinceName: 'Torino',
      sigla: 'TO',
      locationIntent: {
        scope: 'comune',
        regionId: '1',
        provinceId: '11',
        comuneId: '101',
        label: 'Torino (TO)',
        secondaryLabel: 'Comune - Torino, Piemonte',
      },
    },
  ]);
  const requestPasswordRecovery = vi.fn(async () => undefined);
  const resendEmailVerification = vi.fn(async () => undefined);
  const requestPhoneVerification = vi.fn(async () => ({
    accepted: true as const,
    message: 'If the phone number is eligible, a verification code has been issued.',
    phoneE164: '+393331112233',
    expiresInSeconds: 600,
    devCode: '123456',
  }));
  const confirmPhoneVerification = vi.fn(async () => ({
    verified: true as const,
    phoneE164: '+393331112233',
    verifiedAt: new Date().toISOString(),
  }));
  const recordBestEffort = vi.fn(async () => undefined);
  const createIdentifierHash = vi.fn(() => 'hash');
  const upsertFromIdentity = vi.fn(async (identity: Record<string, unknown>) => ({
    id: String(identity.providerSubject ?? identity.email ?? 'rl-user'),
    databaseId: null,
    provider: identity.provider ?? 'dev-header',
    providerSubject: String(identity.providerSubject ?? 'rl-user'),
    email: String(identity.email ?? 'rl-user@example.local'),
    emailVerified: identity.emailVerified === true,
    roles: Array.isArray(identity.roles) ? identity.roles : ['user'],
    preferences: {
      messageEmailNotificationsEnabled: true,
    },
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
  }));

  beforeAll(async () => {
    process.env.RATE_LIMIT_ANALYTICS_MAX_REQUESTS = '2';
    process.env.RATE_LIMIT_ANALYTICS_WINDOW_SECONDS = '120';
    process.env.RATE_LIMIT_GEOGRAPHY_MAX_REQUESTS = '2';
    process.env.RATE_LIMIT_GEOGRAPHY_WINDOW_SECONDS = '120';
    process.env.RATE_LIMIT_AUTH_PASSWORD_RECOVERY_MAX_REQUESTS = '2';
    process.env.RATE_LIMIT_AUTH_PASSWORD_RECOVERY_WINDOW_SECONDS = '120';
    process.env.RATE_LIMIT_AUTH_EMAIL_VERIFICATION_RESEND_MAX_REQUESTS = '2';
    process.env.RATE_LIMIT_AUTH_EMAIL_VERIFICATION_RESEND_WINDOW_SECONDS = '120';
    process.env.RATE_LIMIT_AUTH_PHONE_VERIFICATION_REQUEST_MAX_REQUESTS = '2';
    process.env.RATE_LIMIT_AUTH_PHONE_VERIFICATION_REQUEST_WINDOW_SECONDS = '120';
    process.env.RATE_LIMIT_AUTH_PHONE_VERIFICATION_CONFIRM_MAX_REQUESTS = '2';
    process.env.RATE_LIMIT_AUTH_PHONE_VERIFICATION_CONFIRM_WINDOW_SECONDS = '120';
    process.env.RATE_LIMIT_KEY_PREFIX = `rate_limit_e2e_${Date.now().toString()}`;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AnalyticsService)
      .useValue({
        trackPublicEvent,
        getAdminKpis: vi.fn(),
      })
      .overrideProvider(GeographyService)
      .useValue({
        findRegions: vi.fn(async () => []),
        findProvincesByRegionId: vi.fn(async () => []),
        findComuniByProvinceId: vi.fn(async () => []),
        search: geographySearch,
      })
      .overrideProvider(AuthRecoveryService)
      .useValue({
        requestPasswordRecovery,
        resendEmailVerification,
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
      .overrideProvider(UsersService)
      .useValue({
        upsertFromIdentity,
      })
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();

    if (previousAnalyticsMax === undefined) {
      process.env.RATE_LIMIT_ANALYTICS_MAX_REQUESTS = undefined;
    } else {
      process.env.RATE_LIMIT_ANALYTICS_MAX_REQUESTS = previousAnalyticsMax;
    }

    if (previousAnalyticsWindow === undefined) {
      process.env.RATE_LIMIT_ANALYTICS_WINDOW_SECONDS = undefined;
    } else {
      process.env.RATE_LIMIT_ANALYTICS_WINDOW_SECONDS = previousAnalyticsWindow;
    }

    if (previousGeographyMax === undefined) {
      process.env.RATE_LIMIT_GEOGRAPHY_MAX_REQUESTS = undefined;
    } else {
      process.env.RATE_LIMIT_GEOGRAPHY_MAX_REQUESTS = previousGeographyMax;
    }

    if (previousGeographyWindow === undefined) {
      process.env.RATE_LIMIT_GEOGRAPHY_WINDOW_SECONDS = undefined;
    } else {
      process.env.RATE_LIMIT_GEOGRAPHY_WINDOW_SECONDS = previousGeographyWindow;
    }
    if (previousAuthPasswordRecoveryMax === undefined) {
      process.env.RATE_LIMIT_AUTH_PASSWORD_RECOVERY_MAX_REQUESTS = undefined;
    } else {
      process.env.RATE_LIMIT_AUTH_PASSWORD_RECOVERY_MAX_REQUESTS = previousAuthPasswordRecoveryMax;
    }
    if (previousAuthPasswordRecoveryWindow === undefined) {
      process.env.RATE_LIMIT_AUTH_PASSWORD_RECOVERY_WINDOW_SECONDS = undefined;
    } else {
      process.env.RATE_LIMIT_AUTH_PASSWORD_RECOVERY_WINDOW_SECONDS =
        previousAuthPasswordRecoveryWindow;
    }
    if (previousAuthEmailVerificationResendMax === undefined) {
      process.env.RATE_LIMIT_AUTH_EMAIL_VERIFICATION_RESEND_MAX_REQUESTS = undefined;
    } else {
      process.env.RATE_LIMIT_AUTH_EMAIL_VERIFICATION_RESEND_MAX_REQUESTS =
        previousAuthEmailVerificationResendMax;
    }
    if (previousAuthEmailVerificationResendWindow === undefined) {
      process.env.RATE_LIMIT_AUTH_EMAIL_VERIFICATION_RESEND_WINDOW_SECONDS = undefined;
    } else {
      process.env.RATE_LIMIT_AUTH_EMAIL_VERIFICATION_RESEND_WINDOW_SECONDS =
        previousAuthEmailVerificationResendWindow;
    }
    if (previousAuthPhoneVerificationRequestMax === undefined) {
      process.env.RATE_LIMIT_AUTH_PHONE_VERIFICATION_REQUEST_MAX_REQUESTS = undefined;
    } else {
      process.env.RATE_LIMIT_AUTH_PHONE_VERIFICATION_REQUEST_MAX_REQUESTS =
        previousAuthPhoneVerificationRequestMax;
    }
    if (previousAuthPhoneVerificationRequestWindow === undefined) {
      process.env.RATE_LIMIT_AUTH_PHONE_VERIFICATION_REQUEST_WINDOW_SECONDS = undefined;
    } else {
      process.env.RATE_LIMIT_AUTH_PHONE_VERIFICATION_REQUEST_WINDOW_SECONDS =
        previousAuthPhoneVerificationRequestWindow;
    }
    if (previousAuthPhoneVerificationConfirmMax === undefined) {
      process.env.RATE_LIMIT_AUTH_PHONE_VERIFICATION_CONFIRM_MAX_REQUESTS = undefined;
    } else {
      process.env.RATE_LIMIT_AUTH_PHONE_VERIFICATION_CONFIRM_MAX_REQUESTS =
        previousAuthPhoneVerificationConfirmMax;
    }
    if (previousAuthPhoneVerificationConfirmWindow === undefined) {
      process.env.RATE_LIMIT_AUTH_PHONE_VERIFICATION_CONFIRM_WINDOW_SECONDS = undefined;
    } else {
      process.env.RATE_LIMIT_AUTH_PHONE_VERIFICATION_CONFIRM_WINDOW_SECONDS =
        previousAuthPhoneVerificationConfirmWindow;
    }

    if (previousRateLimitPrefix === undefined) {
      process.env.RATE_LIMIT_KEY_PREFIX = undefined;
    } else {
      process.env.RATE_LIMIT_KEY_PREFIX = previousRateLimitPrefix;
    }
  });

  beforeEach(() => {
    trackPublicEvent.mockClear();
    geographySearch.mockClear();
    requestPasswordRecovery.mockClear();
    resendEmailVerification.mockClear();
    requestPhoneVerification.mockClear();
    confirmPhoneVerification.mockClear();
    recordBestEffort.mockClear();
    createIdentifierHash.mockClear();
    upsertFromIdentity.mockClear();
  });

  it('returns 429 when analytics event burst exceeds configured threshold', async () => {
    const payload = {
      eventType: 'contact_clicked',
      listingId: '101',
      source: 'web_public',
    };

    const first = await request(app.getHttpServer()).post('/v1/analytics/events').send(payload);
    const second = await request(app.getHttpServer()).post('/v1/analytics/events').send(payload);
    const third = await request(app.getHttpServer()).post('/v1/analytics/events').send(payload);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(third.status).toBe(429);
    expect(third.body.message).toBe('Rate limit exceeded for analytics_events.');
    expect(typeof third.body.retryAfterSeconds).toBe('number');
    expect(third.headers['retry-after']).toBeDefined();
    expect(trackPublicEvent).toHaveBeenCalledTimes(2);
  });

  it('returns 429 when geography search burst exceeds configured threshold', async () => {
    const first = await request(app.getHttpServer()).get('/v1/geography/search?q=Tor&limit=5');
    const second = await request(app.getHttpServer()).get('/v1/geography/search?q=Tor&limit=5');
    const third = await request(app.getHttpServer()).get('/v1/geography/search?q=Tor&limit=5');

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
    expect(third.body.message).toBe('Rate limit exceeded for geography.');
    expect(typeof third.body.retryAfterSeconds).toBe('number');
    expect(third.headers['retry-after']).toBeDefined();
    expect(geographySearch).toHaveBeenCalledTimes(2);
  });

  it('returns 429 when password recovery burst exceeds configured threshold', async () => {
    const payload = {
      identifier: 'utente.demo@adottaungatto.local',
    };

    const first = await request(app.getHttpServer()).post('/v1/auth/password-recovery').send(payload);
    const second = await request(app.getHttpServer()).post('/v1/auth/password-recovery').send(payload);
    const third = await request(app.getHttpServer()).post('/v1/auth/password-recovery').send(payload);

    expect(first.status).toBe(202);
    expect(second.status).toBe(202);
    expect(third.status).toBe(429);
    expect(third.body.message).toBe('Rate limit exceeded for auth_password_recovery.');
    expect(typeof third.body.retryAfterSeconds).toBe('number');
    expect(third.headers['retry-after']).toBeDefined();
    expect(requestPasswordRecovery).toHaveBeenCalledTimes(2);
  });

  it('returns 429 when email verification resend burst exceeds configured threshold', async () => {
    const sendResend = () =>
      request(app.getHttpServer())
        .post('/v1/auth/email-verification/resend')
        .set('x-auth-user-id', 'rl-user-1')
        .set('x-auth-subject', 'rl-user-1')
        .set('x-auth-email', 'rl-user-1@adottaungatto.local')
        .set('x-auth-roles', 'user')
        .set('x-auth-email-verified', 'false')
        .send({});

    const first = await sendResend();
    const second = await sendResend();
    const third = await sendResend();

    expect(first.status).toBe(202);
    expect(second.status).toBe(202);
    expect(third.status).toBe(429);
    expect(third.body.message).toBe('Rate limit exceeded for auth_email_verification_resend.');
    expect(typeof third.body.retryAfterSeconds).toBe('number');
    expect(third.headers['retry-after']).toBeDefined();
    expect(resendEmailVerification).toHaveBeenCalledTimes(2);
  });

  it('returns 429 when phone verification request burst exceeds configured threshold', async () => {
    const sendPhoneRequest = () =>
      request(app.getHttpServer())
        .post('/v1/auth/phone-verification/request')
        .set('x-auth-user-id', 'rl-user-2')
        .set('x-auth-subject', 'rl-user-2')
        .set('x-auth-email', 'rl-user-2@adottaungatto.local')
        .set('x-auth-roles', 'user')
        .send({
          phoneE164: '+393331112233',
        });

    const first = await sendPhoneRequest();
    const second = await sendPhoneRequest();
    const third = await sendPhoneRequest();

    expect(first.status).toBe(202);
    expect(second.status).toBe(202);
    expect(third.status).toBe(429);
    expect(third.body.message).toBe('Rate limit exceeded for auth_phone_verification_request.');
    expect(typeof third.body.retryAfterSeconds).toBe('number');
    expect(third.headers['retry-after']).toBeDefined();
    expect(requestPhoneVerification).toHaveBeenCalledTimes(2);
  });

  it('returns 429 when phone verification confirm burst exceeds configured threshold', async () => {
    const sendPhoneConfirm = () =>
      request(app.getHttpServer())
        .post('/v1/auth/phone-verification/confirm')
        .set('x-auth-user-id', 'rl-user-2')
        .set('x-auth-subject', 'rl-user-2')
        .set('x-auth-email', 'rl-user-2@adottaungatto.local')
        .set('x-auth-roles', 'user')
        .send({
          phoneE164: '+393331112233',
          code: '123456',
        });

    const first = await sendPhoneConfirm();
    const second = await sendPhoneConfirm();
    const third = await sendPhoneConfirm();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
    expect(third.body.message).toBe('Rate limit exceeded for auth_phone_verification_confirm.');
    expect(typeof third.body.retryAfterSeconds).toBe('number');
    expect(third.headers['retry-after']).toBeDefined();
    expect(confirmPhoneVerification).toHaveBeenCalledTimes(2);
  });
});
