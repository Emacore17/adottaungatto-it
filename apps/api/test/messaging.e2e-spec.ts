import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { MessagingService } from '../src/messaging/messaging.service';

const userHeaders = {
  'x-auth-user-id': 'user-messages-1',
  'x-auth-email': 'user-messages-1@example.test',
  'x-auth-roles': 'user',
};

const buildThread = () => ({
  id: '9001',
  listingId: '101',
  listingTitle: 'Gattina in adozione',
  listingStatus: 'published',
  source: 'web_listing',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  latestMessageAt: new Date().toISOString(),
  unreadCount: 1,
  viewerRole: 'requester',
  otherParticipant: {
    role: 'owner',
    email: 'owner@example.test',
    providerSubject: 'owner-subject-1',
  },
  latestMessage: {
    id: '7001',
    threadId: '9001',
    senderRole: 'owner',
    senderEmail: 'owner@example.test',
    body: 'Ciao, certo.',
    createdAt: new Date().toISOString(),
  },
  messages: [
    {
      id: '7000',
      threadId: '9001',
      senderRole: 'requester',
      senderEmail: 'user-messages-1@example.test',
      body: 'Ciao, e ancora disponibile?',
      createdAt: new Date().toISOString(),
    },
    {
      id: '7001',
      threadId: '9001',
      senderRole: 'owner',
      senderEmail: 'owner@example.test',
      body: 'Ciao, certo.',
      createdAt: new Date().toISOString(),
    },
  ],
});

describe('Messaging endpoints', () => {
  let app: NestFastifyApplication;

  const openListingThreadForUser = vi.fn(async () => ({
    createdThread: true,
    message: {
      id: '7000',
      threadId: '9001',
      senderRole: 'requester',
      senderEmail: 'user-messages-1@example.test',
      body: 'Ciao, e ancora disponibile?',
      createdAt: new Date().toISOString(),
    },
    thread: buildThread(),
  }));
  const listThreadsForUser = vi.fn(async () => ({
    threads: [buildThread()],
    pagination: {
      limit: 20,
      offset: 0,
      total: 1,
      hasMore: false,
    },
    unreadMessages: 1,
  }));
  const getThreadForUser = vi.fn(async () => ({
    thread: buildThread(),
    hasMore: false,
  }));
  const sendMessageForUser = vi.fn(async () => ({
    message: {
      id: '7002',
      threadId: '9001',
      senderRole: 'requester',
      senderEmail: 'user-messages-1@example.test',
      body: 'Perfetto, grazie.',
      createdAt: new Date().toISOString(),
    },
    thread: buildThread(),
  }));
  const markThreadReadForUser = vi.fn(async () => ({
    readAt: new Date().toISOString(),
  }));
  const archiveThreadForUser = vi.fn(async () => ({
    archivedAt: new Date().toISOString(),
  }));
  const deleteThreadForEveryone = vi.fn(async () => ({
    deletedAt: new Date().toISOString(),
  }));
  const setTypingForUser = vi.fn(async () => ({
    accepted: true,
  }));

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MessagingService)
      .useValue({
        openListingThreadForUser,
        listThreadsForUser,
        getThreadForUser,
        sendMessageForUser,
        markThreadReadForUser,
        archiveThreadForUser,
        deleteThreadForEveryone,
        setTypingForUser,
      })
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('denies messaging routes without authentication headers', async () => {
    const response = await request(app.getHttpServer()).get('/v1/messages/threads');
    expect(response.status).toBe(401);
  });

  it('opens a thread from a listing and sends the first message', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/messages/listings/101/thread')
      .set(userHeaders)
      .send({
        body: 'Ciao, e ancora disponibile?',
      });

    expect(response.status).toBe(201);
    expect(response.body.createdThread).toBe(true);
    expect(openListingThreadForUser).toHaveBeenCalledWith(
      expect.any(Object),
      '101',
      'Ciao, e ancora disponibile?',
      'web_listing',
    );
  });

  it('lists inbox threads for the authenticated user', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/messages/threads?limit=20&offset=0')
      .set(userHeaders);

    expect(response.status).toBe(200);
    expect(response.body.threads).toHaveLength(1);
    expect(response.body.unreadMessages).toBe(1);
  });

  it('returns a thread detail with pagination metadata', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/messages/threads/9001?limit=40')
      .set(userHeaders);

    expect(response.status).toBe(200);
    expect(response.body.thread.id).toBe('9001');
    expect(response.body.pagination.hasMore).toBe(false);
  });

  it('sends a message inside an existing thread', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/messages/threads/9001/messages')
      .set(userHeaders)
      .send({
        body: 'Perfetto, grazie.',
      });

    expect(response.status).toBe(201);
    expect(response.body.message.id).toBe('7002');
    expect(sendMessageForUser).toHaveBeenCalledWith(
      expect.any(Object),
      '9001',
      'Perfetto, grazie.',
    );
  });

  it('marks a thread as read', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/messages/threads/9001/read')
      .set(userHeaders)
      .send({});

    expect(response.status).toBe(201);
    expect(response.body.threadId).toBe('9001');
    expect(markThreadReadForUser).toHaveBeenCalledWith(expect.any(Object), '9001');
  });

  it('archives a thread only for the authenticated user', async () => {
    const response = await request(app.getHttpServer())
      .delete('/v1/messages/threads/9001')
      .set(userHeaders);

    expect(response.status).toBe(200);
    expect(response.body.threadId).toBe('9001');
    expect(archiveThreadForUser).toHaveBeenCalledWith(expect.any(Object), '9001');
  });

  it('deletes a thread for everyone when requested', async () => {
    const response = await request(app.getHttpServer())
      .delete('/v1/messages/threads/9001/everyone')
      .set(userHeaders);

    expect(response.status).toBe(200);
    expect(response.body.threadId).toBe('9001');
    expect(deleteThreadForEveryone).toHaveBeenCalledWith(expect.any(Object), '9001');
  });

  it('accepts typing events without refreshing the page', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/messages/threads/9001/typing')
      .set(userHeaders)
      .send({
        isTyping: true,
      });

    expect(response.status).toBe(201);
    expect(response.body.threadId).toBe('9001');
    expect(response.body.accepted).toBe(true);
    expect(response.body.isTyping).toBe(true);
    expect(setTypingForUser).toHaveBeenCalledWith(expect.any(Object), '9001', true);
  });

  it('validates typing payloads strictly', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/messages/threads/9001/typing')
      .set(userHeaders)
      .send({
        isTyping: 'true',
      });

    expect(response.status).toBe(400);
    expect(setTypingForUser).not.toHaveBeenCalled();
  });
});
