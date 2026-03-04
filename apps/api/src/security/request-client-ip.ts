type HeaderValue = string | string[] | undefined;

export type RequestWithClientIp = {
  headers?: Record<string, HeaderValue>;
  ip?: string | null;
};

export const pickFirstHeaderValue = (value: HeaderValue): string | null => {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0]?.trim() || null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeClientIp = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, 64);
};

export const resolveClientIp = (
  request: RequestWithClientIp,
  trustProxyEnabled: boolean,
): string | null => {
  if (trustProxyEnabled) {
    const forwardedFor = pickFirstHeaderValue(request.headers?.['x-forwarded-for']);
    if (forwardedFor) {
      const firstForwardedIp = forwardedFor
        .split(',')
        .map((entry) => entry.trim())
        .find((entry) => entry.length > 0);
      const normalizedForwardedIp = normalizeClientIp(firstForwardedIp);
      if (normalizedForwardedIp) {
        return normalizedForwardedIp;
      }
    }

    const realIp = normalizeClientIp(pickFirstHeaderValue(request.headers?.['x-real-ip']));
    if (realIp) {
      return realIp;
    }
  }

  return normalizeClientIp(request.ip) ?? null;
};
