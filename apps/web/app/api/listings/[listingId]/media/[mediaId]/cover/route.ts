import { NextResponse } from 'next/server';
import {
  forwardApiRequest,
  getSessionTokenFromCookie,
  unauthorizedResponse,
} from '../../../../../../../lib/api-proxy';

const parseNumericId = (value: string): string | null => {
  const normalized = value.trim();
  return /^[1-9]\d*$/.test(normalized) ? normalized : null;
};

export async function PATCH(
  _request: Request,
  context: {
    params: Promise<{
      listingId: string;
      mediaId: string;
    }>;
  },
) {
  const token = await getSessionTokenFromCookie();
  if (!token) {
    return unauthorizedResponse();
  }

  const { listingId: rawListingId, mediaId: rawMediaId } = await context.params;
  const listingId = parseNumericId(rawListingId);
  const mediaId = parseNumericId(rawMediaId);
  if (!listingId || !mediaId) {
    return NextResponse.json(
      {
        message: 'Invalid listing or media id.',
      },
      { status: 400 },
    );
  }

  return forwardApiRequest({
    pathname: `/v1/listings/${listingId}/media/${mediaId}/cover`,
    method: 'PATCH',
    token,
  });
}

export function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
