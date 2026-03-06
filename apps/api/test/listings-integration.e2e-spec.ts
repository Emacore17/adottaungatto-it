import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module';

type LocationRow = {
  regionId: string;
  provinceId: string;
  comuneId: string;
};

type ListingRow = {
  id: string;
  title: string;
  status: string;
  ownerUserId: string;
  regionId: string;
  provinceId: string;
  comuneId: string;
};

const integrationUserHeaders = {
  'x-auth-user-id': 'integration-listings-user',
  'x-auth-email': 'integration-listings-user@example.test',
  'x-auth-roles': 'user',
};

describe('Listings integration e2e (real providers)', () => {
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
      throw new Error('No geography rows available for integration listing test.');
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
    const numericIds = createdListingIds
      .map((value) => Number.parseInt(value, 10))
      .filter((value) => Number.isFinite(value));

    if (numericIds.length > 0) {
      await pool.query('DELETE FROM listings WHERE id = ANY($1::bigint[])', [numericIds]);
    }

    await app.close();
    await pool.end();
  });

  it('creates a listing and persists it in database without service overrides', async () => {
    const title = `[INT-E2E] Listing ${Date.now()}`;
    const description = `Integration listing created at ${new Date().toISOString()}`;

    const createResponse = await request(app.getHttpServer())
      .post('/v1/listings')
      .set(integrationUserHeaders)
      .send({
        title,
        description,
        listingType: 'adozione',
        ageMonths: 14,
        sex: 'femmina',
        regionId: location.regionId,
        provinceId: location.provinceId,
        comuneId: location.comuneId,
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body?.listing?.status).toBe('pending_review');

    const createdListingId = createResponse.body?.listing?.id as string | undefined;
    expect(typeof createdListingId).toBe('string');
    if (!createdListingId) {
      throw new Error('Listing id not returned by create endpoint.');
    }

    createdListingIds.push(createdListingId);

    const persistedResult = await pool.query<ListingRow>(
      `
        SELECT
          l.id::text AS "id",
          l.title AS "title",
          l.status AS "status",
          l.owner_user_id::text AS "ownerUserId",
          l.region_id::text AS "regionId",
          l.province_id::text AS "provinceId",
          l.comune_id::text AS "comuneId"
        FROM listings l
        WHERE l.id = $1::bigint
      `,
      [createdListingId],
    );

    expect(persistedResult.rowCount).toBe(1);
    expect(persistedResult.rows[0]).toMatchObject({
      id: createdListingId,
      title,
      status: 'pending_review',
      regionId: location.regionId,
      provinceId: location.provinceId,
      comuneId: location.comuneId,
    });

    const mineResponse = await request(app.getHttpServer())
      .get('/v1/listings/me')
      .set(integrationUserHeaders);

    expect(mineResponse.status).toBe(200);
    const mineListings = mineResponse.body?.listings as Array<{ id: string }> | undefined;
    expect(Array.isArray(mineListings)).toBe(true);
    expect(mineListings?.some((entry) => entry.id === createdListingId)).toBe(true);
  });
});
