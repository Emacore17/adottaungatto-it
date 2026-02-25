import { loadAdminEnv } from '@adottaungatto/config';
import { requestPasswordGrantToken } from '@adottaungatto/sdk';
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

export const adminSessionCookieName = env.ADMIN_SESSION_COOKIE_NAME;

export const resolveAdminRedirectAfterLogin = (rawNextPath: string | null | undefined) =>
  sanitizeNextPath(rawNextPath, '/moderation');

export const exchangeAdminCredentialsForToken = async (username: string, password: string) =>
  requestPasswordGrantToken({
    keycloakBaseUrl: env.KEYCLOAK_URL,
    realm: env.KEYCLOAK_REALM,
    clientId: env.KEYCLOAK_CLIENT_ID_ADMIN,
    username,
    password,
  });

export const getAdminSession = async (): Promise<SessionPayload | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminSessionCookieName)?.value;
  if (!token) {
    return null;
  }

  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/v1/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

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
