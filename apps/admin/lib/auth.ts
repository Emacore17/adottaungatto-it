import { loadAdminEnv } from '@adottaungatto/config';
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
  roles: string[];
}

interface SessionPayload {
  user: SessionUser;
}

export interface AdminSessionCookiePayload {
  accessToken: string;
  refreshToken: string | null;
  idToken: string | null;
  expiresAt: number | null;
}

interface AdminSessionCookieWriteInput {
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

const env = loadAdminEnv();
const allowedAdminRoles = new Set(['moderator', 'admin']);

const sanitizeNextPath = (value: string | null | undefined, fallbackPath: string) => {
  if (!value) {
    return fallbackPath;
  }

  if (!value.startsWith('/') || value.startsWith('//')) {
    return fallbackPath;
  }

  return value;
};

const createRandomUrlToken = (size = 32) => randomBytes(size).toString('base64url');

const createPkceCodeChallenge = (verifier: string): string =>
  createHash('sha256').update(verifier).digest('base64url');

const serializeAdminSessionCookiePayload = (payload: AdminSessionCookiePayload): string =>
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

export const adminSessionCookieName = env.ADMIN_SESSION_COOKIE_NAME;
export const adminOidcStateCookieName = `${adminSessionCookieName}_oidc_state`;
export const adminOidcNonceCookieName = `${adminSessionCookieName}_oidc_nonce`;
export const adminOidcCodeVerifierCookieName = `${adminSessionCookieName}_oidc_verifier`;
export const adminOidcNextPathCookieName = `${adminSessionCookieName}_oidc_next`;

export const resolveAdminRedirectAfterLogin = (rawNextPath: string | null | undefined) =>
  sanitizeNextPath(rawNextPath, '/admin');

export const parseAdminSessionCookie = (
  rawCookieValue: string | null | undefined,
): AdminSessionCookiePayload | null => {
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

export const buildAdminSessionCookie = (
  input: AdminSessionCookieWriteInput,
): { value: string; maxAge: number } => {
  // Keep the session cookie below browser size limits (~4KB) by not persisting id_token.
  const payload: AdminSessionCookiePayload = {
    accessToken: input.accessToken,
    refreshToken: input.refreshToken ?? null,
    idToken: null,
    expiresAt: Date.now() + input.expiresIn * 1_000,
  };

  const maxAge = Math.max(input.refreshExpiresIn ?? 0, input.expiresIn);
  return {
    value: serializeAdminSessionCookiePayload(payload),
    maxAge,
  };
};

export const readNonceFromAdminIdToken = (idToken: string | null | undefined): string | null => {
  if (!idToken) {
    return null;
  }

  const payload = parseJwtPayload(idToken);
  if (!payload) {
    return null;
  }

  return typeof payload.nonce === 'string' ? payload.nonce : null;
};

export const createAdminOidcLoginContext = (requestUrl: string, rawNextPath: string | null) => {
  const nextPath = resolveAdminRedirectAfterLogin(rawNextPath);
  const redirectUri = new URL('/api/auth/callback', requestUrl).toString();
  const state = createRandomUrlToken(24);
  const nonce = createRandomUrlToken(24);
  const codeVerifier = createRandomUrlToken(64);
  const codeChallenge = createPkceCodeChallenge(codeVerifier);

  const authorizationUrl = buildOidcAuthorizationUrl({
    keycloakBaseUrl: env.KEYCLOAK_URL,
    realm: env.KEYCLOAK_REALM,
    clientId: env.KEYCLOAK_CLIENT_ID_ADMIN,
    redirectUri,
    state,
    nonce,
    codeChallenge,
  });

  return {
    authorizationUrl,
    state,
    nonce,
    codeVerifier,
    nextPath,
  };
};

export const exchangeAdminAuthorizationCodeForToken = async (
  code: string,
  codeVerifier: string,
  requestUrl: string,
): Promise<OidcTokenResponse> => {
  const redirectUri = new URL('/api/auth/callback', requestUrl).toString();
  return exchangeOidcCodeForToken({
    keycloakBaseUrl: env.KEYCLOAK_URL,
    realm: env.KEYCLOAK_REALM,
    clientId: env.KEYCLOAK_CLIENT_ID_ADMIN,
    redirectUri,
    code,
    codeVerifier,
  });
};

export const refreshAdminSessionToken = async (
  refreshToken: string,
): Promise<OidcTokenResponse> => {
  return refreshOidcToken({
    keycloakBaseUrl: env.KEYCLOAK_URL,
    realm: env.KEYCLOAK_REALM,
    clientId: env.KEYCLOAK_CLIENT_ID_ADMIN,
    refreshToken,
  });
};

export const buildAdminOidcEndSessionUrl = (requestUrl: string, idTokenHint?: string | null) => {
  return buildOidcEndSessionUrl({
    keycloakBaseUrl: env.KEYCLOAK_URL,
    realm: env.KEYCLOAK_REALM,
    postLogoutRedirectUri: new URL('/login', requestUrl).toString(),
    idTokenHint: idTokenHint ?? null,
    clientId: env.KEYCLOAK_CLIENT_ID_ADMIN,
  });
};

export const getAdminSessionCookiePayload = async (): Promise<AdminSessionCookiePayload | null> => {
  const cookieStore = await cookies();
  return parseAdminSessionCookie(cookieStore.get(adminSessionCookieName)?.value);
};

export const getAdminAccessTokenFromSessionCookie = async (): Promise<string | null> => {
  const payload = await getAdminSessionCookiePayload();
  return payload?.accessToken ?? null;
};

export const getAdminSession = async (): Promise<SessionPayload | null> => {
  const token = await getAdminAccessTokenFromSessionCookie();
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

export const requireAdminSession = async (nextPath: string): Promise<SessionPayload> => {
  const session = await getAdminSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  return session;
};

export const requireAdminRole = async (nextPath: string): Promise<SessionPayload> => {
  const session = await requireAdminSession(nextPath);
  const hasRole = session.user.roles.some((role) => allowedAdminRoles.has(role));
  if (!hasRole) {
    redirect('/unauthorized');
  }

  return session;
};
