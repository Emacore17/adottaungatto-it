import { vi } from 'vitest';
import type { SearchListingsQueryDto } from '../src/listings/dto/search-listings-query.dto';
import type { PublicListingSummaryRecord } from '../src/listings/listings.repository';
import { SearchIndexService } from '../src/listings/search-index.service';

const buildSummaryRecord = (id: string, title: string): PublicListingSummaryRecord => ({
  id,
  title,
  description: `${title} descrizione`,
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
    id: `media-${id}`,
    mimeType: 'image/jpeg',
    width: 1200,
    height: 900,
    position: 1,
    isPrimary: true,
    storageKey: `listings/${id}/photo.jpg`,
  },
  comuneCentroidLat: 45.0703,
  comuneCentroidLng: 7.6869,
});

describe('SearchIndexService', () => {
  const listPublishedByIds = vi.fn();
  const findPublishedSearchIndexDocumentById = vi.fn();
  const listPublishedSearchIndexDocuments = vi.fn();
  const resolveLocationCentroid = vi.fn();
  const listingsRepositoryMock = {
    listPublishedByIds,
    findPublishedSearchIndexDocumentById,
    listPublishedSearchIndexDocuments,
    resolveLocationCentroid,
  };

  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('builds OpenSearch query with filters and preserves hit order', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            hits: {
              total: { value: 2, relation: 'eq' },
              hits: [{ _id: '2' }, { _id: '1' }],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

    global.fetch = fetchMock as typeof fetch;

    listPublishedByIds.mockResolvedValueOnce([
      buildSummaryRecord('1', 'Primo risultato'),
      buildSummaryRecord('2', 'Secondo risultato'),
    ]);
    resolveLocationCentroid.mockResolvedValueOnce({
      lat: 45.0703,
      lon: 7.6869,
    });

    const service = new SearchIndexService(listingsRepositoryMock as never);
    const query: SearchListingsQueryDto = {
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
      priceMin: 50,
      priceMax: 500,
      ageText: '2 anni',
      sex: 'femmina',
      breed: 'Europeo',
      sort: 'price_asc',
      limit: 12,
      offset: 24,
    };

    const result = await service.searchPublished(query);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(resolveLocationCentroid).toHaveBeenCalledWith(query.locationIntent);
    const searchRequest = fetchMock.mock.calls[1];
    const searchUrl = searchRequest?.[0];
    const searchOptions = searchRequest?.[1];

    expect(searchUrl).toContain('/listings_v1/_search');
    expect(searchOptions?.method).toBe('POST');
    const requestBody = JSON.parse(String(searchOptions?.body));
    expect(requestBody).toMatchObject({
      from: 24,
      size: 12,
      track_total_hits: true,
    });
    expect(requestBody.sort).toEqual(
      expect.arrayContaining([
        { priceAmount: { order: 'asc', missing: '_last' } },
        expect.objectContaining({
          _geo_distance: expect.objectContaining({
            location: {
              lat: 45.0703,
              lon: 7.6869,
            },
          }),
        }),
        { publishedAt: { order: 'desc', missing: '_last' } },
      ]),
    );
    expect(requestBody.query.bool.must).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          multi_match: expect.objectContaining({
            query: 'Torino',
          }),
        }),
      ]),
    );
    expect(requestBody.query.bool.filter).toEqual(
      expect.arrayContaining([
        { term: { status: 'published' } },
        { term: { comuneId: '101' } },
        {
          range: {
            priceAmount: {
              gte: 50,
              lte: 500,
            },
          },
        },
      ]),
    );

    expect(listPublishedByIds).toHaveBeenCalledWith(['2', '1']);
    expect(result.total).toBe(2);
    expect(result.items.map((item) => item.id)).toEqual(['2', '1']);
  });

  it('returns empty results without DB hydration when index has no hits', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            hits: {
              total: { value: 0, relation: 'eq' },
              hits: [],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

    global.fetch = fetchMock as typeof fetch;
    resolveLocationCentroid.mockResolvedValueOnce(null);

    const service = new SearchIndexService(listingsRepositoryMock as never);
    const query: SearchListingsQueryDto = {
      queryText: null,
      locationIntent: null,
      listingType: null,
      priceMin: null,
      priceMax: null,
      ageText: null,
      sex: null,
      breed: null,
      sort: 'newest',
      limit: 24,
      offset: 0,
    };

    const result = await service.searchPublished(query);

    expect(resolveLocationCentroid).toHaveBeenCalledWith(null);
    expect(result).toEqual({
      items: [],
      total: 0,
    });
    expect(listPublishedByIds).not.toHaveBeenCalled();
  });
});
