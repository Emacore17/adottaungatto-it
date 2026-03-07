'use client';

let refreshSessionPromise: Promise<boolean> | null = null;
export const SESSION_EXPIRED_MESSAGE = 'La sessione e scaduta. Accedi di nuovo per continuare.';

const refreshWebSession = async (): Promise<boolean> => {
  if (!refreshSessionPromise) {
    refreshSessionPromise = (async () => {
      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: {
            accept: 'application/json',
          },
        });

        return response.ok;
      } catch {
        return false;
      } finally {
        refreshSessionPromise = null;
      }
    })();
  }

  return await refreshSessionPromise;
};

export const fetchWithAuthRefresh = async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  const response = await fetch(input, init);
  if (response.status !== 401) {
    return response;
  }

  const refreshCompleted = await refreshWebSession();
  if (!refreshCompleted) {
    return response;
  }

  return await fetch(input, init);
};
