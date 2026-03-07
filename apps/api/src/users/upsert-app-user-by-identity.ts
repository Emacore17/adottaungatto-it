import { Pool } from 'pg';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { AUTH_SECURITY_EVENT } from '../auth/security-events.constants';
import type { IdentityClaims } from './models/app-user.model';

type AppUserIdRow = {
  userId: string;
};

type LinkedIdentityRow = AppUserIdRow & {
  previousProvider: string;
  previousProviderSubject: string;
};

type AppUserIdentity = Pick<
  IdentityClaims | RequestUser,
  'provider' | 'providerSubject' | 'email' | 'emailVerified' | 'roles'
>;

const uniqueRoles = <TRole extends string>(roles: TRole[]): TRole[] => Array.from(new Set(roles));

const findUserIdByIdentity = async (
  pool: Pool,
  identity: AppUserIdentity,
): Promise<string | null> => {
  const result = await pool.query<AppUserIdRow>(
    `
      SELECT id::text AS "userId"
      FROM app_users
      WHERE provider = $1
        AND provider_subject = $2
      LIMIT 1;
    `,
    [identity.provider, identity.providerSubject],
  );

  return result.rows[0]?.userId ?? null;
};

const updateUserIdentityById = async (
  pool: Pool,
  userId: string,
  identity: AppUserIdentity,
): Promise<string> => {
  const result = await pool.query<AppUserIdRow>(
    `
      UPDATE app_users
      SET
        provider = $2,
        provider_subject = $3,
        email = $4,
        roles = $5::jsonb,
        updated_at = NOW()
      WHERE id = $1::bigint
      RETURNING id::text AS "userId";
    `,
    [userId, identity.provider, identity.providerSubject, identity.email, JSON.stringify(identity.roles)],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error('Failed to update user identity.');
  }

  return row.userId;
};

const upsertUserByIdentity = async (pool: Pool, identity: AppUserIdentity): Promise<string> => {
  const result = await pool.query<AppUserIdRow>(
    `
      INSERT INTO app_users (provider, provider_subject, email, roles)
      VALUES ($1, $2, $3, $4::jsonb)
      ON CONFLICT (provider, provider_subject)
      DO UPDATE SET
        email = EXCLUDED.email,
        roles = EXCLUDED.roles,
        updated_at = NOW()
      RETURNING id::text AS "userId";
    `,
    [
      identity.provider,
      identity.providerSubject,
      identity.email,
      JSON.stringify(uniqueRoles(identity.roles)),
    ],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error('Failed to upsert user identity.');
  }

  return row.userId;
};

const insertIdentityLinkSecurityEvent = async (
  pool: Pool,
  input: {
    userId: string;
    previousProvider: string;
    previousProviderSubject: string;
    nextProvider: string;
    nextProviderSubject: string;
  },
): Promise<void> => {
  const metadata = {
    strategy: 'verified_email_match',
    previousProvider: input.previousProvider,
    previousProviderSubject: input.previousProviderSubject,
    nextProvider: input.nextProvider,
    nextProviderSubject: input.nextProviderSubject,
  };

  try {
    await pool.query(
      `
        INSERT INTO user_security_events (user_id, event_type, metadata)
        VALUES ($1::bigint, $2, $3::jsonb);
      `,
      [input.userId, AUTH_SECURITY_EVENT.IDENTITY_LINKED_BY_VERIFIED_EMAIL, JSON.stringify(metadata)],
    );
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError.code === '42P01') {
      // Best effort fallback while migration rollout completes.
      return;
    }
    throw error;
  }
};

const touchLinkedIdentityBestEffort = async (
  pool: Pool,
  input: {
    userId: string;
    provider: string;
    providerSubject: string;
    emailAtLink: string;
  },
): Promise<void> => {
  try {
    await pool.query(
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
      [input.userId, input.provider, input.providerSubject, input.emailAtLink],
    );
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError.code === '42P01') {
      // Best effort fallback while migration rollout completes.
      return;
    }
    throw error;
  }
};

const tryLinkVerifiedEmailIdentity = async (
  pool: Pool,
  identity: AppUserIdentity,
): Promise<string | null> => {
  try {
    const result = await pool.query<LinkedIdentityRow>(
      `
        WITH candidate AS (
          SELECT candidate.id
          , candidate.provider AS "previousProvider"
          , candidate.provider_subject AS "previousProviderSubject"
          FROM app_users candidate
          WHERE lower(candidate.email) = lower($1)
          ORDER BY candidate.id ASC
          LIMIT 1
        )
        UPDATE app_users target
        SET
          provider = $2,
          provider_subject = $3,
          email = $1,
          roles = $4::jsonb,
          updated_at = NOW()
        FROM candidate
        WHERE target.id = candidate.id
        RETURNING
          target.id::text AS "userId",
          candidate."previousProvider" AS "previousProvider",
          candidate."previousProviderSubject" AS "previousProviderSubject";
      `,
      [
        identity.email,
        identity.provider,
        identity.providerSubject,
        JSON.stringify(uniqueRoles(identity.roles)),
      ],
    );

    const linkedIdentity = result.rows[0];
    if (!linkedIdentity) {
      return null;
    }

    const providerChanged =
      linkedIdentity.previousProvider !== identity.provider ||
      linkedIdentity.previousProviderSubject !== identity.providerSubject;

    if (providerChanged) {
      await insertIdentityLinkSecurityEvent(pool, {
        userId: linkedIdentity.userId,
        previousProvider: linkedIdentity.previousProvider,
        previousProviderSubject: linkedIdentity.previousProviderSubject,
        nextProvider: identity.provider,
        nextProviderSubject: identity.providerSubject,
      });
    }

    return linkedIdentity.userId;
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError.code === '23505') {
      // Concurrent identity binding can race on unique(provider, provider_subject):
      // fallback to deterministic upsert by provider subject.
      return upsertUserByIdentity(pool, identity);
    }
    throw error;
  }
};

export const upsertAppUserByIdentity = async (
  pool: Pool,
  identity: AppUserIdentity,
): Promise<string> => {
  const normalizedIdentity: AppUserIdentity = {
    provider: identity.provider,
    providerSubject: identity.providerSubject,
    email: identity.email.trim(),
    emailVerified: identity.emailVerified === true,
    roles: uniqueRoles(identity.roles),
  };

  const userIdByIdentity = await findUserIdByIdentity(pool, normalizedIdentity);
  if (userIdByIdentity) {
    const userId = await updateUserIdentityById(pool, userIdByIdentity, normalizedIdentity);
    await touchLinkedIdentityBestEffort(pool, {
      userId,
      provider: normalizedIdentity.provider,
      providerSubject: normalizedIdentity.providerSubject,
      emailAtLink: normalizedIdentity.email,
    });
    return userId;
  }

  if (normalizedIdentity.emailVerified) {
    const userIdByVerifiedEmail = await tryLinkVerifiedEmailIdentity(pool, normalizedIdentity);
    if (userIdByVerifiedEmail) {
      await touchLinkedIdentityBestEffort(pool, {
        userId: userIdByVerifiedEmail,
        provider: normalizedIdentity.provider,
        providerSubject: normalizedIdentity.providerSubject,
        emailAtLink: normalizedIdentity.email,
      });
      return userIdByVerifiedEmail;
    }
  }

  const createdUserId = await upsertUserByIdentity(pool, normalizedIdentity);
  await touchLinkedIdentityBestEffort(pool, {
    userId: createdUserId,
    provider: normalizedIdentity.provider,
    providerSubject: normalizedIdentity.providerSubject,
    emailAtLink: normalizedIdentity.email,
  });
  return createdUserId;
};
