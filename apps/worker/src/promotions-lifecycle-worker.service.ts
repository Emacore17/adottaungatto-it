import { loadWorkerEnv } from '@adottaungatto/config';
import { SEARCH_INDEX_WRITE_ALIAS } from '@adottaungatto/types';
import { Inject, Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { IntervalWorkerTask } from './interval-worker-task';
import {
  PromotionsLifecycleRepository,
  type PromotionTransitionResult,
  type SearchIndexDocumentRecord,
} from './promotions-lifecycle.repository';
import { SEARCH_INDEX_ADMIN_CLIENT, type SearchIndexAdminClient } from './search-index-admin';
import { WorkerDistributedLockService } from './worker-distributed-lock.service';

const promotionsLifecycleWorkerLockName = 'worker:promotions-lifecycle';

type OpenSearchBulkDeleteItem = {
  delete?: {
    status?: number;
    error?: unknown;
  };
};

export type PromotionsLifecycleSummary = {
  activatedPromotions: number;
  expiredPromotions: number;
  transitionedPromotions: number;
  touchedListings: number;
  reindexedListings: number;
  removedFromSearchIndex: number;
  searchSyncFailures: number;
};

const emptySummary = (): PromotionsLifecycleSummary => ({
  activatedPromotions: 0,
  expiredPromotions: 0,
  transitionedPromotions: 0,
  touchedListings: 0,
  reindexedListings: 0,
  removedFromSearchIndex: 0,
  searchSyncFailures: 0,
});

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

@Injectable()
export class PromotionsLifecycleWorkerService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly env = loadWorkerEnv();
  private readonly logger = new Logger(PromotionsLifecycleWorkerService.name);
  private lifecycleTask: IntervalWorkerTask | null = null;
  private processing = false;

  constructor(
    private readonly promotionsLifecycleRepository: PromotionsLifecycleRepository,
    @Inject(SEARCH_INDEX_ADMIN_CLIENT)
    private readonly searchIndexAdminClient: SearchIndexAdminClient,
    private readonly workerDistributedLockService: WorkerDistributedLockService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.env.PROMOTIONS_LIFECYCLE_ENABLED) {
      this.logger.log('Promotions lifecycle worker is disabled.');
      return;
    }

    await this.runLifecycleCycleSafe();
    this.lifecycleTask = new IntervalWorkerTask(this.env.PROMOTIONS_LIFECYCLE_POLL_MS, async () => {
      await this.runLifecycleCycleSafe();
    });
    this.lifecycleTask.start();
  }

  async onModuleDestroy(): Promise<void> {
    this.lifecycleTask?.stop();
    this.lifecycleTask = null;
  }

  async runLifecycleCycle(): Promise<PromotionsLifecycleSummary> {
    if (!this.env.PROMOTIONS_LIFECYCLE_ENABLED || this.processing) {
      return emptySummary();
    }

    this.processing = true;

    try {
      const execution = await this.workerDistributedLockService.runWithLock(
        promotionsLifecycleWorkerLockName,
        async () => {
          const activated = await this.collectTransitionBatches((batchSize) =>
            this.promotionsLifecycleRepository.activateDuePromotions(batchSize),
          );
          const expired = await this.collectTransitionBatches((batchSize) =>
            this.promotionsLifecycleRepository.expireDuePromotions(batchSize),
          );
          const touchedListingIds = Array.from(
            new Set([...activated.transitionedListingIds, ...expired.transitionedListingIds]),
          );

          const summary: PromotionsLifecycleSummary = {
            activatedPromotions: activated.transitionedPromotions,
            expiredPromotions: expired.transitionedPromotions,
            transitionedPromotions: activated.transitionedPromotions + expired.transitionedPromotions,
            touchedListings: touchedListingIds.length,
            reindexedListings: 0,
            removedFromSearchIndex: 0,
            searchSyncFailures: 0,
          };

          if (touchedListingIds.length > 0) {
            try {
              const searchSyncSummary = await this.syncSearchIndexForListings(touchedListingIds);
              summary.reindexedListings = searchSyncSummary.reindexedListings;
              summary.removedFromSearchIndex = searchSyncSummary.removedFromSearchIndex;
            } catch (error) {
              summary.searchSyncFailures = touchedListingIds.length;
              this.logger.warn(
                `Promotions lifecycle search sync skipped (${(error as Error).message}).`,
              );
            }
          }

          if (summary.transitionedPromotions > 0 || summary.searchSyncFailures > 0) {
            this.logger.log(
              `Promotions lifecycle activated=${summary.activatedPromotions} expired=${summary.expiredPromotions} transitioned=${summary.transitionedPromotions} touched_listings=${summary.touchedListings} reindexed=${summary.reindexedListings} removed_from_index=${summary.removedFromSearchIndex} search_sync_failures=${summary.searchSyncFailures}.`,
            );
          }

          return summary;
        },
      );

      if (!execution.acquired) {
        return emptySummary();
      }

      return execution.result ?? emptySummary();
    } finally {
      this.processing = false;
    }
  }

  private async collectTransitionBatches(
    runner: (batchSize: number) => Promise<PromotionTransitionResult>,
  ): Promise<PromotionTransitionResult> {
    let transitionedPromotions = 0;
    const listingIds = new Set<string>();
    let processedBatches = 0;

    while (processedBatches < this.env.PROMOTIONS_LIFECYCLE_MAX_BATCHES_PER_CYCLE) {
      processedBatches += 1;
      const result = await runner(this.env.PROMOTIONS_LIFECYCLE_BATCH_SIZE);
      transitionedPromotions += result.transitionedPromotions;

      for (const listingId of result.transitionedListingIds) {
        listingIds.add(listingId);
      }

      if (result.transitionedPromotions < this.env.PROMOTIONS_LIFECYCLE_BATCH_SIZE) {
        break;
      }
    }

    return {
      transitionedPromotions,
      transitionedListingIds: Array.from(listingIds),
    };
  }

  private async syncSearchIndexForListings(listingIds: string[]): Promise<{
    reindexedListings: number;
    removedFromSearchIndex: number;
  }> {
    await this.searchIndexAdminClient.ensureAliasesReady();
    const publishedDocuments =
      await this.promotionsLifecycleRepository.listPublishedSearchIndexDocumentsByListingIds(
        listingIds,
      );

    const documentsByListingId = new Map<string, SearchIndexDocumentRecord>(
      publishedDocuments.map((document) => [document.id, document]),
    );
    const documentsToDelete = listingIds.filter((listingId) => !documentsByListingId.has(listingId));

    if (publishedDocuments.length > 0) {
      await this.searchIndexAdminClient.bulkIndexDocuments(
        SEARCH_INDEX_WRITE_ALIAS,
        publishedDocuments,
      );
    }

    if (documentsToDelete.length > 0) {
      await this.bulkDeleteDocumentsFromSearchIndex(documentsToDelete);
    }

    return {
      reindexedListings: publishedDocuments.length,
      removedFromSearchIndex: documentsToDelete.length,
    };
  }

  private async bulkDeleteDocumentsFromSearchIndex(listingIds: string[]): Promise<void> {
    const operations = listingIds.map((listingId) =>
      JSON.stringify({
        delete: {
          _index: SEARCH_INDEX_WRITE_ALIAS,
          _id: listingId,
        },
      }),
    );

    const response = await this.searchIndexAdminClient.requestOpenSearch('/_bulk', {
      method: 'POST',
      body: `${operations.join('\n')}\n`,
      contentType: 'application/x-ndjson',
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        `OpenSearch bulk delete failed (${response.status}): ${JSON.stringify(response.body)}`,
      );
    }

    const payload = asRecord(response.body);
    if (!payload || payload.errors !== true) {
      return;
    }

    const items = Array.isArray(payload.items) ? payload.items : [];
    for (const item of items) {
      const parsedItem = asRecord(item) as OpenSearchBulkDeleteItem | null;
      const deleteResult = parsedItem?.delete;
      const status = deleteResult?.status ?? 200;

      if (status >= 400 && status !== 404) {
        throw new Error(
          `OpenSearch bulk delete item failed (status=${status}): ${JSON.stringify(deleteResult?.error ?? null)}`,
        );
      }
    }
  }

  private async runLifecycleCycleSafe(): Promise<void> {
    try {
      await this.runLifecycleCycle();
    } catch (error) {
      this.logger.warn(`Promotions lifecycle cycle skipped (${(error as Error).message}).`);
    }
  }
}
