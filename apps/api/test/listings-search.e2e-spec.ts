import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { vi } from 'vitest';
import { AppModule } from '../src/app.module';
import type { SearchListingsQueryDto } from '../src/listings/dto/search-listings-query.dto';
import { ListingsRepository } from '../src/listings/listings.repository';
import { MinioStorageService } from '../src/listings/minio-storage.service';
import { SearchIndexService } from '../src/listings/search-index.service';

const buildSearchResultItems = (title: string) => [
  {
    id: '501',
    title,
    description: 'Abituata in appartamento e gia vaccinata.',
    listingType: 'adozione',
    priceAmount: null,
    currency: 'EUR',
    ageText: '2 anni',
    sex: 'femmina',
    breed: 'Europeo',
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    regionName: 'Piemonte',
    provinceName: 'Torino',
    provinceSigla: 'TO',
    comuneName: 'Torino',
    distanceKm: null,
    mediaCount: 1,
    primaryMedia: {
      id: '9001',
      mimeType: 'image/jpeg',
      width: 1200,
      height: 900,
      position: 1,
      isPrimary: true,
      storageKey: 'listings/501/photo-1.jpg',
    },
    comuneCentroidLat: 45.0703,
    comuneCentroidLng: 7.6869,
  },
];

describe('Listings search endpoint', () => {
  let app: NestFastifyApplication;

  const searchPublished = vi.fn(async (_query: SearchListingsQueryDto) => ({
    items: buildSearchResultItems('OpenSearch Torino'),
    total: 37,
  }));
  const searchPublishedFallback = vi.fn(async (_query: SearchListingsQueryDto) => ({
    items: buildSearchResultItems('Fallback SQL Torino'),
    total: 4,
  }));
  const findFallbackComuneContextById = vi.fn(async (_comuneId: string) => ({
    id: '101',
    name: 'Torino',
    provinceId: '11',
    provinceName: 'Torino',
    provinceSigla: 'TO',
    regionId: '1',
    regionName: 'Piemonte',
  }));
  const findFallbackProvinceContextById = vi.fn(async (_provinceId: string) => ({
    id: '11',
    name: 'Torino',
    sigla: 'TO',
    regionId: '1',
    regionName: 'Piemonte',
  }));
  const listNearbyFallbackProvinces = vi.fn(async (_provinceId: string, _limit: number) => [
    {
      id: '12',
      name: 'Asti',
      sigla: 'AT',
      regionId: '1',
      regionName: 'Piemonte',
    },
    {
      id: '13',
      name: 'Cuneo',
      sigla: 'CN',
      regionId: '1',
      regionName: 'Piemonte',
    },
  ]);
  const resolveLocationCentroid = vi.fn(
    async (locationIntent: SearchListingsQueryDto['locationIntent']) =>
      locationIntent
        ? {
            lat: 45.0703,
            lon: 7.6869,
          }
        : null,
  );
  const getListingMediaObjectUrl = vi.fn(
    (storageKey: string) => `http://localhost:9000/listing-originals/${storageKey}`,
  );

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SearchIndexService)
      .useValue({
        ping: vi.fn(async () => true),
        getIndexName: vi.fn(() => 'listings_v1'),
        searchPublished,
        indexPublishedListingById: vi.fn(async () => undefined),
        removeListingById: vi.fn(async () => undefined),
      })
      .overrideProvider(ListingsRepository)
      .useValue({
        searchPublished: searchPublishedFallback,
        findFallbackComuneContextById,
        findFallbackProvinceContextById,
        listNearbyFallbackProvinces,
        resolveLocationCentroid,
      })
      .overrideProvider(MinioStorageService)
      .useValue({
        getListingMediaObjectUrl,
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
    searchPublished.mockClear();
    searchPublishedFallback.mockClear();
    findFallbackComuneContextById.mockClear();
    findFallbackProvinceContextById.mockClear();
    listNearbyFallbackProvinces.mockClear();
    resolveLocationCentroid.mockClear();
  });

  it('accepts LocationIntent filters and returns paginated search payload', async () => {
    const response = await request(app.getHttpServer()).get(
      '/v1/listings/search?q=Torino&locationScope=comune&regionId=1&provinceId=11&comuneId=101&locationLabel=Torino%20(TO)&locationSecondaryLabel=Comune%20-%20Torino,%20Piemonte&listingType=adozione&priceMin=20&priceMax=300&ageText=2%20anni&sex=femmina&breed=Europeo&sort=newest&limit=12&offset=24',
    );

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.pagination).toMatchObject({
      limit: 12,
      offset: 24,
      total: 37,
      hasMore: true,
    });
    expect(response.body.metadata).toMatchObject({
      fallbackApplied: false,
      fallbackLevel: 'none',
      fallbackReason: null,
    });
    expect(response.body.items[0].title).toBe('OpenSearch Torino');
    expect(response.body.items[0].distanceKm).toBe(0);
    expect(response.body.items[0].primaryMedia.objectUrl).toContain(
      '/listing-originals/listings/501/photo-1.jpg',
    );

    expect(searchPublished).toHaveBeenCalledWith({
      queryText: 'Torino',
      locationIntent: {
        scope: 'comune',
        regionId: '1',
        provinceId: '11',
        comuneId: '101',
        label: 'Torino (TO)',
        secondaryLabel: 'Comune - Torino, Piemonte',
      },
      listingType: 'adozione',
      priceMin: 20,
      priceMax: 300,
      ageText: '2 anni',
      sex: 'femmina',
      breed: 'Europeo',
      sort: 'newest',
      limit: 12,
      offset: 24,
    });
    expect(searchPublishedFallback).not.toHaveBeenCalled();
  });

  it('uses default pagination and sort when optional params are missing', async () => {
    const response = await request(app.getHttpServer()).get('/v1/listings/search');

    expect(response.status).toBe(200);
    expect(searchPublished).toHaveBeenCalledWith({
      queryText: null,
      locationIntent: null,
      listingType: null,
      priceMin: null,
      priceMax: null,
      ageText: null,
      sex: null,
      breed: null,
      sort: 'relevance',
      limit: 24,
      offset: 0,
    });
  });

  it('applies fallback from comune to provincia when exact area returns zero results', async () => {
    searchPublished
      .mockResolvedValueOnce({
        items: [],
        total: 0,
      })
      .mockResolvedValueOnce({
        items: buildSearchResultItems('Fallback provincia Torino'),
        total: 2,
      });

    const response = await request(app.getHttpServer()).get(
      '/v1/listings/search?q=Torino&locationScope=comune&regionId=1&provinceId=11&comuneId=101&sort=newest&limit=12&offset=0',
    );

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].title).toBe('Fallback provincia Torino');
    expect(response.body.metadata).toMatchObject({
      fallbackApplied: true,
      fallbackLevel: 'province',
      fallbackReason: 'WIDENED_TO_PARENT_AREA',
    });
    expect(response.body.metadata.requestedLocationIntent.scope).toBe('comune');
    expect(response.body.metadata.effectiveLocationIntent.scope).toBe('province');
    expect(response.body.metadata.effectiveLocationIntent.provinceId).toBe('11');
    expect(searchPublished).toHaveBeenCalledTimes(2);
    expect(searchPublishedFallback).not.toHaveBeenCalled();
  });

  it('falls back to SQL search when OpenSearch request fails', async () => {
    searchPublished.mockRejectedValueOnce(new Error('OpenSearch unavailable'));

    const response = await request(app.getHttpServer()).get('/v1/listings/search?sort=newest');

    expect(response.status).toBe(200);
    expect(searchPublished).toHaveBeenCalledTimes(1);
    expect(searchPublishedFallback).toHaveBeenCalledTimes(1);
    expect(response.body.pagination.total).toBe(4);
    expect(response.body.items[0].title).toBe('Fallback SQL Torino');
  });

  it('validates required location identifiers by scope', async () => {
    const response = await request(app.getHttpServer()).get(
      '/v1/listings/search?locationScope=region',
    );

    expect(response.status).toBe(400);
    expect(searchPublished).not.toHaveBeenCalled();
    expect(searchPublishedFallback).not.toHaveBeenCalled();
  });

  it('validates price range coherence', async () => {
    const response = await request(app.getHttpServer()).get(
      '/v1/listings/search?priceMin=400&priceMax=100',
    );

    expect(response.status).toBe(400);
    expect(searchPublished).not.toHaveBeenCalled();
    expect(searchPublishedFallback).not.toHaveBeenCalled();
  });
});
