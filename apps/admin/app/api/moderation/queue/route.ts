import {
  forwardApiRequest,
  getSessionTokenFromCookie,
  unauthorizedResponse,
} from '../../../../lib/api-proxy';

const sanitizeQueueLimit = (rawValue: string | null): string | null => {
  if (!rawValue) {
    return null;
  }

  if (!/^[1-9]\d{0,2}$/.test(rawValue)) {
    return null;
  }

  const numeric = Number.parseInt(rawValue, 10);
  if (numeric > 100) {
    return null;
  }

  return String(numeric);
};

export async function GET(request: Request) {
  const token = await getSessionTokenFromCookie();
  if (!token) {
    return unauthorizedResponse();
  }

  const url = new URL(request.url);
  const limit = sanitizeQueueLimit(url.searchParams.get('limit'));

  return forwardApiRequest({
    pathname: limit ? `/v1/admin/moderation/queue?limit=${limit}` : '/v1/admin/moderation/queue',
    method: 'GET',
    token,
  });
}
