'use client';

let refreshSessionPromise: Promise<WebSessionRefreshResult> | null = null;
export const SESSION_EXPIRED_MESSAGE = 'La sessione e scaduta. Accedi di nuovo per continuare.';
export const WEB_SESSION_REFRESHED_EVENT = 'adottaungatto:web-session-refreshed';

export interface WebSessionRefreshResult {
  ok: boolean;
  status: number;
  expiresAt: number | null;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const parseExpiresAt = (value: unknown): number | null => {
  const record = asRecord(value);
  return typeof record.expiresAt === 'number' && Number.isFinite(record.expiresAt)
    ? record.expiresAt
    : null;
};

const dispatchSessionRefreshedEvent = (expiresAt: number | null) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(WEB_SESSION_REFRESHED_EVENT, {
      detail: {
        expiresAt,
      },
    }),
  );
};

const refreshWebSession = async (): Promise<WebSessionRefreshResult> => {
  if (!refreshSessionPromise) {
    refreshSessionPromise = (async () => {
      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: {
            accept: 'application/json',
          },
        });

        const payload = await response.json().catch(() => null);
        const result: WebSessionRefreshResult = {
          ok: response.ok,
          status: response.status,
          expiresAt: parseExpiresAt(payload),
        };

        if (result.ok) {
          dispatchSessionRefreshedEvent(result.expiresAt);
        }

        return result;
      } catch {
        return {
          ok: false,
          status: 0,
          expiresAt: null,
        } satisfies WebSessionRefreshResult;
      } finally {
        refreshSessionPromise = null;
      }
    })();
  }

  return await refreshSessionPromise;
};

export const refreshWebSessionSilently = async (): Promise<WebSessionRefreshResult> =>
  await refreshWebSession();

export const fetchWithAuthRefresh = async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  const response = await fetch(input, init);
  if (response.status !== 401) {
    return response;
  }

  const refreshResult = await refreshWebSession();
  if (!refreshResult.ok) {
    return response;
  }

  return await fetch(input, init);
};
