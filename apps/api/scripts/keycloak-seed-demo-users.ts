import { resolve } from 'node:path';
import { loadApiEnv } from '@adottaungatto/config';
import { config as loadDotEnv } from 'dotenv';

type KeycloakRole = {
  id: string;
  name: string;
};

type KeycloakUser = {
  id: string;
  username: string;
};

type KeycloakIdentityProvider = {
  alias: string;
  providerId: string;
  enabled?: boolean;
  trustEmail?: boolean;
  storeToken?: boolean;
  addReadTokenRoleOnCreate?: boolean;
  authenticateByDefault?: boolean;
  linkOnly?: boolean;
  firstBrokerLoginFlowAlias?: string;
  config?: Record<string, string>;
};

type KeycloakRealmRepresentation = Record<string, unknown> & {
  realm?: string;
  internationalizationEnabled?: boolean;
  supportedLocales?: unknown;
  defaultLocale?: unknown;
  accessTokenLifespan?: unknown;
  ssoSessionIdleTimeout?: unknown;
  ssoSessionMaxLifespan?: unknown;
};

type DemoUserSeed = {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  roles: string[];
};

type SeedCounter = {
  rolesCreated: number;
  usersCreated: number;
  usersUpdated: number;
  passwordsReset: number;
  roleMappingsAdded: number;
  socialProvidersCreated: number;
  socialProvidersUpdated: number;
  realmSettingsUpdated: number;
};

const demoUsers: DemoUserSeed[] = [
  {
    username: 'utente.demo',
    firstName: 'Utente',
    lastName: 'Demo',
    email: 'utente.demo@adottaungatto.local',
    password: 'demo1234',
    roles: ['user'],
  },
  {
    username: 'utente2.demo',
    firstName: 'Utente',
    lastName: 'Secondo',
    email: 'utente2.demo@adottaungatto.local',
    password: 'demo1234',
    roles: ['user'],
  },
  {
    username: 'moderatore.demo',
    firstName: 'Moderatore',
    lastName: 'Demo',
    email: 'moderatore.demo@adottaungatto.local',
    password: 'demo1234',
    roles: ['moderator'],
  },
  {
    username: 'admin.demo',
    firstName: 'Admin',
    lastName: 'Demo',
    email: 'admin.demo@adottaungatto.local',
    password: 'demo1234',
    roles: ['admin'],
  },
];

const normalizeUrl = (value: string): string => value.replace(/\/$/, '');

const parseJson = async <TValue>(response: Response): Promise<TValue> => {
  return (await response.json()) as TValue;
};

const throwRequestError = async (scope: string, response: Response): Promise<never> => {
  const payload = await response.text();
  throw new Error(`${scope} failed with status ${response.status}: ${payload}`);
};

const requestAdminToken = async (
  keycloakBaseUrl: string,
  username: string,
  password: string,
): Promise<string> => {
  const tokenUrl = `${keycloakBaseUrl}/realms/master/protocol/openid-connect/token`;
  const formData = new URLSearchParams();
  formData.set('grant_type', 'password');
  formData.set('client_id', 'admin-cli');
  formData.set('username', username);
  formData.set('password', password);

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: formData,
  });

  if (!response.ok) {
    await throwRequestError('admin token request', response);
  }

  const payload = await parseJson<{ access_token: string }>(response);
  if (!payload.access_token) {
    throw new Error('admin token request did not return an access token.');
  }

  return payload.access_token;
};

const keycloakAdminRequest = async (
  keycloakBaseUrl: string,
  realm: string,
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<Response> => {
  return fetch(`${keycloakBaseUrl}/admin/realms/${realm}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
};

const getIdentityProviderByAlias = async (
  keycloakBaseUrl: string,
  realm: string,
  accessToken: string,
  alias: string,
): Promise<KeycloakIdentityProvider | null> => {
  const response = await keycloakAdminRequest(
    keycloakBaseUrl,
    realm,
    accessToken,
    `/identity-provider/instances/${encodeURIComponent(alias)}`,
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    await throwRequestError(`get identity provider "${alias}"`, response);
  }

  return parseJson<KeycloakIdentityProvider>(response);
};

const upsertGoogleIdentityProvider = async (
  keycloakBaseUrl: string,
  realm: string,
  accessToken: string,
  env: ReturnType<typeof loadApiEnv>,
): Promise<'skipped' | 'created' | 'updated'> => {
  if (!env.KEYCLOAK_GOOGLE_IDP_ENABLED) {
    return 'skipped';
  }

  const clientId = env.KEYCLOAK_GOOGLE_CLIENT_ID.trim();
  const clientSecret = env.KEYCLOAK_GOOGLE_CLIENT_SECRET.trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      'KEYCLOAK_GOOGLE_IDP_ENABLED=true richiede KEYCLOAK_GOOGLE_CLIENT_ID e KEYCLOAK_GOOGLE_CLIENT_SECRET valorizzati.',
    );
  }

  const defaultScopes = env.KEYCLOAK_GOOGLE_DEFAULT_SCOPES.trim() || 'openid profile email';
  const hostedDomain = env.KEYCLOAK_GOOGLE_HOSTED_DOMAIN.trim();
  const alias = 'google';
  const providerConfig: Record<string, string> = {
    clientId,
    clientSecret,
    defaultScope: defaultScopes,
    syncMode: 'FORCE',
    useJwksUrl: 'true',
  };
  if (hostedDomain) {
    providerConfig.hostedDomain = hostedDomain;
  }

  const desiredRepresentation: KeycloakIdentityProvider = {
    alias,
    providerId: 'google',
    enabled: true,
    trustEmail: true,
    storeToken: false,
    addReadTokenRoleOnCreate: false,
    authenticateByDefault: false,
    linkOnly: false,
    firstBrokerLoginFlowAlias: 'first broker login',
    config: providerConfig,
  };

  const existing = await getIdentityProviderByAlias(keycloakBaseUrl, realm, accessToken, alias);

  if (!existing) {
    const createResponse = await keycloakAdminRequest(
      keycloakBaseUrl,
      realm,
      accessToken,
      '/identity-provider/instances',
      {
        method: 'POST',
        body: JSON.stringify(desiredRepresentation),
      },
    );
    if (createResponse.status !== 201) {
      await throwRequestError(`create identity provider "${alias}"`, createResponse);
    }
    return 'created';
  }

  const updateRepresentation: KeycloakIdentityProvider = {
    ...existing,
    ...desiredRepresentation,
    config: {
      ...(existing.config ?? {}),
      ...providerConfig,
    },
  };
  const updateResponse = await keycloakAdminRequest(
    keycloakBaseUrl,
    realm,
    accessToken,
    `/identity-provider/instances/${encodeURIComponent(alias)}`,
    {
      method: 'PUT',
      body: JSON.stringify(updateRepresentation),
    },
  );
  if (updateResponse.status !== 204) {
    await throwRequestError(`update identity provider "${alias}"`, updateResponse);
  }

  return 'updated';
};

const ensureRealmLocalization = async (
  keycloakBaseUrl: string,
  realm: string,
  accessToken: string,
): Promise<boolean> => {
  const desiredAccessTokenLifespan = 900;
  const desiredSsoSessionIdleTimeout = 28_800;
  const desiredSsoSessionMaxLifespan = 604_800;

  const getResponse = await keycloakAdminRequest(keycloakBaseUrl, realm, accessToken, '');
  if (!getResponse.ok) {
    await throwRequestError('get realm settings', getResponse);
  }

  const realmRepresentation = await parseJson<KeycloakRealmRepresentation>(getResponse);
  const currentSupportedLocales = Array.isArray(realmRepresentation.supportedLocales)
    ? realmRepresentation.supportedLocales.filter(
        (value): value is string => typeof value === 'string' && value.trim().length > 0,
      )
    : [];
  const normalizedSupportedLocales = Array.from(new Set(['it', 'en', ...currentSupportedLocales]));
  const internationalizationEnabled = realmRepresentation.internationalizationEnabled === true;
  const hasItalianLocale = currentSupportedLocales.includes('it');
  const defaultLocaleIsItalian = realmRepresentation.defaultLocale === 'it';
  const accessTokenLifespan =
    typeof realmRepresentation.accessTokenLifespan === 'number'
      ? realmRepresentation.accessTokenLifespan
      : null;
  const ssoSessionIdleTimeout =
    typeof realmRepresentation.ssoSessionIdleTimeout === 'number'
      ? realmRepresentation.ssoSessionIdleTimeout
      : null;
  const ssoSessionMaxLifespan =
    typeof realmRepresentation.ssoSessionMaxLifespan === 'number'
      ? realmRepresentation.ssoSessionMaxLifespan
      : null;

  if (
    internationalizationEnabled &&
    hasItalianLocale &&
    defaultLocaleIsItalian &&
    accessTokenLifespan === desiredAccessTokenLifespan &&
    ssoSessionIdleTimeout === desiredSsoSessionIdleTimeout &&
    ssoSessionMaxLifespan === desiredSsoSessionMaxLifespan
  ) {
    return false;
  }

  const updateRepresentation: KeycloakRealmRepresentation = {
    accessTokenLifespan: desiredAccessTokenLifespan,
    ssoSessionIdleTimeout: desiredSsoSessionIdleTimeout,
    ssoSessionMaxLifespan: desiredSsoSessionMaxLifespan,
    internationalizationEnabled: true,
    supportedLocales: normalizedSupportedLocales,
    defaultLocale: 'it',
  };

  const updateResponse = await keycloakAdminRequest(keycloakBaseUrl, realm, accessToken, '', {
    method: 'PUT',
    body: JSON.stringify(updateRepresentation),
  });

  if (updateResponse.status !== 204) {
    await throwRequestError('update realm localization', updateResponse);
  }

  return true;
};

const getRoleByName = async (
  keycloakBaseUrl: string,
  realm: string,
  accessToken: string,
  roleName: string,
): Promise<KeycloakRole | null> => {
  const response = await keycloakAdminRequest(
    keycloakBaseUrl,
    realm,
    accessToken,
    `/roles/${encodeURIComponent(roleName)}`,
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    await throwRequestError(`get role "${roleName}"`, response);
  }

  return parseJson<KeycloakRole>(response);
};

const ensureRole = async (
  keycloakBaseUrl: string,
  realm: string,
  accessToken: string,
  roleName: string,
  counters: SeedCounter,
): Promise<KeycloakRole> => {
  const existing = await getRoleByName(keycloakBaseUrl, realm, accessToken, roleName);
  if (existing) {
    return existing;
  }

  const createResponse = await keycloakAdminRequest(keycloakBaseUrl, realm, accessToken, '/roles', {
    method: 'POST',
    body: JSON.stringify({ name: roleName }),
  });

  if (createResponse.status !== 201) {
    await throwRequestError(`create role "${roleName}"`, createResponse);
  }

  counters.rolesCreated += 1;

  const created = await getRoleByName(keycloakBaseUrl, realm, accessToken, roleName);
  if (!created) {
    throw new Error(`role "${roleName}" was created but cannot be read back.`);
  }

  return created;
};

const findUserByUsername = async (
  keycloakBaseUrl: string,
  realm: string,
  accessToken: string,
  username: string,
): Promise<KeycloakUser | null> => {
  const response = await keycloakAdminRequest(
    keycloakBaseUrl,
    realm,
    accessToken,
    `/users?username=${encodeURIComponent(username)}&exact=true`,
  );

  if (!response.ok) {
    await throwRequestError(`search user "${username}"`, response);
  }

  const users = await parseJson<KeycloakUser[]>(response);
  return users.find((user) => user.username === username) ?? null;
};

const createUser = async (
  keycloakBaseUrl: string,
  realm: string,
  accessToken: string,
  user: DemoUserSeed,
): Promise<string> => {
  const response = await keycloakAdminRequest(keycloakBaseUrl, realm, accessToken, '/users', {
    method: 'POST',
    body: JSON.stringify({
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      enabled: true,
      emailVerified: true,
    }),
  });

  if (response.status !== 201) {
    await throwRequestError(`create user "${user.username}"`, response);
  }

  const location = response.headers.get('location');
  if (location) {
    const userId = location.split('/').pop();
    if (userId) {
      return userId;
    }
  }

  const found = await findUserByUsername(keycloakBaseUrl, realm, accessToken, user.username);
  if (!found) {
    throw new Error(`user "${user.username}" created but not found afterwards.`);
  }

  return found.id;
};

const updateUserProfile = async (
  keycloakBaseUrl: string,
  realm: string,
  accessToken: string,
  userId: string,
  user: DemoUserSeed,
): Promise<void> => {
  const response = await keycloakAdminRequest(
    keycloakBaseUrl,
    realm,
    accessToken,
    `/users/${encodeURIComponent(userId)}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        enabled: true,
        emailVerified: true,
      }),
    },
  );

  if (response.status !== 204) {
    await throwRequestError(`update user "${user.username}"`, response);
  }
};

const resetUserPassword = async (
  keycloakBaseUrl: string,
  realm: string,
  accessToken: string,
  userId: string,
  user: DemoUserSeed,
): Promise<void> => {
  const response = await keycloakAdminRequest(
    keycloakBaseUrl,
    realm,
    accessToken,
    `/users/${encodeURIComponent(userId)}/reset-password`,
    {
      method: 'PUT',
      body: JSON.stringify({
        type: 'password',
        value: user.password,
        temporary: false,
      }),
    },
  );

  if (response.status !== 204) {
    await throwRequestError(`reset password for "${user.username}"`, response);
  }
};

const getUserRealmRoles = async (
  keycloakBaseUrl: string,
  realm: string,
  accessToken: string,
  userId: string,
): Promise<KeycloakRole[]> => {
  const response = await keycloakAdminRequest(
    keycloakBaseUrl,
    realm,
    accessToken,
    `/users/${encodeURIComponent(userId)}/role-mappings/realm`,
  );

  if (!response.ok) {
    await throwRequestError(`get role mappings for user "${userId}"`, response);
  }

  return parseJson<KeycloakRole[]>(response);
};

const addUserRealmRoles = async (
  keycloakBaseUrl: string,
  realm: string,
  accessToken: string,
  userId: string,
  roles: KeycloakRole[],
): Promise<void> => {
  const response = await keycloakAdminRequest(
    keycloakBaseUrl,
    realm,
    accessToken,
    `/users/${encodeURIComponent(userId)}/role-mappings/realm`,
    {
      method: 'POST',
      body: JSON.stringify(roles),
    },
  );

  if (response.status !== 204) {
    await throwRequestError(`add role mappings for user "${userId}"`, response);
  }
};

const run = async (): Promise<void> => {
  loadDotEnv({ path: resolve(process.cwd(), '.env.local') });
  loadDotEnv({ path: resolve(process.cwd(), '../../.env.local') });
  loadDotEnv();

  const env = loadApiEnv();
  const keycloakBaseUrl = normalizeUrl(env.KEYCLOAK_URL);
  const realm = env.KEYCLOAK_REALM;
  const adminUsername = process.env.KEYCLOAK_ADMIN ?? 'admin';
  const adminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD ?? 'admin';

  const counters: SeedCounter = {
    rolesCreated: 0,
    usersCreated: 0,
    usersUpdated: 0,
    passwordsReset: 0,
    roleMappingsAdded: 0,
    socialProvidersCreated: 0,
    socialProvidersUpdated: 0,
    realmSettingsUpdated: 0,
  };

  console.log(`[auth:seed] Target Keycloak: ${keycloakBaseUrl} (realm: ${realm})`);

  const accessToken = await requestAdminToken(keycloakBaseUrl, adminUsername, adminPassword);
  const realmLocalizationUpdated = await ensureRealmLocalization(keycloakBaseUrl, realm, accessToken);
  if (realmLocalizationUpdated) {
    counters.realmSettingsUpdated += 1;
    console.log(
      '[auth:seed] Realm settings updated: locale it + accessTokenLifespan=900s + ssoSessionIdleTimeout=28800s.',
    );
  } else {
    console.log('[auth:seed] Realm settings already aligned (locale/session policy).');
  }

  const googleProviderResult = await upsertGoogleIdentityProvider(
    keycloakBaseUrl,
    realm,
    accessToken,
    env,
  );
  if (googleProviderResult === 'created') {
    counters.socialProvidersCreated += 1;
  } else if (googleProviderResult === 'updated') {
    counters.socialProvidersUpdated += 1;
  }

  if (googleProviderResult === 'skipped') {
    console.log('[auth:seed] Google IdP skip: KEYCLOAK_GOOGLE_IDP_ENABLED=false.');
  } else {
    console.log(`[auth:seed] Google IdP ${googleProviderResult} (alias: google).`);
  }

  const requiredRoleNames = Array.from(new Set(demoUsers.flatMap((user) => user.roles)));
  const rolesByName = new Map<string, KeycloakRole>();

  for (const roleName of requiredRoleNames) {
    const role = await ensureRole(keycloakBaseUrl, realm, accessToken, roleName, counters);
    rolesByName.set(roleName, role);
  }

  for (const user of demoUsers) {
    const existingUser = await findUserByUsername(
      keycloakBaseUrl,
      realm,
      accessToken,
      user.username,
    );
    const userId = existingUser
      ? existingUser.id
      : await createUser(keycloakBaseUrl, realm, accessToken, user);

    if (existingUser) {
      counters.usersUpdated += 1;
    } else {
      counters.usersCreated += 1;
    }

    await updateUserProfile(keycloakBaseUrl, realm, accessToken, userId, user);
    await resetUserPassword(keycloakBaseUrl, realm, accessToken, userId, user);
    counters.passwordsReset += 1;

    const currentRoles = await getUserRealmRoles(keycloakBaseUrl, realm, accessToken, userId);
    const currentRoleNames = new Set(currentRoles.map((role) => role.name));
    const missingRoles = user.roles
      .map((roleName) => rolesByName.get(roleName))
      .filter((role): role is KeycloakRole => Boolean(role))
      .filter((role) => !currentRoleNames.has(role.name));

    if (missingRoles.length > 0) {
      await addUserRealmRoles(keycloakBaseUrl, realm, accessToken, userId, missingRoles);
      counters.roleMappingsAdded += missingRoles.length;
    }
  }

  console.log(
    `[auth:seed] Roles created=${counters.rolesCreated}, users created=${counters.usersCreated}, users updated=${counters.usersUpdated}.`,
  );
  console.log(
    `[auth:seed] Passwords reset=${counters.passwordsReset}, role mappings added=${counters.roleMappingsAdded}.`,
  );
  console.log(
    `[auth:seed] Social providers created=${counters.socialProvidersCreated}, updated=${counters.socialProvidersUpdated}.`,
  );
  console.log(`[auth:seed] Realm settings updated=${counters.realmSettingsUpdated}.`);
  console.log('[auth:seed] Demo users seed completed.');
};

run().catch((error: Error) => {
  console.error(`[auth:seed] ${error.message}`);
  process.exit(1);
});
