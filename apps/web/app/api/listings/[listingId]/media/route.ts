import { NextResponse } from 'next/server';
import {
  forwardApiRequest,
  getSessionTokenFromCookie,
  invalidJsonResponse,
  unauthorizedResponse,
} from '../../../../../lib/api-proxy';

const parseListingId = (value: string): string | null => {
  const normalized = value.trim();
  if (!/^[1-9]\d*$/.test(normalized)) {
    return null;
  }

  return normalized;
};

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      listingId: string;
    }>;
  },
) {
  const token = await getSessionTokenFromCookie();
  if (!token) {
    return unauthorizedResponse();
  }

  const { listingId: rawListingId } = await context.params;
  const listingId = parseListingId(rawListingId);
  if (!listingId) {
    return NextResponse.json(
      {
        message: 'Invalid listing id.',
      },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidJsonResponse();
  }

  return forwardApiRequest({
    pathname: `/v1/listings/${listingId}/media`,
    method: 'POST',
    token,
    body,
  });
}
