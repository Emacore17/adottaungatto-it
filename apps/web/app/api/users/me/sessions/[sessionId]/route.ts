import { NextResponse } from 'next/server';
import { forwardApiRequest, getSessionTokenFromCookie, unauthorizedResponse } from '../../../../../../lib/api-proxy';

const parseSessionId = (value: string): string | null => {
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= 255 ? normalized : null;
};

interface SessionRouteContext {
  params: Promise<{
    sessionId: string;
  }>;
}

export async function DELETE(_request: Request, context: SessionRouteContext) {
  const token = await getSessionTokenFromCookie();
  if (!token) {
    return unauthorizedResponse();
  }

  const { sessionId: rawSessionId } = await context.params;
  const sessionId = parseSessionId(rawSessionId);
  if (!sessionId) {
    return NextResponse.json(
      {
        message: 'Invalid session id.',
      },
      { status: 400 },
    );
  }

  return forwardApiRequest({
    pathname: `/v1/users/me/sessions/${encodeURIComponent(sessionId)}`,
    method: 'DELETE',
    token,
  });
}

export function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
