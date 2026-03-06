import { loadWebEnv } from '@adottaungatto/config';
import {
  buildOidcAuthorizationUrl,
  buildOidcEndSessionUrl,
  exchangeOidcCodeForToken,
  refreshOidcToken,
  type OidcTokenResponse,
} from '@adottaungatto/sdk';
import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

interface SessionUser {
  id: string;
  email: string;
  emailVerified?: boolean;
  roles: string[];
  preferences?: {
    messageEmailNotificationsEnabled: boolean;
  };
}

interface SessionPayload {
  user: SessionUser;
}

export interface WebSessionCookiePayload {
  accessToken: string;
  refreshToken: string | null;
  idToken: string | null;
  expiresAt: number | null;
}

interface WebSessionCookieWriteInput {
  accessToken: string;
  expiresIn: number;
  refreshToken?: string | null;
  refreshExpiresIn?: number | null;
  idToken?: string | null;
}

interface SessionCookieEnvelope {
  accessToken: string;
  refreshToken?: string | null;
  idToken?: string | null;
  expiresAt?: number | null;
}

const env = loadWebEnv();
const enabledWebSocialProviders = new Set(env.KEYCLOAK_SOCIAL_PROVIDERS);

const normalizeProviderAlias = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{0,62}$/.test(normalized)) {
    return null;
  }

  return normalized;
};

const sanitizeNextPath = (value: string | null | undefined, fallbackPath: string) => {
  if (!value) {
    return fallbackPath;
  }

  if (!value.startsWith('/')) {
    return fallbackPath;
  }

  if (value.startsWith('//')) {
    return fallbackPath;
  }

  return value;
};

const createRandomUrlToken = (size = 32) => randomBytes(size).toString('base64url');

const createPkceCodeChallenge = (verifier: string): string =>
  createHash('sha256').update(verifier).digest('base64url');

const serializeWebSessionCookiePayload = (payload: WebSessionCookiePayload): string =>
  Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');

const parseJwtPayload = (token: string): Record<string, unknown> | null => {
  const segments = token.split('.');
  if (segments.length < 2) {
    return null;
  }

  try {
    const payloadText = Buffer.from(segments[1] ?? '', 'base64url').toString('utf8');
    const payload = JSON.parse(payloadText) as unknown;
    if (typeof payload === 'object' && payload !== null && !Array.isArray(payload)) {
      return payload as Record<string, unknown>;
    }
  } catch {}

  return null;
};

export const webSessionCookieName = env.WEB_SESSION_COOKIE_NAME;
export const webOidcStateCookieName = `${webSessionCookieName}_oidc_state`;
export const webOidcNonceCookieName = `${webSessionCookieName}_oidc_nonce`;
export const webOidcCodeVerifierCookieName = `${webSessionCookieName}_oidc_verifier`;
export const webOidcNextPathCookieName = `${webSessionCookieName}_oidc_next`;

export const resolveWebRedirectAfterLogin = (rawNextPath: string | null | undefined) =>
  sanitizeNextPath(rawNextPath, '/account');

export const listEnabledWebSocialProviders = (): string[] =>
  Array.from(enabledWebSocialProviders.values());

export const isWebSocialProviderEnabled = (providerAlias: string): boolean => {
  const normalizedAlias = normalizeProviderAlias(providerAlias);
  return normalizedAlias ? enabledWebSocialProviders.has(normalizedAlias) : false;
};

export const resolveEnabledWebSocialProviderAlias = (
  providerAlias: string | null | undefined,
): string | null => {
  const normalizedAlias = normalizeProviderAlias(providerAlias);
  if (!normalizedAlias || !enabledWebSocialProviders.has(normalizedAlias)) {
    return null;
  }

  return normalizedAlias;
};

export const parseWebSessionCookie = (
  rawCookieValue: string | null | undefined,
): WebSessionCookiePayload | null => {
  if (!rawCookieValue) {
    return null;
  }

  try {
    const decoded = Buffer.from(rawCookieValue, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded) as SessionCookieEnvelope;
    if (typeof parsed.accessToken === 'string' && parsed.accessToken.length > 0) {
      return {
        accessToken: parsed.accessToken,
        refreshToken: typeof parsed.refreshToken === 'string' ? parsed.refreshToken : null,
        idToken: typeof parsed.idToken === 'string' ? parsed.idToken : null,
        expiresAt:
          typeof parsed.expiresAt === 'number' && Number.isFinite(parsed.expiresAt)
            ? parsed.expiresAt
            : null,
      };
    }
  } catch {}

  // Backward compatibility with old cookie format that stored access_token as plain string.
  return {
    accessToken: rawCookieValue,
    refreshToken: null,
    idToken: null,
    expiresAt: null,
  };
};

export const buildWebSessionCookie = (
  input: WebSessionCookieWriteInput,
): { value: string; maxAge: number } => {
  // Keep the session cookie below browser size limits (~4KB) by not persisting id_token.
  // Nonce validation is already performed during callback before cookie write.
  const payload: WebSessionCookiePayload = {
    accessToken: input.accessToken,
    refreshToken: input.refreshToken ?? null,
    idToken: null,
    expiresAt: Date.now() + input.expiresIn * 1_000,
  };

  const maxAge = Math.max(input.refreshExpiresIn ?? 0, input.expiresIn);
  return {
    value: serializeWebSessionCookiePayload(payload),
    maxAge,
  };
};

export const readNonceFromIdToken = (idToken: string | null | undefined): string | null => {
  if (!idToken) {
    return null;
  }

  const payload = parseJwtPayload(idToken);
  if (!payload) {
    return null;
  }

  return typeof payload.nonce === 'string' ? payload.nonce : null;
};

interface WebOidcFlowOptions {
  idpHint?: string;
}

interface WebOidcContextOptions {
  prompt?: string;
  idpHint?: string;
  extraParams?: Record<string, string>;
}

const createWebOidcContext = (
  requestUrl: string,
  rawNextPath: string | null,
  options?: WebOidcContextOptions,
) => {
  const nextPath = resolveWebRedirectAfterLogin(rawNextPath);
  const redirectUri = new URL('/api/auth/callback', requestUrl).toString();
  const state = createRandomUrlToken(24);
  const nonce = createRandomUrlToken(24);
  const codeVerifier = createRandomUrlToken(64);
  const codeChallenge = createPkceCodeChallenge(codeVerifier);

  const authorizationUrl = buildOidcAuthorizationUrl({
    keycloakBaseUrl: env.KEYCLOAK_URL,
    realm: env.KEYCLOAK_REALM,
    clientId: env.KEYCLOAK_CLIENT_ID_WEB,
    redirectUri,
    state,
    nonce,
    codeChallenge,
    prompt: options?.prompt,
    idpHint: options?.idpHint,
    extraParams: options?.extraParams,
  });

  return {
    authorizationUrl,
    state,
    nonce,
    codeVerifier,
    nextPath,
  };
};

export const createWebOidcLoginContext = (
  requestUrl: string,
  rawNextPath: string | null,
  options?: WebOidcFlowOptions,
) => {
  return createWebOidcContext(requestUrl, rawNextPath, {
    idpHint: options?.idpHint,
  });
};

export const createWebOidcRegisterContext = (
  requestUrl: string,
  rawNextPath: string | null,
  options?: WebOidcFlowOptions,
) => {
  return createWebOidcContext(requestUrl, rawNextPath, {
    idpHint: options?.idpHint,
    extraParams: {
      screen_hint: 'signup',
      kc_action: 'register',
    },
  });
};

export const exchangeWebAuthorizationCodeForToken = async (
  code: string,
  codeVerifier: string,
  requestUrl: string,
): Promise<OidcTokenResponse> => {
  const redirectUri = new URL('/api/auth/callback', requestUrl).toString();
  return exchangeOidcCodeForToken({
    keycloakBaseUrl: env.KEYCLOAK_URL,
    realm: env.KEYCLOAK_REALM,
    clientId: env.KEYCLOAK_CLIENT_ID_WEB,
    redirectUri,
    code,
    codeVerifier,
  });
};

export const refreshWebSessionToken = async (
  refreshToken: string,
): Promise<OidcTokenResponse> => {
  return refreshOidcToken({
    keycloakBaseUrl: env.KEYCLOAK_URL,
    realm: env.KEYCLOAK_REALM,
    clientId: env.KEYCLOAK_CLIENT_ID_WEB,
    refreshToken,
  });
};

export const buildWebOidcEndSessionUrl = (requestUrl: string, idTokenHint?: string | null) => {
  return buildOidcEndSessionUrl({
    keycloakBaseUrl: env.KEYCLOAK_URL,
    realm: env.KEYCLOAK_REALM,
    postLogoutRedirectUri: new URL('/login', requestUrl).toString(),
    idTokenHint: idTokenHint ?? null,
    clientId: env.KEYCLOAK_CLIENT_ID_WEB,
  });
};

export const getWebSessionCookiePayload = async (): Promise<WebSessionCookiePayload | null> => {
  const cookieStore = await cookies();
  return parseWebSessionCookie(cookieStore.get(webSessionCookieName)?.value);
};

export const getWebAccessTokenFromSessionCookie = async (): Promise<string | null> => {
  const payload = await getWebSessionCookiePayload();
  return payload?.accessToken ?? null;
};

export const getWebSession = async (): Promise<SessionPayload | null> => {
  const token = await getWebAccessTokenFromSessionCookie();
  if (!token) {
    return null;
  }

  let response: Response;
  try {
    response = await fetch(`${env.NEXT_PUBLIC_API_URL}/v1/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(3_000),
    });
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as SessionPayload;
};

export const requireWebSession = async (nextPath: string): Promise<SessionPayload> => {
  const session = await getWebSession();
  if (!session) {
    const encodedNextPath = encodeURIComponent(nextPath);
    redirect(`/login?next=${encodedNextPath}`);
  }

  return session;
};
