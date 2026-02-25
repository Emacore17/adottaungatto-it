import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { RequestUser } from '../src/auth/interfaces/request-user.interface';
import { UserRole } from '../src/auth/roles.enum';
import type { ListingStatus } from '../src/listings/models/listing.model';
import type {
  ListingPromotionWithPlan,
  PlanRecord,
} from '../src/promotions/models/promotion.model';
import { PromotionsService } from '../src/promotions/promotions.service';

const actor: RequestUser = {
  id: 'admin-promotions-spec',
  provider: 'dev-header',
  providerSubject: 'admin-promotions-spec',
  email: 'admin-promotions-spec@example.test',
  roles: [UserRole.ADMIN],
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

const buildPlan = (overrides: Partial<PlanRecord> = {}): PlanRecord => ({
  id: '11',
  code: 'boost_24h',
  name: 'Boost 24 ore',
  description: 'Boost breve',
  boostType: 'boost_24h',
  durationHours: 24,
  promotionWeight: '1.120',
  isActive: true,
  metadata: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const buildListingStatusRow = (status: ListingStatus) => ({
  id: '101',
  status,
});

const buildPromotionWithPlan = (): ListingPromotionWithPlan => ({
  id: '9001',
  listingId: '101',
  planId: '11',
  createdByUserId: '42',
  status: 'active',
  startsAt: new Date().toISOString(),
  endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  activatedAt: new Date().toISOString(),
  expiredAt: null,
  cancelledAt: null,
  metadata: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  plan: buildPlan(),
});

describe('PromotionsService', () => {
  const findListingForPromotion = vi.fn<
    (listingId: string) => Promise<{ id: string; status: ListingStatus } | null>
  >(async (_listingId: string) => buildListingStatusRow('published'));
  const findPlanByCode = vi.fn<(planCode: string) => Promise<PlanRecord | null>>(
    async (_planCode: string) => buildPlan(),
  );

  const promotionsRepositoryMock = {
    listPlans: vi.fn(async (_onlyActive: boolean) => [buildPlan()]),
    findListingForPromotion,
    listPromotionsByListingId: vi.fn(async (_listingId: string) => [buildPromotionWithPlan()]),
    findPlanByCode,
    upsertActorUser: vi.fn(async (_actor: RequestUser) => '42'),
    createListingPromotion: vi.fn(async () => ({
      promotion: {
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
    })),
  };

  const searchIndexServiceMock = {
    indexPublishedListingById: vi.fn(async (_listingId: string) => undefined),
  };

  const service = new PromotionsService(
    promotionsRepositoryMock as never,
    searchIndexServiceMock as never,
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists plans with active-only flag', async () => {
    const plans = await service.listPlans(true);

    expect(promotionsRepositoryMock.listPlans).toHaveBeenCalledWith(true);
    expect(plans).toHaveLength(1);
    expect(plans[0]?.code).toBe('boost_24h');
  });

  it('returns listing promotions when listing exists', async () => {
    const promotions = await service.listListingPromotions('101');

    expect(promotionsRepositoryMock.findListingForPromotion).toHaveBeenCalledWith('101');
    expect(promotionsRepositoryMock.listPromotionsByListingId).toHaveBeenCalledWith('101');
    expect(promotions).toHaveLength(1);
  });

  it('throws not found when listing does not exist for list', async () => {
    promotionsRepositoryMock.findListingForPromotion.mockResolvedValueOnce(null);

    await expect(service.listListingPromotions('999')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('assigns active promotion when startsAt is now', async () => {
    const result = await service.assignListingPromotion(actor, {
      listingId: '101',
      planCode: 'boost_24h',
    });

    expect(promotionsRepositoryMock.findListingForPromotion).toHaveBeenCalledWith('101');
    expect(promotionsRepositoryMock.findPlanByCode).toHaveBeenCalledWith('boost_24h');
    expect(promotionsRepositoryMock.upsertActorUser).toHaveBeenCalledWith(actor);
    expect(promotionsRepositoryMock.createListingPromotion).toHaveBeenCalledWith(
      expect.objectContaining({
        listingId: '101',
        planId: '11',
        status: 'active',
        activatedAt: expect.any(String),
      }),
    );
    expect(searchIndexServiceMock.indexPublishedListingById).toHaveBeenCalledWith('101');
    expect(result.promotion.plan.code).toBe('boost_24h');
  });

  it('assigns scheduled promotion when startsAt is in future', async () => {
    const futureStart = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    await service.assignListingPromotion(actor, {
      listingId: '101',
      planCode: 'boost_24h',
      startsAt: futureStart,
    });

    expect(promotionsRepositoryMock.createListingPromotion).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'scheduled',
        activatedAt: null,
      }),
    );
  });

  it('throws when listing is archived', async () => {
    promotionsRepositoryMock.findListingForPromotion.mockResolvedValueOnce(
      buildListingStatusRow('archived'),
    );

    await expect(
      service.assignListingPromotion(actor, {
        listingId: '101',
        planCode: 'boost_24h',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when plan is not found', async () => {
    promotionsRepositoryMock.findPlanByCode.mockResolvedValueOnce(null);

    await expect(
      service.assignListingPromotion(actor, {
        listingId: '101',
        planCode: 'boost_not_found',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when startsAt is too old and window already expired', async () => {
    const oldStart = new Date(Date.now() - 40 * 60 * 60 * 1000).toISOString();

    await expect(
      service.assignListingPromotion(actor, {
        listingId: '101',
        planCode: 'boost_24h',
        startsAt: oldStart,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
