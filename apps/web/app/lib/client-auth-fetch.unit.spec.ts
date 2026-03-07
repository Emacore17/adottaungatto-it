import { afterEach, describe, expect, it, vi } from 'vitest';

const createJsonResponse = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  });

describe('fetchWithAuthRefresh', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('retries the original request after a successful refresh', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(createJsonResponse(401, { message: 'expired' }))
      .mockResolvedValueOnce(createJsonResponse(200, { ok: true }))
      .mockResolvedValueOnce(createJsonResponse(200, { data: 'ok' }));

    vi.stubGlobal('fetch', fetchMock);
    const { fetchWithAuthRefresh } = await import('../../lib/client-auth-fetch');

    const response = await fetchWithAuthRefresh('/api/users/me/preferences', {
      method: 'PATCH',
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/users/me/preferences', {
      method: 'PATCH',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/auth/refresh', {
      headers: {
        accept: 'application/json',
      },
      method: 'POST',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/users/me/preferences', {
      method: 'PATCH',
    });
  });

  it('returns the original 401 response when refresh fails', async () => {
    const initialResponse = createJsonResponse(401, { message: 'expired' });
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(initialResponse)
      .mockResolvedValueOnce(createJsonResponse(401, { message: 'refresh failed' }));

    vi.stubGlobal('fetch', fetchMock);
    const { fetchWithAuthRefresh } = await import('../../lib/client-auth-fetch');

    const response = await fetchWithAuthRefresh('/api/users/me/consents');

    expect(response).toBe(initialResponse);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/auth/refresh', {
      headers: {
        accept: 'application/json',
      },
      method: 'POST',
    });
  });
});
