import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthRecoveryService } from '../src/auth/services/auth-recovery.service';
import { AuthSecurityEventsService } from '../src/auth/services/auth-security-events.service';
import { AUTH_SECURITY_EVENT } from '../src/auth/security-events.constants';

describe('Auth password recovery endpoint', () => {
  let app: NestFastifyApplication;
  const requestPasswordRecovery = vi.fn(async () => undefined);
  const resendEmailVerification = vi.fn(async () => undefined);
  const createIdentifierHash = vi.fn(() => 'identifier-hash');
  const recordBestEffort = vi.fn(async () => undefined);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthRecoveryService)
      .useValue({
        requestPasswordRecovery,
        resendEmailVerification,
      })
      .overrideProvider(AuthSecurityEventsService)
      .useValue({
        createIdentifierHash,
        recordBestEffort,
      })
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepts a recovery request with a neutral response', async () => {
    const response = await request(app.getHttpServer()).post('/v1/auth/password-recovery').send({
      identifier: 'utente.demo@adottaungatto.local',
    });

    expect(response.status).toBe(202);
    expect(response.body.accepted).toBe(true);
    expect(typeof response.body.message).toBe('string');
    expect(requestPasswordRecovery).toHaveBeenCalledWith('utente.demo@adottaungatto.local');
    expect(createIdentifierHash).toHaveBeenCalledWith('utente.demo@adottaungatto.local');
    expect(recordBestEffort).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: AUTH_SECURITY_EVENT.PASSWORD_RECOVERY_REQUESTED,
        metadata: expect.objectContaining({
          identifierHash: 'identifier-hash',
          identifierKind: 'email',
        }),
      }),
    );
  });

  it('validates identifier payload', async () => {
    const response = await request(app.getHttpServer()).post('/v1/auth/password-recovery').send({
      identifier: '',
    });

    expect(response.status).toBe(400);
    expect(requestPasswordRecovery).not.toHaveBeenCalled();
    expect(recordBestEffort).not.toHaveBeenCalled();
  });

  it('denies email verification resend without auth headers', async () => {
    const response = await request(app.getHttpServer()).post('/v1/auth/email-verification/resend');

    expect(response.status).toBe(401);
    expect(resendEmailVerification).not.toHaveBeenCalled();
    expect(recordBestEffort).not.toHaveBeenCalled();
  });

  it('accepts email verification resend for authenticated users', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/auth/email-verification/resend')
      .set('x-auth-user-id', 'user-verify-1')
      .set('x-auth-email', 'user-verify-1@example.test')
      .set('x-auth-roles', 'user')
      .set('x-auth-email-verified', 'false')
      .send({});

    expect(response.status).toBe(202);
    expect(response.body.accepted).toBe(true);
    expect(typeof response.body.message).toBe('string');
    expect(resendEmailVerification).toHaveBeenCalledWith({
      provider: 'dev-header',
      providerSubject: 'user-verify-1',
      email: 'user-verify-1@example.test',
      emailVerified: false,
    });
    expect(createIdentifierHash).toHaveBeenCalledWith('user-verify-1@example.test');
    expect(recordBestEffort).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: AUTH_SECURITY_EVENT.EMAIL_VERIFICATION_RESEND_REQUESTED,
        userDatabaseId: null,
        metadata: expect.objectContaining({
          provider: 'dev-header',
          providerSubject: 'user-verify-1',
          emailHash: 'identifier-hash',
          emailPreviouslyVerified: false,
        }),
      }),
    );
  });
});
