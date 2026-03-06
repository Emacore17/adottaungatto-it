import type { HealthResponse } from '@adottaungatto/types';

export const getApiHealth = async (baseUrl: string): Promise<HealthResponse> => {
  const response = await fetch(`${baseUrl}/health`);
  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }
  return (await response.json()) as HealthResponse;
};

export interface OidcAuthorizationUrlInput {
  keycloakBaseUrl: string;
  realm: string;
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge: string;
  scope?: string;
  prompt?: string;
  idpHint?: string;
  extraParams?: Record<string, string>;
}

export interface OidcCodeExchangeInput {
  keycloakBaseUrl: string;
  realm: string;
  clientId: string;
  redirectUri: string;
  code: string;
  codeVerifier: string;
}

export interface OidcRefreshInput {
  keycloakBaseUrl: string;
  realm: string;
  clientId: string;
  refreshToken: string;
}

export interface OidcTokenResponse {
  accessToken: string;
  expiresIn: number;
  refreshToken: string | null;
  refreshExpiresIn: number | null;
  idToken: string | null;
  tokenType: string | null;
  scope: string | null;
}

export class OidcTokenRequestError extends Error {
  public readonly status: number | null;
  public readonly errorCode: string | null;

  constructor(
    message: string,
    options?: {
      status?: number | null;
      errorCode?: string | null;
      cause?: unknown;
    },
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = 'OidcTokenRequestError';
    this.status = options?.status ?? null;
    this.errorCode = options?.errorCode ?? null;
  }
}

export const isOidcInvalidGrantError = (error: unknown): boolean => {
  return (
    error instanceof OidcTokenRequestError &&
    (error.status === 400 || error.status === 401) &&
    error.errorCode === 'invalid_grant'
  );
};

const normalizeOidcBaseUrl = (value: string) => value.replace(/\/$/, '');

const parseOidcTokenResponse = (payload: {
  access_token?: unknown;
  expires_in?: unknown;
  refresh_token?: unknown;
  refresh_expires_in?: unknown;
  id_token?: unknown;
  token_type?: unknown;
  scope?: unknown;
}): OidcTokenResponse => {
  if (typeof payload.access_token !== 'string') {
    throw new OidcTokenRequestError('OIDC token response is missing access_token.');
  }

  const expiresIn =
    typeof payload.expires_in === 'number'
      ? payload.expires_in
      : Number.parseInt(String(payload.expires_in ?? ''), 10);

  if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
    throw new OidcTokenRequestError('OIDC token response has invalid expires_in.');
  }

  const refreshExpiresCandidate =
    typeof payload.refresh_expires_in === 'number'
      ? payload.refresh_expires_in
      : Number.parseInt(String(payload.refresh_expires_in ?? ''), 10);

  return {
    accessToken: payload.access_token,
    expiresIn,
    refreshToken: typeof payload.refresh_token === 'string' ? payload.refresh_token : null,
    refreshExpiresIn:
      Number.isFinite(refreshExpiresCandidate) && refreshExpiresCandidate > 0
        ? refreshExpiresCandidate
        : null,
    idToken: typeof payload.id_token === 'string' ? payload.id_token : null,
    tokenType: typeof payload.token_type === 'string' ? payload.token_type : null,
    scope: typeof payload.scope === 'string' ? payload.scope : null,
  };
};

const requestOidcToken = async (
  input: {
    keycloakBaseUrl: string;
    realm: string;
  },
  formData: URLSearchParams,
): Promise<OidcTokenResponse> => {
  const tokenUrl = `${normalizeOidcBaseUrl(input.keycloakBaseUrl)}/realms/${input.realm}/protocol/openid-connect/token`;

  let response: Response;
  try {
    response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: formData,
    });
  } catch (error) {
    throw new OidcTokenRequestError('OIDC token request failed before receiving a response.', {
      cause: error,
    });
  }

  const payload = (await response.json().catch(() => ({}))) as {
    error?: unknown;
    error_description?: unknown;
    access_token?: unknown;
    expires_in?: unknown;
    refresh_token?: unknown;
    refresh_expires_in?: unknown;
    id_token?: unknown;
    token_type?: unknown;
    scope?: unknown;
  };

  if (!response.ok) {
    const errorCode = typeof payload.error === 'string' ? payload.error : null;
    const errorDescription =
      typeof payload.error_description === 'string' ? payload.error_description : '';

    throw new OidcTokenRequestError(
      `OIDC token request failed with status ${response.status}${
        errorDescription ? ` (${errorDescription})` : ''
      }`,
      {
        status: response.status,
        errorCode,
      },
    );
  }

  return parseOidcTokenResponse(payload);
};

export const buildOidcAuthorizationUrl = (input: OidcAuthorizationUrlInput): string => {
  const url = new URL(
    `${normalizeOidcBaseUrl(input.keycloakBaseUrl)}/realms/${input.realm}/protocol/openid-connect/auth`,
  );

  url.searchParams.set('client_id', input.clientId);
  url.searchParams.set('redirect_uri', input.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', input.scope ?? 'openid profile email');
  url.searchParams.set('state', input.state);
  url.searchParams.set('nonce', input.nonce);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('code_challenge', input.codeChallenge);

  if (input.prompt) {
    url.searchParams.set('prompt', input.prompt);
  }

  if (input.idpHint) {
    url.searchParams.set('kc_idp_hint', input.idpHint);
  }

  if (input.extraParams) {
    for (const [key, value] of Object.entries(input.extraParams)) {
      if (key.trim().length > 0 && value.trim().length > 0) {
        url.searchParams.set(key, value);
      }
    }
  }

  return url.toString();
};

export const exchangeOidcCodeForToken = async (
  input: OidcCodeExchangeInput,
): Promise<OidcTokenResponse> => {
  const formData = new URLSearchParams();
  formData.set('grant_type', 'authorization_code');
  formData.set('client_id', input.clientId);
  formData.set('code', input.code);
  formData.set('redirect_uri', input.redirectUri);
  formData.set('code_verifier', input.codeVerifier);

  return requestOidcToken(input, formData);
};

export const refreshOidcToken = async (input: OidcRefreshInput): Promise<OidcTokenResponse> => {
  const formData = new URLSearchParams();
  formData.set('grant_type', 'refresh_token');
  formData.set('client_id', input.clientId);
  formData.set('refresh_token', input.refreshToken);

  return requestOidcToken(input, formData);
};

export interface OidcEndSessionUrlInput {
  keycloakBaseUrl: string;
  realm: string;
  postLogoutRedirectUri: string;
  idTokenHint?: string | null;
  clientId?: string | null;
}

export const buildOidcEndSessionUrl = (input: OidcEndSessionUrlInput): string => {
  const url = new URL(
    `${normalizeOidcBaseUrl(input.keycloakBaseUrl)}/realms/${input.realm}/protocol/openid-connect/logout`,
  );
  url.searchParams.set('post_logout_redirect_uri', input.postLogoutRedirectUri);

  if (input.idTokenHint) {
    url.searchParams.set('id_token_hint', input.idTokenHint);
  }

  if (input.clientId) {
    url.searchParams.set('client_id', input.clientId);
  }

  return url.toString();
};
