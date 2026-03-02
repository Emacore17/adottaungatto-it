import { NextResponse } from 'next/server';
import {
  forwardApiRequest,
  getSessionTokenFromCookie,
  invalidJsonResponse,
  unauthorizedResponse,
} from '../../../../../lib/api-proxy';

export async function PATCH(request: Request) {
  const token = await getSessionTokenFromCookie();
  if (!token) {
    return unauthorizedResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidJsonResponse();
  }

  return forwardApiRequest({
    pathname: '/v1/users/me/preferences',
    method: 'PATCH',
    token,
    body,
  });
}

export function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
