import { NextResponse } from 'next/server';
import {
  forwardApiRequest,
  getSessionTokenFromCookie,
  unauthorizedResponse,
} from '../../../../../../lib/api-proxy';

const parseNumericId = (value: string): string | null => {
  const normalized = value.trim();
  return /^[1-9]\d*$/.test(normalized) ? normalized : null;
};

export async function DELETE(
  _request: Request,
  context: {
    params: Promise<{
      threadId: string;
    }>;
  },
) {
  const token = await getSessionTokenFromCookie();
  if (!token) {
    return unauthorizedResponse();
  }

  const { threadId: rawThreadId } = await context.params;
  const threadId = parseNumericId(rawThreadId);
  if (!threadId) {
    return NextResponse.json(
      {
        message: 'Invalid thread id.',
      },
      { status: 400 },
    );
  }

  return forwardApiRequest({
    pathname: `/v1/messages/threads/${threadId}/everyone`,
    method: 'DELETE',
    token,
  });
}

export function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
