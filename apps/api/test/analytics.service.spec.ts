import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AnalyticsService } from '../src/analytics/analytics.service';
import type { RequestUser } from '../src/auth/interfaces/request-user.interface';
import { UserRole } from '../src/auth/roles.enum';

const actor: RequestUser = {
  id: 'analytics-service-spec',
  provider: 'dev-header',
  providerSubject: 'analytics-service-spec',
  email: 'analytics-service-spec@example.test',
  roles: [UserRole.USER],
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

describe('AnalyticsService', () => {
  const findPublishedListingId = vi.fn<(listingId: string) => Promise<string | null>>(
    async (_listingId: string) => '101',
  );

  const analyticsRepositoryMock = {
    upsertActorUser: vi.fn(async (_actor: RequestUser) => '42'),
    findPublishedListingId,
    createEvent: vi.fn(
      async (input: {
        eventType: string;
        actorUserId: string | null;
        listingId: string | null;
        source: string;
        metadata: Record<string, unknown>;
      }) => ({
        id: '9001',
        eventType: input.eventType,
        actorUserId: input.actorUserId,
        listingId: input.listingId,
        source: input.source,
        metadata: input.metadata,
        createdAt: new Date().toISOString(),
      }),
    ),
    getKpiAggregate: vi.fn(async (_fromIso: string, _toIso: string) => ({
      listingView: 100,
      searchPerformed: 50,
      searchFallbackApplied: 5,
      contactClicked: 22,
      contactSent: 11,
      listingCreated: 20,
      listingPublished: 8,
    })),
    getModerationAggregate: vi.fn(async (_fromIso: string, _toIso: string) => ({
      pendingReview: 3,
      approved: 9,
      rejected: 2,
    })),
  };

  const service = new AnalyticsService(analyticsRepositoryMock as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('tracks system event with actor', async () => {
    const event = await service.trackSystemEvent({
      eventType: 'listing_created',
      actor,
      listingId: '101',
      source: 'api_listings_create',
      metadata: {
        listingType: 'adozione',
      },
    });

    expect(analyticsRepositoryMock.upsertActorUser).toHaveBeenCalledWith(actor);
    expect(analyticsRepositoryMock.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'listing_created',
        actorUserId: '42',
        listingId: '101',
      }),
    );
    expect(event.eventType).toBe('listing_created');
  });

  it('tracks public contact event for published listing', async () => {
    const event = await service.trackPublicEvent({
      eventType: 'contact_clicked',
      listingId: '101',
      source: 'web_public',
      metadata: {
        channel: 'email',
      },
    });

    expect(analyticsRepositoryMock.findPublishedListingId).toHaveBeenCalledWith('101');
    expect(analyticsRepositoryMock.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'contact_clicked',
        actorUserId: null,
        listingId: '101',
      }),
    );
    expect(event.eventType).toBe('contact_clicked');
  });

  it('throws not found for public event on missing listing', async () => {
    findPublishedListingId.mockResolvedValueOnce(null);

    await expect(
      service.trackPublicEvent({
        eventType: 'contact_sent',
        listingId: '999999',
        source: 'web_public',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns KPI snapshot with derived rates', async () => {
    const snapshot = await service.getAdminKpis(30);

    expect(analyticsRepositoryMock.getKpiAggregate).toHaveBeenCalledTimes(1);
    expect(analyticsRepositoryMock.getModerationAggregate).toHaveBeenCalledTimes(1);
    expect(snapshot.windowDays).toBe(30);
    expect(snapshot.metrics.searchPerformed).toBe(50);
    expect(snapshot.moderation.pendingReview).toBe(3);
    expect(snapshot.funnel.listingCreated).toBe(20);
    expect(snapshot.funnel.contactClickToSendRatePct).toBe(50);
    expect(snapshot.derived.fallbackRatePct).toBe(10);
    expect(snapshot.derived.contactRatePct).toBe(11);
    expect(snapshot.derived.publishRatePct).toBe(40);
  });

  it('validates KPI window range', async () => {
    await expect(service.getAdminKpis(0)).rejects.toBeInstanceOf(BadRequestException);
  });
});
