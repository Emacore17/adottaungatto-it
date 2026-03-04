import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchIndexCleanupWorkerService } from './search-index-cleanup-worker.service';

describe('SearchIndexCleanupWorkerService', () => {
  const adminClientMock = {
    listAliasTargets: vi.fn(),
    assertAliasTargetsAreConsistent: vi.fn(),
    listManagedIndices: vi.fn(),
    deleteIndexIfExists: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SEARCH_INDEX_STALE_CLEANUP_ENABLED = 'true';
    process.env.SEARCH_INDEX_STALE_RETAIN_INACTIVE_COUNT = '1';
  });

  it('deletes stale versioned indices beyond the retained rollback window', async () => {
    adminClientMock.listAliasTargets
      .mockResolvedValueOnce(['listings_v_current'])
      .mockResolvedValueOnce(['listings_v_current']);
    adminClientMock.listManagedIndices.mockResolvedValueOnce([
      {
        index: 'listings_v_current',
        docsCount: 24,
        creationDate: 300,
        storeSize: '24kb',
        status: 'open',
      },
      {
        index: 'listings_v_prev_2',
        docsCount: 24,
        creationDate: 200,
        storeSize: '24kb',
        status: 'open',
      },
      {
        index: 'listings_v_prev_1',
        docsCount: 24,
        creationDate: 100,
        storeSize: '24kb',
        status: 'open',
      },
    ]);
    adminClientMock.deleteIndexIfExists.mockResolvedValueOnce(true);

    const service = new SearchIndexCleanupWorkerService(adminClientMock as never);
    const summary = await service.runCleanupCycle();

    expect(adminClientMock.assertAliasTargetsAreConsistent).toHaveBeenCalledWith(
      ['listings_v_current'],
      ['listings_v_current'],
    );
    expect(adminClientMock.deleteIndexIfExists).toHaveBeenCalledWith('listings_v_prev_1');
    expect(summary).toEqual({
      activeIndices: ['listings_v_current'],
      retainedInactiveIndices: ['listings_v_prev_2'],
      deletedIndices: ['listings_v_prev_1'],
    });
  });

  it('skips deletion when aliases are not fully initialized', async () => {
    adminClientMock.listAliasTargets.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const service = new SearchIndexCleanupWorkerService(adminClientMock as never);
    const summary = await service.runCleanupCycle();

    expect(adminClientMock.listManagedIndices).not.toHaveBeenCalled();
    expect(summary.deletedIndices).toEqual([]);
  });

  it('skips cleanup entirely when disabled', async () => {
    process.env.SEARCH_INDEX_STALE_CLEANUP_ENABLED = 'false';

    const service = new SearchIndexCleanupWorkerService(adminClientMock as never);
    const summary = await service.runCleanupCycle();

    expect(adminClientMock.listAliasTargets).not.toHaveBeenCalled();
    expect(summary.deletedIndices).toEqual([]);
  });
});
