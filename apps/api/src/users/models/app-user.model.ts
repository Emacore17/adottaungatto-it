import type { UserRole } from '../../auth/roles.enum';

export type IdentityProvider = 'dev-header' | 'keycloak';

export interface AppUser {
  id: string;
  databaseId?: string | null;
  provider: IdentityProvider;
  providerSubject: string;
  authSessionId?: string | null;
  authClientId?: string | null;
  email: string;
  emailVerified?: boolean;
  roles: UserRole[];
  profile?: UserProfile;
  preferences?: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface IdentityClaims {
  provider: IdentityProvider;
  providerSubject: string;
  authSessionId?: string | null;
  authClientId?: string | null;
  email: string;
  emailVerified?: boolean;
  roles: UserRole[];
}

export interface UserPreferences {
  messageEmailNotificationsEnabled: boolean;
}

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

export interface UserProfileUpdateInput {
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  phoneE164?: string | null;
  city?: string | null;
  province?: string | null;
  bio?: string | null;
}

export interface UserAvatarUploadInput {
  mimeType: string;
  payload: Buffer;
  originalFileName: string | null;
}

export interface UserFavoriteListing {
  listingId: string;
  addedAt: string;
}

export type UserConsentType = 'privacy' | 'terms' | 'marketing';

export interface UserConsent {
  type: UserConsentType;
  granted: boolean;
  version: string | null;
  grantedAt: string | null;
  source: string | null;
}

export interface UserConsentUpdateInput {
  type: UserConsentType;
  granted: boolean;
  version: string;
  source: string;
}

export interface UserLinkedIdentity {
  provider: string;
  providerSubject: string;
  emailAtLink: string | null;
  linkedAt: string;
  lastSeenAt: string;
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
