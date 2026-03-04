import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RetentionCleanupWorkerService } from './retention-cleanup-worker.service';

describe('RetentionCleanupWorkerService', () => {
  const repositoryMock = {
    purgeAnalyticsEvents: vi.fn(),
    purgeAdminAuditLogs: vi.fn(),
    purgeNotificationOutboxSent: vi.fn(),
    purgeNotificationOutboxFailed: vi.fn(),
    purgeDeletedMessageThreads: vi.fn(),
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
  });

  it('runs retention cleanup with configured retention windows', async () => {
    repositoryMock.purgeAnalyticsEvents.mockResolvedValueOnce(3);
    repositoryMock.purgeAdminAuditLogs.mockResolvedValueOnce(2);
    repositoryMock.purgeNotificationOutboxSent.mockResolvedValueOnce(5);
    repositoryMock.purgeNotificationOutboxFailed.mockResolvedValueOnce(1);
    repositoryMock.purgeDeletedMessageThreads.mockResolvedValueOnce(4);

    const service = new RetentionCleanupWorkerService(repositoryMock as never);
    const summary = await service.runCleanupCycle();

    expect(repositoryMock.purgeAnalyticsEvents).toHaveBeenCalledWith(90, 500);
    expect(repositoryMock.purgeAdminAuditLogs).toHaveBeenCalledWith(365, 500);
    expect(repositoryMock.purgeNotificationOutboxSent).toHaveBeenCalledWith(14, 500);
    expect(repositoryMock.purgeNotificationOutboxFailed).toHaveBeenCalledWith(30, 500);
    expect(repositoryMock.purgeDeletedMessageThreads).toHaveBeenCalledWith(30, 500);
    expect(summary).toEqual({
      analyticsEvents: 3,
      adminAuditLogs: 2,
      notificationOutboxSent: 5,
      notificationOutboxFailed: 1,
      deletedMessageThreads: 4,
      totalDeleted: 15,
    });
  });

  it('skips cleanup domains disabled via retention window 0', async () => {
    process.env.RETENTION_ANALYTICS_EVENTS_DAYS = '0';
    process.env.RETENTION_ADMIN_AUDIT_LOGS_DAYS = '0';
    process.env.RETENTION_NOTIFICATION_OUTBOX_SENT_DAYS = '0';
    process.env.RETENTION_NOTIFICATION_OUTBOX_FAILED_DAYS = '0';
    process.env.RETENTION_MESSAGE_THREADS_DELETED_DAYS = '0';

    const service = new RetentionCleanupWorkerService(repositoryMock as never);
    const summary = await service.runCleanupCycle();

    expect(repositoryMock.purgeAnalyticsEvents).not.toHaveBeenCalled();
    expect(repositoryMock.purgeAdminAuditLogs).not.toHaveBeenCalled();
    expect(repositoryMock.purgeNotificationOutboxSent).not.toHaveBeenCalled();
    expect(repositoryMock.purgeNotificationOutboxFailed).not.toHaveBeenCalled();
    expect(repositoryMock.purgeDeletedMessageThreads).not.toHaveBeenCalled();
    expect(summary.totalDeleted).toBe(0);
  });

  it('skips cleanup entirely when retention worker is disabled', async () => {
    process.env.RETENTION_CLEANUP_ENABLED = 'false';

    const service = new RetentionCleanupWorkerService(repositoryMock as never);
    const summary = await service.runCleanupCycle();

    expect(repositoryMock.purgeAnalyticsEvents).not.toHaveBeenCalled();
    expect(summary.totalDeleted).toBe(0);
  });
});
