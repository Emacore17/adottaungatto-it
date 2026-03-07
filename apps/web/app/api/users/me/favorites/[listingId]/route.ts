import { NextResponse } from 'next/server';
import { forwardApiRequest, getSessionTokenFromCookie, unauthorizedResponse } from '../../../../../../lib/api-proxy';

const parseListingId = (value: string): string | null => {
  const normalized = value.trim();
  return /^[1-9]\d*$/.test(normalized) ? normalized : null;
};

interface FavoriteListingRouteContext {
  params: Promise<{
    listingId: string;
  }>;
}

export async function PUT(_request: Request, context: FavoriteListingRouteContext) {
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

  return forwardApiRequest({
    pathname: `/v1/users/me/favorites/${listingId}`,
    method: 'PUT',
    token,
  });
}

export async function DELETE(_request: Request, context: FavoriteListingRouteContext) {
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

  return forwardApiRequest({
    pathname: `/v1/users/me/favorites/${listingId}`,
    method: 'DELETE',
    token,
  });
}

export function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
