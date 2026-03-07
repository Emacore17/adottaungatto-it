import type { components } from './generated/openapi';

export type ApiErrorResponse = components['schemas']['ErrorResponse'];
export type ApiHealthResponse = components['schemas']['HealthResponse'];
export type ApiSearchHealthResponse = components['schemas']['SearchHealthResponse'];
export type ApiMeResponse = components['schemas']['MeResponse'];
export type ApiProfileResponse = components['schemas']['ProfileResponse'];
export type ApiConsentsResponse = components['schemas']['ConsentsResponse'];
export type ApiFavoritesResponse = components['schemas']['FavoritesResponse'];
export type ApiLinkedIdentitiesResponse = components['schemas']['LinkedIdentitiesResponse'];
export type ApiStartLinkedIdentityResponse = components['schemas']['StartLinkedIdentityResponse'];
export type ApiSessionsResponse = components['schemas']['SessionsResponse'];

export type ApiUpdateProfileRequest = components['schemas']['UpdateProfileRequest'];
export type ApiUpsertAvatarRequest = components['schemas']['UpsertAvatarRequest'];
export type ApiUpdateConsentsRequest = components['schemas']['UpdateConsentsRequest'];
export type ApiUpdatePreferencesRequest = components['schemas']['UpdatePreferencesRequest'];

export class ApiClientError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(input: { status: number; payload: unknown }) {
    super(`API request failed with status ${input.status}`);
    this.name = 'ApiClientError';
    this.status = input.status;
    this.payload = input.payload;
  }
}

export interface ApiV1ClientOptions {
  baseUrl: string;
  accessToken?: string | null | (() => string | null | Promise<string | null>);
  headers?: Record<string, string>;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

const normalizeBaseUrl = (value: string): string => value.replace(/\/$/, '');

const parseJsonSafe = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const resolveAccessToken = async (
  accessToken: ApiV1ClientOptions['accessToken'],
): Promise<string | null> => {
  if (typeof accessToken === 'function') {
    return (await accessToken()) ?? null;
  }

  return accessToken ?? null;
};

export class ApiV1Client {
  private readonly baseUrl: string;
  private readonly accessToken: ApiV1ClientOptions['accessToken'];
  private readonly defaultHeaders: Record<string, string>;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(input: ApiV1ClientOptions) {
    this.baseUrl = normalizeBaseUrl(input.baseUrl);
    this.accessToken = input.accessToken;
    this.defaultHeaders = input.headers ?? {};
    this.fetchImpl = input.fetchImpl ?? fetch;
    this.timeoutMs = input.timeoutMs ?? 10_000;
  }

  private async requestJson<TResponse, TBody = never>(input: {
    path: string;
    method?: 'GET' | 'PATCH' | 'POST' | 'PUT' | 'DELETE';
    body?: TBody;
    auth?: boolean;
  }): Promise<TResponse> {
    const token = input.auth === false ? null : await resolveAccessToken(this.accessToken);
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      accept: 'application/json',
    };

    let serializedBody: string | undefined;
    if (input.body !== undefined) {
      headers['content-type'] = 'application/json';
      serializedBody = JSON.stringify(input.body);
    }

    if (token) {
      headers.authorization = `Bearer ${token}`;
    }

    const response = await this.fetchImpl(`${this.baseUrl}${input.path}`, {
      method: input.method ?? 'GET',
      headers,
      body: serializedBody,
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      throw new ApiClientError({
        status: response.status,
        payload: await parseJsonSafe(response),
      });
    }

    return (await response.json()) as TResponse;
  }

  getHealth(): Promise<ApiHealthResponse> {
    return this.requestJson<ApiHealthResponse>({
      path: '/health',
      auth: false,
    });
  }

  getSearchHealth(): Promise<ApiSearchHealthResponse> {
    return this.requestJson<ApiSearchHealthResponse>({
      path: '/health/search',
      auth: false,
    });
  }

  getCurrentUser(): Promise<ApiMeResponse> {
    return this.requestJson<ApiMeResponse>({
      path: '/v1/users/me',
    });
  }

  updateCurrentUserPreferences(body: ApiUpdatePreferencesRequest): Promise<ApiMeResponse> {
    return this.requestJson<ApiMeResponse, ApiUpdatePreferencesRequest>({
      path: '/v1/users/me',
      method: 'PATCH',
      body,
    });
  }

  getCurrentUserProfile(): Promise<ApiProfileResponse> {
    return this.requestJson<ApiProfileResponse>({
      path: '/v1/users/me/profile',
    });
  }

  updateCurrentUserProfile(body: ApiUpdateProfileRequest): Promise<ApiProfileResponse> {
    return this.requestJson<ApiProfileResponse, ApiUpdateProfileRequest>({
      path: '/v1/users/me/profile',
      method: 'PATCH',
      body,
    });
  }

  upsertCurrentUserAvatar(body: ApiUpsertAvatarRequest): Promise<ApiProfileResponse> {
    return this.requestJson<ApiProfileResponse, ApiUpsertAvatarRequest>({
      path: '/v1/users/me/avatar',
      method: 'POST',
      body,
    });
  }

  deleteCurrentUserAvatar(): Promise<ApiProfileResponse> {
    return this.requestJson<ApiProfileResponse>({
      path: '/v1/users/me/avatar',
      method: 'DELETE',
    });
  }

  getCurrentUserConsents(): Promise<ApiConsentsResponse> {
    return this.requestJson<ApiConsentsResponse>({
      path: '/v1/users/me/consents',
    });
  }

  updateCurrentUserConsents(body: ApiUpdateConsentsRequest): Promise<ApiConsentsResponse> {
    return this.requestJson<ApiConsentsResponse, ApiUpdateConsentsRequest>({
      path: '/v1/users/me/consents',
      method: 'PATCH',
      body,
    });
  }

  getCurrentUserFavorites(): Promise<ApiFavoritesResponse> {
    return this.requestJson<ApiFavoritesResponse>({
      path: '/v1/users/me/favorites',
    });
  }

  addCurrentUserFavorite(listingId: string): Promise<ApiFavoritesResponse> {
    return this.requestJson<ApiFavoritesResponse>({
      path: `/v1/users/me/favorites/${encodeURIComponent(listingId)}`,
      method: 'PUT',
    });
  }

  deleteCurrentUserFavorite(listingId: string): Promise<ApiFavoritesResponse> {
    return this.requestJson<ApiFavoritesResponse>({
      path: `/v1/users/me/favorites/${encodeURIComponent(listingId)}`,
      method: 'DELETE',
    });
  }

  getCurrentUserLinkedIdentities(): Promise<ApiLinkedIdentitiesResponse> {
    return this.requestJson<ApiLinkedIdentitiesResponse>({
      path: '/v1/users/me/linked-identities',
    });
  }

  startCurrentUserLinkedIdentity(provider: string): Promise<ApiStartLinkedIdentityResponse> {
    return this.requestJson<ApiStartLinkedIdentityResponse>({
      path: `/v1/users/me/linked-identities/${encodeURIComponent(provider)}/start`,
      method: 'POST',
    });
  }

  deleteCurrentUserLinkedIdentity(provider: string): Promise<ApiLinkedIdentitiesResponse> {
    return this.requestJson<ApiLinkedIdentitiesResponse>({
      path: `/v1/users/me/linked-identities/${encodeURIComponent(provider)}`,
      method: 'DELETE',
    });
  }

  getCurrentUserSessions(): Promise<ApiSessionsResponse> {
    return this.requestJson<ApiSessionsResponse>({
      path: '/v1/users/me/sessions',
    });
  }

  deleteCurrentUserSession(sessionId: string): Promise<ApiSessionsResponse> {
    return this.requestJson<ApiSessionsResponse>({
      path: `/v1/users/me/sessions/${encodeURIComponent(sessionId)}`,
      method: 'DELETE',
    });
  }
}

export const createApiV1Client = (input: ApiV1ClientOptions): ApiV1Client => {
  return new ApiV1Client(input);
};
