import type { RequestUser } from '../src/auth/interfaces/request-user.interface';
import { UserRole } from '../src/auth/roles.enum';
import { ListingsService } from '../src/listings/listings.service';
import type { UploadListingMediaInput } from '../src/listings/models/listing-media.model';
import type {
  CreateListingInput,
  ListingRecord,
  UpdateListingInput,
} from '../src/listings/models/listing.model';

const baseUser: RequestUser = {
  id: 'listing-user-1',
  provider: 'dev-header',
  providerSubject: 'listing-user-1',
  email: 'listing-user-1@example.test',
  roles: [UserRole.USER],
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

const buildListingRecord = (overrides: Partial<ListingRecord> = {}): ListingRecord => ({
  id: '1',
  ownerUserId: '10',
  title: 'Micio in adozione',
  description: 'Descrizione test',
  listingType: 'adozione',
  priceAmount: null,
  currency: 'EUR',
  ageText: '2 anni',
  sex: 'maschio',
  breed: null,
  status: 'pending_review',
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
  ...overrides,
});

describe('ListingsService', () => {
  const listingsRepositoryMock = {
    upsertOwnerUser: vi.fn(async () => '10'),
    createListing: vi.fn(async (_ownerUserId: string, input: CreateListingInput) =>
      buildListingRecord({
        status: input.status,
        publishedAt: input.publishedAt ?? null,
        archivedAt: input.archivedAt ?? null,
      }),
    ),
    listMine: vi.fn(async () => [buildListingRecord()]),
    updateMine: vi.fn(async (_ownerUserId: string, _listingId: string, input: UpdateListingInput) =>
      buildListingRecord({
        title: input.title ?? 'Micio in adozione',
        status: input.status ?? 'pending_review',
        publishedAt: input.publishedAt ?? null,
        archivedAt: input.archivedAt ?? null,
      }),
    ),
    softDeleteMine: vi.fn(async () =>
      buildListingRecord({
        status: 'archived',
        deletedAt: new Date().toISOString(),
      }),
    ),
    findMineById: vi.fn(async () => buildListingRecord()),
    getNextMediaPosition: vi.fn(async () => 4),
    clearPrimaryMedia: vi.fn(async () => undefined),
    createListingMedia: vi.fn(async () => ({
      id: 'media-1',
      listingId: '1',
      storageKey: 'listings/1/media-1.png',
      mimeType: 'image/png',
      fileSize: '128',
      width: 300,
      height: 200,
      hash: null,
      position: 4,
      isPrimary: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
    listMediaByListingId: vi.fn(async () => [
      {
        id: 'media-1',
        listingId: '1',
        storageKey: 'listings/1/media-1.png',
        mimeType: 'image/png',
        fileSize: '128',
        width: 300,
        height: 200,
        hash: null,
        position: 1,
        isPrimary: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]),
    findListingMediaById: vi.fn(async () => ({
      id: 'media-1',
      listingId: '1',
      storageKey: 'listings/1/media-1.png',
      mimeType: 'image/png',
      fileSize: '128',
      width: 300,
      height: 200,
      hash: null,
      position: 1,
      isPrimary: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
    deleteListingMediaById: vi.fn(async () => ({
      id: 'media-1',
      listingId: '1',
      storageKey: 'listings/1/media-1.png',
      mimeType: 'image/png',
      fileSize: '128',
      width: 300,
      height: 200,
      hash: null,
      position: 1,
      isPrimary: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
    reorderListingMediaPositions: vi.fn(async () => [
      {
        id: 'media-2',
        listingId: '1',
        storageKey: 'listings/1/media-2.png',
        mimeType: 'image/png',
        fileSize: '256',
        width: 320,
        height: 240,
        hash: null,
        position: 1,
        isPrimary: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'media-1',
        listingId: '1',
        storageKey: 'listings/1/media-1.png',
        mimeType: 'image/png',
        fileSize: '128',
        width: 300,
        height: 200,
        hash: null,
        position: 2,
        isPrimary: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]),
  };

  const minioStorageServiceMock = {
    uploadListingMedia: vi.fn(async () => ({
      bucket: 'listing-originals',
      storageKey: 'listings/1/media-1.png',
      fileSize: 128,
      mimeType: 'image/png',
      objectUrl: 'http://localhost:9000/listing-originals/listings/1/media-1.png',
    })),
    deleteMediaObject: vi.fn(async () => undefined),
    getListingMediaObjectUrl: vi.fn(
      (storageKey: string) => `http://localhost:9000/listing-originals/${storageKey}`,
    ),
  };

  const service = new ListingsService(
    listingsRepositoryMock as never,
    minioStorageServiceMock as never,
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates listing and always forces pending_review status', async () => {
    const listing = await service.createForUser(baseUser, {
      title: 'Micio in adozione',
      description: 'Descrizione test',
      listingType: 'adozione',
      priceAmount: null,
      currency: 'EUR',
      ageText: '2 anni',
      sex: 'maschio',
      breed: null,
      status: 'published',
      regionId: '1',
      provinceId: '11',
      comuneId: '101',
      contactName: null,
      contactPhone: null,
      contactEmail: null,
    });

    expect(listingsRepositoryMock.upsertOwnerUser).toHaveBeenCalledWith(baseUser);
    expect(listingsRepositoryMock.createListing).toHaveBeenCalledWith(
      '10',
      expect.objectContaining({
        status: 'pending_review',
        publishedAt: undefined,
        archivedAt: undefined,
      }),
    );
    expect(listing.status).toBe('pending_review');
    expect(listing.publishedAt).toBeNull();
  });

  it('lists current user listings', async () => {
    const listings = await service.listForUser(baseUser);

    expect(listingsRepositoryMock.upsertOwnerUser).toHaveBeenCalledWith(baseUser);
    expect(listingsRepositoryMock.listMine).toHaveBeenCalledWith('10');
    expect(listings).toHaveLength(1);
  });

  it('updates listing and auto-fills archivedAt when status is archived', async () => {
    const listing = await service.updateForUser(baseUser, '1', {
      status: 'archived',
    });

    expect(listingsRepositoryMock.updateMine).toHaveBeenCalledWith(
      '10',
      '1',
      expect.objectContaining({
        status: 'archived',
        archivedAt: expect.any(String),
      }),
    );
    expect(listing?.status).toBe('archived');
  });

  it('archives listing via soft delete', async () => {
    const listing = await service.archiveForUser(baseUser, '1');

    expect(listingsRepositoryMock.softDeleteMine).toHaveBeenCalledWith('10', '1');
    expect(listing?.status).toBe('archived');
    expect(listing?.deletedAt).toEqual(expect.any(String));
  });

  it('uploads listing media and stores DB reference', async () => {
    const mediaPayload: UploadListingMediaInput = {
      mimeType: 'image/png',
      payload: Buffer.from('media'),
      originalFileName: 'cat.png',
      width: 300,
      height: 200,
      hash: null,
      position: null,
      isPrimary: true,
    };

    const media = await service.uploadMediaForUser(baseUser, '1', mediaPayload);

    expect(minioStorageServiceMock.uploadListingMedia).toHaveBeenCalledWith({
      listingId: '1',
      mimeType: 'image/png',
      payload: mediaPayload.payload,
      originalFileName: 'cat.png',
    });
    expect(listingsRepositoryMock.clearPrimaryMedia).toHaveBeenCalledWith('1');
    expect(listingsRepositoryMock.createListingMedia).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({
        storageKey: 'listings/1/media-1.png',
        mimeType: 'image/png',
        position: 4,
        isPrimary: true,
      }),
    );
    expect(media?.objectUrl).toContain('/listing-originals/');
  });

  it('lists listing media for owner', async () => {
    const media = await service.listMediaForUser(baseUser, '1');

    expect(listingsRepositoryMock.listMediaByListingId).toHaveBeenCalledWith('1');
    expect(media).toHaveLength(1);
    expect(media?.[0]?.objectUrl).toContain('/listing-originals/listings/1/media-1.png');
  });

  it('deletes listing media for owner and cleans MinIO object', async () => {
    const media = await service.deleteMediaForUser(baseUser, '1', 'media-1');

    expect(listingsRepositoryMock.deleteListingMediaById).toHaveBeenCalledWith('1', 'media-1');
    expect(minioStorageServiceMock.deleteMediaObject).toHaveBeenCalledWith(
      'listings/1/media-1.png',
    );
    expect(media?.id).toBe('media-1');
  });

  it('reorders listing media positions', async () => {
    listingsRepositoryMock.listMediaByListingId.mockResolvedValueOnce([
      {
        id: 'media-1',
        listingId: '1',
        storageKey: 'listings/1/media-1.png',
        mimeType: 'image/png',
        fileSize: '128',
        width: 300,
        height: 200,
        hash: null,
        position: 1,
        isPrimary: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'media-2',
        listingId: '1',
        storageKey: 'listings/1/media-2.png',
        mimeType: 'image/png',
        fileSize: '256',
        width: 320,
        height: 240,
        hash: null,
        position: 2,
        isPrimary: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    const reordered = await service.reorderMediaForUser(baseUser, '1', ['media-2', 'media-1']);

    expect(listingsRepositoryMock.reorderListingMediaPositions).toHaveBeenCalledWith('1', [
      'media-2',
      'media-1',
    ]);
    expect(reordered?.[0]?.id).toBe('media-2');
    expect(reordered?.[0]?.position).toBe(1);
  });
});
