import { loadApiEnv } from '@adottaungatto/config';
import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import type { UserRole } from '../auth/roles.enum';
import { UserRole as UserRoleValue } from '../auth/roles.enum';
import type { AppUser, IdentityClaims } from './models/app-user.model';

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

@Injectable()
export class UsersRepository implements OnModuleDestroy {
  private readonly env = loadApiEnv();
  private readonly pool = new Pool({
    connectionString: this.env.DATABASE_URL,
  });

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async upsertFromIdentityClaims(claims: IdentityClaims): Promise<AppUser> {
    const result = await this.pool.query<AppUserRow>(
      `
        INSERT INTO app_users (provider, provider_subject, email, roles)
        VALUES ($1, $2, $3, $4::jsonb)
        ON CONFLICT (provider, provider_subject)
        DO UPDATE SET
          email = EXCLUDED.email,
          roles = EXCLUDED.roles,
          updated_at = NOW()
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
      [claims.provider, claims.providerSubject, claims.email, JSON.stringify(claims.roles)],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('Failed to upsert application user.');
    }

    return this.mapAppUserRow(row);
  }

  async updateMessagePreferences(
    claims: IdentityClaims,
    input: {
      messageEmailNotificationsEnabled: boolean;
    },
  ): Promise<AppUser> {
    const persistedUser = await this.upsertFromIdentityClaims(claims);

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
      [persistedUser.id, input.messageEmailNotificationsEnabled],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('Failed to update user messaging preferences.');
    }

    return this.mapAppUserRow(row);
  }

  private mapAppUserRow(row: AppUserRow): AppUser {
    return {
      id: row.id,
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
}
