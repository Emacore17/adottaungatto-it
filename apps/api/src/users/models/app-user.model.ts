import type { UserRole } from '../../auth/roles.enum';

export type IdentityProvider = 'dev-header' | 'keycloak';

export interface AppUser {
  id: string;
  databaseId?: string | null;
  provider: IdentityProvider;
  providerSubject: string;
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
