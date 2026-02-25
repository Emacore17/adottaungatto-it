import {
  forwardApiRequest,
  getSessionTokenFromCookie,
  invalidJsonResponse,
  unauthorizedResponse,
} from '../../../../../lib/api-proxy';
import { moderationActionValues } from '../../../../../lib/moderation-types';

const moderationActionSet = new Set<string>(moderationActionValues);

const parsePositiveIntegerString = (value: string): string | null =>
  /^[1-9]\d*$/.test(value) ? value : null;

const parseReasonFromBody = (body: unknown): string | null => {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return null;
  }

  const record = body as Record<string, unknown>;
  if (typeof record.reason !== 'string') {
    return null;
  }

  const normalized = record.reason.trim();
  if (normalized.length < 3 || normalized.length > 2000) {
    return null;
  }

  return normalized;
};

interface ModerationActionRouteContext {
  params: Promise<{
    listingId: string;
    action: string;
  }>;
}

export async function POST(request: Request, context: ModerationActionRouteContext) {
  const token = await getSessionTokenFromCookie();
  if (!token) {
    return unauthorizedResponse();
  }

  const params = await context.params;
  const listingId = parsePositiveIntegerString(params.listingId);
  const action = params.action;
  if (!listingId || !moderationActionSet.has(action)) {
    return Response.json(
      {
        message: 'Invalid moderation action route params.',
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

  const reason = parseReasonFromBody(body);
  if (!reason) {
    return Response.json(
      {
        message: 'Field "reason" must contain between 3 and 2000 characters.',
      },
      { status: 400 },
    );
  }

  return forwardApiRequest({
    pathname: `/v1/admin/moderation/${listingId}/${action}`,
    method: 'POST',
    token,
    body: {
      reason,
    },
  });
}
