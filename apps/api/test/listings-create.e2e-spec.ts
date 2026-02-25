import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { vi } from 'vitest';
import { AppModule } from '../src/app.module';
import { ListingsService } from '../src/listings/listings.service';
import type { CreateListingInput, ListingRecord } from '../src/listings/models/listing.model';

const userHeaders = {
  'x-auth-user-id': 'user-create-1',
  'x-auth-email': 'user-create-1@example.test',
  'x-auth-roles': 'user',
};

describe('Listings create endpoint', () => {
  let app: NestFastifyApplication;
  const createForUser = vi.fn(
    async (_user: unknown, payload: CreateListingInput): Promise<ListingRecord> => ({
      id: '1',
      ownerUserId: '10',
      title: payload.title,
      description: payload.description,
      listingType: payload.listingType,
      priceAmount: null,
      currency: payload.currency,
      ageText: payload.ageText,
      sex: payload.sex,
      breed: payload.breed,
      status: payload.status,
      regionId: payload.regionId,
      provinceId: payload.provinceId,
      comuneId: payload.comuneId,
      contactName: payload.contactName,
      contactPhone: payload.contactPhone,
      contactEmail: payload.contactEmail,
      publishedAt: null,
      archivedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    }),
  );

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ListingsService)
      .useValue({
        createForUser,
      })
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    createForUser.mockClear();
  });

  it('denies create without authentication headers', async () => {
    const response = await request(app.getHttpServer()).post('/v1/listings').send({
      title: 'Annuncio test',
    });

    expect(response.status).toBe(401);
  });

  it('validates required create payload fields', async () => {
    const response = await request(app.getHttpServer()).post('/v1/listings').set(userHeaders).send({
      title: 'Annuncio test',
    });

    expect(response.status).toBe(400);
  });

  it('rejects client-provided status in create payload', async () => {
    const response = await request(app.getHttpServer()).post('/v1/listings').set(userHeaders).send({
      title: 'Annuncio test',
      description: 'Descrizione',
      listingType: 'adozione',
      ageText: '2 anni',
      sex: 'femmina',
      regionId: 1,
      provinceId: 11,
      comuneId: 101,
      status: 'published',
    });

    expect(response.status).toBe(400);
    expect(createForUser).toHaveBeenCalledTimes(0);
  });

  it('creates listing and enforces pending_review status', async () => {
    const response = await request(app.getHttpServer()).post('/v1/listings').set(userHeaders).send({
      title: '  Micia in adozione  ',
      description: '  Molto affettuosa  ',
      listing_type: 'adozione',
      ageText: '  3 anni ',
      sex: ' femmina ',
      regionId: 1,
      provinceId: 11,
      comuneId: 101,
    });

    expect(response.status).toBe(201);
    expect(response.body.listing.status).toBe('pending_review');
    expect(createForUser).toHaveBeenCalledTimes(1);
    const firstCall = createForUser.mock.calls[0] as unknown[] | undefined;
    expect(firstCall?.[1]).toMatchObject({
      title: 'Micia in adozione',
      description: 'Molto affettuosa',
      listingType: 'adozione',
      currency: 'EUR',
      ageText: '3 anni',
      sex: 'femmina',
      regionId: '1',
      provinceId: '11',
      comuneId: '101',
      status: 'pending_review',
    });
  });
});
