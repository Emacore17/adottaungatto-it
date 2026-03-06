import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  buildWebOidcEndSessionUrl,
  getWebSessionCookiePayload,
  webOidcCodeVerifierCookieName,
  webOidcNextPathCookieName,
  webOidcNonceCookieName,
  webOidcStateCookieName,
  webSessionCookieName,
} from '../../../../lib/auth';
import { validateWebAuthCsrf } from '../../../../lib/auth-csrf';

const isProduction = process.env.NODE_ENV === 'production';

const clearWebAuthCookies = async () => {
  const cookieStore = await cookies();
  const clearCookie = {
    value: '',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isProduction,
    path: '/',
    maxAge: 0,
  };

  cookieStore.set({
    name: webSessionCookieName,
    ...clearCookie,
  });
  cookieStore.set({
    name: webOidcStateCookieName,
    ...clearCookie,
  });
  cookieStore.set({
    name: webOidcNonceCookieName,
    ...clearCookie,
  });
  cookieStore.set({
    name: webOidcCodeVerifierCookieName,
    ...clearCookie,
  });
  cookieStore.set({
    name: webOidcNextPathCookieName,
    ...clearCookie,
  });
};

const resolveLogoutRedirectUrl = async (request: Request): Promise<string> => {
  const session = await getWebSessionCookiePayload();
  await clearWebAuthCookies();

  try {
    return buildWebOidcEndSessionUrl(request.url, session?.idToken ?? null);
  } catch {
    return new URL('/login', request.url).toString();
  }
};

export async function POST(request: Request) {
  const csrfError = validateWebAuthCsrf(request);
  if (csrfError) {
    return csrfError;
  }

  const logoutRedirectUrl = await resolveLogoutRedirectUrl(request);
  if (request.headers.get('x-auth-mode') === 'spa') {
    return NextResponse.json({ redirectTo: logoutRedirectUrl.toString() });
  }

  return NextResponse.redirect(logoutRedirectUrl, 303);
}

export async function GET() {
  return NextResponse.json({ message: 'Method not allowed. Use POST.' }, { status: 405 });
}
