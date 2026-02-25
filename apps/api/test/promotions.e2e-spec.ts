import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { vi } from 'vitest';
import { AppModule } from '../src/app.module';
import type { RequestUser } from '../src/auth/interfaces/request-user.interface';
import type { PlanRecord } from '../src/promotions/models/promotion.model';
import { PromotionsService } from '../src/promotions/promotions.service';

const userHeaders = {
  'x-auth-user-id': 'user-promotions-e2e',
  'x-auth-email': 'user-promotions-e2e@example.test',
  'x-auth-roles': 'user',
};

const moderatorHeaders = {
  'x-auth-user-id': 'moderator-promotions-e2e',
  'x-auth-email': 'moderator-promotions-e2e@example.test',
  'x-auth-roles': 'moderator',
};

const adminHeaders = {
  'x-auth-user-id': 'admin-promotions-e2e',
  'x-auth-email': 'admin-promotions-e2e@example.test',
  'x-auth-roles': 'admin',
};

const buildPlan = (): PlanRecord => ({
  id: '11',
  code: 'boost_24h',
  name: 'Boost 24 ore',
  description: 'Spinta breve',
  boostType: 'boost_24h',
  durationHours: 24,
  promotionWeight: '1.120',
  isActive: true,
  metadata: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

describe('Promotions admin endpoints', () => {
  let app: NestFastifyApplication;

  const listPlans = vi.fn(async (_onlyActive: boolean) => [buildPlan()]);
  const listListingPromotions = vi.fn(async (_listingId: string) => [
    {
      id: '9001',
      listingId: '101',
      planId: '11',
      createdByUserId: '42',
      status: 'active' as const,
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      activatedAt: new Date().toISOString(),
      expiredAt: null,
      cancelledAt: null,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      plan: buildPlan(),
    },
  ]);
  const assignListingPromotion = vi.fn(
    async (
      _actor: RequestUser,
      input: {
        listingId: string;
        planCode: string;
        startsAt?: string;
        metadata?: Record<string, unknown>;
      },
    ) => ({
      promotion: {
        id: '9001',
        listingId: input.listingId,
        planId: '11',
        createdByUserId: '42',
        status: input.startsAt ? 'scheduled' : ('active' as const),
        startsAt: input.startsAt ?? new Date().toISOString(),
        endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        activatedAt: input.startsAt ? null : new Date().toISOString(),
        expiredAt: null,
        cancelledAt: null,
        metadata: input.metadata ?? {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        plan: buildPlan(),
      },
      events: [
        {
          id: '1',
          listingPromotionId: '9001',
          eventType: 'created' as const,
          actorUserId: '42',
          eventAt: new Date().toISOString(),
          payload: {},
          createdAt: new Date().toISOString(),
        },
      ],
    }),
  );

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PromotionsService)
      .useValue({
        listPlans,
        listListingPromotions,
        assignListingPromotion,
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
    listPlans.mockClear();
    listListingPromotions.mockClear();
    assignListingPromotion.mockClear();
  });

  it('denies plans endpoint without auth', async () => {
    const response = await request(app.getHttpServer()).get('/v1/admin/promotions/plans');
    expect(response.status).toBe(401);
  });

  it('denies plans endpoint to user role', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/admin/promotions/plans')
      .set(userHeaders);

    expect(response.status).toBe(403);
  });

  it('denies plans endpoint to moderator role', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/admin/promotions/plans')
      .set(moderatorHeaders);

    expect(response.status).toBe(403);
  });

  it('lists plans for admin', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/admin/promotions/plans')
      .set(adminHeaders);

    expect(response.status).toBe(200);
    expect(response.body.plans).toHaveLength(1);
    expect(response.body.plans[0].code).toBe('boost_24h');
    expect(listPlans).toHaveBeenCalledWith(true);
  });

  it('validates assign payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/admin/promotions/listings/101/assign')
      .set(adminHeaders)
      .send({});

    expect(response.status).toBe(400);
    expect(assignListingPromotion).not.toHaveBeenCalled();
  });

  it('assigns promotion for admin', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/admin/promotions/listings/101/assign')
      .set(adminHeaders)
      .send({
        planCode: 'boost_24h',
        metadata: {
          source: 'e2e-test',
        },
      });

    expect(response.status).toBe(201);
    expect(response.body.promotion.listingId).toBe('101');
    expect(response.body.promotion.plan.code).toBe('boost_24h');
    expect(assignListingPromotion).toHaveBeenCalledWith(
      expect.objectContaining({ providerSubject: 'admin-promotions-e2e' }),
      expect.objectContaining({
        listingId: '101',
        planCode: 'boost_24h',
      }),
    );
  });

  it('lists promotions by listing id for admin', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/admin/promotions/listings/101')
      .set(adminHeaders);

    expect(response.status).toBe(200);
    expect(response.body.promotions).toHaveLength(1);
    expect(response.body.promotions[0].listingId).toBe('101');
    expect(listListingPromotions).toHaveBeenCalledWith('101');
  });
});
