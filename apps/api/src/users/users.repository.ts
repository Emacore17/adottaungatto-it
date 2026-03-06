import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import type { UserRole } from '../auth/roles.enum';
import { API_DATABASE_POOL } from '../database/database.constants';
import { UserRole as UserRoleValue } from '../auth/roles.enum';
import type {
  AppUser,
  IdentityClaims,
  UserProfile,
  UserProfileUpdateInput,
} from './models/app-user.model';
import { upsertAppUserByIdentity } from './upsert-app-user-by-identity';

type AppUserRow = {
  id: string;
  provider: string;
  providerSubject: string;
  email: string;
  roles: UserRole[];
  messageEmailNotificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

type UserProfileRow = {
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
};

@Injectable()
export class UsersRepository {
  constructor(
    @Inject(API_DATABASE_POOL)
    private readonly pool: Pool,
  ) {}

  async upsertFromIdentityClaims(claims: IdentityClaims): Promise<AppUser> {
    const userId = await upsertAppUserByIdentity(this.pool, claims);
    const row = await this.findAppUserRowById(userId);
    if (!row) {
      throw new Error('Failed to upsert application user.');
    }

    return {
      ...this.mapAppUserRow(row),
      emailVerified: claims.emailVerified,
    };
  }

  async updateMessagePreferences(
    claims: IdentityClaims,
    input: {
      messageEmailNotificationsEnabled: boolean;
    },
  ): Promise<AppUser> {
    const persistedUser = await this.upsertFromIdentityClaims(claims);
    if (!persistedUser.databaseId) {
      throw new Error('Failed to resolve internal user id for messaging preferences.');
    }

    const result = await this.pool.query<AppUserRow>(
      `
        UPDATE app_users
        SET
          message_email_notifications_enabled = $2,
          updated_at = NOW()
        WHERE id = $1::bigint
        RETURNING
          id::text AS "id",
          provider,
          provider_subject AS "providerSubject",
          email,
          roles,
          message_email_notifications_enabled AS "messageEmailNotificationsEnabled",
          created_at::text AS "createdAt",
          updated_at::text AS "updatedAt";
      `,
      [persistedUser.databaseId, input.messageEmailNotificationsEnabled],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('Failed to update user messaging preferences.');
    }

    return {
      ...this.mapAppUserRow(row),
      emailVerified: claims.emailVerified,
    };
  }

  async getProfileByIdentityClaims(claims: IdentityClaims): Promise<UserProfile> {
    const userDatabaseId = await this.ensureUserDatabaseId(claims);
    return this.getProfileByUserDatabaseId(userDatabaseId);
  }

  async updateProfile(claims: IdentityClaims, input: UserProfileUpdateInput): Promise<UserProfile> {
    const userDatabaseId = await this.ensureUserDatabaseId(claims);
    const currentProfile = await this.getProfileByUserDatabaseId(userDatabaseId);
    const nextPhoneE164 = input.phoneE164 !== undefined ? input.phoneE164 : currentProfile.phoneE164;
    const phoneChanged = nextPhoneE164 !== currentProfile.phoneE164;

    const nextProfile = {
      firstName: input.firstName !== undefined ? input.firstName : currentProfile.firstName,
      lastName: input.lastName !== undefined ? input.lastName : currentProfile.lastName,
      displayName: input.displayName !== undefined ? input.displayName : currentProfile.displayName,
      phoneE164: nextPhoneE164,
      phoneVerifiedAt: phoneChanged ? null : currentProfile.phoneVerifiedAt,
      city: input.city !== undefined ? input.city : currentProfile.city,
      province: input.province !== undefined ? input.province : currentProfile.province,
      bio: input.bio !== undefined ? input.bio : currentProfile.bio,
      avatarStorageKey: currentProfile.avatarStorageKey,
    };

    return this.upsertProfileByUserDatabaseId(userDatabaseId, nextProfile);
  }

  async setAvatarStorageKey(
    claims: IdentityClaims,
    avatarStorageKey: string | null,
  ): Promise<UserProfile> {
    const userDatabaseId = await this.ensureUserDatabaseId(claims);
    const currentProfile = await this.getProfileByUserDatabaseId(userDatabaseId);

    return this.upsertProfileByUserDatabaseId(userDatabaseId, {
      firstName: currentProfile.firstName,
      lastName: currentProfile.lastName,
      displayName: currentProfile.displayName,
      phoneE164: currentProfile.phoneE164,
      phoneVerifiedAt: currentProfile.phoneVerifiedAt,
      city: currentProfile.city,
      province: currentProfile.province,
      bio: currentProfile.bio,
      avatarStorageKey,
    });
  }

  async markPhoneVerified(claims: IdentityClaims, phoneE164: string): Promise<UserProfile> {
    const userDatabaseId = await this.ensureUserDatabaseId(claims);
    const currentProfile = await this.getProfileByUserDatabaseId(userDatabaseId);

    return this.upsertProfileByUserDatabaseId(userDatabaseId, {
      firstName: currentProfile.firstName,
      lastName: currentProfile.lastName,
      displayName: currentProfile.displayName,
      phoneE164,
      phoneVerifiedAt: new Date().toISOString(),
      city: currentProfile.city,
      province: currentProfile.province,
      bio: currentProfile.bio,
      avatarStorageKey: currentProfile.avatarStorageKey,
    });
  }

  private async ensureUserDatabaseId(claims: IdentityClaims): Promise<string> {
    const persistedUser = await this.upsertFromIdentityClaims(claims);
    if (!persistedUser.databaseId) {
      throw new Error('Failed to resolve internal user id.');
    }

    return persistedUser.databaseId;
  }

  private async findAppUserRowById(userDatabaseId: string): Promise<AppUserRow | null> {
    const result = await this.pool.query<AppUserRow>(
      `
        SELECT
          id::text AS "id",
          provider,
          provider_subject AS "providerSubject",
          email,
          roles,
          message_email_notifications_enabled AS "messageEmailNotificationsEnabled",
          created_at::text AS "createdAt",
          updated_at::text AS "updatedAt"
        FROM app_users
        WHERE id = $1::bigint
        LIMIT 1;
      `,
      [userDatabaseId],
    );

    return result.rows[0] ?? null;
  }

  private async getProfileByUserDatabaseId(userDatabaseId: string): Promise<UserProfile> {
    const result = await this.pool.query<UserProfileRow>(
      `
        SELECT
          first_name AS "firstName",
          last_name AS "lastName",
          display_name AS "displayName",
          phone_e164 AS "phoneE164",
          phone_verified_at::text AS "phoneVerifiedAt",
          city,
          province,
          bio,
          avatar_storage_key AS "avatarStorageKey",
          created_at::text AS "createdAt",
          updated_at::text AS "updatedAt"
        FROM user_profiles
        WHERE user_id = $1::bigint;
      `,
      [userDatabaseId],
    );

    const row = result.rows[0];
    if (!row) {
      return this.buildEmptyProfile();
    }

    return this.mapUserProfileRow(row);
  }

  private async upsertProfileByUserDatabaseId(
    userDatabaseId: string,
    input: {
      firstName: string | null;
      lastName: string | null;
      displayName: string | null;
      phoneE164: string | null;
      phoneVerifiedAt: string | null;
      city: string | null;
      province: string | null;
      bio: string | null;
      avatarStorageKey: string | null;
    },
  ): Promise<UserProfile> {
    const result = await this.pool.query<UserProfileRow>(
      `
        INSERT INTO user_profiles (
          user_id,
          first_name,
          last_name,
          display_name,
          phone_e164,
          phone_verified_at,
          city,
          province,
          bio,
          avatar_storage_key
        )
        VALUES ($1::bigint, $2, $3, $4, $5, $6::timestamptz, $7, $8, $9, $10)
        ON CONFLICT (user_id)
        DO UPDATE SET
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          display_name = EXCLUDED.display_name,
          phone_e164 = EXCLUDED.phone_e164,
          phone_verified_at = EXCLUDED.phone_verified_at,
          city = EXCLUDED.city,
          province = EXCLUDED.province,
          bio = EXCLUDED.bio,
          avatar_storage_key = EXCLUDED.avatar_storage_key,
          updated_at = NOW()
        RETURNING
          first_name AS "firstName",
          last_name AS "lastName",
          display_name AS "displayName",
          phone_e164 AS "phoneE164",
          phone_verified_at::text AS "phoneVerifiedAt",
          city,
          province,
          bio,
          avatar_storage_key AS "avatarStorageKey",
          created_at::text AS "createdAt",
          updated_at::text AS "updatedAt";
      `,
      [
        userDatabaseId,
        input.firstName,
        input.lastName,
        input.displayName,
        input.phoneE164,
        input.phoneVerifiedAt,
        input.city,
        input.province,
        input.bio,
        input.avatarStorageKey,
      ],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('Failed to upsert user profile.');
    }

    return this.mapUserProfileRow(row);
  }

  private mapAppUserRow(row: AppUserRow): AppUser {
    return {
      id: row.providerSubject,
      databaseId: row.id,
      provider: row.provider === 'keycloak' ? 'keycloak' : 'dev-header',
      providerSubject: row.providerSubject,
      email: row.email,
      roles: Array.isArray(row.roles) ? row.roles : [UserRoleValue.USER],
      preferences: {
        messageEmailNotificationsEnabled: row.messageEmailNotificationsEnabled === true,
      },
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapUserProfileRow(row: UserProfileRow): UserProfile {
    return {
      firstName: row.firstName,
      lastName: row.lastName,
      displayName: row.displayName,
      phoneE164: row.phoneE164,
      phoneVerifiedAt: row.phoneVerifiedAt,
      city: row.city,
      province: row.province,
      bio: row.bio,
      avatarStorageKey: row.avatarStorageKey,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private buildEmptyProfile(): UserProfile {
    return {
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
    };
  }
}
