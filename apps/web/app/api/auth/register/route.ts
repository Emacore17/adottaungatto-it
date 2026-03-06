import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  createWebOidcRegisterContext,
  resolveWebRedirectAfterLogin,
  webOidcCodeVerifierCookieName,
  webOidcNextPathCookieName,
  webOidcNonceCookieName,
  webOidcStateCookieName,
} from '../../../../lib/auth';
import { validateWebAuthCsrf } from '../../../../lib/auth-csrf';

const isProduction = process.env.NODE_ENV === 'production';
const oidcChallengeCookieMaxAgeSeconds = 10 * 60;

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

const redirectToRegisterFlow = async (request: Request, nextPath: string) => {
  const context = createWebOidcRegisterContext(request.url, nextPath);
  await setOidcChallengeCookies(context.state, context.nonce, context.codeVerifier, context.nextPath);
  return NextResponse.redirect(context.authorizationUrl, 303);
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const nextPath = resolveWebRedirectAfterLogin(url.searchParams.get('next'));
  return redirectToRegisterFlow(request, nextPath);
}

export async function POST(request: Request) {
  const csrfError = validateWebAuthCsrf(request);
  if (csrfError) {
    return csrfError;
  }

  const formData = await request.formData();
  const nextPath = resolveWebRedirectAfterLogin(formData.get('next')?.toString());
  return redirectToRegisterFlow(request, nextPath);
}
