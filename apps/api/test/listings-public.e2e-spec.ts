import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { vi } from 'vitest';
import { AppModule } from '../src/app.module';
import { ListingsService } from '../src/listings/listings.service';
import type {
  PublicListingDetail,
  PublicListingSummary,
} from '../src/listings/models/listing.model';

const buildSummary = (): PublicListingSummary => ({
  id: '101',
  title: 'Micia tricolore in adozione',
  description: 'Affettuosa e abituata in appartamento.',
  listingType: 'adozione',
  priceAmount: null,
  currency: 'EUR',
  ageText: '2 anni',
  sex: 'femmina',
  breed: null,
  publishedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  regionName: 'Piemonte',
  provinceName: 'Torino',
  provinceSigla: 'TO',
  comuneName: 'Torino',
  distanceKm: null,
  mediaCount: 2,
  primaryMedia: {
    id: '8001',
    mimeType: 'image/jpeg',
    width: 1200,
    height: 900,
    position: 1,
    isPrimary: true,
    objectUrl: 'http://localhost:9000/listing-originals/listings/101/photo-1.jpg',
  },
});

const buildDetail = (): PublicListingDetail => ({
  ...buildSummary(),
  contactName: 'Gattile Centro',
  contactPhone: '+390111234567',
  contactEmail: 'gattile@example.test',
  media: [
    {
      id: '8001',
      mimeType: 'image/jpeg',
      width: 1200,
      height: 900,
      position: 1,
      isPrimary: true,
      objectUrl: 'http://localhost:9000/listing-originals/listings/101/photo-1.jpg',
    },
    {
      id: '8002',
      mimeType: 'image/jpeg',
      width: 1200,
      height: 900,
      position: 2,
      isPrimary: false,
      objectUrl: 'http://localhost:9000/listing-originals/listings/101/photo-2.jpg',
    },
  ],
});

describe('Listings public endpoints', () => {
  let app: NestFastifyApplication;

  const listPublished = vi.fn(
    async (_limit: number, _offset: number): Promise<PublicListingSummary[]> => [buildSummary()],
  );
  const getPublishedById = vi.fn(
    async (_listingId: string): Promise<PublicListingDetail | null> => buildDetail(),
  );

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ListingsService)
      .useValue({
        listPublished,
        getPublishedById,
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
    listPublished.mockClear();
    getPublishedById.mockClear();
  });

  it('lists published listings without authentication', async () => {
    const response = await request(app.getHttpServer()).get('/v1/listings/public');

    expect(response.status).toBe(200);
    expect(response.body.listings).toHaveLength(1);
    expect(response.body.listings[0].id).toBe('101');
    expect(response.body.listings[0].primaryMedia).toMatchObject({
      id: '8001',
      isPrimary: true,
    });
    expect(listPublished).toHaveBeenCalledWith(24, 0);
  });

  it('supports pagination query params for public listings', async () => {
    const response = await request(app.getHttpServer()).get(
      '/v1/listings/public?limit=12&offset=8',
    );

    expect(response.status).toBe(200);
    expect(response.body.limit).toBe(12);
    expect(response.body.offset).toBe(8);
    expect(listPublished).toHaveBeenCalledWith(12, 8);
  });

  it('validates invalid pagination query params', async () => {
    const response = await request(app.getHttpServer()).get('/v1/listings/public?limit=0');

    expect(response.status).toBe(400);
    expect(listPublished).not.toHaveBeenCalled();
  });

  it('returns published listing detail', async () => {
    const response = await request(app.getHttpServer()).get('/v1/listings/public/101');

    expect(response.status).toBe(200);
    expect(response.body.listing.id).toBe('101');
    expect(response.body.listing.media).toHaveLength(2);
    expect(getPublishedById).toHaveBeenCalledWith('101');
  });

  it('returns 404 when listing is not available publicly', async () => {
    getPublishedById.mockResolvedValueOnce(null);

    const response = await request(app.getHttpServer()).get('/v1/listings/public/999999');

    expect(response.status).toBe(404);
  });
});
