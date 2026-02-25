import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { webSessionCookieName } from '../../../../lib/auth';

const clearWebSessionCookie = async () => {
  const cookieStore = await cookies();
  cookieStore.set({
    name: webSessionCookieName,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 0,
  });
};

export async function POST(request: Request) {
  await clearWebSessionCookie();
  return NextResponse.redirect(new URL('/login', request.url), 303);
}

export async function GET(request: Request) {
  await clearWebSessionCookie();
  return NextResponse.redirect(new URL('/login', request.url), 303);
}
