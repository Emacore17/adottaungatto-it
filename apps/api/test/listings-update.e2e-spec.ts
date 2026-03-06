import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { vi } from 'vitest';
import { AppModule } from '../src/app.module';
import { ListingsService } from '../src/listings/listings.service';

const userHeaders = {
  'x-auth-user-id': 'user-listing-update-1',
  'x-auth-email': 'user-listing-update-1@example.test',
  'x-auth-roles': 'user',
};

const buildListing = () => ({
  id: '1',
  ownerUserId: '10',
  title: 'Titolo aggiornato',
  description: 'Descrizione aggiornata',
  listingType: 'adozione',
  priceAmount: null,
  currency: 'EUR',
  ageText: '2 anni',
  sex: 'femmina',
  breed: 'Europeo',
  status: 'pending_review',
  regionId: '1',
  provinceId: '11',
  comuneId: '101',
  contactName: null,
  contactPhone: null,
  contactEmail: null,
  publishedAt: null,
  archivedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  deletedAt: null,
});

describe('Listings update endpoint', () => {
  let app: NestFastifyApplication;
  const updateForUser = vi.fn<() => Promise<ReturnType<typeof buildListing> | null>>(
    async () => buildListing(),
  );

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ListingsService)
      .useValue({
        updateForUser,
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
    updateForUser.mockClear();
  });

  it('denies PATCH /v1/listings/:id without authentication headers', async () => {
    const response = await request(app.getHttpServer()).patch('/v1/listings/1').send({
      title: 'Titolo aggiornato',
    });

    expect(response.status).toBe(401);
  });

  it('rejects owner status changes in update payload', async () => {
    const response = await request(app.getHttpServer())
      .patch('/v1/listings/1')
      .set(userHeaders)
      .send({
        status: 'published',
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Field "status" cannot be updated by listing owner.');
    expect(updateForUser).not.toHaveBeenCalled();
  });

  it('updates listing fields with valid payload', async () => {
    const response = await request(app.getHttpServer())
      .patch('/v1/listings/1')
      .set(userHeaders)
      .send({
        title: 'Titolo aggiornato',
        description: 'Descrizione aggiornata',
      });

    expect(response.status).toBe(200);
    expect(response.body.listing.id).toBe('1');
    expect(updateForUser).toHaveBeenCalledWith(expect.any(Object), '1', {
      title: 'Titolo aggiornato',
      description: 'Descrizione aggiornata',
    });
  });

  it('returns 404 when listing is not found', async () => {
    updateForUser.mockResolvedValueOnce(null);

    const response = await request(app.getHttpServer())
      .patch('/v1/listings/999')
      .set(userHeaders)
      .send({
        title: 'Nuovo titolo',
      });

    expect(response.status).toBe(404);
  });
});
