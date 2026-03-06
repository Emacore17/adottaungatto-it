import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getSessionTokenFromCookieMock, validateWebAuthCsrfMock } = vi.hoisted(() => ({
  getSessionTokenFromCookieMock: vi.fn(),
  validateWebAuthCsrfMock: vi.fn(),
}));

vi.mock('@adottaungatto/config', () => ({
  loadWebEnv: () => ({
    NEXT_PUBLIC_API_URL: 'http://api.local.test',
  }),
}));

vi.mock('../../../../../lib/api-proxy', () => ({
  getSessionTokenFromCookie: getSessionTokenFromCookieMock,
}));

vi.mock('../../../../../lib/auth-csrf', () => ({
  validateWebAuthCsrf: validateWebAuthCsrfMock,
}));

import { POST } from './route';

const createRequest = (params: { phoneE164?: string; code?: string }): Request => {
  const formData = new FormData();
  if (params.phoneE164) {
    formData.set('phoneE164', params.phoneE164);
  }
  if (params.code) {
    formData.set('code', params.code);
  }

  return new Request('http://localhost:3000/api/auth/phone-verification/confirm', {
    method: 'POST',
    body: formData,
  });
};

describe('POST /api/auth/phone-verification/confirm', () => {
  beforeEach(() => {
    getSessionTokenFromCookieMock.mockReset();
    getSessionTokenFromCookieMock.mockResolvedValue('token-1');
    validateWebAuthCsrfMock.mockReset();
    validateWebAuthCsrfMock.mockReturnValue(null);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requires OTP code and redirects with missing_code when absent', async () => {
    const response = await POST(createRequest({ phoneE164: '+393331112233' }));
    const location = response.headers.get('location');

    expect(response.status).toBe(303);
    expect(location).toContain('phoneVerification=missing_code');
  });

  it('maps 429 to rate_limited and propagates retryAfterSeconds from JSON body', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          retryAfterSeconds: 75,
        }),
        {
          status: 429,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );

    const response = await POST(createRequest({ phoneE164: '+393331112233', code: '123456' }));
    const location = response.headers.get('location');

    expect(response.status).toBe(303);
    expect(location).toContain('phoneVerification=rate_limited');
    expect(location).toContain('retryAfterSeconds=75');
  });

  it('maps 429 to rate_limited and propagates retryAfterSeconds from header', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response('{}', {
        status: 429,
        headers: { 'retry-after': '21' },
      }),
    );

    const response = await POST(createRequest({ phoneE164: '+393331112233', code: '123456' }));
    const location = response.headers.get('location');

    expect(response.status).toBe(303);
    expect(location).toContain('phoneVerification=rate_limited');
    expect(location).toContain('retryAfterSeconds=21');
  });

  it('maps expired code error to expired status', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          message: 'Verification code expired. Request a new code.',
        }),
        {
          status: 400,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );

    const response = await POST(createRequest({ phoneE164: '+393331112233', code: '123456' }));
    const location = response.headers.get('location');

    expect(response.status).toBe(303);
    expect(location).toContain('phoneVerification=expired');
  });

  it('maps invalid verification code error to invalid_code', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          message: 'Invalid verification code.',
        }),
        {
          status: 400,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );

    const response = await POST(createRequest({ phoneE164: '+393331112233', code: '123456' }));
    const location = response.headers.get('location');

    expect(response.status).toBe(303);
    expect(location).toContain('phoneVerification=invalid_code');
  });

  it('maps missing challenge error to request_required', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          message: 'No active phone verification challenge for this phone number.',
        }),
        {
          status: 400,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );

    const response = await POST(createRequest({ phoneE164: '+393331112233', code: '123456' }));
    const location = response.headers.get('location');

    expect(response.status).toBe(303);
    expect(location).toContain('phoneVerification=request_required');
  });

  it('maps missing phone error to missing_phone', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          message: 'Phone number is required. Provide "phoneE164" or set it in your profile.',
        }),
        {
          status: 400,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );

    const response = await POST(createRequest({ code: '123456' }));
    const location = response.headers.get('location');

    expect(response.status).toBe(303);
    expect(location).toContain('phoneVerification=missing_phone');
  });

  it('maps unknown upstream failure to confirm_failed', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          message: 'Unexpected upstream error.',
        }),
        {
          status: 500,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );

    const response = await POST(createRequest({ phoneE164: '+393331112233', code: '123456' }));
    const location = response.headers.get('location');

    expect(response.status).toBe(303);
    expect(location).toContain('phoneVerification=confirm_failed');
  });

  it('maps success to verified status', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response('{}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const response = await POST(createRequest({ phoneE164: '+393331112233', code: '123456' }));
    const location = response.headers.get('location');

    expect(response.status).toBe(303);
    expect(location).toContain('phoneVerification=verified');
  });
});
