import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { AnalyticsRepository, type CreateAnalyticsEventInput } from './analytics.repository';
import type {
  AnalyticsEventRecord,
  AnalyticsEventType,
  AnalyticsKpiSnapshot,
  PublicAnalyticsEventType,
} from './models/analytics.model';

type TrackSystemEventInput = {
  eventType: AnalyticsEventType;
  actor: RequestUser | null;
  listingId?: string | null;
  source: string;
  metadata?: Record<string, unknown>;
};

type TrackPublicEventInput = {
  eventType: PublicAnalyticsEventType;
  listingId: string;
  source: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @Inject(AnalyticsRepository)
    private readonly analyticsRepository: AnalyticsRepository,
  ) {}

  async trackSystemEvent(input: TrackSystemEventInput): Promise<AnalyticsEventRecord> {
    const actorUserId = input.actor
      ? await this.analyticsRepository.upsertActorUser(input.actor)
      : null;

    const normalizedListingId = this.normalizeOptionalListingId(input.listingId ?? null);
    const payload: CreateAnalyticsEventInput = {
      eventType: input.eventType,
      actorUserId,
      listingId: normalizedListingId,
      source: this.normalizeSource(input.source),
      metadata: input.metadata ?? {},
    };

    return this.analyticsRepository.createEvent(payload);
  }

  async trackPublicEvent(input: TrackPublicEventInput): Promise<AnalyticsEventRecord> {
    const normalizedListingId = this.normalizeRequiredListingId(input.listingId, 'listingId');
    const listingId = await this.analyticsRepository.findPublishedListingId(normalizedListingId);
    if (!listingId) {
      throw new NotFoundException('Listing not found.');
    }

    return this.analyticsRepository.createEvent({
      eventType: input.eventType,
      actorUserId: null,
      listingId,
      source: this.normalizeSource(input.source),
      metadata: input.metadata ?? {},
    });
  }

  async getAdminKpis(windowDays: number): Promise<AnalyticsKpiSnapshot> {
    const normalizedWindowDays = this.normalizeWindowDays(windowDays);
    const now = new Date();
    const fromDate = new Date(now.getTime() - normalizedWindowDays * 24 * 60 * 60 * 1000);

    const fromIso = fromDate.toISOString();
    const toIso = now.toISOString();

    const [metrics, moderation] = await Promise.all([
      this.analyticsRepository.getKpiAggregate(fromIso, toIso),
      this.analyticsRepository.getModerationAggregate(fromIso, toIso),
    ]);

    return {
      windowDays: normalizedWindowDays,
      from: fromIso,
      to: toIso,
      metrics,
      moderation,
      funnel: {
        listingCreated: metrics.listingCreated,
        listingPublished: metrics.listingPublished,
        contactClicked: metrics.contactClicked,
        contactSent: metrics.contactSent,
        publishRatePct: this.computeRate(metrics.listingPublished, metrics.listingCreated),
        contactFromPublishedRatePct: this.computeRate(
          metrics.contactSent,
          metrics.listingPublished,
        ),
        contactClickToSendRatePct: this.computeRate(metrics.contactSent, metrics.contactClicked),
      },
      derived: {
        fallbackRatePct: this.computeRate(metrics.searchFallbackApplied, metrics.searchPerformed),
        contactRatePct: this.computeRate(metrics.contactSent, metrics.listingView),
        publishRatePct: this.computeRate(metrics.listingPublished, metrics.listingCreated),
      },
    };
  }

  async trackSystemEventSafe(input: TrackSystemEventInput): Promise<void> {
    try {
      await this.trackSystemEvent(input);
    } catch (error) {
      this.logger.warn(
        `Analytics event "${input.eventType}" not tracked: ${(error as Error).message}`,
      );
    }
  }

  private normalizeSource(rawSource: string): string {
    const normalized = rawSource.trim().toLowerCase();
    if (!normalized) {
      throw new BadRequestException('Field "source" cannot be empty.');
    }

    if (normalized.length > 60) {
      throw new BadRequestException('Field "source" exceeds maximum length (60 characters).');
    }

    return normalized;
  }

  private normalizeWindowDays(rawWindowDays: number): number {
    if (!Number.isFinite(rawWindowDays) || rawWindowDays < 1 || rawWindowDays > 365) {
      throw new BadRequestException(
        'Query param "windowDays" must be an integer between 1 and 365.',
      );
    }

    return Math.trunc(rawWindowDays);
  }

  private normalizeRequiredListingId(rawValue: string, fieldName: string): string {
    const normalized = rawValue.trim();
    if (!/^[1-9]\d*$/.test(normalized)) {
      throw new BadRequestException(`Field "${fieldName}" must be a positive integer.`);
    }

    return normalized;
  }

  private normalizeOptionalListingId(rawValue: string | null): string | null {
    if (!rawValue) {
      return null;
    }

    return this.normalizeRequiredListingId(rawValue, 'listingId');
  }

  private computeRate(numerator: number, denominator: number): number {
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
      return 0;
    }

    return Number.parseFloat(((numerator / denominator) * 100).toFixed(1));
  }
}
