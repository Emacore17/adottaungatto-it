import { loadWorkerEnv } from '@adottaungatto/config';
import { Inject, Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { SEARCH_INDEX_READ_ALIAS, SEARCH_INDEX_WRITE_ALIAS } from '@adottaungatto/types';
import { IntervalWorkerTask } from './interval-worker-task';
import {
  SEARCH_INDEX_ADMIN_CLIENT,
  type SearchIndexAdminClient,
  planSearchIndexCleanup,
} from './search-index-admin';
import { WorkerDistributedLockService } from './worker-distributed-lock.service';

const searchIndexCleanupWorkerLockName = 'worker:search-index-cleanup';

export type SearchIndexCleanupSummary = {
  activeIndices: string[];
  retainedInactiveIndices: string[];
  deletedIndices: string[];
};

const emptySummary = (): SearchIndexCleanupSummary => ({
  activeIndices: [],
  retainedInactiveIndices: [],
  deletedIndices: [],
});

@Injectable()
export class SearchIndexCleanupWorkerService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly env = loadWorkerEnv();
  private readonly logger = new Logger(SearchIndexCleanupWorkerService.name);
  private cleanupTask: IntervalWorkerTask | null = null;
  private processing = false;

  constructor(
    @Inject(SEARCH_INDEX_ADMIN_CLIENT)
    private readonly searchIndexAdminClient: SearchIndexAdminClient,
    private readonly workerDistributedLockService: WorkerDistributedLockService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.env.SEARCH_INDEX_STALE_CLEANUP_ENABLED) {
      this.logger.log('Search stale index cleanup is disabled.');
      return;
    }

    await this.runCleanupCycleSafe();
    this.cleanupTask = new IntervalWorkerTask(this.env.SEARCH_INDEX_STALE_CLEANUP_POLL_MS, async () => {
      await this.runCleanupCycleSafe();
    });
    this.cleanupTask.start();
  }

  async onModuleDestroy(): Promise<void> {
    this.cleanupTask?.stop();
    this.cleanupTask = null;
  }

  async runCleanupCycle(): Promise<SearchIndexCleanupSummary> {
    if (!this.env.SEARCH_INDEX_STALE_CLEANUP_ENABLED || this.processing) {
      return emptySummary();
    }

    this.processing = true;

    try {
      const execution = await this.workerDistributedLockService.runWithLock(
        searchIndexCleanupWorkerLockName,
        async () => {
          const readTargets = await this.searchIndexAdminClient.listAliasTargets(SEARCH_INDEX_READ_ALIAS);
          const writeTargets = await this.searchIndexAdminClient.listAliasTargets(SEARCH_INDEX_WRITE_ALIAS);
          this.searchIndexAdminClient.assertAliasTargetsAreConsistent(readTargets, writeTargets);

          if (
            readTargets.length !== 1 ||
            writeTargets.length !== 1 ||
            readTargets[0] !== writeTargets[0]
          ) {
            this.logger.warn(
              `Search alias cleanup skipped because aliases are not fully initialized (${SEARCH_INDEX_READ_ALIAS}=${readTargets.join(',') || 'none'}, ${SEARCH_INDEX_WRITE_ALIAS}=${writeTargets.join(',') || 'none'}).`,
            );
            return emptySummary();
          }

          const managedIndices = await this.searchIndexAdminClient.listManagedIndices();
          const activeIndices = Array.from(new Set([...readTargets, ...writeTargets]));
          const cleanupPlan = planSearchIndexCleanup({
            managedIndices,
            protectedIndices: activeIndices,
            retainInactiveCount: this.env.SEARCH_INDEX_STALE_RETAIN_INACTIVE_COUNT,
          });

          const deletedIndices: string[] = [];
          for (const indexInfo of cleanupPlan.indicesToDelete) {
            const deleted = await this.searchIndexAdminClient.deleteIndexIfExists(indexInfo.index);
            if (deleted) {
              deletedIndices.push(indexInfo.index);
            }
          }

          if (deletedIndices.length > 0) {
            this.logger.log(
              `Search stale index cleanup deleted=${deletedIndices.join(', ')} retained_inactive=${cleanupPlan.retainedInactiveIndices
                .map((indexInfo) => indexInfo.index)
                .join(', ') || 'none'} active=${activeIndices.join(', ')}.`,
            );
          }

          return {
            activeIndices,
            retainedInactiveIndices: cleanupPlan.retainedInactiveIndices.map(
              (indexInfo) => indexInfo.index,
            ),
            deletedIndices,
          };
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

  private async runCleanupCycleSafe(): Promise<void> {
    try {
      await this.runCleanupCycle();
    } catch (error) {
      this.logger.warn(`Search stale index cleanup skipped (${(error as Error).message}).`);
    }
  }
}
