import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { ListingsRepository } from './listings.repository';
import { MinioStorageService } from './minio-storage.service';
import type { ListingMediaView, UploadListingMediaInput } from './models/listing-media.model';
import type { ListingMediaRecord } from './models/listing-media.model';
import type { CreateListingInput, ListingRecord, UpdateListingInput } from './models/listing.model';

@Injectable()
export class ListingsService {
  constructor(
    @Inject(ListingsRepository)
    private readonly listingsRepository: ListingsRepository,
    @Inject(MinioStorageService)
    private readonly minioStorageService: MinioStorageService,
  ) {}

  async createForUser(user: RequestUser, input: CreateListingInput): Promise<ListingRecord> {
    const ownerUserId = await this.listingsRepository.upsertOwnerUser(user);

    const normalizedInput: CreateListingInput = {
      ...input,
      status: 'pending_review',
      publishedAt: undefined,
      archivedAt: undefined,
    };

    return this.listingsRepository.createListing(ownerUserId, normalizedInput);
  }

  async listForUser(user: RequestUser): Promise<ListingRecord[]> {
    const ownerUserId = await this.listingsRepository.upsertOwnerUser(user);
    return this.listingsRepository.listMine(ownerUserId);
  }

  async updateForUser(
    user: RequestUser,
    listingId: string,
    input: UpdateListingInput,
  ): Promise<ListingRecord | null> {
    const ownerUserId = await this.listingsRepository.upsertOwnerUser(user);
    const normalizedInput = { ...input };

    if (normalizedInput.status === 'published' && normalizedInput.publishedAt === undefined) {
      normalizedInput.publishedAt = new Date().toISOString();
    }

    if (normalizedInput.status === 'archived' && normalizedInput.archivedAt === undefined) {
      normalizedInput.archivedAt = new Date().toISOString();
    }

    return this.listingsRepository.updateMine(ownerUserId, listingId, normalizedInput);
  }

  async archiveForUser(user: RequestUser, listingId: string): Promise<ListingRecord | null> {
    const ownerUserId = await this.listingsRepository.upsertOwnerUser(user);
    return this.listingsRepository.softDeleteMine(ownerUserId, listingId);
  }

  async uploadMediaForUser(
    user: RequestUser,
    listingId: string,
    input: UploadListingMediaInput,
  ): Promise<ListingMediaView | null> {
    const ownerUserId = await this.listingsRepository.upsertOwnerUser(user);
    const listing = await this.listingsRepository.findMineById(ownerUserId, listingId);
    if (!listing) {
      return null;
    }

    const uploadResult = await this.minioStorageService.uploadListingMedia({
      listingId,
      mimeType: input.mimeType,
      payload: input.payload,
      originalFileName: input.originalFileName,
    });

    const targetPosition =
      input.position ?? (await this.listingsRepository.getNextMediaPosition(listingId));

    try {
      if (input.isPrimary) {
        await this.listingsRepository.clearPrimaryMedia(listingId);
      }

      const media = await this.listingsRepository.createListingMedia(listingId, {
        storageKey: uploadResult.storageKey,
        mimeType: uploadResult.mimeType,
        fileSize: uploadResult.fileSize,
        width: input.width,
        height: input.height,
        hash: input.hash,
        position: targetPosition,
        isPrimary: input.isPrimary,
      });

      return {
        ...media,
        objectUrl: uploadResult.objectUrl,
      };
    } catch (error) {
      await this.minioStorageService.deleteMediaObject(uploadResult.storageKey);
      throw error;
    }
  }

  async listMediaForUser(user: RequestUser, listingId: string): Promise<ListingMediaView[] | null> {
    const ownerUserId = await this.listingsRepository.upsertOwnerUser(user);
    const listing = await this.listingsRepository.findMineById(ownerUserId, listingId);
    if (!listing) {
      return null;
    }

    const media = await this.listingsRepository.listMediaByListingId(listingId);
    return media.map((item) => this.toMediaView(item));
  }

  async deleteMediaForUser(
    user: RequestUser,
    listingId: string,
    mediaId: string,
  ): Promise<ListingMediaView | null> {
    const ownerUserId = await this.listingsRepository.upsertOwnerUser(user);
    const listing = await this.listingsRepository.findMineById(ownerUserId, listingId);
    if (!listing) {
      return null;
    }

    const media = await this.listingsRepository.deleteListingMediaById(listingId, mediaId);
    if (!media) {
      throw new NotFoundException('Listing media not found.');
    }

    await this.minioStorageService.deleteMediaObject(media.storageKey);
    return this.toMediaView(media);
  }

  async reorderMediaForUser(
    user: RequestUser,
    listingId: string,
    orderedMediaIds: string[],
  ): Promise<ListingMediaView[] | null> {
    const ownerUserId = await this.listingsRepository.upsertOwnerUser(user);
    const listing = await this.listingsRepository.findMineById(ownerUserId, listingId);
    if (!listing) {
      return null;
    }

    const media = await this.listingsRepository.listMediaByListingId(listingId);
    if (media.length === 0) {
      throw new BadRequestException('Listing has no media to reorder.');
    }

    const existingIds = new Set(media.map((item) => item.id));
    const hasMismatchedLength = orderedMediaIds.length !== media.length;
    const hasUnknownId = orderedMediaIds.some((mediaId) => !existingIds.has(mediaId));
    if (hasMismatchedLength || hasUnknownId) {
      throw new BadRequestException(
        'Field "mediaIds" must include every listing media id exactly once.',
      );
    }

    let reordered: ListingMediaRecord[];
    try {
      reordered = await this.listingsRepository.reorderListingMediaPositions(
        listingId,
        orderedMediaIds,
      );
    } catch (error) {
      if ((error as Error).message.includes('reorder payload mismatch')) {
        throw new BadRequestException(
          'Field "mediaIds" must include every listing media id exactly once.',
        );
      }

      throw error;
    }

    return reordered.map((item) => this.toMediaView(item));
  }

  private toMediaView(item: ListingMediaRecord): ListingMediaView {
    return {
      ...item,
      objectUrl: this.minioStorageService.getListingMediaObjectUrl(item.storageKey),
    };
  }
}
