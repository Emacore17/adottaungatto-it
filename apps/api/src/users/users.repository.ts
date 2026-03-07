import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import type { UserRole } from '../auth/roles.enum';
import { API_DATABASE_POOL } from '../database/database.constants';
import { UserRole as UserRoleValue } from '../auth/roles.enum';
import type {
  AppUser,
  IdentityClaims,
  UserConsent,
  UserConsentType,
  UserConsentUpdateInput,
  UserFavoriteListing,
  UserLinkedIdentity,
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

type UserFavoriteRow = {
  listingId: string;
  addedAt: string;
};

type UserConsentRow = {
  type: UserConsentType;
  granted: boolean;
  version: string;
  grantedAt: string;
  source: string;
};

type UserLinkedIdentityRow = {
  provider: string;
  providerSubject: string;
  emailAtLink: string | null;
  linkedAt: string;
  lastSeenAt: string;
  isPrimary: boolean;
};

const USER_CONSENT_TYPES: UserConsentType[] = ['privacy', 'terms', 'marketing'];

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

  async getConsentsByIdentityClaims(claims: IdentityClaims): Promise<UserConsent[]> {
    const userDatabaseId = await this.ensureUserDatabaseId(claims);
    return this.listCurrentConsentsByUserDatabaseId(userDatabaseId);
  }

  async appendConsentsByIdentityClaims(
    claims: IdentityClaims,
    input: {
      consents: UserConsentUpdateInput[];
      ip: string | null;
      userAgent: string | null;
    },
  ): Promise<UserConsent[]> {
    const userDatabaseId = await this.ensureUserDatabaseId(claims);
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      for (const consent of input.consents) {
        await client.query(
          `
            INSERT INTO user_consents (
              user_id,
              consent_type,
              consent_version,
              granted,
              source,
              ip,
              user_agent
            )
            VALUES ($1::bigint, $2, $3, $4::boolean, $5, $6::inet, $7);
          `,
          [
            userDatabaseId,
            consent.type,
            consent.version,
            consent.granted,
            consent.source,
            input.ip,
            input.userAgent,
          ],
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return this.listCurrentConsentsByUserDatabaseId(userDatabaseId);
  }

  async listFavoritesByIdentityClaims(claims: IdentityClaims): Promise<UserFavoriteListing[]> {
    const userDatabaseId = await this.ensureUserDatabaseId(claims);
    return this.listFavoritesByUserDatabaseId(userDatabaseId);
  }

  async addFavoriteByIdentityClaims(
    claims: IdentityClaims,
    listingId: string,
  ): Promise<UserFavoriteListing[]> {
    const userDatabaseId = await this.ensureUserDatabaseId(claims);

    await this.pool.query(
      `
        INSERT INTO user_favorite_listings (user_id, listing_id)
        VALUES ($1::bigint, $2::bigint)
        ON CONFLICT (user_id, listing_id)
        DO NOTHING;
      `,
      [userDatabaseId, listingId],
    );

    return this.listFavoritesByUserDatabaseId(userDatabaseId);
  }

  async removeFavoriteByIdentityClaims(
    claims: IdentityClaims,
    listingId: string,
  ): Promise<UserFavoriteListing[]> {
    const userDatabaseId = await this.ensureUserDatabaseId(claims);

    await this.pool.query(
      `
        DELETE FROM user_favorite_listings
        WHERE user_id = $1::bigint
          AND listing_id = $2::bigint;
      `,
      [userDatabaseId, listingId],
    );

    return this.listFavoritesByUserDatabaseId(userDatabaseId);
  }

  async upsertLinkedIdentityByIdentityClaims(
    claims: IdentityClaims,
    input: {
      provider: string;
      providerSubject: string;
      emailAtLink: string | null;
    },
  ): Promise<void> {
    const userDatabaseId = await this.ensureUserDatabaseId(claims);
    await this.pool.query(
      `
        INSERT INTO user_linked_identities (
          user_id,
          provider,
          provider_subject,
          email_at_link
        )
        VALUES ($1::bigint, $2, $3, $4)
        ON CONFLICT (provider, provider_subject)
        DO UPDATE SET
          user_id = EXCLUDED.user_id,
          email_at_link = EXCLUDED.email_at_link,
          last_seen_at = NOW();
      `,
      [userDatabaseId, input.provider, input.providerSubject, input.emailAtLink],
    );
  }

  async listLinkedIdentitiesByIdentityClaims(claims: IdentityClaims): Promise<UserLinkedIdentity[]> {
    const userDatabaseId = await this.ensureUserDatabaseId(claims);
    await this.upsertLinkedIdentityByIdentityClaims(claims, {
      provider: claims.provider,
      providerSubject: claims.providerSubject,
      emailAtLink: claims.email,
    });

    const result = await this.pool.query<UserLinkedIdentityRow>(
      `
        SELECT
          li.provider,
          li.provider_subject AS "providerSubject",
          li.email_at_link AS "emailAtLink",
          li.linked_at::text AS "linkedAt",
          li.last_seen_at::text AS "lastSeenAt",
          (li.provider = au.provider AND li.provider_subject = au.provider_subject) AS "isPrimary"
        FROM user_linked_identities li
        INNER JOIN app_users au
          ON au.id = li.user_id
        WHERE li.user_id = $1::bigint
        ORDER BY "isPrimary" DESC, li.last_seen_at DESC, li.id DESC;
      `,
      [userDatabaseId],
    );

    return result.rows.map((row) => ({
      provider: row.provider,
      providerSubject: row.providerSubject,
      emailAtLink: row.emailAtLink,
      linkedAt: row.linkedAt,
      lastSeenAt: row.lastSeenAt,
      isPrimary: row.isPrimary === true,
    }));
  }

  async deleteLinkedIdentityByProviderByIdentityClaims(
    claims: IdentityClaims,
    provider: string,
  ): Promise<boolean> {
    const userDatabaseId = await this.ensureUserDatabaseId(claims);
    const result = await this.pool.query<{ id: string }>(
      `
        DELETE FROM user_linked_identities
        WHERE user_id = $1::bigint
          AND provider = $2
        RETURNING id::text AS id;
      `,
      [userDatabaseId, provider],
    );

    return (result.rows[0]?.id ?? null) !== null;
  }

  async pruneLinkedIdentitiesByIdentityClaims(
    claims: IdentityClaims,
    keepProviders: string[],
  ): Promise<void> {
    const userDatabaseId = await this.ensureUserDatabaseId(claims);

    if (keepProviders.length === 0) {
      await this.pool.query(
        `
          DELETE FROM user_linked_identities
          WHERE user_id = $1::bigint
            AND NOT (provider = $2 AND provider_subject = $3);
        `,
        [userDatabaseId, claims.provider, claims.providerSubject],
      );
      return;
    }

    await this.pool.query(
      `
        DELETE FROM user_linked_identities
        WHERE user_id = $1::bigint
          AND NOT (provider = $2 AND provider_subject = $3)
          AND provider <> ALL($4::text[]);
      `,
      [userDatabaseId, claims.provider, claims.providerSubject, keepProviders],
    );
  }

  async listingExistsForFavorite(listingId: string): Promise<boolean> {
    const result = await this.pool.query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM listings
          WHERE id = $1::bigint
            AND status = 'published'
            AND deleted_at IS NULL
        ) AS "exists";
      `,
      [listingId],
    );

    return result.rows[0]?.exists === true;
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

  private async listCurrentConsentsByUserDatabaseId(userDatabaseId: string): Promise<UserConsent[]> {
    const result = await this.pool.query<UserConsentRow>(
      `
        SELECT DISTINCT ON (consent_type)
          consent_type AS "type",
          granted,
          consent_version AS "version",
          created_at::text AS "grantedAt",
          source
        FROM user_consents
        WHERE user_id = $1::bigint
        ORDER BY consent_type, created_at DESC, id DESC;
      `,
      [userDatabaseId],
    );

    const rowsByType = new Map<UserConsentType, UserConsentRow>();
    for (const row of result.rows) {
      rowsByType.set(row.type, row);
    }

    return USER_CONSENT_TYPES.map((type) => {
      const row = rowsByType.get(type);
      if (!row) {
        return this.buildEmptyConsent(type);
      }

      return this.mapUserConsentRow(row);
    });
  }

  private async listFavoritesByUserDatabaseId(userDatabaseId: string): Promise<UserFavoriteListing[]> {
    const result = await this.pool.query<UserFavoriteRow>(
      `
        SELECT
          listing_id::text AS "listingId",
          created_at::text AS "addedAt"
        FROM user_favorite_listings
        WHERE user_id = $1::bigint
        ORDER BY created_at DESC, listing_id DESC;
      `,
      [userDatabaseId],
    );

    return result.rows.map((row) => this.mapUserFavoriteRow(row));
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

  private mapUserFavoriteRow(row: UserFavoriteRow): UserFavoriteListing {
    return {
      listingId: row.listingId,
      addedAt: row.addedAt,
    };
  }

  private mapUserConsentRow(row: UserConsentRow): UserConsent {
    return {
      type: row.type,
      granted: row.granted === true,
      version: row.version,
      grantedAt: row.grantedAt,
      source: row.source,
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

  private buildEmptyConsent(type: UserConsentType): UserConsent {
    return {
      type,
      granted: false,
      version: null,
      grantedAt: null,
      source: null,
    };
  }
}
