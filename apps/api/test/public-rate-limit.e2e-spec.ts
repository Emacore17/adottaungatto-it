import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { vi } from 'vitest';
import { AnalyticsService } from '../src/analytics/analytics.service';
import { AppModule } from '../src/app.module';

describe('Public rate limit guard', () => {
  let app: NestFastifyApplication;
  const previousAnalyticsMax = process.env.RATE_LIMIT_ANALYTICS_MAX_REQUESTS;
  const previousAnalyticsWindow = process.env.RATE_LIMIT_ANALYTICS_WINDOW_SECONDS;

  const trackPublicEvent = vi.fn(async () => ({
    id: 'event-1',
    eventType: 'contact_clicked',
    actorUserId: null,
    listingId: '101',
    source: 'web_public',
    metadata: {},
    createdAt: new Date().toISOString(),
  }));

  beforeAll(async () => {
    process.env.RATE_LIMIT_ANALYTICS_MAX_REQUESTS = '2';
    process.env.RATE_LIMIT_ANALYTICS_WINDOW_SECONDS = '120';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AnalyticsService)
      .useValue({
        trackPublicEvent,
        getAdminKpis: vi.fn(),
      })
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();

    if (previousAnalyticsMax === undefined) {
      process.env.RATE_LIMIT_ANALYTICS_MAX_REQUESTS = undefined;
    } else {
      process.env.RATE_LIMIT_ANALYTICS_MAX_REQUESTS = previousAnalyticsMax;
    }

    if (previousAnalyticsWindow === undefined) {
      process.env.RATE_LIMIT_ANALYTICS_WINDOW_SECONDS = undefined;
    } else {
      process.env.RATE_LIMIT_ANALYTICS_WINDOW_SECONDS = previousAnalyticsWindow;
    }
  });

  beforeEach(() => {
    trackPublicEvent.mockClear();
  });

  it('returns 429 when analytics event burst exceeds configured threshold', async () => {
    const payload = {
      eventType: 'contact_clicked',
      listingId: '101',
      source: 'web_public',
    };

    const first = await request(app.getHttpServer()).post('/v1/analytics/events').send(payload);
    const second = await request(app.getHttpServer()).post('/v1/analytics/events').send(payload);
    const third = await request(app.getHttpServer()).post('/v1/analytics/events').send(payload);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(third.status).toBe(429);
    expect(third.body.message).toBe('Rate limit exceeded for analytics_events.');
    expect(typeof third.body.retryAfterSeconds).toBe('number');
    expect(trackPublicEvent).toHaveBeenCalledTimes(2);
  });
});
