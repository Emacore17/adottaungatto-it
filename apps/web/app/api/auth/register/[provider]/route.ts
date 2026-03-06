import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  createWebOidcRegisterContext,
  resolveEnabledWebSocialProviderAlias,
  resolveWebRedirectAfterLogin,
  webOidcCodeVerifierCookieName,
  webOidcNextPathCookieName,
  webOidcNonceCookieName,
  webOidcStateCookieName,
} from '../../../../../lib/auth';

const isProduction = process.env.NODE_ENV === 'production';
const oidcChallengeCookieMaxAgeSeconds = 10 * 60;

const toRegisterUrl = (request: Request, errorCode: string, nextPath: string) => {
  const url = new URL('/registrati', request.url);
  url.searchParams.set('error', errorCode);
  url.searchParams.set('next', nextPath);
  return url;
};

const setOidcChallengeCookies = async (
  state: string,
  nonce: string,
  codeVerifier: string,
  nextPath: string,
) => {
  const cookieStore = await cookies();
  const baseCookie = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isProduction,
    path: '/',
    maxAge: oidcChallengeCookieMaxAgeSeconds,
  };

  cookieStore.set({
    name: webOidcStateCookieName,
    value: state,
    ...baseCookie,
  });
  cookieStore.set({
    name: webOidcNonceCookieName,
    value: nonce,
    ...baseCookie,
  });
  cookieStore.set({
    name: webOidcCodeVerifierCookieName,
    value: codeVerifier,
    ...baseCookie,
  });
  cookieStore.set({
    name: webOidcNextPathCookieName,
    value: nextPath,
    ...baseCookie,
  });
};

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      provider: string;
    }>;
  },
) {
  const url = new URL(request.url);
  const nextPath = resolveWebRedirectAfterLogin(url.searchParams.get('next') ?? '/verifica-account');
  const { provider: rawProviderAlias } = await context.params;
  const providerAlias = resolveEnabledWebSocialProviderAlias(rawProviderAlias);

  if (!providerAlias) {
    return NextResponse.redirect(toRegisterUrl(request, 'social_provider_unavailable', nextPath), 303);
  }

  const oidcContext = createWebOidcRegisterContext(request.url, nextPath, {
    idpHint: providerAlias,
  });
  await setOidcChallengeCookies(
    oidcContext.state,
    oidcContext.nonce,
    oidcContext.codeVerifier,
    oidcContext.nextPath,
  );
  return NextResponse.redirect(oidcContext.authorizationUrl, 303);
}
