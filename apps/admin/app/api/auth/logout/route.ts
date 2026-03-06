import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  adminOidcCodeVerifierCookieName,
  adminOidcNextPathCookieName,
  adminOidcNonceCookieName,
  adminOidcStateCookieName,
  adminSessionCookieName,
  buildAdminOidcEndSessionUrl,
  getAdminSessionCookiePayload,
} from '../../../../lib/auth';
import { validateAdminAuthCsrf } from '../../../../lib/auth-csrf';

const isProduction = process.env.NODE_ENV === 'production';

const clearAdminAuthCookies = async () => {
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
    name: adminSessionCookieName,
    ...clearCookie,
  });
  cookieStore.set({
    name: adminOidcStateCookieName,
    ...clearCookie,
  });
  cookieStore.set({
    name: adminOidcNonceCookieName,
    ...clearCookie,
  });
  cookieStore.set({
    name: adminOidcCodeVerifierCookieName,
    ...clearCookie,
  });
  cookieStore.set({
    name: adminOidcNextPathCookieName,
    ...clearCookie,
  });
};

const handleLogout = async (request: Request) => {
  const session = await getAdminSessionCookiePayload();
  await clearAdminAuthCookies();

  try {
    const logoutUrl = buildAdminOidcEndSessionUrl(request.url, session?.idToken ?? null);
    return NextResponse.redirect(logoutUrl, 303);
  } catch {
    return NextResponse.redirect(new URL('/login', request.url), 303);
  }
};

export async function POST(request: Request) {
  const csrfError = validateAdminAuthCsrf(request);
  if (csrfError) {
    return csrfError;
  }

  return handleLogout(request);
}

export async function GET() {
  return NextResponse.json({ message: 'Method not allowed. Use POST.' }, { status: 405 });
}
