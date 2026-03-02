import { loadWebEnv } from '@adottaungatto/config';
import { NextResponse } from 'next/server';
import { getSessionTokenFromCookie, unauthorizedResponse } from '../../../../lib/api-proxy';

const env = loadWebEnv();

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const token = await getSessionTokenFromCookie();
  if (!token) {
    return unauthorizedResponse();
  }

  const requestUrl = new URL(request.url);
  const threadId = requestUrl.searchParams.get('threadId');
  const query = new URLSearchParams();
  if (threadId) {
    query.set('threadId', threadId);
  }

  const suffix = query.toString() ? `?${query.toString()}` : '';

  try {
    const upstreamResponse = await fetch(`${env.NEXT_PUBLIC_API_URL}/v1/messages/events${suffix}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'text/event-stream',
      },
      cache: 'no-store',
    });

    if (!upstreamResponse.ok || !upstreamResponse.body) {
      const message = await upstreamResponse.text().catch(() => 'Upstream API unavailable.');
      return NextResponse.json(
        {
          message: message || 'Unable to open messaging event stream.',
        },
        { status: upstreamResponse.status || 502 },
      );
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch {
    return NextResponse.json(
      {
        message: 'Upstream API unavailable.',
      },
      { status: 502 },
    );
  }
}

export function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
