import { NextResponse } from 'next/server';
import {
  forwardApiRequest,
  getSessionTokenFromCookie,
  invalidJsonResponse,
  unauthorizedResponse,
} from '../../../../../../lib/api-proxy';

const parseNumericId = (value: string): string | null => {
  const normalized = value.trim();
  return /^[1-9]\d*$/.test(normalized) ? normalized : null;
};

export async function POST(
  request: Request,
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidJsonResponse();
  }

  return forwardApiRequest({
    pathname: `/v1/messages/threads/${threadId}/messages`,
    method: 'POST',
    token,
    body,
  });
}

export function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
