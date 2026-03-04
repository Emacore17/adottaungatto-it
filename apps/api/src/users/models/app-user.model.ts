import type { UserRole } from '../../auth/roles.enum';

export type IdentityProvider = 'dev-header' | 'keycloak';

export interface AppUser {
  id: string;
  databaseId?: string | null;
  provider: IdentityProvider;
  providerSubject: string;
  email: string;
  roles: UserRole[];
  preferences?: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface IdentityClaims {
  provider: IdentityProvider;
  providerSubject: string;
  email: string;
  roles: UserRole[];
}

export interface UserPreferences {
  messageEmailNotificationsEnabled: boolean;
}
