import type { MessageEmailNotificationPayload } from '@adottaungatto/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessagingNotificationWorkerService } from './messaging-notification-worker.service';

const buildPayload = (
  overrides: Partial<MessageEmailNotificationPayload> = {},
): MessageEmailNotificationPayload => ({
  threadId: '9001',
  messageId: '7001',
  listingId: '101',
  listingTitle: 'Gattina in adozione',
  recipientUserId: '601',
  recipientEmail: 'owner@example.test',
  senderUserId: '501',
  senderEmail: 'user@example.test',
  messagePreview: 'Ciao, il gatto e ancora disponibile?',
  messageCreatedAt: new Date().toISOString(),
  ...overrides,
});

describe('MessagingNotificationWorkerService', () => {
  const repositoryMock = {
    claimDueMessageEmailJobs: vi.fn(),
    markJobSent: vi.fn(),
    markJobForRetryOrFailure: vi.fn(),
    markJobFailedPermanently: vi.fn(),
  };
  const emailDeliveryServiceMock = {
    verifyConnection: vi.fn(),
    sendMessageNotification: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MESSAGE_EMAIL_NOTIFICATIONS_ENABLED = 'true';
  });

  it('sends queued email notifications and marks jobs as sent', async () => {
    repositoryMock.claimDueMessageEmailJobs.mockResolvedValueOnce([
      {
        id: '1',
        attemptCount: 1,
        maxAttempts: 8,
        payload: buildPayload(),
        parseError: null,
      },
    ]);

    const service = new MessagingNotificationWorkerService(
      repositoryMock as never,
      emailDeliveryServiceMock as never,
    );

    const processed = await service.processDueJobs();

    expect(processed).toBe(1);
    expect(emailDeliveryServiceMock.sendMessageNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: '9001',
      }),
    );
    expect(repositoryMock.markJobSent).toHaveBeenCalledWith('1');
  });

  it('requeues failed deliveries with backoff', async () => {
    repositoryMock.claimDueMessageEmailJobs.mockResolvedValueOnce([
      {
        id: '2',
        attemptCount: 2,
        maxAttempts: 8,
        payload: buildPayload(),
        parseError: null,
      },
    ]);
    emailDeliveryServiceMock.sendMessageNotification.mockRejectedValueOnce(new Error('SMTP down'));

    const service = new MessagingNotificationWorkerService(
      repositoryMock as never,
      emailDeliveryServiceMock as never,
    );

    const processed = await service.processDueJobs();

    expect(processed).toBe(1);
    expect(repositoryMock.markJobForRetryOrFailure).toHaveBeenCalledWith('2', 60_000, 'SMTP down');
  });

  it('fails invalid payloads permanently', async () => {
    repositoryMock.claimDueMessageEmailJobs.mockResolvedValueOnce([
      {
        id: '3',
        attemptCount: 1,
        maxAttempts: 8,
        payload: null,
        parseError: 'Notification payload field "recipientEmail" is required.',
      },
    ]);

    const service = new MessagingNotificationWorkerService(
      repositoryMock as never,
      emailDeliveryServiceMock as never,
    );

    const processed = await service.processDueJobs();

    expect(processed).toBe(1);
    expect(repositoryMock.markJobFailedPermanently).toHaveBeenCalledWith(
      '3',
      'Notification payload field "recipientEmail" is required.',
    );
    expect(emailDeliveryServiceMock.sendMessageNotification).not.toHaveBeenCalled();
  });

  it('skips processing when email notifications are disabled', async () => {
    process.env.MESSAGE_EMAIL_NOTIFICATIONS_ENABLED = 'false';

    const service = new MessagingNotificationWorkerService(
      repositoryMock as never,
      emailDeliveryServiceMock as never,
    );

    const processed = await service.processDueJobs();

    expect(processed).toBe(0);
    expect(repositoryMock.claimDueMessageEmailJobs).not.toHaveBeenCalled();
  });
});
