import { SEARCH_INDEX_READ_ALIAS, SEARCH_INDEX_WRITE_ALIAS } from '@adottaungatto/types';
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

const buildSearchIndexDocument = (id: string) => ({
  id,
  title: `Annuncio ${id}`,
  description: `Descrizione ${id}`,
  listingType: 'adozione',
  priceAmount: null,
  currency: 'EUR',
  ageText: '2 anni',
  sex: 'femmina',
  breed: 'Europeo',
  status: 'published',
  regionId: '1',
  provinceId: '11',
  comuneId: '101',
  regionName: 'Piemonte',
  provinceName: 'Torino',
  provinceSigla: 'TO',
  comuneName: 'Torino',
  location: {
    lat: 45.0703,
    lon: 7.6869,
  },
  isSponsored: false,
  promotionWeight: 1,
  publishedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const buildAliasLookupResponse = (aliasName: string, indexName = 'listings_v1') =>
  new Response(
    JSON.stringify({
      [indexName]: {
        aliases: {
          [aliasName]: {},
        },
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );

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
      .mockResolvedValueOnce(buildAliasLookupResponse(SEARCH_INDEX_READ_ALIAS))
      .mockResolvedValueOnce(buildAliasLookupResponse(SEARCH_INDEX_WRITE_ALIAS))
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

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(resolveLocationCentroid).toHaveBeenCalledWith(query.locationIntent);
    const searchRequest = fetchMock.mock.calls[2];
    const searchUrl = searchRequest?.[0];
    const searchOptions = searchRequest?.[1];

    expect(searchUrl).toContain(`/${SEARCH_INDEX_READ_ALIAS}/_search`);
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

  it('applies capped sponsored boost for relevance queries with text', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(buildAliasLookupResponse(SEARCH_INDEX_READ_ALIAS))
      .mockResolvedValueOnce(buildAliasLookupResponse(SEARCH_INDEX_WRITE_ALIAS))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            hits: {
              total: { value: 1, relation: 'eq' },
              hits: [{ _id: '2' }],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

    global.fetch = fetchMock as typeof fetch;

    listPublishedByIds.mockResolvedValueOnce([buildSummaryRecord('2', 'Secondo risultato')]);
    resolveLocationCentroid.mockResolvedValueOnce({
      lat: 45.0703,
      lon: 7.6869,
    });

    const service = new SearchIndexService(listingsRepositoryMock as never);
    const query: SearchListingsQueryDto = {
      queryText: 'gatto nero',
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
    };

    await service.searchPublished(query);

    const searchRequest = fetchMock.mock.calls[2];
    const searchOptions = searchRequest?.[1];
    const requestBody = JSON.parse(String(searchOptions?.body));

    expect(requestBody.query).toMatchObject({
      function_score: {
        max_boost: 1.2,
        score_mode: 'multiply',
        boost_mode: 'multiply',
        query: {
          bool: expect.objectContaining({
            must: expect.arrayContaining([
              expect.objectContaining({
                multi_match: expect.objectContaining({
                  query: 'gatto nero',
                }),
              }),
            ]),
          }),
        },
        functions: expect.arrayContaining([
          expect.objectContaining({
            filter: { term: { isSponsored: true } },
            field_value_factor: {
              field: 'promotionWeight',
              modifier: 'sqrt',
              missing: 1,
            },
          }),
        ]),
      },
    });
    expect(requestBody.sort).toEqual(
      expect.arrayContaining([
        { _score: { order: 'desc' } },
        { publishedAt: { order: 'desc', missing: '_last' } },
      ]),
    );
  });

  it('returns empty results without DB hydration when index has no hits', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(buildAliasLookupResponse(SEARCH_INDEX_READ_ALIAS))
      .mockResolvedValueOnce(buildAliasLookupResponse(SEARCH_INDEX_WRITE_ALIAS))
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

  it('reindexes into a versioned index and swaps aliases without clearing the live index', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(buildAliasLookupResponse(SEARCH_INDEX_READ_ALIAS))
      .mockResolvedValueOnce(buildAliasLookupResponse(SEARCH_INDEX_WRITE_ALIAS))
      .mockResolvedValueOnce(buildAliasLookupResponse(SEARCH_INDEX_READ_ALIAS))
      .mockResolvedValueOnce(buildAliasLookupResponse(SEARCH_INDEX_WRITE_ALIAS))
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ acknowledged: true }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            errors: false,
            items: [{ index: { _id: '1', status: 201 } }, { index: { _id: '2', status: 201 } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ acknowledged: true }), { status: 200 }));

    global.fetch = fetchMock as typeof fetch;
    listPublishedSearchIndexDocuments
      .mockResolvedValueOnce([buildSearchIndexDocument('1'), buildSearchIndexDocument('2')])
      .mockResolvedValueOnce([]);

    const service = new SearchIndexService(listingsRepositoryMock as never);
    const indexedCount = await service.reindexAllPublishedListings(200);

    expect(indexedCount).toBe(2);
    expect(fetchMock.mock.calls.map((call) => String(call[0]))).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`/_alias/${SEARCH_INDEX_READ_ALIAS}`),
        expect.stringContaining(`/_alias/${SEARCH_INDEX_WRITE_ALIAS}`),
        expect.stringContaining('/_bulk'),
        expect.stringContaining('/_aliases'),
      ]),
    );
    expect(fetchMock.mock.calls.map((call) => String(call[0]))).not.toEqual(
      expect.arrayContaining([expect.stringContaining('_delete_by_query')]),
    );

    const createIndexCall = fetchMock.mock.calls[5];
    expect(String(createIndexCall?.[0])).toContain('/listings_v');

    const bulkCall = fetchMock.mock.calls[6];
    expect(String(bulkCall?.[0])).toContain('/_bulk');
    expect(bulkCall?.[1]).toMatchObject({
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-ndjson',
      },
    });
    expect(String(bulkCall?.[1]?.body)).toContain('"promotionWeight":1');

    const aliasSwapCall = fetchMock.mock.calls[8];
    expect(String(aliasSwapCall?.[0])).toContain('/_aliases');
    const aliasPayload = JSON.parse(String(aliasSwapCall?.[1]?.body));
    expect(aliasPayload.actions).toEqual(
      expect.arrayContaining([
        {
          remove: {
            index: 'listings_v1',
            alias: SEARCH_INDEX_READ_ALIAS,
          },
        },
        {
          remove: {
            index: 'listings_v1',
            alias: SEARCH_INDEX_WRITE_ALIAS,
          },
        },
      ]),
    );

    nowSpy.mockRestore();
  });
});
