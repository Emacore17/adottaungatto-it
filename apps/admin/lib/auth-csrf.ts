import { loadAdminEnv } from '@adottaungatto/config';
import { NextResponse } from 'next/server';

const env = loadAdminEnv();
const configuredAdminOrigin = new URL(env.NEXT_PUBLIC_ADMIN_URL).origin;

const parseHeaderOrigin = (rawValue: string | null): string | null => {
  if (!rawValue) {
    return null;
  }

  const normalized = rawValue.split(',')[0]?.trim();
  if (!normalized) {
    return null;
  }

  try {
    return new URL(normalized).origin;
  } catch {
    return null;
  }
};

const buildTrustedOrigins = (request: Request): Set<string> => {
  const trustedOrigins = new Set<string>([configuredAdminOrigin]);
  try {
    trustedOrigins.add(new URL(request.url).origin);
  } catch {}

  return trustedOrigins;
};

export const validateAdminAuthCsrf = (request: Request): NextResponse | null => {
  const trustedOrigins = buildTrustedOrigins(request);
  const requestOrigin = parseHeaderOrigin(request.headers.get('origin'));
  if (requestOrigin) {
    if (trustedOrigins.has(requestOrigin)) {
      return null;
    }

    return NextResponse.json({ message: 'CSRF validation failed.' }, { status: 403 });
  }

  const refererOrigin = parseHeaderOrigin(request.headers.get('referer'));
  if (refererOrigin && trustedOrigins.has(refererOrigin)) {
    return null;
  }

  return NextResponse.json({ message: 'CSRF validation failed.' }, { status: 403 });
};
