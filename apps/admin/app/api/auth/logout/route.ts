import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { adminSessionCookieName } from '../../../../lib/auth';

const clearAdminSessionCookie = async () => {
  const cookieStore = await cookies();
  cookieStore.set({
    name: adminSessionCookieName,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 0,
  });
};

export async function POST(request: Request) {
  await clearAdminSessionCookie();
  return NextResponse.redirect(new URL('/login', request.url), 303);
}

export async function GET(request: Request) {
  await clearAdminSessionCookie();
  return NextResponse.redirect(new URL('/login', request.url), 303);
}
