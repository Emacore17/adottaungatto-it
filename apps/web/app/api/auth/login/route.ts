import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  exchangeWebCredentialsForToken,
  resolveWebRedirectAfterLogin,
  webSessionCookieName,
} from '../../../../lib/auth';

const toLoginUrl = (request: Request, errorCode: string, nextPath: string) => {
  const url = new URL('/login', request.url);
  url.searchParams.set('error', errorCode);
  url.searchParams.set('next', nextPath);
  return url;
};

const isProduction = process.env.NODE_ENV === 'production';

export async function POST(request: Request) {
  const formData = await request.formData();
  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const nextPath = resolveWebRedirectAfterLogin(formData.get('next')?.toString());

  if (!username || !password) {
    return NextResponse.redirect(toLoginUrl(request, 'missing_credentials', nextPath), 303);
  }

  try {
    const token = await exchangeWebCredentialsForToken(username, password);
    const cookieStore = await cookies();
    cookieStore.set({
      name: webSessionCookieName,
      value: token.accessToken,
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      path: '/',
      maxAge: token.expiresIn,
    });

    return NextResponse.redirect(new URL(nextPath, request.url), 303);
  } catch {
    return NextResponse.redirect(toLoginUrl(request, 'invalid_credentials', nextPath), 303);
  }
}
