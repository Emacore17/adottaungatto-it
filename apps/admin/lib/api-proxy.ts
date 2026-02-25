import { loadAdminEnv } from '@adottaungatto/config';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { adminSessionCookieName } from './auth';

const env = loadAdminEnv();

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

export const getSessionTokenFromCookie = async (): Promise<string | null> => {
  const cookieStore = await cookies();
  return cookieStore.get(adminSessionCookieName)?.value ?? null;
};

export const unauthorizedResponse = () =>
  NextResponse.json(
    {
      message: 'Unauthorized.',
    },
    { status: 401 },
  );

export const invalidJsonResponse = () =>
  NextResponse.json(
    {
      message: 'Invalid JSON body.',
    },
    { status: 400 },
  );

interface ForwardApiRequestOptions {
  pathname: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  token: string;
  body?: unknown;
}

export const forwardApiRequest = async (
  options: ForwardApiRequestOptions,
): Promise<NextResponse> => {
  try {
    const upstreamResponse = await fetch(`${env.NEXT_PUBLIC_API_URL}${options.pathname}`, {
      method: options.method,
      headers: {
        Authorization: `Bearer ${options.token}`,
        ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
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
};
