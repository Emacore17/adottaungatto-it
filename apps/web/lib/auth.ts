import { loadWebEnv } from '@adottaungatto/config';
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

const env = loadWebEnv();

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

export const webSessionCookieName = env.WEB_SESSION_COOKIE_NAME;

export const resolveWebRedirectAfterLogin = (rawNextPath: string | null | undefined) =>
  sanitizeNextPath(rawNextPath, '/account');

export const exchangeWebCredentialsForToken = async (username: string, password: string) =>
  requestPasswordGrantToken({
    keycloakBaseUrl: env.KEYCLOAK_URL,
    realm: env.KEYCLOAK_REALM,
    clientId: env.KEYCLOAK_CLIENT_ID_WEB,
    username,
    password,
  });

export const getWebSession = async (): Promise<SessionPayload | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(webSessionCookieName)?.value;
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

export const requireWebSession = async (nextPath: string): Promise<SessionPayload> => {
  const session = await getWebSession();
  if (!session) {
    const encodedNextPath = encodeURIComponent(nextPath);
    redirect(`/login?next=${encodedNextPath}`);
  }

  return session;
};
