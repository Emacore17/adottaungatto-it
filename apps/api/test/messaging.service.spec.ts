import { BadRequestException, ConflictException, HttpStatus } from '@nestjs/common';
import type { RequestUser } from '../src/auth/interfaces/request-user.interface';
import { UserRole } from '../src/auth/roles.enum';
import { MessagingService } from '../src/messaging/messaging.service';
import type {
  MessageSummary,
  MessageThreadSummary,
} from '../src/messaging/models/message-thread.model';

const baseUser: RequestUser = {
  id: 'user-subject-1',
  provider: 'dev-header',
  providerSubject: 'user-subject-1',
  email: 'user-1@example.test',
  roles: [UserRole.USER],
  preferences: {
    messageEmailNotificationsEnabled: true,
  },
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

const buildThreadSummary = (
  overrides: Partial<MessageThreadSummary> = {},
): MessageThreadSummary => ({
  id: '9001',
  listingId: '101',
  listingTitle: 'Gattina in adozione',
  listingStatus: 'published',
  source: 'web_listing',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  latestMessageAt: new Date().toISOString(),
  unreadCount: 0,
  viewerRole: 'requester',
  otherParticipant: {
    role: 'owner',
    email: 'owner@example.test',
    providerSubject: 'owner-subject-1',
  },
  latestMessage: null,
  ...overrides,
});

const buildMessage = (overrides: Partial<MessageSummary> = {}): MessageSummary => ({
  id: '7001',
  threadId: '9001',
  senderRole: 'requester',
  senderEmail: 'user-1@example.test',
  body: 'Ciao, sono interessato al tuo annuncio.',
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe('MessagingService', () => {
  const messagingRepositoryMock = {
    upsertActorUser: vi.fn(async () => '501'),
    findPublishedListingForMessaging: vi.fn(async () => ({
      listingId: '101',
      listingTitle: 'Gattina in adozione',
      ownerUserId: '601',
      ownerProviderSubject: 'owner-subject-1',
      ownerEmail: 'owner@example.test',
    })),
    findThreadIdByListingAndUsers: vi.fn<() => Promise<string | null>>(async () => null),
    countRecentThreadsByRequester: vi.fn(async () => 0),
    getOrCreateThread: vi.fn(async () => '9001'),
    countRecentMessagesBySender: vi.fn(async () => 0),
    countRecentDuplicateMessages: vi.fn(async () => 0),
    findLatestMessageCreatedAtBySender: vi.fn<() => Promise<string | null>>(async () => null),
    getThreadMessageCount: vi.fn(async () => 0),
    appendMessageToThread: vi.fn(async () => buildMessage()),
    findThreadForUser: vi.fn<() => Promise<MessageThreadSummary | null>>(async () =>
      buildThreadSummary(),
    ),
    listMessagesForThread: vi.fn(async () => ({
      messages: [buildMessage()],
      hasMore: false,
    })),
    markThreadRead: vi.fn(async () => undefined),
    archiveThreadForUser: vi.fn(async () => true),
    restoreThreadForUser: vi.fn(async () => true),
    deleteThreadForEveryone: vi.fn(async () => true),
    listThreadParticipantUserIds: vi.fn(async () => ['501', '601']),
    listThreadsForUser: vi.fn(async () => ({
      threads: [buildThreadSummary()],
      pagination: {
        limit: 20,
        offset: 0,
        total: 1,
        hasMore: false,
      },
      unreadMessages: 0,
    })),
  };
  const messagingEventsServiceMock = {
    publishThreadUpdated: vi.fn(async () => undefined),
    publishTypingChanged: vi.fn(async () => undefined),
  };

  let service: MessagingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MessagingService(
      messagingRepositoryMock as never,
      messagingEventsServiceMock as never,
    );
  });

  it('creates or opens a listing thread and sends the initial message', async () => {
    const result = await service.openListingThreadForUser(
      baseUser,
      '101',
      'Ciao, sono interessato al tuo annuncio.',
      'web_listing',
    );

    expect(result.createdThread).toBe(true);
    expect(result.thread.id).toBe('9001');
    expect(result.message.body).toContain('interessato');
    expect(messagingRepositoryMock.getOrCreateThread).toHaveBeenCalledWith(
      expect.objectContaining({
        listingId: '101',
        requesterUserId: '501',
        ownerUserId: '601',
      }),
    );
    expect(messagingEventsServiceMock.publishThreadUpdated).toHaveBeenCalledWith(['501', '601'], {
      threadId: '9001',
      reason: 'message_created',
    });
  });

  it('blocks attempts to contact your own listing', async () => {
    messagingRepositoryMock.findPublishedListingForMessaging.mockResolvedValueOnce({
      listingId: '101',
      listingTitle: 'Gattina in adozione',
      ownerUserId: '501',
      ownerProviderSubject: 'user-subject-1',
      ownerEmail: 'owner@example.test',
    });

    await expect(
      service.openListingThreadForUser(baseUser, '101', 'Ciao', 'web_listing'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rate limits excessive creation of new threads', async () => {
    messagingRepositoryMock.countRecentThreadsByRequester.mockResolvedValueOnce(20);

    await expect(
      service.openListingThreadForUser(baseUser, '101', 'Ciao, ci sono ancora?', 'web_listing'),
    ).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
  });

  it('blocks messages with too many links', async () => {
    const spamBody = 'https://a.test https://b.test https://c.test https://d.test https://e.test';

    await expect(service.sendMessageForUser(baseUser, '9001', spamBody)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('blocks messages when a thread reached the configured storage cap', async () => {
    messagingRepositoryMock.getThreadMessageCount.mockResolvedValueOnce(2000);

    await expect(
      service.sendMessageForUser(baseUser, '9001', 'Questo thread e troppo pieno'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rate limits repeated sends in the same thread during slow mode', async () => {
    messagingRepositoryMock.findLatestMessageCreatedAtBySender.mockResolvedValueOnce(
      new Date().toISOString(),
    );

    await expect(
      service.sendMessageForUser(baseUser, '9001', 'Scrivo di nuovo troppo presto'),
    ).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
  });

  it('restores visibility when reopening an archived thread from a listing', async () => {
    messagingRepositoryMock.findThreadIdByListingAndUsers.mockResolvedValueOnce('9001');
    messagingRepositoryMock.findThreadForUser
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(buildThreadSummary());

    const result = await service.openListingThreadForUser(
      baseUser,
      '101',
      'Ciao, torno a scriverti per questo annuncio.',
      'web_listing',
    );

    expect(result.createdThread).toBe(false);
    expect(result.thread.id).toBe('9001');
    expect(messagingRepositoryMock.restoreThreadForUser).toHaveBeenCalledWith('9001', '501');
  });

  it('blocks duplicate messages in the anti-spam window', async () => {
    messagingRepositoryMock.findThreadForUser.mockResolvedValueOnce(buildThreadSummary());
    messagingRepositoryMock.countRecentDuplicateMessages.mockResolvedValueOnce(1);

    await expect(
      service.sendMessageForUser(baseUser, '9001', 'Messaggio duplicato'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns null when sending a message to an inaccessible thread', async () => {
    messagingRepositoryMock.findThreadForUser.mockImplementationOnce(async () => null as never);

    const result = await service.sendMessageForUser(baseUser, '9999', 'Ciao');
    expect(result).toBeNull();
  });

  it('restores visibility when thread detail lookup misses after send', async () => {
    messagingRepositoryMock.findThreadForUser
      .mockResolvedValueOnce(buildThreadSummary())
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(buildThreadSummary());

    const result = await service.sendMessageForUser(baseUser, '9001', 'Ti aggiorno sul contatto');

    expect(result?.thread.id).toBe('9001');
    expect(messagingRepositoryMock.restoreThreadForUser).toHaveBeenCalledWith('9001', '501');
  });

  it('marks a thread as read for the authenticated participant', async () => {
    const result = await service.markThreadReadForUser(baseUser, '9001');

    expect(result?.readAt).toBeTruthy();
    expect(messagingRepositoryMock.markThreadRead).toHaveBeenCalledWith(
      '9001',
      '501',
      expect.any(String),
    );
    expect(messagingEventsServiceMock.publishThreadUpdated).toHaveBeenCalledWith(['501'], {
      threadId: '9001',
      reason: 'read_state_changed',
    });
  });

  it('archives a thread only for the current participant', async () => {
    const result = await service.archiveThreadForUser(baseUser, '9001');

    expect(result?.archivedAt).toBeTruthy();
    expect(messagingRepositoryMock.archiveThreadForUser).toHaveBeenCalledWith(
      '9001',
      '501',
      expect.any(String),
    );
    expect(messagingEventsServiceMock.publishThreadUpdated).toHaveBeenCalledWith(['501'], {
      threadId: '9001',
      reason: 'thread_archived',
    });
  });

  it('hard deletes a thread for both participants', async () => {
    const result = await service.deleteThreadForEveryone(baseUser, '9001');

    expect(result?.deletedAt).toBeTruthy();
    expect(messagingRepositoryMock.deleteThreadForEveryone).toHaveBeenCalledWith('9001', '501');
    expect(messagingEventsServiceMock.publishThreadUpdated).toHaveBeenCalledWith(['501', '601'], {
      threadId: '9001',
      reason: 'thread_deleted',
    });
  });

  it('publishes typing indicator only to the other participant', async () => {
    const result = await service.setTypingForUser(baseUser, '9001', true);

    expect(result).toEqual({ accepted: true });
    expect(messagingEventsServiceMock.publishTypingChanged).toHaveBeenCalledWith(['601'], {
      threadId: '9001',
      userId: '501',
      isTyping: true,
    });
  });

  it('returns null when archiving an inaccessible thread', async () => {
    messagingRepositoryMock.findThreadForUser.mockResolvedValueOnce(null);

    await expect(service.archiveThreadForUser(baseUser, '9999')).resolves.toBeNull();
    expect(messagingRepositoryMock.archiveThreadForUser).not.toHaveBeenCalled();
  });

  it('returns null when deleting an inaccessible thread for everyone', async () => {
    messagingRepositoryMock.findThreadForUser.mockResolvedValueOnce(null);

    await expect(service.deleteThreadForEveryone(baseUser, '9999')).resolves.toBeNull();
    expect(messagingRepositoryMock.deleteThreadForEveryone).not.toHaveBeenCalled();
  });

  it('returns null when sending typing state to an inaccessible thread', async () => {
    messagingRepositoryMock.findThreadForUser.mockResolvedValueOnce(null);

    await expect(service.setTypingForUser(baseUser, '9999', true)).resolves.toBeNull();
    expect(messagingEventsServiceMock.publishTypingChanged).not.toHaveBeenCalled();
  });
});
