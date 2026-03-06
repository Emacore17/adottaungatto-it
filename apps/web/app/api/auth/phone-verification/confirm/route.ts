import { loadWebEnv } from '@adottaungatto/config';
import { NextResponse } from 'next/server';
import { getSessionTokenFromCookie } from '../../../../../lib/api-proxy';
import { validateWebAuthCsrf } from '../../../../../lib/auth-csrf';

const env = loadWebEnv();

const toSecurityPageUrl = (request: Request, status: string, retryAfterSeconds?: number) => {
  const url = new URL('/account/sicurezza', request.url);
  url.searchParams.set('phoneVerification', status);
  if (
    typeof retryAfterSeconds === 'number' &&
    Number.isInteger(retryAfterSeconds) &&
    retryAfterSeconds > 0
  ) {
    url.searchParams.set('retryAfterSeconds', retryAfterSeconds.toString());
  }
  return url;
};

const toLoginUrl = (request: Request) => {
  const url = new URL('/login', request.url);
  url.searchParams.set('next', '/account/sicurezza');
  return url;
};

const parsePositiveInteger = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return undefined;
};

const parseMessageFromPayload = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as { message?: unknown };
    if (typeof payload.message === 'string') {
      return payload.message;
    }
  } catch {}

  return '';
};

const parseRetryAfterFromResponse = async (response: Response): Promise<number | undefined> => {
  const retryAfterHeader = parsePositiveInteger(response.headers.get('retry-after'));
  if (retryAfterHeader) {
    return retryAfterHeader;
  }

  try {
    const payload = (await response.json()) as { retryAfterSeconds?: unknown };
    return parsePositiveInteger(payload.retryAfterSeconds);
  } catch {
    return undefined;
  }
};

const mapConfirmFailureStatus = (message: string): string => {
  const normalized = message.toLowerCase();
  if (normalized.includes('expired')) {
    return 'expired';
  }

  if (normalized.includes('invalid verification code')) {
    return 'invalid_code';
  }

  if (normalized.includes('no active phone verification challenge')) {
    return 'request_required';
  }

  if (normalized.includes('phone number is required')) {
    return 'missing_phone';
  }

  return 'confirm_failed';
};

export async function POST(request: Request) {
  const csrfError = validateWebAuthCsrf(request);
  if (csrfError) {
    return csrfError;
  }

  const token = await getSessionTokenFromCookie();
  if (!token) {
    return NextResponse.redirect(toLoginUrl(request), 303);
  }

  const formData = await request.formData();
  const phoneE164 = String(formData.get('phoneE164') ?? '').trim();
  const code = String(formData.get('code') ?? '').trim();

  if (!code) {
    return NextResponse.redirect(toSecurityPageUrl(request, 'missing_code'), 303);
  }

  const body = {
    code,
    ...(phoneE164 ? { phoneE164 } : {}),
  };

  try {
    const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/v1/auth/phone-verification/confirm`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (response.status === 401) {
      return NextResponse.redirect(toLoginUrl(request), 303);
    }

    if (response.status === 429) {
      const retryAfterSeconds = await parseRetryAfterFromResponse(response);
      return NextResponse.redirect(toSecurityPageUrl(request, 'rate_limited', retryAfterSeconds), 303);
    }

    if (!response.ok) {
      const message = await parseMessageFromPayload(response);
      return NextResponse.redirect(toSecurityPageUrl(request, mapConfirmFailureStatus(message)), 303);
    }
  } catch {
    return NextResponse.redirect(toSecurityPageUrl(request, 'confirm_failed'), 303);
  }

  return NextResponse.redirect(toSecurityPageUrl(request, 'verified'), 303);
}
