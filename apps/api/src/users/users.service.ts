import { Inject, Injectable } from '@nestjs/common';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import type {
  AppUser,
  IdentityClaims,
  UserProfile,
  UserProfileUpdateInput,
} from './models/app-user.model';
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
        emailVerified: claims.emailVerified ?? existing.emailVerified,
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
      emailVerified: claims.emailVerified,
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
      emailVerified: user.emailVerified,
      roles: user.roles,
    });

    const userWithClaims: AppUser = {
      ...persistedUser,
      emailVerified: user.emailVerified ?? persistedUser.emailVerified,
    };

    this.usersByIdentityKey.set(`${user.provider}:${user.providerSubject}`, userWithClaims);
    return userWithClaims;
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
        emailVerified: user.emailVerified,
        roles: user.roles,
      },
      input,
    );

    const userWithClaims: AppUser = {
      ...persistedUser,
      emailVerified: user.emailVerified ?? persistedUser.emailVerified,
    };

    this.usersByIdentityKey.set(`${user.provider}:${user.providerSubject}`, userWithClaims);
    return userWithClaims;
  }

  async getCurrentUserProfile(user: RequestUser): Promise<UserProfile> {
    return this.usersRepository.getProfileByIdentityClaims({
      provider: user.provider,
      providerSubject: user.providerSubject,
      email: user.email,
      emailVerified: user.emailVerified,
      roles: user.roles,
    });
  }

  async updateCurrentUserProfile(
    user: RequestUser,
    input: UserProfileUpdateInput,
  ): Promise<UserProfile> {
    return this.usersRepository.updateProfile(
      {
        provider: user.provider,
        providerSubject: user.providerSubject,
        email: user.email,
        emailVerified: user.emailVerified,
        roles: user.roles,
      },
      input,
    );
  }

  async setCurrentUserAvatarStorageKey(
    user: RequestUser,
    avatarStorageKey: string | null,
  ): Promise<UserProfile> {
    return this.usersRepository.setAvatarStorageKey(
      {
        provider: user.provider,
        providerSubject: user.providerSubject,
        email: user.email,
        emailVerified: user.emailVerified,
        roles: user.roles,
      },
      avatarStorageKey,
    );
  }

  async markCurrentUserPhoneVerified(user: RequestUser, phoneE164: string): Promise<UserProfile> {
    return this.usersRepository.markPhoneVerified(
      {
        provider: user.provider,
        providerSubject: user.providerSubject,
        email: user.email,
        emailVerified: user.emailVerified,
        roles: user.roles,
      },
      phoneE164,
    );
  }
}
