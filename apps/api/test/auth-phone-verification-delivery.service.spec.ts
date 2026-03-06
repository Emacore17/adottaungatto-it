import { ServiceUnavailableException } from '@nestjs/common';
import { AuthPhoneVerificationDeliveryService } from '../src/auth/services/auth-phone-verification-delivery.service';

const baseEnv = {
  NODE_ENV: 'test',
  API_HOST: '127.0.0.1',
  API_PORT: '3002',
  API_BODY_LIMIT_BYTES: '16777216',
  API_CORS_ALLOWED_ORIGINS: 'http://localhost:3000,http://localhost:3001',
  DATABASE_URL: 'postgresql://adottaungatto:adottaungatto@localhost:5432/adottaungatto',
  REDIS_URL: 'redis://localhost:6379',
  OPENSEARCH_URL: 'http://localhost:9200',
  MINIO_ENDPOINT: 'http://localhost:9000',
  MINIO_ACCESS_KEY: 'minio',
  MINIO_SECRET_KEY: 'minio123',
  MEDIA_UPLOAD_MAX_BYTES: '10485760',
  MEDIA_ALLOWED_MIME_TYPES: 'image/jpeg,image/png,image/webp',
  KEYCLOAK_URL: 'http://localhost:8080',
  KEYCLOAK_REALM: 'adottaungatto',
  KEYCLOAK_CLIENT_ID_WEB: 'adottaungatto-web',
  KEYCLOAK_CLIENT_ID_ADMIN: 'adottaungatto-admin',
  KEYCLOAK_CLIENT_ID_MOBILE: 'adottaungatto-mobile',
  KEYCLOAK_ADMIN_REALM: 'master',
  KEYCLOAK_ADMIN_CLIENT_ID: 'admin-cli',
  KEYCLOAK_ADMIN: 'admin',
  KEYCLOAK_ADMIN_PASSWORD: 'admin',
  WEB_APP_URL: 'http://localhost:3000',
  API_TRUST_PROXY_ENABLED: 'false',
  AUTH_DEV_HEADERS_ENABLED: 'true',
  PHONE_VERIFICATION_CODE_LENGTH: '6',
  PHONE_VERIFICATION_CODE_TTL_SECONDS: '600',
  PHONE_VERIFICATION_MAX_ATTEMPTS: '5',
  PHONE_VERIFICATION_CODE_PEPPER: 'dev-phone-verification-pepper',
  PHONE_VERIFICATION_DELIVERY_PROVIDER: 'console',
  PHONE_VERIFICATION_DELIVERY_WEBHOOK_URL: '',
  PHONE_VERIFICATION_DELIVERY_WEBHOOK_AUTH_TOKEN: '',
  PHONE_VERIFICATION_TWILIO_ACCOUNT_SID: '',
  PHONE_VERIFICATION_TWILIO_AUTH_TOKEN: '',
  PHONE_VERIFICATION_TWILIO_FROM_NUMBER: '',
  PHONE_VERIFICATION_TWILIO_MESSAGING_SERVICE_SID: '',
  PHONE_VERIFICATION_SMS_TEMPLATE:
    'Il tuo codice di verifica AdottaUnGatto e {{code}}. Scade tra {{ttl_minutes}} minuti.',
  PHONE_VERIFICATION_DELIVERY_TIMEOUT_MS: '5000',
  RATE_LIMIT_KEY_PREFIX: 'rate_limit',
  RATE_LIMIT_PUBLIC_WINDOW_SECONDS: '60',
  RATE_LIMIT_PUBLIC_MAX_REQUESTS: '120',
  RATE_LIMIT_SEARCH_WINDOW_SECONDS: '60',
  RATE_LIMIT_SEARCH_MAX_REQUESTS: '80',
  RATE_LIMIT_GEOGRAPHY_WINDOW_SECONDS: '60',
  RATE_LIMIT_GEOGRAPHY_MAX_REQUESTS: '100',
  RATE_LIMIT_ANALYTICS_WINDOW_SECONDS: '60',
  RATE_LIMIT_ANALYTICS_MAX_REQUESTS: '120',
  RATE_LIMIT_CONTACT_WINDOW_SECONDS: '60',
  RATE_LIMIT_CONTACT_MAX_REQUESTS: '30',
  RATE_LIMIT_AUTH_PASSWORD_RECOVERY_WINDOW_SECONDS: '300',
  RATE_LIMIT_AUTH_PASSWORD_RECOVERY_MAX_REQUESTS: '8',
  RATE_LIMIT_AUTH_EMAIL_VERIFICATION_RESEND_WINDOW_SECONDS: '300',
  RATE_LIMIT_AUTH_EMAIL_VERIFICATION_RESEND_MAX_REQUESTS: '12',
  RATE_LIMIT_AUTH_PHONE_VERIFICATION_REQUEST_WINDOW_SECONDS: '300',
  RATE_LIMIT_AUTH_PHONE_VERIFICATION_REQUEST_MAX_REQUESTS: '6',
  RATE_LIMIT_AUTH_PHONE_VERIFICATION_CONFIRM_WINDOW_SECONDS: '300',
  RATE_LIMIT_AUTH_PHONE_VERIFICATION_CONFIRM_MAX_REQUESTS: '12',
  SEARCH_FALLBACK_MAX_STEPS: '5',
  MESSAGE_THREAD_CREATE_WINDOW_SECONDS: '600',
  MESSAGE_THREAD_CREATE_MAX_REQUESTS: '20',
  MESSAGE_MESSAGE_WINDOW_SECONDS: '300',
  MESSAGE_MESSAGE_MAX_REQUESTS: '30',
  MESSAGE_DUPLICATE_WINDOW_SECONDS: '120',
  MESSAGE_THREAD_MAX_MESSAGES: '2000',
  MESSAGE_THREAD_SLOWMODE_SECONDS: '3',
  MESSAGE_MESSAGE_MAX_URLS: '4',
  MESSAGE_TYPING_EVENT_WINDOW_SECONDS: '15',
  MESSAGE_TYPING_EVENT_MAX_REQUESTS: '20',
  MESSAGE_TYPING_EVENT_TTL_SECONDS: '6',
  MESSAGE_EMAIL_NOTIFICATIONS_ENABLED: 'true',
  MESSAGE_EMAIL_NOTIFICATION_MAX_ATTEMPTS: '8',
} as const;

describe('AuthPhoneVerificationDeliveryService', () => {
  const restoreEnv = () => {
    for (const [key, value] of Object.entries(baseEnv)) {
      process.env[key] = value;
    }
  };

  beforeEach(() => {
    restoreEnv();
    vi.restoreAllMocks();
  });

  it('supports console provider in non-production', async () => {
    process.env.NODE_ENV = 'test';
    process.env.PHONE_VERIFICATION_DELIVERY_PROVIDER = 'console';

    const service = new AuthPhoneVerificationDeliveryService();
    await expect(
      service.deliverPhoneVerificationCode({
        phoneE164: '+393331112233',
        code: '123456',
        ttlSeconds: 600,
      }),
    ).resolves.toBeUndefined();
  });

  it('fails console provider in production mode', async () => {
    process.env.NODE_ENV = 'production';
    process.env.PHONE_VERIFICATION_DELIVERY_PROVIDER = 'console';

    const service = new AuthPhoneVerificationDeliveryService();
    await expect(
      service.deliverPhoneVerificationCode({
        phoneE164: '+393331112233',
        code: '123456',
        ttlSeconds: 600,
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('sends payload to webhook provider', async () => {
    process.env.PHONE_VERIFICATION_DELIVERY_PROVIDER = 'webhook';
    process.env.PHONE_VERIFICATION_DELIVERY_WEBHOOK_URL = 'http://example.test/sms';
    process.env.PHONE_VERIFICATION_DELIVERY_WEBHOOK_AUTH_TOKEN = 'token-1';

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));

    const service = new AuthPhoneVerificationDeliveryService();
    await service.deliverPhoneVerificationCode({
      phoneE164: '+393331112233',
      code: '123456',
      ttlSeconds: 600,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://example.test/sms',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: 'Bearer token-1',
          'content-type': 'application/json',
        }),
      }),
    );
  });

  it('sends payload to twilio provider', async () => {
    process.env.PHONE_VERIFICATION_DELIVERY_PROVIDER = 'twilio';
    process.env.PHONE_VERIFICATION_TWILIO_ACCOUNT_SID = 'AC1234567890';
    process.env.PHONE_VERIFICATION_TWILIO_AUTH_TOKEN = 'twilio-token';
    process.env.PHONE_VERIFICATION_TWILIO_MESSAGING_SERVICE_SID = 'MG1234567890';

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 201 }));

    const service = new AuthPhoneVerificationDeliveryService();
    await service.deliverPhoneVerificationCode({
      phoneE164: '+393331112233',
      code: '123456',
      ttlSeconds: 600,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.twilio.com/2010-04-01/Accounts/AC1234567890/Messages.json',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: expect.stringMatching(/^Basic /),
          'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
        }),
      }),
    );

    const [, callInit] = fetchMock.mock.calls[0] ?? [];
    const requestInit = callInit as RequestInit | undefined;
    expect(requestInit).toBeDefined();

    const params = new URLSearchParams(String(requestInit?.body ?? ''));
    expect(params.get('To')).toBe('+393331112233');
    expect(params.get('MessagingServiceSid')).toBe('MG1234567890');
    expect(params.get('Body')).toContain('123456');
  });

  it('fails twilio provider when account credentials are missing', async () => {
    process.env.PHONE_VERIFICATION_DELIVERY_PROVIDER = 'twilio';
    process.env.PHONE_VERIFICATION_TWILIO_ACCOUNT_SID = '';
    process.env.PHONE_VERIFICATION_TWILIO_AUTH_TOKEN = '';
    process.env.PHONE_VERIFICATION_TWILIO_MESSAGING_SERVICE_SID = 'MG1234567890';

    const service = new AuthPhoneVerificationDeliveryService();
    await expect(
      service.deliverPhoneVerificationCode({
        phoneE164: '+393331112233',
        code: '123456',
        ttlSeconds: 600,
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('fails twilio provider when from number and messaging service are both missing', async () => {
    process.env.PHONE_VERIFICATION_DELIVERY_PROVIDER = 'twilio';
    process.env.PHONE_VERIFICATION_TWILIO_ACCOUNT_SID = 'AC1234567890';
    process.env.PHONE_VERIFICATION_TWILIO_AUTH_TOKEN = 'twilio-token';
    process.env.PHONE_VERIFICATION_TWILIO_FROM_NUMBER = '';
    process.env.PHONE_VERIFICATION_TWILIO_MESSAGING_SERVICE_SID = '';

    const service = new AuthPhoneVerificationDeliveryService();
    await expect(
      service.deliverPhoneVerificationCode({
        phoneE164: '+393331112233',
        code: '123456',
        ttlSeconds: 600,
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
