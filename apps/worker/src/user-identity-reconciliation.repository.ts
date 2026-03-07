import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { WORKER_DATABASE_POOL } from './database/database.constants';

export type ReconciliationCandidateUser = {
  userDatabaseId: string;
  keycloakUserId: string;
  currentEmail: string;
};

export type ReconcileLinkedIdentityInput = {
  provider: string;
  providerSubject: string;
  emailAtLink: string | null;
};

export type ReconcileKeycloakUserInput = {
  userDatabaseId: string;
  keycloakUserId: string;
  email: string;
  linkedIdentities: ReconcileLinkedIdentityInput[];
};

export type ReconcileKeycloakUserResult = {
  emailUpdated: boolean;
  upsertedLinkedIdentities: number;
  removedLinkedIdentities: number;
};

type KeycloakUserRow = {
  userDatabaseId: string;
  keycloakUserId: string;
  currentEmail: string;
};

const buildIdentityKey = (provider: string, providerSubject: string): string =>
  `${provider}:${providerSubject}`;

@Injectable()
export class UserIdentityReconciliationRepository {
  constructor(
    @Inject(WORKER_DATABASE_POOL)
    private readonly pool: Pool,
  ) {}

  async listKeycloakUsersBatch(
    cursorUserDatabaseId: string | null,
    batchSize: number,
  ): Promise<ReconciliationCandidateUser[]> {
    const result =
      cursorUserDatabaseId === null
        ? await this.pool.query<KeycloakUserRow>(
            `
              SELECT
                au.id::text AS "userDatabaseId",
                au.provider_subject AS "keycloakUserId",
                au.email AS "currentEmail"
              FROM app_users au
              WHERE au.provider = 'keycloak'
              ORDER BY au.id ASC
              LIMIT $1::integer;
            `,
            [batchSize],
          )
        : await this.pool.query<KeycloakUserRow>(
            `
              SELECT
                au.id::text AS "userDatabaseId",
                au.provider_subject AS "keycloakUserId",
                au.email AS "currentEmail"
              FROM app_users au
              WHERE au.provider = 'keycloak'
                AND au.id > $1::bigint
              ORDER BY au.id ASC
              LIMIT $2::integer;
            `,
            [cursorUserDatabaseId, batchSize],
          );

    return result.rows.map((row) => ({
      userDatabaseId: row.userDatabaseId,
      keycloakUserId: row.keycloakUserId,
      currentEmail: row.currentEmail,
    }));
  }

  async reconcileKeycloakUser(
    input: ReconcileKeycloakUserInput,
  ): Promise<ReconcileKeycloakUserResult> {
    const deduplicatedLinkedIdentities = Array.from(
      new Map(
        input.linkedIdentities.map((identity) => [
          buildIdentityKey(identity.provider, identity.providerSubject),
          identity,
        ]),
      ).values(),
    );

    const keepIdentityKeys = [
      buildIdentityKey('keycloak', input.keycloakUserId),
      ...deduplicatedLinkedIdentities.map((identity) =>
        buildIdentityKey(identity.provider, identity.providerSubject),
      ),
    ];

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const emailUpdateResult = await client.query<{ id: string }>(
        `
          UPDATE app_users
          SET
            email = $2,
            updated_at = NOW()
          WHERE id = $1::bigint
            AND email <> $2
          RETURNING id::text AS id;
        `,
        [input.userDatabaseId, input.email],
      );

      let upsertedLinkedIdentities = 0;

      await client.query(
        `
          INSERT INTO user_linked_identities (
            user_id,
            provider,
            provider_subject,
            email_at_link
          )
          VALUES ($1::bigint, 'keycloak', $2, $3)
          ON CONFLICT (provider, provider_subject)
          DO UPDATE SET
            user_id = EXCLUDED.user_id,
            email_at_link = EXCLUDED.email_at_link,
            last_seen_at = NOW();
        `,
        [input.userDatabaseId, input.keycloakUserId, input.email],
      );
      upsertedLinkedIdentities += 1;

      for (const identity of deduplicatedLinkedIdentities) {
        await client.query(
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
          [input.userDatabaseId, identity.provider, identity.providerSubject, identity.emailAtLink],
        );
        upsertedLinkedIdentities += 1;
      }

      const pruneResult = await client.query<{ id: string }>(
        `
          DELETE FROM user_linked_identities
          WHERE user_id = $1::bigint
            AND CONCAT(provider, ':', provider_subject) <> ALL($2::text[])
          RETURNING id::text AS id;
        `,
        [input.userDatabaseId, keepIdentityKeys],
      );

      await client.query('COMMIT');

      return {
        emailUpdated: (emailUpdateResult.rows[0]?.id ?? null) !== null,
        upsertedLinkedIdentities,
        removedLinkedIdentities: pruneResult.rows.length,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
