import { isOidcInvalidGrantError } from '@adottaungatto/sdk';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  adminSessionCookieName,
  buildAdminSessionCookie,
  getAdminSessionCookiePayload,
  refreshAdminSessionToken,
} from '../../../../lib/auth';
import { validateAdminAuthCsrf } from '../../../../lib/auth-csrf';

const isProduction = process.env.NODE_ENV === 'production';

const clearSessionCookie = async () => {
  const cookieStore = await cookies();
  cookieStore.set({
    name: adminSessionCookieName,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
    maxAge: 0,
  });
};

export async function POST(request: Request) {
  const csrfError = validateAdminAuthCsrf(request);
  if (csrfError) {
    return csrfError;
  }

  const session = await getAdminSessionCookiePayload();
  if (!session?.refreshToken) {
    return NextResponse.json({ message: 'Refresh token unavailable.' }, { status: 401 });
  }

  try {
    const token = await refreshAdminSessionToken(session.refreshToken);
    const sessionCookie = buildAdminSessionCookie({
      accessToken: token.accessToken,
      expiresIn: token.expiresIn,
      refreshToken: token.refreshToken ?? session.refreshToken,
      refreshExpiresIn: token.refreshExpiresIn,
      idToken: token.idToken ?? session.idToken,
    });

    const cookieStore = await cookies();
    cookieStore.set({
      name: adminSessionCookieName,
      value: sessionCookie.value,
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      path: '/',
      maxAge: sessionCookie.maxAge,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isOidcInvalidGrantError(error)) {
      await clearSessionCookie();
      return NextResponse.json({ message: 'Session expired.' }, { status: 401 });
    }

    return NextResponse.json({ message: 'Auth provider unavailable.' }, { status: 503 });
  }
}
