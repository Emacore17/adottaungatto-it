import { createHash } from 'node:crypto';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AnalyticsService } from '../analytics/analytics.service';
import type { AnalyticsEventType } from '../analytics/models/analytics.model';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import type { SearchListingsQueryDto } from './dto/search-listings-query.dto';
import {
  ListingsRepository,
  type LocationCentroid,
  type PublicListingDetailRecord,
  type PublicListingSummaryRecord,
  type SearchPublishedResultRecord,
} from './listings.repository';
import { MinioStorageService } from './minio-storage.service';
import type { ListingMediaView, UploadListingMediaInput } from './models/listing-media.model';
import type { ListingMediaRecord } from './models/listing-media.model';
import type {
  ContactListingContext,
  ContactListingInput,
  ContactListingResult,
  CreateListingInput,
  ListingRecord,
  PublicListingDetail,
  PublicListingSummary,
  SearchListingsPage,
  UpdateListingInput,
} from './models/listing.model';
import { SearchFallbackService } from './search-fallback.service';
import { SearchIndexService } from './search-index.service';

@Injectable()
export class ListingsService {
  private readonly logger = new Logger(ListingsService.name);
  private readonly contactRateLimitWindowMinutes = 15;
  private readonly contactRateLimitMaxRequests = 3;
  private readonly contactDuplicateWindowHours = 24;

  constructor(
    @Inject(ListingsRepository)
    private readonly listingsRepository: ListingsRepository,
    @Inject(MinioStorageService)
    private readonly minioStorageService: MinioStorageService,
    @Inject(SearchIndexService)
    private readonly searchIndexService: SearchIndexService,
    @Inject(SearchFallbackService)
    private readonly searchFallbackService: SearchFallbackService,
    @Inject(AnalyticsService)
    private readonly analyticsService: AnalyticsService,
  ) {}

  async createForUser(user: RequestUser, input: CreateListingInput): Promise<ListingRecord> {
    const ownerUserId = await this.listingsRepository.upsertOwnerUser(user);

    const normalizedInput: CreateListingInput = {
      ...input,
      status: 'pending_review',
      publishedAt: undefined,
      archivedAt: undefined,
    };

    const listing = await this.listingsRepository.createListing(ownerUserId, normalizedInput);
    await this.trackAnalyticsEvent({
      eventType: 'listing_created',
      actor: user,
      listingId: listing.id,
      source: 'api_listings_create',
      metadata: {
        status: listing.status,
        listingType: listing.listingType,
      },
    });

    return listing;
  }

  async listForUser(user: RequestUser): Promise<ListingRecord[]> {
    const ownerUserId = await this.listingsRepository.upsertOwnerUser(user);
    return this.listingsRepository.listMine(ownerUserId);
  }

  async listPublished(limit: number, offset: number): Promise<PublicListingSummary[]> {
    const listings = await this.listingsRepository.listPublished(limit, offset);
    return listings.map((listing) => this.toPublicSummary(listing));
  }

  async getPublishedById(listingId: string): Promise<PublicListingDetail | null> {
    const listing = await this.listingsRepository.findPublishedById(listingId);
    if (!listing) {
      return null;
    }

    await this.trackAnalyticsEvent({
      eventType: 'listing_view',
      actor: null,
      listingId,
      source: 'api_listings_public_detail',
      metadata: {
        province: listing.provinceSigla,
        listingType: listing.listingType,
      },
    });

    return this.toPublicDetail(listing);
  }

  async submitPublicContactRequest(
    listingId: string,
    input: ContactListingInput,
    context: ContactListingContext,
  ): Promise<ContactListingResult | null> {
    const target = await this.listingsRepository.findPublishedContactTarget(listingId);
    if (!target) {
      return null;
    }

    if (!target.contactEmail && !target.contactPhone) {
      throw new BadRequestException('Listing contact channels are unavailable.');
    }

    this.ensureContactMessageNotSpam(input.message);

    const now = new Date();
    const senderIp = context.senderIp ? context.senderIp.trim() : null;
    const userAgent = context.userAgent ? context.userAgent.trim() : null;

    if (senderIp) {
      const rateLimitWindowFrom = new Date(
        now.getTime() - this.contactRateLimitWindowMinutes * 60 * 1000,
      ).toISOString();
      const recentRequests = await this.listingsRepository.countRecentContactRequestsByIp(
        listingId,
        senderIp,
        rateLimitWindowFrom,
      );
      if (recentRequests >= this.contactRateLimitMaxRequests) {
        throw new HttpException(
          `Contact rate limit exceeded. Retry in ${this.contactRateLimitWindowMinutes} minutes.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const messageHash = this.hashMessageFingerprint(input.message);
    const duplicateWindowFrom = new Date(
      now.getTime() - this.contactDuplicateWindowHours * 60 * 60 * 1000,
    ).toISOString();
    const duplicateRequests = await this.listingsRepository.countRecentDuplicateContactRequests(
      listingId,
      input.senderEmail,
      messageHash,
      duplicateWindowFrom,
    );
    if (duplicateRequests > 0) {
      throw new HttpException(
        'Duplicate contact request detected. Retry later with a new message.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const createdRequest = await this.listingsRepository.createContactRequest(listingId, {
      senderName: input.senderName,
      senderEmail: input.senderEmail,
      senderPhone: input.senderPhone,
      message: input.message,
      source: input.source,
      messageHash,
      senderIp,
      userAgent,
      metadata: {
        hasAdvertiserEmail: Boolean(target.contactEmail),
        hasAdvertiserPhone: Boolean(target.contactPhone),
      },
    });

    await this.trackAnalyticsEvent({
      eventType: 'contact_sent',
      actor: null,
      listingId,
      source: 'api_listings_contact',
      metadata: {
        channel: 'form',
        hasSenderPhone: Boolean(input.senderPhone),
        hasAdvertiserEmail: Boolean(target.contactEmail),
        hasAdvertiserPhone: Boolean(target.contactPhone),
      },
    });

    return {
      requestId: createdRequest.id,
      listingId: createdRequest.listingId,
      createdAt: createdRequest.createdAt,
      confirmationMessage:
        "Richiesta inviata con successo. L'inserzionista ti contattera tramite i recapiti indicati.",
    };
  }

  async searchPublic(query: SearchListingsQueryDto): Promise<SearchListingsPage> {
    const fallbackSearch = await this.searchFallbackService.searchWithFallback(query, (nextQuery) =>
      this.executeSearchWithTechnicalFallback(nextQuery),
    );
    const effectiveReferencePoint = await this.listingsRepository.resolveLocationCentroid(
      fallbackSearch.metadata.effectiveLocationIntent,
    );

    const items = fallbackSearch.result.items.map((listing) =>
      this.toPublicSummary(listing, effectiveReferencePoint),
    );
    await this.trackAnalyticsEvent({
      eventType: 'search_performed',
      actor: null,
      source: 'api_listings_search',
      metadata: {
        hasQueryText: Boolean(query.queryText),
        sort: query.sort,
        locationScope: query.locationIntent?.scope ?? 'italy',
        total: fallbackSearch.result.total,
        fallbackApplied: fallbackSearch.metadata.fallbackApplied,
      },
    });

    if (fallbackSearch.metadata.fallbackApplied) {
      await this.trackAnalyticsEvent({
        eventType: 'search_fallback_applied',
        actor: null,
        source: 'api_listings_search_fallback',
        metadata: {
          fallbackLevel: fallbackSearch.metadata.fallbackLevel,
          fallbackReason: fallbackSearch.metadata.fallbackReason,
          requestedScope: fallbackSearch.metadata.requestedLocationIntent?.scope ?? null,
          effectiveScope: fallbackSearch.metadata.effectiveLocationIntent?.scope ?? null,
        },
      });
    }

    return {
      items,
      pagination: {
        limit: query.limit,
        offset: query.offset,
        total: fallbackSearch.result.total,
        hasMore: query.offset + items.length < fallbackSearch.result.total,
      },
      metadata: fallbackSearch.metadata,
    };
  }

  async updateForUser(
    user: RequestUser,
    listingId: string,
    input: UpdateListingInput,
  ): Promise<ListingRecord | null> {
    const ownerUserId = await this.listingsRepository.upsertOwnerUser(user);
    const previousListing = await this.listingsRepository.findMineById(ownerUserId, listingId);
    if (!previousListing) {
      return null;
    }

    const normalizedInput = { ...input };

    if (normalizedInput.status === 'published' && normalizedInput.publishedAt === undefined) {
      normalizedInput.publishedAt = new Date().toISOString();
    }

    if (normalizedInput.status === 'archived' && normalizedInput.archivedAt === undefined) {
      normalizedInput.archivedAt = new Date().toISOString();
    }

    const updatedListing = await this.listingsRepository.updateMine(
      ownerUserId,
      listingId,
      normalizedInput,
    );
    if (!updatedListing) {
      return null;
    }

    await this.syncListingSearchIndex(updatedListing);
    if (updatedListing.status === 'published' && previousListing.status !== 'published') {
      await this.trackAnalyticsEvent({
        eventType: 'listing_published',
        actor: user,
        listingId: updatedListing.id,
        source: 'api_listings_update',
        metadata: {
          fromStatus: previousListing.status,
          toStatus: updatedListing.status,
        },
      });
    }

    return updatedListing;
  }

  async archiveForUser(user: RequestUser, listingId: string): Promise<ListingRecord | null> {
    const ownerUserId = await this.listingsRepository.upsertOwnerUser(user);
    const archivedListing = await this.listingsRepository.softDeleteMine(ownerUserId, listingId);
    if (!archivedListing) {
      return null;
    }

    await this.syncListingSearchIndex(archivedListing);
    return archivedListing;
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

  private toPublicSummary(
    listing: PublicListingSummaryRecord,
    referencePoint: LocationCentroid | null = null,
  ): PublicListingSummary {
    const primaryMedia = listing.primaryMedia;
    const distanceKm = this.computeListingDistanceKm(listing, referencePoint);

    return {
      id: listing.id,
      title: listing.title,
      description: listing.description,
      listingType: listing.listingType,
      priceAmount: listing.priceAmount,
      currency: listing.currency,
      ageText: listing.ageText,
      sex: listing.sex,
      breed: listing.breed,
      publishedAt: listing.publishedAt,
      createdAt: listing.createdAt,
      regionName: listing.regionName,
      provinceName: listing.provinceName,
      provinceSigla: listing.provinceSigla,
      comuneName: listing.comuneName,
      distanceKm,
      mediaCount: listing.mediaCount,
      primaryMedia: primaryMedia
        ? {
            id: primaryMedia.id,
            mimeType: primaryMedia.mimeType,
            width: primaryMedia.width,
            height: primaryMedia.height,
            position: primaryMedia.position,
            isPrimary: primaryMedia.isPrimary,
            objectUrl: this.minioStorageService.getListingMediaObjectUrl(primaryMedia.storageKey),
          }
        : null,
    };
  }

  private toPublicDetail(listing: PublicListingDetailRecord): PublicListingDetail {
    const summary = this.toPublicSummary(listing);

    return {
      ...summary,
      contactName: listing.contactName,
      contactPhone: listing.contactPhone,
      contactEmail: listing.contactEmail,
      media: listing.media.map((media) => ({
        id: media.id,
        mimeType: media.mimeType,
        width: media.width,
        height: media.height,
        position: media.position,
        isPrimary: media.isPrimary,
        objectUrl: this.minioStorageService.getListingMediaObjectUrl(media.storageKey),
      })),
    };
  }

  private async syncListingSearchIndex(listing: ListingRecord): Promise<void> {
    try {
      if (listing.status === 'published') {
        await this.searchIndexService.indexPublishedListingById(listing.id);
        return;
      }

      await this.searchIndexService.removeListingById(listing.id);
    } catch (error) {
      this.logger.warn(
        `OpenSearch sync skipped for listing ${listing.id}: ${(error as Error).message}`,
      );
    }
  }

  private computeListingDistanceKm(
    listing: PublicListingSummaryRecord,
    referencePoint: LocationCentroid | null,
  ): number | null {
    if (!referencePoint || listing.comuneCentroidLat == null || listing.comuneCentroidLng == null) {
      return null;
    }

    const distanceInKilometers = this.haversineDistanceKm(
      referencePoint.lat,
      referencePoint.lon,
      listing.comuneCentroidLat,
      listing.comuneCentroidLng,
    );

    return Number.isFinite(distanceInKilometers)
      ? Number.parseFloat(distanceInKilometers.toFixed(1))
      : null;
  }

  private haversineDistanceKm(latA: number, lonA: number, latB: number, lonB: number): number {
    const toRadians = (value: number) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRadians(latB - latA);
    const dLon = toRadians(lonB - lonA);
    const radLatA = toRadians(latA);
    const radLatB = toRadians(latB);

    const haversineValue =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(radLatA) * Math.cos(radLatB);
    const angularDistance =
      2 * Math.atan2(Math.sqrt(haversineValue), Math.sqrt(1 - haversineValue));

    return earthRadiusKm * angularDistance;
  }

  private async executeSearchWithTechnicalFallback(
    query: SearchListingsQueryDto,
  ): Promise<SearchPublishedResultRecord> {
    try {
      return await this.searchIndexService.searchPublished(query);
    } catch (error) {
      this.logger.warn(
        `OpenSearch search unavailable, falling back to Postgres search: ${(error as Error).message}`,
      );
      return this.listingsRepository.searchPublished(query);
    }
  }

  private async trackAnalyticsEvent(input: {
    eventType: AnalyticsEventType;
    actor: RequestUser | null;
    listingId?: string | null;
    source: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.analyticsService.trackSystemEventSafe({
      eventType: input.eventType,
      actor: input.actor,
      listingId: input.listingId ?? null,
      source: input.source,
      metadata: input.metadata,
    });
  }

  private hashMessageFingerprint(message: string): string {
    return createHash('sha256').update(message.trim().toLowerCase()).digest('hex');
  }

  private ensureContactMessageNotSpam(message: string): void {
    const urlOccurrences = message.match(/https?:\/\//gi)?.length ?? 0;
    if (urlOccurrences > 2) {
      throw new BadRequestException('Field "message" contains too many links.');
    }

    const alphanumericCharacters = message.match(/[a-z0-9]/gi)?.length ?? 0;
    if (alphanumericCharacters < 10) {
      throw new BadRequestException('Field "message" must contain more meaningful content.');
    }
  }
}
