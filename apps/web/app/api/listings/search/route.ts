import { loadWebEnv } from '@adottaungatto/config';
import { NextResponse } from 'next/server';

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

export async function GET(request: Request) {
  const { search } = new URL(request.url);

  try {
    const upstreamResponse = await fetch(`${env.NEXT_PUBLIC_API_URL}/v1/listings/search${search}`, {
      cache: 'no-store',
    });

    const payloadText = await upstreamResponse.text();
    const payload = parseApiResponsePayload(payloadText);
    return NextResponse.json(payload, {
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
