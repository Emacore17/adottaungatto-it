import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AUTH_SECURITY_EVENT } from '../src/auth/security-events.constants';

type LocationRow = {
  regionId: string;
  provinceId: string;
  comuneId: string;
};

type ListingOwnerRow = {
  listingId: string;
  ownerUserId: string;
};

type LinkedUserRow = {
  usersCount: string;
  providerSubject: string;
};

type SecurityEventCountRow = {
  count: string;
};

const sharedEmail = 'identity-link@example.test';
const userAHeaders = {
  'x-auth-user-id': 'identity-link-a',
  'x-auth-subject': 'identity-link-a',
  'x-auth-email': sharedEmail,
  'x-auth-roles': 'user',
};
const userBHeaders = {
  'x-auth-user-id': 'identity-link-b',
  'x-auth-subject': 'identity-link-b',
  'x-auth-email': sharedEmail,
  'x-auth-roles': 'user',
};

describe('Auth identity linking e2e (verified email fallback)', () => {
  let app: NestFastifyApplication;
  let pool: Pool;
  let location: LocationRow;
  const createdListingIds: string[] = [];

  beforeAll(async () => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    const locationResult = await pool.query<LocationRow>(`
      SELECT
        r.id::text AS "regionId",
        p.id::text AS "provinceId",
        c.id::text AS "comuneId"
      FROM regions r
      INNER JOIN provinces p ON p.region_id = r.id
      INNER JOIN comuni c ON c.province_id = p.id
      ORDER BY r.id ASC, p.id ASC, c.id ASC
      LIMIT 1
    `);

    if (!locationResult.rows[0]) {
      throw new Error('No geography rows available for identity linking test.');
    }
    location = locationResult.rows[0];

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  }, 60_000);

  afterAll(async () => {
    const numericListingIds = createdListingIds
      .map((value) => Number.parseInt(value, 10))
      .filter((value) => Number.isFinite(value));

    if (numericListingIds.length > 0) {
      await pool.query('DELETE FROM listings WHERE id = ANY($1::bigint[])', [numericListingIds]);
    }

    await pool.query(
      `
        DELETE FROM user_security_events
        WHERE event_type = $1
          AND (
            metadata->>'nextProviderSubject' = ANY($2::text[])
            OR metadata->>'previousProviderSubject' = ANY($2::text[])
          );
      `,
      [AUTH_SECURITY_EVENT.IDENTITY_LINKED_BY_VERIFIED_EMAIL, ['identity-link-a', 'identity-link-b']],
    );
    await pool.query('DELETE FROM app_users WHERE lower(email) = lower($1)', [sharedEmail]);
    await app.close();
    await pool.end();
  });

  it('links two verified identities with same email to a single app_users record', async () => {
    const securityEventsBeforeResult = await pool.query<SecurityEventCountRow>(
      `
        SELECT COUNT(*)::text AS "count"
        FROM user_security_events
        WHERE event_type = $1
          AND metadata->>'nextProviderSubject' = $2;
      `,
      [AUTH_SECURITY_EVENT.IDENTITY_LINKED_BY_VERIFIED_EMAIL, 'identity-link-b'],
    );
    const securityEventsBefore = Number.parseInt(
      securityEventsBeforeResult.rows[0]?.count ?? '0',
      10,
    );

    const meAResponse = await request(app.getHttpServer()).get('/v1/users/me').set(userAHeaders);
    expect(meAResponse.status).toBe(200);
    expect(meAResponse.body.user.id).toBe('identity-link-a');

    const meBResponse = await request(app.getHttpServer()).get('/v1/users/me').set(userBHeaders);
    expect(meBResponse.status).toBe(200);
    expect(meBResponse.body.user.id).toBe('identity-link-b');

    const createAResponse = await request(app.getHttpServer())
      .post('/v1/listings')
      .set(userAHeaders)
      .send({
        title: `[AUTH-LINK] Listing A ${Date.now()}`,
        description: 'Identity linking listing A',
        listingType: 'adozione',
        ageMonths: 12,
        sex: 'femmina',
        regionId: location.regionId,
        provinceId: location.provinceId,
        comuneId: location.comuneId,
      });

    expect(createAResponse.status).toBe(201);
    const listingAId = createAResponse.body?.listing?.id as string | undefined;
    expect(typeof listingAId).toBe('string');
    if (!listingAId) {
      throw new Error('Listing A id not returned.');
    }
    createdListingIds.push(listingAId);

    const createBResponse = await request(app.getHttpServer())
      .post('/v1/listings')
      .set(userBHeaders)
      .send({
        title: `[AUTH-LINK] Listing B ${Date.now()}`,
        description: 'Identity linking listing B',
        listingType: 'adozione',
        ageMonths: 10,
        sex: 'maschio',
        regionId: location.regionId,
        provinceId: location.provinceId,
        comuneId: location.comuneId,
      });

    expect(createBResponse.status).toBe(201);
    const listingBId = createBResponse.body?.listing?.id as string | undefined;
    expect(typeof listingBId).toBe('string');
    if (!listingBId) {
      throw new Error('Listing B id not returned.');
    }
    createdListingIds.push(listingBId);

    const listingOwnersResult = await pool.query<ListingOwnerRow>(
      `
        SELECT
          id::text AS "listingId",
          owner_user_id::text AS "ownerUserId"
        FROM listings
        WHERE id = ANY($1::bigint[])
        ORDER BY id ASC;
      `,
      [[listingAId, listingBId]],
    );

    expect(listingOwnersResult.rowCount).toBe(2);
    const distinctOwnerIds = Array.from(
      new Set(listingOwnersResult.rows.map((row) => row.ownerUserId)),
    );
    expect(distinctOwnerIds).toHaveLength(1);

    const linkedUserResult = await pool.query<LinkedUserRow>(
      `
        SELECT
          COUNT(*)::text AS "usersCount",
          MAX(provider_subject) AS "providerSubject"
        FROM app_users
        WHERE lower(email) = lower($1);
      `,
      [sharedEmail],
    );

    expect(Number.parseInt(linkedUserResult.rows[0]?.usersCount ?? '0', 10)).toBe(1);
    expect(linkedUserResult.rows[0]?.providerSubject).toBe('identity-link-b');

    const securityEventsAfterResult = await pool.query<SecurityEventCountRow>(
      `
        SELECT COUNT(*)::text AS "count"
        FROM user_security_events
        WHERE event_type = $1
          AND metadata->>'nextProviderSubject' = $2;
      `,
      [AUTH_SECURITY_EVENT.IDENTITY_LINKED_BY_VERIFIED_EMAIL, 'identity-link-b'],
    );
    const securityEventsAfter = Number.parseInt(
      securityEventsAfterResult.rows[0]?.count ?? '0',
      10,
    );

    expect(securityEventsAfter).toBeGreaterThan(securityEventsBefore);
  });
});
