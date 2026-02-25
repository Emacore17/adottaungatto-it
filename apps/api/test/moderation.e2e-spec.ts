import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { vi } from 'vitest';
import { AppModule } from '../src/app.module';
import type { RequestUser } from '../src/auth/interfaces/request-user.interface';
import type {
  ModerationAction,
  ModerationActionResult,
  ModerationQueueItem,
} from '../src/moderation/models/moderation.model';
import { ModerationService } from '../src/moderation/moderation.service';

const userHeaders = {
  'x-auth-user-id': 'user-moderation-e2e',
  'x-auth-email': 'user-moderation-e2e@example.test',
  'x-auth-roles': 'user',
};

const moderatorHeaders = {
  'x-auth-user-id': 'moderator-moderation-e2e',
  'x-auth-email': 'moderator-moderation-e2e@example.test',
  'x-auth-roles': 'moderator',
};

const buildQueueItem = (): ModerationQueueItem => ({
  id: '101',
  ownerUserId: '10',
  title: 'Micia da moderare',
  description: 'Descrizione annuncio in attesa',
  listingType: 'adozione',
  priceAmount: null,
  currency: 'EUR',
  ageText: '2 anni',
  sex: 'femmina',
  breed: null,
  status: 'pending_review' as const,
  regionId: '1',
  provinceId: '11',
  comuneId: '101',
  contactName: 'Contatto Test',
  contactPhone: '+39123456789',
  contactEmail: 'owner@example.test',
  publishedAt: null,
  archivedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  deletedAt: null,
  ownerEmail: 'owner@example.test',
  regionName: 'Piemonte',
  provinceName: 'Torino',
  provinceSigla: 'TO',
  comuneName: 'Torino',
  mediaCount: 2,
});

describe('Moderation endpoints', () => {
  let app: NestFastifyApplication;

  const listPendingQueue = vi.fn(
    async (_limit: number): Promise<ModerationQueueItem[]> => [buildQueueItem()],
  );
  const moderateListing = vi.fn(
    async (
      _actor: RequestUser,
      listingId: string,
      action: ModerationAction,
      reason: string,
    ): Promise<ModerationActionResult | null> => ({
      listing: {
        id: listingId,
        ownerUserId: '10',
        title: 'Micia da moderare',
        description: 'Descrizione annuncio in attesa',
        listingType: 'adozione',
        priceAmount: null,
        currency: 'EUR',
        ageText: '2 anni',
        sex: 'femmina',
        breed: null,
        status: action === 'approve' ? 'published' : action === 'reject' ? 'rejected' : 'suspended',
        regionId: '1',
        provinceId: '11',
        comuneId: '101',
        contactName: 'Contatto Test',
        contactPhone: '+39123456789',
        contactEmail: 'owner@example.test',
        publishedAt: action === 'approve' ? new Date().toISOString() : null,
        archivedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      },
      auditLog: {
        id: listingId,
        actorUserId: '42',
        action,
        targetType: 'listing',
        targetId: listingId,
        reason,
        fromStatus: 'pending_review',
        toStatus:
          action === 'approve'
            ? 'published'
            : action === 'reject'
              ? 'rejected'
              : action === 'suspend'
                ? 'suspended'
                : 'pending_review',
        metadata: {
          actorProvider: 'dev-header',
          actorSubject: 'moderator-moderation-e2e',
          actorRoles: ['moderator'],
        },
        createdAt: new Date().toISOString(),
      },
    }),
  );

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ModerationService)
      .useValue({
        listPendingQueue,
        moderateListing,
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
    listPendingQueue.mockClear();
    moderateListing.mockClear();
  });

  it('denies moderation queue without authentication headers', async () => {
    const response = await request(app.getHttpServer()).get('/v1/admin/moderation/queue');
    expect(response.status).toBe(401);
  });

  it('denies moderation queue to normal user role', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/admin/moderation/queue')
      .set(userHeaders);

    expect(response.status).toBe(403);
  });

  it('validates queue limit', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/admin/moderation/queue?limit=0')
      .set(moderatorHeaders);

    expect(response.status).toBe(400);
    expect(listPendingQueue).not.toHaveBeenCalled();
  });

  it('returns moderation queue to moderator', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/admin/moderation/queue?limit=10')
      .set(moderatorHeaders);

    expect(response.status).toBe(200);
    expect(response.body.limit).toBe(10);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].provinceSigla).toBe('TO');
    expect(listPendingQueue).toHaveBeenCalledWith(10);
  });

  it('validates moderation reason payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/admin/moderation/101/approve')
      .set(moderatorHeaders)
      .send({});

    expect(response.status).toBe(400);
    expect(moderateListing).not.toHaveBeenCalled();
  });

  it('approves listing with reason', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/admin/moderation/101/approve')
      .set(moderatorHeaders)
      .send({ reason: '  Contenuto conforme alle policy  ' });

    expect(response.status).toBe(201);
    expect(response.body.listing.status).toBe('published');
    expect(response.body.auditLog.action).toBe('approve');
    expect(moderateListing).toHaveBeenCalledWith(
      expect.objectContaining({ providerSubject: 'moderator-moderation-e2e' }),
      '101',
      'approve',
      'Contenuto conforme alle policy',
    );
  });

  it('rejects listing with reason', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/admin/moderation/101/reject')
      .set(moderatorHeaders)
      .send({ reason: 'Foto non adeguate alla policy immagini' });

    expect(response.status).toBe(201);
    expect(response.body.auditLog.action).toBe('reject');
    expect(moderateListing).toHaveBeenCalledWith(
      expect.any(Object),
      '101',
      'reject',
      'Foto non adeguate alla policy immagini',
    );
  });

  it('returns not found when listing does not exist', async () => {
    moderateListing.mockResolvedValueOnce(null);

    const response = await request(app.getHttpServer())
      .post('/v1/admin/moderation/99999/approve')
      .set(moderatorHeaders)
      .send({ reason: 'Annuncio non trovato in coda' });

    expect(response.status).toBe(404);
  });
});
