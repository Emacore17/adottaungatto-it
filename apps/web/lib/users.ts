import { loadWebEnv } from '@adottaungatto/config';
import { getWebAccessTokenFromSessionCookie } from './auth';

const env = loadWebEnv();

export interface UserProfile {
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  phoneE164: string | null;
  phoneVerifiedAt: string | null;
  city: string | null;
  province: string | null;
  bio: string | null;
  avatarStorageKey: string | null;
  avatarObjectUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export type UserConsentType = 'privacy' | 'terms' | 'marketing';

export interface UserConsent {
  type: UserConsentType;
  granted: boolean;
  version: string | null;
  grantedAt: string | null;
  source: string | null;
}

export interface UserLinkedIdentity {
  provider: string;
  providerSubject: string;
  emailAtLink: string | null;
  linkedAt: string | null;
  lastSeenAt: string | null;
  isPrimary: boolean;
}

export interface UserSessionRecord {
  sessionId: string;
  clientId: string | null;
  ipAddress: string | null;
  startedAt: string | null;
  lastSeenAt: string | null;
  isCurrent: boolean;
}

const USER_CONSENT_TYPES: UserConsentType[] = ['privacy', 'terms', 'marketing'];
const userConsentTypeSet = new Set<UserConsentType>(USER_CONSENT_TYPES);
const REQUIRED_USER_CONSENT_TYPES = new Set<UserConsentType>(['privacy', 'terms']);

const defaultConsentGranted = (type: UserConsentType): boolean =>
  REQUIRED_USER_CONSENT_TYPES.has(type);

export const emptyUserProfile = (): UserProfile => ({
  firstName: null,
  lastName: null,
  displayName: null,
  phoneE164: null,
  phoneVerifiedAt: null,
  city: null,
  province: null,
  bio: null,
  avatarStorageKey: null,
  avatarObjectUrl: null,
  createdAt: null,
  updatedAt: null,
});

export const emptyUserConsents = (): UserConsent[] =>
  USER_CONSENT_TYPES.map((type) => ({
    type,
    granted: defaultConsentGranted(type),
    version: null,
    grantedAt: null,
    source: null,
  }));

export const emptyUserLinkedIdentities = (): UserLinkedIdentity[] => [];

export const emptyUserSessions = (): UserSessionRecord[] => [];

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const parseNullableString = (value: unknown): string | null =>
  value === null || value === undefined ? null : String(value);

const isUserConsentType = (value: unknown): value is UserConsentType =>
  typeof value === 'string' && userConsentTypeSet.has(value as UserConsentType);

const parseProfile = (value: unknown): UserProfile => {
  const record = asRecord(value);
  return {
    firstName: parseNullableString(record.firstName),
    lastName: parseNullableString(record.lastName),
    displayName: parseNullableString(record.displayName),
    phoneE164: parseNullableString(record.phoneE164),
    phoneVerifiedAt: parseNullableString(record.phoneVerifiedAt),
    city: parseNullableString(record.city),
    province: parseNullableString(record.province),
    bio: parseNullableString(record.bio),
    avatarStorageKey: parseNullableString(record.avatarStorageKey),
    avatarObjectUrl: parseNullableString(record.avatarObjectUrl),
    createdAt: parseNullableString(record.createdAt),
    updatedAt: parseNullableString(record.updatedAt),
  };
};

const parseConsent = (value: unknown): UserConsent | null => {
  const record = asRecord(value);
  if (!isUserConsentType(record.type)) {
    return null;
  }

  return {
    type: record.type,
    granted: defaultConsentGranted(record.type) ? true : record.granted === true,
    version: parseNullableString(record.version),
    grantedAt: parseNullableString(record.grantedAt),
    source: parseNullableString(record.source),
  };
};

const parseConsents = (value: unknown): UserConsent[] => {
  const consentsByType = new Map<UserConsentType, UserConsent>();
  if (Array.isArray(value)) {
    for (const consent of value) {
      const parsed = parseConsent(consent);
      if (!parsed) {
        continue;
      }

      consentsByType.set(parsed.type, parsed);
    }
  }

  return USER_CONSENT_TYPES.map(
    (type) =>
      consentsByType.get(type) ?? {
        type,
        granted: defaultConsentGranted(type),
        version: null,
        grantedAt: null,
        source: null,
      },
  );
};

const parseLinkedIdentity = (value: unknown): UserLinkedIdentity | null => {
  const record = asRecord(value);
  const provider = typeof record.provider === 'string' ? record.provider.trim().toLowerCase() : '';
  const providerSubject =
    typeof record.providerSubject === 'string' ? record.providerSubject.trim() : '';
  if (!provider || !providerSubject) {
    return null;
  }

  return {
    provider,
    providerSubject,
    emailAtLink: parseNullableString(record.emailAtLink),
    linkedAt: parseNullableString(record.linkedAt),
    lastSeenAt: parseNullableString(record.lastSeenAt),
    isPrimary: record.isPrimary === true,
  };
};

const parseLinkedIdentities = (value: unknown): UserLinkedIdentity[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => parseLinkedIdentity(item))
    .filter((item): item is UserLinkedIdentity => item !== null)
    .sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary));
};

const parseSession = (value: unknown): UserSessionRecord | null => {
  const record = asRecord(value);
  const sessionId = typeof record.sessionId === 'string' ? record.sessionId.trim() : '';
  if (!sessionId) {
    return null;
  }

  return {
    sessionId,
    clientId: parseNullableString(record.clientId),
    ipAddress: parseNullableString(record.ipAddress),
    startedAt: parseNullableString(record.startedAt),
    lastSeenAt: parseNullableString(record.lastSeenAt),
    isCurrent: record.isCurrent === true,
  };
};

const parseSessions = (value: unknown): UserSessionRecord[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => parseSession(item))
    .filter((item): item is UserSessionRecord => item !== null)
    .sort((left, right) => Number(right.isCurrent) - Number(left.isCurrent));
};

export const fetchMyProfile = async (): Promise<UserProfile> => {
  const token = await getWebAccessTokenFromSessionCookie();
  if (!token) {
    return emptyUserProfile();
  }

  let response: Response;
  try {
    response = await fetch(`${env.NEXT_PUBLIC_API_URL}/v1/users/me/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(3_000),
    });
  } catch {
    return emptyUserProfile();
  }

  if (!response.ok) {
    return emptyUserProfile();
  }

  const payload = asRecord(await response.json());
  return parseProfile(payload.profile);
};

export const fetchMyConsents = async (): Promise<UserConsent[]> => {
  const token = await getWebAccessTokenFromSessionCookie();
  if (!token) {
    return emptyUserConsents();
  }

  let response: Response;
  try {
    response = await fetch(`${env.NEXT_PUBLIC_API_URL}/v1/users/me/consents`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(3_000),
    });
  } catch {
    return emptyUserConsents();
  }

  if (!response.ok) {
    return emptyUserConsents();
  }

  const payload = asRecord(await response.json());
  return parseConsents(payload.consents);
};

export const fetchMyLinkedIdentities = async (): Promise<UserLinkedIdentity[]> => {
  const token = await getWebAccessTokenFromSessionCookie();
  if (!token) {
    return emptyUserLinkedIdentities();
  }

  let response: Response;
  try {
    response = await fetch(`${env.NEXT_PUBLIC_API_URL}/v1/users/me/linked-identities`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(3_000),
    });
  } catch {
    return emptyUserLinkedIdentities();
  }

  if (!response.ok) {
    return emptyUserLinkedIdentities();
  }

  const payload = asRecord(await response.json());
  return parseLinkedIdentities(payload.linkedIdentities);
};

export const fetchMySessions = async (): Promise<UserSessionRecord[]> => {
  const token = await getWebAccessTokenFromSessionCookie();
  if (!token) {
    return emptyUserSessions();
  }

  let response: Response;
  try {
    response = await fetch(`${env.NEXT_PUBLIC_API_URL}/v1/users/me/sessions`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(3_000),
    });
  } catch {
    return emptyUserSessions();
  }

  if (!response.ok) {
    return emptyUserSessions();
  }

  const payload = asRecord(await response.json());
  return parseSessions(payload.sessions);
};
