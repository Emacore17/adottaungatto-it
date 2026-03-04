import { Inject, Injectable } from '@nestjs/common';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import type { AppUser, IdentityClaims } from './models/app-user.model';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  private readonly usersByIdentityKey = new Map<string, AppUser>();

  constructor(
    @Inject(UsersRepository)
    private readonly usersRepository: UsersRepository,
  ) {}

  upsertFromIdentity(claims: IdentityClaims): AppUser {
    const identityKey = `${claims.provider}:${claims.providerSubject}`;
    const now = new Date().toISOString();
    const existing = this.usersByIdentityKey.get(identityKey);

    if (existing) {
      const updatedUser: AppUser = {
        ...existing,
        email: claims.email,
        roles: claims.roles,
        preferences: existing.preferences,
        updatedAt: now,
      };
      this.usersByIdentityKey.set(identityKey, updatedUser);
      return updatedUser;
    }

    const createdUser: AppUser = {
      id: claims.providerSubject,
      databaseId: null,
      provider: claims.provider,
      providerSubject: claims.providerSubject,
      email: claims.email,
      roles: claims.roles,
      preferences: {
        messageEmailNotificationsEnabled: true,
      },
      createdAt: now,
      updatedAt: now,
    };

    this.usersByIdentityKey.set(identityKey, createdUser);
    return createdUser;
  }

  async getCurrentUser(user: RequestUser): Promise<AppUser> {
    const persistedUser = await this.usersRepository.upsertFromIdentityClaims({
      provider: user.provider,
      providerSubject: user.providerSubject,
      email: user.email,
      roles: user.roles,
    });

    this.usersByIdentityKey.set(`${user.provider}:${user.providerSubject}`, persistedUser);
    return persistedUser;
  }

  async updateCurrentUserMessagingPreferences(
    user: RequestUser,
    input: {
      messageEmailNotificationsEnabled: boolean;
    },
  ): Promise<AppUser> {
    const persistedUser = await this.usersRepository.updateMessagePreferences(
      {
        provider: user.provider,
        providerSubject: user.providerSubject,
        email: user.email,
        roles: user.roles,
      },
      input,
    );

    this.usersByIdentityKey.set(`${user.provider}:${user.providerSubject}`, persistedUser);
    return persistedUser;
  }
}
