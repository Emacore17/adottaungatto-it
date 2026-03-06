import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RetentionCleanupWorkerService } from './retention-cleanup-worker.service';

describe('RetentionCleanupWorkerService', () => {
  const repositoryMock = {
    purgeAnalyticsEvents: vi.fn(),
    purgeAdminAuditLogs: vi.fn(),
    purgeNotificationOutboxSent: vi.fn(),
    purgeNotificationOutboxFailed: vi.fn(),
    purgeDeletedMessageThreads: vi.fn(),
    purgeListingContactRequests: vi.fn(),
    purgePromotionEvents: vi.fn(),
    purgeInactiveArchivedMessageThreads: vi.fn(),
  };
  const workerDistributedLockServiceMock = {
    runWithLock: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RETENTION_CLEANUP_ENABLED = 'true';
    process.env.RETENTION_CLEANUP_DELETE_BATCH_SIZE = '500';
    process.env.RETENTION_ANALYTICS_EVENTS_DAYS = '90';
    process.env.RETENTION_ADMIN_AUDIT_LOGS_DAYS = '365';
    process.env.RETENTION_NOTIFICATION_OUTBOX_SENT_DAYS = '14';
    process.env.RETENTION_NOTIFICATION_OUTBOX_FAILED_DAYS = '30';
    process.env.RETENTION_MESSAGE_THREADS_DELETED_DAYS = '30';
    process.env.RETENTION_LISTING_CONTACT_REQUESTS_DAYS = '180';
    process.env.RETENTION_PROMOTION_EVENTS_DAYS = '365';
    process.env.RETENTION_MESSAGE_THREADS_INACTIVE_DAYS = '120';
    workerDistributedLockServiceMock.runWithLock.mockImplementation(
      async (_lockName: string, task: () => Promise<unknown>) => ({
        acquired: true,
        result: await task(),
      }),
    );
  });

  it('runs retention cleanup with configured retention windows', async () => {
    repositoryMock.purgeAnalyticsEvents.mockResolvedValueOnce(3);
    repositoryMock.purgeAdminAuditLogs.mockResolvedValueOnce(2);
    repositoryMock.purgeNotificationOutboxSent.mockResolvedValueOnce(5);
    repositoryMock.purgeNotificationOutboxFailed.mockResolvedValueOnce(1);
    repositoryMock.purgeDeletedMessageThreads.mockResolvedValueOnce(4);
    repositoryMock.purgeListingContactRequests.mockResolvedValueOnce(6);
    repositoryMock.purgePromotionEvents.mockResolvedValueOnce(7);
    repositoryMock.purgeInactiveArchivedMessageThreads.mockResolvedValueOnce(8);

    const service = new RetentionCleanupWorkerService(
      repositoryMock as never,
      workerDistributedLockServiceMock as never,
    );
    const summary = await service.runCleanupCycle();

    expect(repositoryMock.purgeAnalyticsEvents).toHaveBeenCalledWith(90, 500);
    expect(repositoryMock.purgeAdminAuditLogs).toHaveBeenCalledWith(365, 500);
    expect(repositoryMock.purgeNotificationOutboxSent).toHaveBeenCalledWith(14, 500);
    expect(repositoryMock.purgeNotificationOutboxFailed).toHaveBeenCalledWith(30, 500);
    expect(repositoryMock.purgeDeletedMessageThreads).toHaveBeenCalledWith(30, 500);
    expect(repositoryMock.purgeListingContactRequests).toHaveBeenCalledWith(180, 500);
    expect(repositoryMock.purgePromotionEvents).toHaveBeenCalledWith(365, 500);
    expect(repositoryMock.purgeInactiveArchivedMessageThreads).toHaveBeenCalledWith(120, 500);
    expect(summary).toEqual({
      analyticsEvents: 3,
      adminAuditLogs: 2,
      notificationOutboxSent: 5,
      notificationOutboxFailed: 1,
      deletedMessageThreads: 4,
      listingContactRequests: 6,
      promotionEvents: 7,
      inactiveArchivedMessageThreads: 8,
      totalDeleted: 36,
    });
  });

  it('skips cleanup domains disabled via retention window 0', async () => {
    process.env.RETENTION_ANALYTICS_EVENTS_DAYS = '0';
    process.env.RETENTION_ADMIN_AUDIT_LOGS_DAYS = '0';
    process.env.RETENTION_NOTIFICATION_OUTBOX_SENT_DAYS = '0';
    process.env.RETENTION_NOTIFICATION_OUTBOX_FAILED_DAYS = '0';
    process.env.RETENTION_MESSAGE_THREADS_DELETED_DAYS = '0';
    process.env.RETENTION_LISTING_CONTACT_REQUESTS_DAYS = '0';
    process.env.RETENTION_PROMOTION_EVENTS_DAYS = '0';
    process.env.RETENTION_MESSAGE_THREADS_INACTIVE_DAYS = '0';

    const service = new RetentionCleanupWorkerService(
      repositoryMock as never,
      workerDistributedLockServiceMock as never,
    );
    const summary = await service.runCleanupCycle();

    expect(repositoryMock.purgeAnalyticsEvents).not.toHaveBeenCalled();
    expect(repositoryMock.purgeAdminAuditLogs).not.toHaveBeenCalled();
    expect(repositoryMock.purgeNotificationOutboxSent).not.toHaveBeenCalled();
    expect(repositoryMock.purgeNotificationOutboxFailed).not.toHaveBeenCalled();
    expect(repositoryMock.purgeDeletedMessageThreads).not.toHaveBeenCalled();
    expect(repositoryMock.purgeListingContactRequests).not.toHaveBeenCalled();
    expect(repositoryMock.purgePromotionEvents).not.toHaveBeenCalled();
    expect(repositoryMock.purgeInactiveArchivedMessageThreads).not.toHaveBeenCalled();
    expect(summary.totalDeleted).toBe(0);
  });

  it('skips cleanup entirely when retention worker is disabled', async () => {
    process.env.RETENTION_CLEANUP_ENABLED = 'false';

    const service = new RetentionCleanupWorkerService(
      repositoryMock as never,
      workerDistributedLockServiceMock as never,
    );
    const summary = await service.runCleanupCycle();

    expect(repositoryMock.purgeAnalyticsEvents).not.toHaveBeenCalled();
    expect(summary.totalDeleted).toBe(0);
  });

  it('skips cleanup when distributed lock is not acquired', async () => {
    workerDistributedLockServiceMock.runWithLock.mockResolvedValueOnce({
      acquired: false,
    });

    const service = new RetentionCleanupWorkerService(
      repositoryMock as never,
      workerDistributedLockServiceMock as never,
    );
    const summary = await service.runCleanupCycle();

    expect(repositoryMock.purgeAnalyticsEvents).not.toHaveBeenCalled();
    expect(summary.totalDeleted).toBe(0);
  });
});
