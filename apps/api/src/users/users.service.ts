import { Injectable } from '@nestjs/common';
import type { AppUser, IdentityClaims } from './models/app-user.model';

@Injectable()
export class UsersService {
  private readonly usersByIdentityKey = new Map<string, AppUser>();

  upsertFromIdentity(claims: IdentityClaims): AppUser {
    const identityKey = `${claims.provider}:${claims.providerSubject}`;
    const now = new Date().toISOString();
    const existing = this.usersByIdentityKey.get(identityKey);

    if (existing) {
      const updatedUser: AppUser = {
        ...existing,
        email: claims.email,
        roles: claims.roles,
        updatedAt: now,
      };
      this.usersByIdentityKey.set(identityKey, updatedUser);
      return updatedUser;
    }

    const createdUser: AppUser = {
      id: claims.providerSubject,
      provider: claims.provider,
      providerSubject: claims.providerSubject,
      email: claims.email,
      roles: claims.roles,
      createdAt: now,
      updatedAt: now,
    };

    this.usersByIdentityKey.set(identityKey, createdUser);
    return createdUser;
  }
}
