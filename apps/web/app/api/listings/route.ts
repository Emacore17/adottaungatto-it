import { NextResponse } from 'next/server';
import {
  forwardApiRequest,
  getSessionTokenFromCookie,
  invalidJsonResponse,
  unauthorizedResponse,
} from '../../../lib/api-proxy';

export async function POST(request: Request) {
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
    pathname: '/v1/listings',
    method: 'POST',
    token,
    body,
  });
}

export async function GET() {
  const token = await getSessionTokenFromCookie();
  if (!token) {
    return unauthorizedResponse();
  }

  return forwardApiRequest({
    pathname: '/v1/listings/me',
    method: 'GET',
    token,
  });
}

export function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
