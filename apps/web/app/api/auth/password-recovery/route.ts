import { loadWebEnv } from '@adottaungatto/config';
import { NextResponse } from 'next/server';
import { validateWebAuthCsrf } from '../../../../lib/auth-csrf';

const env = loadWebEnv();

const toForgotPasswordUrl = (request: Request, status: 'sent' | 'missing_identifier') => {
  const url = new URL('/password-dimenticata', request.url);
  url.searchParams.set('status', status);
  return url;
};

export async function POST(request: Request) {
  const csrfError = validateWebAuthCsrf(request);
  if (csrfError) {
    return csrfError;
  }

  const formData = await request.formData();
  const identifier = String(formData.get('identifier') ?? '').trim();
  if (!identifier) {
    return NextResponse.redirect(toForgotPasswordUrl(request, 'missing_identifier'), 303);
  }

  try {
    await fetch(`${env.NEXT_PUBLIC_API_URL}/v1/auth/password-recovery`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ identifier }),
      cache: 'no-store',
    });
  } catch {}

  // Always return a neutral success state to avoid user enumeration.
  return NextResponse.redirect(toForgotPasswordUrl(request, 'sent'), 303);
}
