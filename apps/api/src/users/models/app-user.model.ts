import type { UserRole } from '../../auth/roles.enum';

export type IdentityProvider = 'dev-header' | 'keycloak';

export interface AppUser {
  id: string;
  provider: IdentityProvider;
  providerSubject: string;
  email: string;
  roles: UserRole[];
  createdAt: string;
  updatedAt: string;
}

export interface IdentityClaims {
  provider: IdentityProvider;
  providerSubject: string;
  email: string;
  roles: UserRole[];
}
