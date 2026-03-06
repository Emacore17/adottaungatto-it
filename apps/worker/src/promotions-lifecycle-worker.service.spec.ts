import { SEARCH_INDEX_WRITE_ALIAS } from '@adottaungatto/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SearchIndexDocumentRecord } from './promotions-lifecycle.repository';
import { PromotionsLifecycleWorkerService } from './promotions-lifecycle-worker.service';

const buildSearchDocument = (listingId: string): SearchIndexDocumentRecord => ({
  id: listingId,
  title: `Listing ${listingId}`,
  description: 'Descrizione',
  listingType: 'adoption',
  priceAmount: null,
  currency: 'EUR',
  ageText: '2 anni',
  sex: 'female',
  breed: null,
  status: 'published',
  regionId: '1',
  provinceId: '10',
  comuneId: '100',
  regionName: 'Lazio',
  provinceName: 'Roma',
  provinceSigla: 'RM',
  comuneName: 'Roma',
  location: {
    lat: 41.9,
    lon: 12.5,
  },
  isSponsored: true,
  promotionWeight: 1.12,
  publishedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

describe('PromotionsLifecycleWorkerService', () => {
  const repositoryMock = {
    activateDuePromotions: vi.fn(),
    expireDuePromotions: vi.fn(),
    listPublishedSearchIndexDocumentsByListingIds: vi.fn(),
  };

  const searchIndexAdminClientMock = {
    ensureAliasesReady: vi.fn(),
    bulkIndexDocuments: vi.fn(),
    requestOpenSearch: vi.fn(),
  };
  const workerDistributedLockServiceMock = {
    runWithLock: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PROMOTIONS_LIFECYCLE_ENABLED = 'true';
    process.env.PROMOTIONS_LIFECYCLE_POLL_MS = '60000';
    process.env.PROMOTIONS_LIFECYCLE_BATCH_SIZE = '2';
    process.env.PROMOTIONS_LIFECYCLE_MAX_BATCHES_PER_CYCLE = '10';
    workerDistributedLockServiceMock.runWithLock.mockImplementation(
      async (_lockName: string, task: () => Promise<unknown>) => ({
        acquired: true,
        result: await task(),
      }),
    );
  });

  it('transitions promotions and syncs affected listings in search index', async () => {
    repositoryMock.activateDuePromotions
      .mockResolvedValueOnce({
        transitionedPromotions: 2,
        transitionedListingIds: ['101', '102'],
      })
      .mockResolvedValueOnce({
        transitionedPromotions: 1,
        transitionedListingIds: ['102'],
      });
    repositoryMock.expireDuePromotions.mockResolvedValueOnce({
      transitionedPromotions: 1,
      transitionedListingIds: ['103'],
    });
    repositoryMock.listPublishedSearchIndexDocumentsByListingIds.mockResolvedValueOnce([
      buildSearchDocument('101'),
      buildSearchDocument('103'),
    ]);
    searchIndexAdminClientMock.ensureAliasesReady.mockResolvedValueOnce({
      readTargets: ['listings_v_current'],
      writeTargets: ['listings_v_current'],
    });
    searchIndexAdminClientMock.bulkIndexDocuments.mockResolvedValueOnce(undefined);
    searchIndexAdminClientMock.requestOpenSearch.mockResolvedValueOnce({
      status: 200,
      body: {
        errors: false,
      },
    });

    const service = new PromotionsLifecycleWorkerService(
      repositoryMock as never,
      searchIndexAdminClientMock as never,
      workerDistributedLockServiceMock as never,
    );
    const summary = await service.runLifecycleCycle();

    expect(repositoryMock.activateDuePromotions).toHaveBeenCalledTimes(2);
    expect(repositoryMock.expireDuePromotions).toHaveBeenCalledTimes(1);
    expect(repositoryMock.listPublishedSearchIndexDocumentsByListingIds).toHaveBeenCalledWith([
      '101',
      '102',
      '103',
    ]);
    expect(searchIndexAdminClientMock.ensureAliasesReady).toHaveBeenCalledTimes(1);
    expect(searchIndexAdminClientMock.bulkIndexDocuments).toHaveBeenCalledWith(
      SEARCH_INDEX_WRITE_ALIAS,
      expect.arrayContaining([expect.objectContaining({ id: '101' }), expect.objectContaining({ id: '103' })]),
    );
    expect(searchIndexAdminClientMock.requestOpenSearch).toHaveBeenCalledWith(
      '/_bulk',
      expect.objectContaining({
        method: 'POST',
        contentType: 'application/x-ndjson',
      }),
    );
    expect(summary).toEqual({
      activatedPromotions: 3,
      expiredPromotions: 1,
      transitionedPromotions: 4,
      touchedListings: 3,
      reindexedListings: 2,
      removedFromSearchIndex: 1,
      searchSyncFailures: 0,
    });
  });

  it('skips lifecycle entirely when worker is disabled', async () => {
    process.env.PROMOTIONS_LIFECYCLE_ENABLED = 'false';

    const service = new PromotionsLifecycleWorkerService(
      repositoryMock as never,
      searchIndexAdminClientMock as never,
      workerDistributedLockServiceMock as never,
    );
    const summary = await service.runLifecycleCycle();

    expect(repositoryMock.activateDuePromotions).not.toHaveBeenCalled();
    expect(searchIndexAdminClientMock.ensureAliasesReady).not.toHaveBeenCalled();
    expect(summary.transitionedPromotions).toBe(0);
  });

  it('keeps transitions and reports sync failures when OpenSearch is unavailable', async () => {
    repositoryMock.activateDuePromotions.mockResolvedValueOnce({
      transitionedPromotions: 1,
      transitionedListingIds: ['101'],
    });
    repositoryMock.expireDuePromotions.mockResolvedValueOnce({
      transitionedPromotions: 0,
      transitionedListingIds: [],
    });
    searchIndexAdminClientMock.ensureAliasesReady.mockRejectedValueOnce(
      new Error('OpenSearch unavailable'),
    );

    const service = new PromotionsLifecycleWorkerService(
      repositoryMock as never,
      searchIndexAdminClientMock as never,
      workerDistributedLockServiceMock as never,
    );
    const summary = await service.runLifecycleCycle();

    expect(summary).toEqual({
      activatedPromotions: 1,
      expiredPromotions: 0,
      transitionedPromotions: 1,
      touchedListings: 1,
      reindexedListings: 0,
      removedFromSearchIndex: 0,
      searchSyncFailures: 1,
    });
    expect(repositoryMock.listPublishedSearchIndexDocumentsByListingIds).not.toHaveBeenCalled();
  });

  it('does not call search sync when no promotions are transitioned', async () => {
    repositoryMock.activateDuePromotions.mockResolvedValueOnce({
      transitionedPromotions: 0,
      transitionedListingIds: [],
    });
    repositoryMock.expireDuePromotions.mockResolvedValueOnce({
      transitionedPromotions: 0,
      transitionedListingIds: [],
    });

    const service = new PromotionsLifecycleWorkerService(
      repositoryMock as never,
      searchIndexAdminClientMock as never,
      workerDistributedLockServiceMock as never,
    );
    const summary = await service.runLifecycleCycle();

    expect(summary.transitionedPromotions).toBe(0);
    expect(searchIndexAdminClientMock.ensureAliasesReady).not.toHaveBeenCalled();
  });

  it('skips lifecycle when distributed lock is not acquired', async () => {
    workerDistributedLockServiceMock.runWithLock.mockResolvedValueOnce({
      acquired: false,
    });

    const service = new PromotionsLifecycleWorkerService(
      repositoryMock as never,
      searchIndexAdminClientMock as never,
      workerDistributedLockServiceMock as never,
    );
    const summary = await service.runLifecycleCycle();

    expect(repositoryMock.activateDuePromotions).not.toHaveBeenCalled();
    expect(searchIndexAdminClientMock.ensureAliasesReady).not.toHaveBeenCalled();
    expect(summary.transitionedPromotions).toBe(0);
  });
});
