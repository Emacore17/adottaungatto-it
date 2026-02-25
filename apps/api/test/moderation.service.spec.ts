import { BadRequestException, ConflictException } from '@nestjs/common';
import type { RequestUser } from '../src/auth/interfaces/request-user.interface';
import { UserRole } from '../src/auth/roles.enum';
import type { ListingRecord, ListingStatus } from '../src/listings/models/listing.model';
import type {
  ModerationActionResult,
  ModerationQueueItem,
} from '../src/moderation/models/moderation.model';
import { ModerationService } from '../src/moderation/moderation.service';

const actor: RequestUser = {
  id: 'moderator-service-spec',
  provider: 'dev-header',
  providerSubject: 'moderator-service-spec',
  email: 'moderator-service-spec@example.test',
  roles: [UserRole.MODERATOR],
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

const buildListing = (status: ListingStatus): ListingRecord => ({
  id: '101',
  ownerUserId: '10',
  title: 'Annuncio test',
  description: 'Descrizione test',
  listingType: 'adozione',
  priceAmount: null,
  currency: 'EUR',
  ageText: '2 anni',
  sex: 'femmina',
  breed: null,
  status,
  regionId: '1',
  provinceId: '11',
  comuneId: '101',
  contactName: null,
  contactPhone: null,
  contactEmail: null,
  publishedAt: null,
  archivedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  deletedAt: null,
});

const buildQueueItem = (status: ListingStatus): ModerationQueueItem => ({
  ...buildListing(status),
  ownerEmail: 'owner@example.test',
  regionName: 'Piemonte',
  provinceName: 'Torino',
  provinceSigla: 'TO',
  comuneName: 'Torino',
  mediaCount: 1,
});

describe('ModerationService', () => {
  const listPendingQueue = vi.fn(async (_limit: number): Promise<ModerationQueueItem[]> => []);
  const findListingById = vi.fn(
    async (_listingId: string): Promise<ListingRecord | null> => buildListing('pending_review'),
  );
  const upsertActorUser = vi.fn(async (_actor: RequestUser): Promise<string> => '42');
  const applyModerationAction = vi.fn(
    async (input: {
      fromStatus: ListingStatus;
      toStatus: ListingStatus;
    }): Promise<ModerationActionResult | null> => ({
      listing: buildListing(input.toStatus),
      auditLog: {
        id: '1',
        actorUserId: '42',
        action: 'approve',
        targetType: 'listing',
        targetId: '101',
        reason: 'ok',
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        metadata: {},
        createdAt: new Date().toISOString(),
      },
    }),
  );

  const moderationRepositoryMock = {
    listPendingQueue,
    findListingById,
    upsertActorUser,
    applyModerationAction,
  };

  const searchIndexServiceMock = {
    indexPublishedListingById: vi.fn(async (_listingId: string) => undefined),
    removeListingById: vi.fn(async (_listingId: string) => undefined),
  };
  const analyticsServiceMock = {
    trackSystemEventSafe: vi.fn(async () => undefined),
  };

  const service = new ModerationService(
    moderationRepositoryMock as never,
    searchIndexServiceMock as never,
    analyticsServiceMock as never,
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists pending queue from repository', async () => {
    listPendingQueue.mockResolvedValueOnce([buildQueueItem('pending_review')]);

    const queue = await service.listPendingQueue(20);

    expect(listPendingQueue).toHaveBeenCalledWith(20);
    expect(queue).toHaveLength(1);
  });

  it('approves pending listing', async () => {
    findListingById.mockResolvedValueOnce(buildListing('pending_review'));

    const result = await service.moderateListing(actor, '101', 'approve', 'Conforme alle policy');

    expect(upsertActorUser).toHaveBeenCalledWith(actor);
    expect(applyModerationAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'approve',
        fromStatus: 'pending_review',
        toStatus: 'published',
      }),
    );
    expect(searchIndexServiceMock.indexPublishedListingById).toHaveBeenCalledWith('101');
    expect(analyticsServiceMock.trackSystemEventSafe).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'listing_published',
        listingId: '101',
      }),
    );
    expect(result?.listing.status).toBe('published');
  });

  it('rejects pending listing', async () => {
    findListingById.mockResolvedValueOnce(buildListing('pending_review'));

    const result = await service.moderateListing(actor, '101', 'reject', 'Contenuto non conforme');

    expect(applyModerationAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'reject',
        fromStatus: 'pending_review',
        toStatus: 'rejected',
      }),
    );
    expect(searchIndexServiceMock.removeListingById).toHaveBeenCalledWith('101');
    expect(result?.listing.status).toBe('rejected');
  });

  it('returns null when listing does not exist', async () => {
    findListingById.mockResolvedValueOnce(null);

    const result = await service.moderateListing(actor, '999', 'approve', 'N/A');

    expect(result).toBeNull();
    expect(upsertActorUser).not.toHaveBeenCalled();
  });

  it('throws conflict when listing status changes concurrently', async () => {
    findListingById.mockResolvedValueOnce(buildListing('pending_review'));
    applyModerationAction.mockResolvedValueOnce(null);

    await expect(
      service.moderateListing(actor, '101', 'approve', 'Conferma'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects unsupported transitions', async () => {
    findListingById.mockResolvedValueOnce(buildListing('published'));

    await expect(
      service.moderateListing(actor, '101', 'approve', 'Conferma'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
