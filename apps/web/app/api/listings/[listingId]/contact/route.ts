import { loadWebEnv } from '@adottaungatto/config';
import { NextResponse } from 'next/server';
import { invalidJsonResponse } from '../../../../../lib/api-proxy';

const env = loadWebEnv();

const parseListingId = (value: string): string | null => {
  const normalized = value.trim();
  if (!/^[1-9]\d*$/.test(normalized)) {
    return null;
  }

  return normalized;
};

const parseApiResponsePayload = (rawText: string): unknown => {
  if (!rawText) {
    return {};
  }

  try {
    return JSON.parse(rawText) as unknown;
  } catch {
    return {
      message: rawText,
    };
  }
};

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      listingId: string;
    }>;
  },
) {
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

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return invalidJsonResponse();
  }

  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const userAgent = request.headers.get('user-agent');

  try {
    const upstreamResponse = await fetch(
      `${env.NEXT_PUBLIC_API_URL}/v1/listings/${listingId}/contact`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(forwardedFor ? { 'x-forwarded-for': forwardedFor } : {}),
          ...(realIp ? { 'x-real-ip': realIp } : {}),
          ...(userAgent ? { 'user-agent': userAgent } : {}),
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      },
    );

    const payloadText = await upstreamResponse.text();
    const parsedPayload = parseApiResponsePayload(payloadText);
    return NextResponse.json(parsedPayload, {
      status: upstreamResponse.status,
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
