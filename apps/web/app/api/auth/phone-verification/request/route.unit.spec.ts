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

const createRequest = (phoneE164?: string): Request => {
  const formData = new FormData();
  if (phoneE164) {
    formData.set('phoneE164', phoneE164);
  }

  return new Request('http://localhost:3000/api/auth/phone-verification/request', {
    method: 'POST',
    body: formData,
  });
};

describe('POST /api/auth/phone-verification/request', () => {
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

  it('redirects to login when session token is missing', async () => {
    getSessionTokenFromCookieMock.mockResolvedValueOnce(null);

    const response = await POST(createRequest('+393331112233'));
    const location = response.headers.get('location');

    expect(response.status).toBe(303);
    expect(location).toContain('/login?next=%2Faccount%2Fsicurezza');
  });

  it('maps 429 to rate_limited and propagates retryAfterSeconds from header', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response('{}', {
        status: 429,
        headers: { 'retry-after': '42' },
      }),
    );

    const response = await POST(createRequest('+393331112233'));
    const location = response.headers.get('location');

    expect(response.status).toBe(303);
    expect(location).toContain('phoneVerification=rate_limited');
    expect(location).toContain('retryAfterSeconds=42');
  });

  it('maps 429 to rate_limited and propagates retryAfterSeconds from JSON body when header is absent', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          retryAfterSeconds: 33,
        }),
        {
          status: 429,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );

    const response = await POST(createRequest('+393331112233'));
    const location = response.headers.get('location');

    expect(response.status).toBe(303);
    expect(location).toContain('phoneVerification=rate_limited');
    expect(location).toContain('retryAfterSeconds=33');
  });

  it('maps 503 to delivery_unavailable', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 503 }));

    const response = await POST(createRequest('+393331112233'));
    const location = response.headers.get('location');

    expect(response.status).toBe(303);
    expect(location).toContain('phoneVerification=delivery_unavailable');
  });

  it('maps invalid E.164 validation error to invalid_phone', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          message: 'Field "phoneE164" must be a valid E.164 number (example: +393331112233).',
        }),
        {
          status: 400,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );

    const response = await POST(createRequest('+39-invalid'));
    const location = response.headers.get('location');

    expect(response.status).toBe(303);
    expect(location).toContain('phoneVerification=invalid_phone');
  });

  it('maps missing phone validation error to missing_phone', async () => {
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

    const response = await POST(createRequest());
    const location = response.headers.get('location');

    expect(response.status).toBe(303);
    expect(location).toContain('phoneVerification=missing_phone');
  });

  it('maps unknown upstream failure to request_failed', async () => {
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

    const response = await POST(createRequest('+393331112233'));
    const location = response.headers.get('location');

    expect(response.status).toBe(303);
    expect(location).toContain('phoneVerification=request_failed');
  });

  it('maps success response and forwards devCode in redirect query', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ devCode: '123456' }), {
        status: 202,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const response = await POST(createRequest('+393331112233'));
    const location = response.headers.get('location');

    expect(response.status).toBe(303);
    expect(location).toContain('phoneVerification=requested');
    expect(location).toContain('devCode=123456');
  });
});
