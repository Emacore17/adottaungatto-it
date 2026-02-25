import { loadWebEnv } from '@adottaungatto/config';
import { NextResponse } from 'next/server';
import { invalidJsonResponse } from '../../../../lib/api-proxy';

const env = loadWebEnv();

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

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return invalidJsonResponse();
  }

  try {
    const upstreamResponse = await fetch(`${env.NEXT_PUBLIC_API_URL}/v1/analytics/events`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

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
