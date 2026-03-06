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
  createdAt: string | null;
  updatedAt: string | null;
}

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
  createdAt: null,
  updatedAt: null,
});

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const parseNullableString = (value: unknown): string | null =>
  value === null || value === undefined ? null : String(value);

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
    createdAt: parseNullableString(record.createdAt),
    updatedAt: parseNullableString(record.updatedAt),
  };
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
