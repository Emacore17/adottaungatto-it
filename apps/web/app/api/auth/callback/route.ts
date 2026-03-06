import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  buildWebSessionCookie,
  exchangeWebAuthorizationCodeForToken,
  readNonceFromIdToken,
  resolveWebRedirectAfterLogin,
  webOidcCodeVerifierCookieName,
  webOidcNextPathCookieName,
  webOidcNonceCookieName,
  webOidcStateCookieName,
  webSessionCookieName,
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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');
  const providerError = url.searchParams.get('error');

  const cookieStore = await cookies();
  const nextPath = resolveWebRedirectAfterLogin(cookieStore.get(webOidcNextPathCookieName)?.value);
  const expectedState = cookieStore.get(webOidcStateCookieName)?.value ?? null;
  const expectedNonce = cookieStore.get(webOidcNonceCookieName)?.value ?? null;
  const codeVerifier = cookieStore.get(webOidcCodeVerifierCookieName)?.value ?? null;

  await clearOidcChallengeCookies();

  if (providerError) {
    return NextResponse.redirect(toLoginUrl(request, 'auth_cancelled', nextPath), 303);
  }

  if (!code || !returnedState || !expectedState || returnedState !== expectedState || !codeVerifier) {
    return NextResponse.redirect(toLoginUrl(request, 'invalid_callback_state', nextPath), 303);
  }

  try {
    const token = await exchangeWebAuthorizationCodeForToken(code, codeVerifier, request.url);
    const tokenNonce = readNonceFromIdToken(token.idToken);

    if (!expectedNonce || !tokenNonce || tokenNonce !== expectedNonce) {
      return NextResponse.redirect(toLoginUrl(request, 'invalid_callback_nonce', nextPath), 303);
    }

    const sessionCookie = buildWebSessionCookie({
      accessToken: token.accessToken,
      expiresIn: token.expiresIn,
      refreshToken: token.refreshToken,
      refreshExpiresIn: token.refreshExpiresIn,
      idToken: token.idToken,
    });

    cookieStore.set({
      name: webSessionCookieName,
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
