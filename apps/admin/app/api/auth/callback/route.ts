import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  adminOidcCodeVerifierCookieName,
  adminOidcNextPathCookieName,
  adminOidcNonceCookieName,
  adminOidcStateCookieName,
  adminSessionCookieName,
  buildAdminSessionCookie,
  exchangeAdminAuthorizationCodeForToken,
  readNonceFromAdminIdToken,
  resolveAdminRedirectAfterLogin,
} from '../../../../lib/auth';

const isProduction = process.env.NODE_ENV === 'production';

const toLoginUrl = (request: Request, errorCode: string, nextPath: string) => {
  const url = new URL('/login', request.url);
  url.searchParams.set('error', errorCode);
  url.searchParams.set('next', nextPath);
  return url;
};

const clearOidcChallengeCookies = async () => {
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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');
  const providerError = url.searchParams.get('error');

  const cookieStore = await cookies();
  const nextPath = resolveAdminRedirectAfterLogin(cookieStore.get(adminOidcNextPathCookieName)?.value);
  const expectedState = cookieStore.get(adminOidcStateCookieName)?.value ?? null;
  const expectedNonce = cookieStore.get(adminOidcNonceCookieName)?.value ?? null;
  const codeVerifier = cookieStore.get(adminOidcCodeVerifierCookieName)?.value ?? null;

  await clearOidcChallengeCookies();

  if (providerError) {
    return NextResponse.redirect(toLoginUrl(request, 'auth_cancelled', nextPath), 303);
  }

  if (!code || !returnedState || !expectedState || returnedState !== expectedState || !codeVerifier) {
    return NextResponse.redirect(toLoginUrl(request, 'invalid_callback_state', nextPath), 303);
  }

  try {
    const token = await exchangeAdminAuthorizationCodeForToken(code, codeVerifier, request.url);
    const tokenNonce = readNonceFromAdminIdToken(token.idToken);

    if (!expectedNonce || !tokenNonce || tokenNonce !== expectedNonce) {
      return NextResponse.redirect(toLoginUrl(request, 'invalid_callback_nonce', nextPath), 303);
    }

    const sessionCookie = buildAdminSessionCookie({
      accessToken: token.accessToken,
      expiresIn: token.expiresIn,
      refreshToken: token.refreshToken,
      refreshExpiresIn: token.refreshExpiresIn,
      idToken: token.idToken,
    });

    cookieStore.set({
      name: adminSessionCookieName,
      value: sessionCookie.value,
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      path: '/',
      maxAge: sessionCookie.maxAge,
    });

    return NextResponse.redirect(new URL(nextPath, request.url), 303);
  } catch {
    return NextResponse.redirect(toLoginUrl(request, 'auth_provider_unavailable', nextPath), 303);
  }
}
