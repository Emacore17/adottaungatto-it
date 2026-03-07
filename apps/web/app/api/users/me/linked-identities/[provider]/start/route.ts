import { NextResponse } from 'next/server';
import { forwardApiRequest, getSessionTokenFromCookie, unauthorizedResponse } from '../../../../../../../lib/api-proxy';

const parseProviderAlias = (value: string): string | null => {
  const normalized = value.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9_-]{0,62}$/.test(normalized) ? normalized : null;
};

interface LinkedIdentityStartRouteContext {
  params: Promise<{
    provider: string;
  }>;
}

export async function POST(_request: Request, context: LinkedIdentityStartRouteContext) {
  const token = await getSessionTokenFromCookie();
  if (!token) {
    return unauthorizedResponse();
  }

  const { provider: rawProvider } = await context.params;
  const provider = parseProviderAlias(rawProvider);
  if (!provider) {
    return NextResponse.json(
      {
        message: 'Invalid provider alias.',
      },
      { status: 400 },
    );
  }

  return forwardApiRequest({
    pathname: `/v1/users/me/linked-identities/${provider}/start`,
    method: 'POST',
    token,
  });
}

export function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
