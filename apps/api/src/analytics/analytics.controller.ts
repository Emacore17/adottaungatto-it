import { BadRequestException, Body, Controller, Get, Inject, Post, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/roles.enum';
import { AnalyticsService } from './analytics.service';
import { publicAnalyticsEventTypeValues } from './models/analytics.model';

const publicEventTypesSet = new Set<string>(publicAnalyticsEventTypeValues);
const metadataTopLevelAllowedKeys = new Set<string>([
  'channel',
  'surface',
  'placement',
  'campaign',
  'referrer',
  'queryText',
  'locationScope',
  'listingType',
  'sort',
  'device',
  'page',
  'cta',
  'sessionId',
  'experiment',
  'variant',
]);
const metadataMaxDepth = 3;
const metadataMaxEntries = 24;
const metadataMaxStringLength = 180;
const metadataMaxSerializedBytes = 2_048;

const asRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BadRequestException('Request body must be a JSON object.');
  }

  return value as Record<string, unknown>;
};

const normalizeMetadataValue = (
  value: unknown,
  path: string,
  depth: number,
  context: { entries: number },
): unknown => {
  if (value === null) {
    return null;
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    if (normalized.length > metadataMaxStringLength) {
      throw new BadRequestException(
        `Field "${path}" exceeds maximum length (${metadataMaxStringLength}).`,
      );
    }

    return normalized;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new BadRequestException(`Field "${path}" must be a finite number.`);
    }

    return value;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    throw new BadRequestException(`Field "${path}" must not be an array.`);
  }

  if (typeof value !== 'object') {
    throw new BadRequestException(
      `Field "${path}" contains an unsupported value type (${typeof value}).`,
    );
  }

  if (depth > metadataMaxDepth) {
    throw new BadRequestException(`Field "${path}" exceeds maximum depth (${metadataMaxDepth}).`);
  }

  const source = value as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};

  for (const [rawKey, childValue] of Object.entries(source)) {
    const key = rawKey.trim();
    if (!key || !/^[a-zA-Z0-9_]{1,40}$/.test(key)) {
      throw new BadRequestException(
        `Field "${path}.${rawKey}" has an invalid key name (allowed: [a-zA-Z0-9_], 1..40).`,
      );
    }

    context.entries += 1;
    if (context.entries > metadataMaxEntries) {
      throw new BadRequestException(
        `Field "metadata" exceeds maximum number of entries (${metadataMaxEntries}).`,
      );
    }

    normalized[key] = normalizeMetadataValue(childValue, `${path}.${key}`, depth + 1, context);
  }

  return normalized;
};

const parseMetadata = (value: unknown): Record<string, unknown> | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Field "metadata" must be an object.');
  }

  const source = value as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};
  const context = { entries: 0 };

  for (const [rawKey, childValue] of Object.entries(source)) {
    const key = rawKey.trim();
    if (!metadataTopLevelAllowedKeys.has(key)) {
      throw new BadRequestException(
        `Field "metadata.${rawKey}" is not allowed. Allowed keys: ${Array.from(
          metadataTopLevelAllowedKeys,
        ).join(', ')}.`,
      );
    }

    context.entries += 1;
    if (context.entries > metadataMaxEntries) {
      throw new BadRequestException(
        `Field "metadata" exceeds maximum number of entries (${metadataMaxEntries}).`,
      );
    }

    normalized[key] = normalizeMetadataValue(childValue, `metadata.${key}`, 1, context);
  }

  const serializedSizeBytes = Buffer.byteLength(JSON.stringify(normalized), 'utf8');
  if (serializedSizeBytes > metadataMaxSerializedBytes) {
    throw new BadRequestException(
      `Field "metadata" exceeds maximum size (${metadataMaxSerializedBytes} bytes).`,
    );
  }

  return normalized;
};

const parsePublicEventPayload = (
  body: unknown,
): {
  eventType: (typeof publicAnalyticsEventTypeValues)[number];
  listingId: string;
  source: string;
  metadata?: Record<string, unknown>;
} => {
  const source = asRecord(body);
  if (typeof source.eventType !== 'string') {
    throw new BadRequestException('Field "eventType" is required and must be a string.');
  }

  const eventType = source.eventType.trim().toLowerCase();
  if (!publicEventTypesSet.has(eventType)) {
    throw new BadRequestException(
      `Field "eventType" must be one of: ${publicAnalyticsEventTypeValues.join(', ')}.`,
    );
  }

  if (typeof source.listingId !== 'string') {
    throw new BadRequestException('Field "listingId" is required and must be a string.');
  }

  const listingId = source.listingId.trim();
  if (!/^[1-9]\d*$/.test(listingId)) {
    throw new BadRequestException('Field "listingId" must be a positive integer.');
  }

  const rawSource = typeof source.source === 'string' ? source.source.trim() : 'web_public';
  const normalizedSource = rawSource.toLowerCase();

  return {
    eventType: eventType as (typeof publicAnalyticsEventTypeValues)[number],
    listingId,
    source: normalizedSource,
    metadata: parseMetadata(source.metadata),
  };
};

const parseWindowDays = (rawWindowDays: string | undefined): number => {
  if (!rawWindowDays) {
    return 30;
  }

  const parsed = Number.parseInt(rawWindowDays, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 365) {
    throw new BadRequestException('Query param "windowDays" must be an integer between 1 and 365.');
  }

  return parsed;
};

@Controller('v1/analytics')
export class AnalyticsController {
  constructor(
    @Inject(AnalyticsService)
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Public()
  @Post('events')
  async trackPublicEvent(@Body() body: unknown) {
    const payload = parsePublicEventPayload(body);
    const event = await this.analyticsService.trackPublicEvent(payload);
    return {
      event,
    };
  }
}

@Controller('v1/admin/analytics')
@Roles(UserRole.MODERATOR, UserRole.ADMIN)
export class AdminAnalyticsController {
  constructor(
    @Inject(AnalyticsService)
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Get('kpis')
  async getKpis(@Query('windowDays') rawWindowDays?: string) {
    const windowDays = parseWindowDays(rawWindowDays);
    return this.analyticsService.getAdminKpis(windowDays);
  }
}
