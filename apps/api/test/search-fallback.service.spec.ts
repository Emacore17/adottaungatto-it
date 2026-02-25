import type { LocationIntent } from '@adottaungatto/types';
import { vi } from 'vitest';
import { SearchFallbackService } from '../src/listings/search-fallback.service';

const comuneIntent: LocationIntent = {
  scope: 'comune',
  regionId: '1',
  provinceId: '11',
  comuneId: '101',
  label: 'Torino (TO)',
  secondaryLabel: 'Comune - Torino, Piemonte',
};

describe('SearchFallbackService', () => {
  const findFallbackComuneContextById = vi.fn();
  const findFallbackProvinceContextById = vi.fn();
  const listNearbyFallbackProvinces = vi.fn();

  const repositoryMock = {
    findFallbackComuneContextById,
    findFallbackProvinceContextById,
    listNearbyFallbackProvinces,
  };

  const service = new SearchFallbackService(repositoryMock as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('widens from comune to province when exact area has no results', async () => {
    findFallbackComuneContextById.mockResolvedValueOnce({
      id: '101',
      name: 'Torino',
      provinceId: '11',
      provinceName: 'Torino',
      provinceSigla: 'TO',
      regionId: '1',
      regionName: 'Piemonte',
    });
    listNearbyFallbackProvinces.mockResolvedValueOnce([]);

    const executeSearch = vi
      .fn()
      .mockResolvedValueOnce({ items: [], total: 0 })
      .mockResolvedValueOnce({
        items: [
          {
            id: '501',
            title: 'Fallback provincia',
          },
        ],
        total: 1,
      });

    const result = await service.searchWithFallback(
      {
        queryText: 'torino',
        locationIntent: comuneIntent,
        listingType: null,
        priceMin: null,
        priceMax: null,
        ageText: null,
        sex: null,
        breed: null,
        sort: 'newest',
        limit: 24,
        offset: 0,
      },
      executeSearch,
    );

    expect(executeSearch).toHaveBeenCalledTimes(2);
    expect(result.result.total).toBe(1);
    expect(result.metadata).toMatchObject({
      fallbackApplied: true,
      fallbackLevel: 'province',
      fallbackReason: 'WIDENED_TO_PARENT_AREA',
    });
    expect(result.metadata.effectiveLocationIntent?.scope).toBe('province');
    expect(result.metadata.effectiveLocationIntent?.provinceId).toBe('11');
  });

  it('uses nearby province step before region when parent province still has zero results', async () => {
    findFallbackComuneContextById.mockResolvedValueOnce({
      id: '101',
      name: 'Torino',
      provinceId: '11',
      provinceName: 'Torino',
      provinceSigla: 'TO',
      regionId: '1',
      regionName: 'Piemonte',
    });
    listNearbyFallbackProvinces.mockResolvedValueOnce([
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

    const executeSearch = vi
      .fn()
      .mockResolvedValueOnce({ items: [], total: 0 }) // comune
      .mockResolvedValueOnce({ items: [], total: 0 }) // provincia parent
      .mockResolvedValueOnce({ items: [], total: 0 }) // nearby 1
      .mockResolvedValueOnce({
        items: [{ id: '601', title: 'Fallback nearby' }],
        total: 1,
      }); // nearby 2

    const result = await service.searchWithFallback(
      {
        queryText: 'torino',
        locationIntent: comuneIntent,
        listingType: null,
        priceMin: null,
        priceMax: null,
        ageText: null,
        sex: null,
        breed: null,
        sort: 'newest',
        limit: 24,
        offset: 0,
      },
      executeSearch,
    );

    expect(result.metadata).toMatchObject({
      fallbackApplied: true,
      fallbackLevel: 'nearby',
      fallbackReason: 'WIDENED_TO_NEARBY_AREA',
    });
    expect(result.metadata.effectiveLocationIntent?.provinceId).toBe('13');
    expect(result.metadata.effectiveLocationIntent?.scope).toBe('province');
  });

  it('returns NO_LOCATION_FILTER when search has no location and no results', async () => {
    const executeSearch = vi.fn().mockResolvedValueOnce({ items: [], total: 0 });

    const result = await service.searchWithFallback(
      {
        queryText: 'micio',
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
      },
      executeSearch,
    );

    expect(result.metadata).toMatchObject({
      fallbackApplied: false,
      fallbackLevel: 'none',
      fallbackReason: 'NO_LOCATION_FILTER',
      requestedLocationIntent: null,
      effectiveLocationIntent: null,
    });
  });
});
