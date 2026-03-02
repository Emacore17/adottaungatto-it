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
    findThreadIdByListingAndUsers: vi.fn(async () => null),
    countRecentThreadsByRequester: vi.fn(async () => 0),
    getOrCreateThread: vi.fn(async () => '9001'),
    countRecentMessagesBySender: vi.fn(async () => 0),
    countRecentDuplicateMessages: vi.fn(async () => 0),
    appendMessageToThread: vi.fn(async () => buildMessage()),
    findThreadForUser: vi.fn(async () => buildThreadSummary()),
    listMessagesForThread: vi.fn(async () => ({
      messages: [buildMessage()],
      hasMore: false,
    })),
    markThreadRead: vi.fn(async () => undefined),
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

  let service: MessagingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MessagingService(messagingRepositoryMock as never);
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

  it('marks a thread as read for the authenticated participant', async () => {
    const result = await service.markThreadReadForUser(baseUser, '9001');

    expect(result?.readAt).toBeTruthy();
    expect(messagingRepositoryMock.markThreadRead).toHaveBeenCalledWith(
      '9001',
      '501',
      expect.any(String),
    );
  });
});
