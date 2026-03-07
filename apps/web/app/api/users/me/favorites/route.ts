import { NextResponse } from 'next/server';
import { forwardApiRequest, getSessionTokenFromCookie, unauthorizedResponse } from '../../../../../lib/api-proxy';

export async function GET() {
  const token = await getSessionTokenFromCookie();
  if (!token) {
    return unauthorizedResponse();
  }

  return forwardApiRequest({
    pathname: '/v1/users/me/favorites',
    method: 'GET',
    token,
  });
}

export function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
