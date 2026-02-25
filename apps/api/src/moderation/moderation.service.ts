import { BadRequestException, ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { AnalyticsService } from '../analytics/analytics.service';
import type { AnalyticsEventType } from '../analytics/models/analytics.model';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import type { ListingStatus } from '../listings/models/listing.model';
import { SearchIndexService } from '../listings/search-index.service';
import type {
  ModerationAction,
  ModerationActionResult,
  ModerationQueueItem,
} from './models/moderation.model';
import { ModerationRepository } from './moderation.repository';

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    @Inject(ModerationRepository)
    private readonly moderationRepository: ModerationRepository,
    @Inject(SearchIndexService)
    private readonly searchIndexService: SearchIndexService,
    @Inject(AnalyticsService)
    private readonly analyticsService: AnalyticsService,
  ) {}

  async listPendingQueue(limit: number): Promise<ModerationQueueItem[]> {
    return this.moderationRepository.listPendingQueue(limit);
  }

  async moderateListing(
    actor: RequestUser,
    listingId: string,
    action: ModerationAction,
    reason: string,
  ): Promise<ModerationActionResult | null> {
    const listing = await this.moderationRepository.findListingById(listingId);
    if (!listing) {
      return null;
    }

    const targetStatus = this.resolveTargetStatus(action, listing.status);
    const actorUserId = await this.moderationRepository.upsertActorUser(actor);

    const result = await this.moderationRepository.applyModerationAction({
      actorUserId,
      listingId,
      action,
      reason,
      fromStatus: listing.status,
      toStatus: targetStatus,
      metadata: {
        actorProvider: actor.provider,
        actorSubject: actor.providerSubject,
        actorRoles: actor.roles,
      },
    });

    if (!result) {
      throw new ConflictException(
        'Listing status changed during moderation. Refresh queue and retry the action.',
      );
    }

    await this.syncListingSearchIndex(result.listing.id, result.listing.status);
    if (
      result.listing.status === 'published' &&
      result.auditLog.toStatus === 'published' &&
      result.auditLog.fromStatus !== 'published'
    ) {
      await this.trackAnalyticsEvent({
        eventType: 'listing_published',
        actor,
        listingId: result.listing.id,
        source: 'api_moderation_action',
        metadata: {
          action,
          fromStatus: result.auditLog.fromStatus,
          toStatus: result.auditLog.toStatus,
        },
      });
    }

    return result;
  }

  private resolveTargetStatus(
    action: ModerationAction,
    currentStatus: ListingStatus,
  ): ListingStatus {
    if (currentStatus === 'archived') {
      throw new BadRequestException('Cannot moderate archived listings.');
    }

    if (action === 'approve') {
      if (currentStatus !== 'pending_review') {
        throw new BadRequestException(
          `Cannot approve listing with status "${currentStatus}". Expected "pending_review".`,
        );
      }
      return 'published';
    }

    if (action === 'reject') {
      if (currentStatus !== 'pending_review') {
        throw new BadRequestException(
          `Cannot reject listing with status "${currentStatus}". Expected "pending_review".`,
        );
      }
      return 'rejected';
    }

    if (action === 'suspend') {
      if (currentStatus !== 'published') {
        throw new BadRequestException(
          `Cannot suspend listing with status "${currentStatus}". Expected "published".`,
        );
      }
      return 'suspended';
    }

    if (action === 'restore') {
      if (currentStatus === 'suspended') {
        return 'published';
      }

      if (currentStatus === 'rejected') {
        return 'pending_review';
      }

      throw new BadRequestException(
        `Cannot restore listing with status "${currentStatus}". Expected "suspended" or "rejected".`,
      );
    }

    throw new BadRequestException(`Unsupported moderation action "${action}".`);
  }

  private async syncListingSearchIndex(listingId: string, status: ListingStatus): Promise<void> {
    try {
      if (status === 'published') {
        await this.searchIndexService.indexPublishedListingById(listingId);
        return;
      }

      await this.searchIndexService.removeListingById(listingId);
    } catch (error) {
      this.logger.warn(
        `OpenSearch sync skipped for moderated listing ${listingId}: ${(error as Error).message}`,
      );
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
}
