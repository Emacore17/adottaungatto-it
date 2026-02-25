import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { vi } from 'vitest';
import { AnalyticsService } from '../src/analytics/analytics.service';
import { AppModule } from '../src/app.module';

const userHeaders = {
  'x-auth-user-id': 'user-analytics-e2e',
  'x-auth-email': 'user-analytics-e2e@example.test',
  'x-auth-roles': 'user',
};

const moderatorHeaders = {
  'x-auth-user-id': 'moderator-analytics-e2e',
  'x-auth-email': 'moderator-analytics-e2e@example.test',
  'x-auth-roles': 'moderator',
};

describe('Analytics endpoints', () => {
  let app: NestFastifyApplication;

  const trackPublicEvent = vi.fn(
    async (input: {
      eventType: 'contact_clicked' | 'contact_sent';
      listingId: string;
      source: string;
      metadata?: Record<string, unknown>;
    }) => ({
      id: '9100',
      eventType: input.eventType,
      actorUserId: null,
      listingId: input.listingId,
      source: input.source,
      metadata: input.metadata ?? {},
      createdAt: new Date().toISOString(),
    }),
  );
  const getAdminKpis = vi.fn(async (_windowDays: number) => ({
    windowDays: 30,
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    to: new Date().toISOString(),
    metrics: {
      listingView: 120,
      searchPerformed: 70,
      searchFallbackApplied: 9,
      contactClicked: 35,
      contactSent: 12,
      listingCreated: 28,
      listingPublished: 14,
    },
    moderation: {
      pendingReview: 4,
      approved: 18,
      rejected: 3,
    },
    funnel: {
      listingCreated: 28,
      listingPublished: 14,
      contactClicked: 35,
      contactSent: 12,
      publishRatePct: 50,
      contactFromPublishedRatePct: 85.7,
      contactClickToSendRatePct: 34.3,
    },
    derived: {
      fallbackRatePct: 12.9,
      contactRatePct: 10,
      publishRatePct: 50,
    },
  }));

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AnalyticsService)
      .useValue({
        trackPublicEvent,
        getAdminKpis,
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
    trackPublicEvent.mockClear();
    getAdminKpis.mockClear();
  });

  it('tracks public contact event without authentication', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/analytics/events')
      .send({
        eventType: 'contact_clicked',
        listingId: '101',
        source: 'web_public',
        metadata: {
          channel: 'email',
        },
      });

    expect(response.status).toBe(201);
    expect(response.body.event.eventType).toBe('contact_clicked');
    expect(trackPublicEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'contact_clicked',
        listingId: '101',
      }),
    );
  });

  it('validates public analytics payload', async () => {
    const response = await request(app.getHttpServer()).post('/v1/analytics/events').send({
      eventType: 'listing_created',
      listingId: '101',
    });

    expect(response.status).toBe(400);
    expect(trackPublicEvent).not.toHaveBeenCalled();
  });

  it('denies admin KPI endpoint to user role', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/admin/analytics/kpis')
      .set(userHeaders);

    expect(response.status).toBe(403);
    expect(getAdminKpis).not.toHaveBeenCalled();
  });

  it('returns KPI snapshot for moderator role', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/admin/analytics/kpis?windowDays=30')
      .set(moderatorHeaders);

    expect(response.status).toBe(200);
    expect(response.body.metrics.listingView).toBe(120);
    expect(response.body.moderation.pendingReview).toBe(4);
    expect(response.body.funnel.listingPublished).toBe(14);
    expect(getAdminKpis).toHaveBeenCalledWith(30);
  });
});
