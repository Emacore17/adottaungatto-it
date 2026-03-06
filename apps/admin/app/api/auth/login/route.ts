import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  adminOidcCodeVerifierCookieName,
  adminOidcNextPathCookieName,
  adminOidcNonceCookieName,
  adminOidcStateCookieName,
  createAdminOidcLoginContext,
  resolveAdminRedirectAfterLogin,
} from '../../../../lib/auth';
import { validateAdminAuthCsrf } from '../../../../lib/auth-csrf';

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
    name: adminOidcStateCookieName,
    value: state,
    ...baseCookie,
  });
  cookieStore.set({
    name: adminOidcNonceCookieName,
    value: nonce,
    ...baseCookie,
  });
  cookieStore.set({
    name: adminOidcCodeVerifierCookieName,
    value: codeVerifier,
    ...baseCookie,
  });
  cookieStore.set({
    name: adminOidcNextPathCookieName,
    value: nextPath,
    ...baseCookie,
  });
};

const redirectToOidcProvider = async (request: Request, nextPath: string) => {
  const context = createAdminOidcLoginContext(request.url, nextPath);
  await setOidcChallengeCookies(context.state, context.nonce, context.codeVerifier, context.nextPath);
  return NextResponse.redirect(context.authorizationUrl, 303);
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const nextPath = resolveAdminRedirectAfterLogin(url.searchParams.get('next'));
  return redirectToOidcProvider(request, nextPath);
}

export async function POST(request: Request) {
  const csrfError = validateAdminAuthCsrf(request);
  if (csrfError) {
    return csrfError;
  }

  const formData = await request.formData();
  const nextPath = resolveAdminRedirectAfterLogin(formData.get('next')?.toString());
  return redirectToOidcProvider(request, nextPath);
}
