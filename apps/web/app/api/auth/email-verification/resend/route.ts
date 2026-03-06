import { loadWebEnv } from '@adottaungatto/config';
import { NextResponse } from 'next/server';
import { getSessionTokenFromCookie } from '../../../../../lib/api-proxy';
import { validateWebAuthCsrf } from '../../../../../lib/auth-csrf';

const env = loadWebEnv();

const toVerifyAccountUrl = (request: Request, status: 'sent' | 'failed') => {
  const url = new URL('/verifica-account', request.url);
  url.searchParams.set('status', status);
  return url;
};

const toLoginUrl = (request: Request) => {
  const url = new URL('/login', request.url);
  url.searchParams.set('next', '/verifica-account');
  return url;
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

  try {
    const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/v1/auth/email-verification/resend`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (response.status === 401) {
      return NextResponse.redirect(toLoginUrl(request), 303);
    }

    if (!response.ok) {
      return NextResponse.redirect(toVerifyAccountUrl(request, 'failed'), 303);
    }
  } catch {
    return NextResponse.redirect(toVerifyAccountUrl(request, 'failed'), 303);
  }

  return NextResponse.redirect(toVerifyAccountUrl(request, 'sent'), 303);
}
