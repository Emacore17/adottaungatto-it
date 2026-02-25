import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { validateCreateListingDto } from './dto/create-listing.dto';
import { validateSearchListingsQueryDto } from './dto/search-listings-query.dto';
import { ListingsService } from './listings.service';
import type { UploadListingMediaInput } from './models/listing-media.model';
import {
  type ContactListingInput,
  type ListingStatus,
  type UpdateListingInput,
  listingStatusValues,
} from './models/listing.model';

type RequestWithClientInfo = {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
};

const listingStatusSet = new Set<string>(listingStatusValues);
const uniqueViolationCode = '23505';

const asRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BadRequestException('Request body must be a JSON object.');
  }

  return value as Record<string, unknown>;
};

const parseRequiredString = (
  source: Record<string, unknown>,
  fieldName: string,
  maxLength: number,
): string => {
  const value = source[fieldName];
  if (typeof value !== 'string') {
    throw new BadRequestException(`Field "${fieldName}" is required and must be a string.`);
  }

  const normalized = value.trim();
  if (!normalized) {
    throw new BadRequestException(`Field "${fieldName}" cannot be empty.`);
  }

  if (normalized.length > maxLength) {
    throw new BadRequestException(
      `Field "${fieldName}" exceeds maximum length (${maxLength} characters).`,
    );
  }

  return normalized;
};

const parseOptionalString = (
  source: Record<string, unknown>,
  fieldName: string,
  maxLength: number,
): string | null | undefined => {
  if (!(fieldName in source)) {
    return undefined;
  }

  const value = source[fieldName];
  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException(`Field "${fieldName}" must be a string or null.`);
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (normalized.length > maxLength) {
    throw new BadRequestException(
      `Field "${fieldName}" exceeds maximum length (${maxLength} characters).`,
    );
  }

  return normalized;
};

const parsePositiveIntegerString = (value: unknown, fieldName: string): string => {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value.toString();
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    if (/^[1-9]\d*$/.test(normalized)) {
      return normalized;
    }
  }

  throw new BadRequestException(`Field "${fieldName}" must be a positive integer.`);
};

const parsePaginationNumber = (
  rawValue: string | undefined,
  fieldName: 'limit' | 'offset',
): number => {
  if (!rawValue) {
    return fieldName === 'limit' ? 24 : 0;
  }

  const parsed = Number.parseInt(rawValue, 10);
  const isLimit = fieldName === 'limit';
  const maxValue = isLimit ? 100 : Number.MAX_SAFE_INTEGER;
  const minValue = isLimit ? 1 : 0;

  if (!Number.isFinite(parsed) || parsed < minValue || parsed > maxValue) {
    if (isLimit) {
      throw new BadRequestException('Query param "limit" must be an integer between 1 and 100.');
    }

    throw new BadRequestException('Query param "offset" must be an integer >= 0.');
  }

  return parsed;
};

const parsePriceAmount = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    throw new BadRequestException('Field "priceAmount" must be a positive number or null.');
  }

  return value;
};

const parseListingType = (value: unknown): string => {
  if (typeof value !== 'string') {
    throw new BadRequestException('Field "listingType" is required and must be a string.');
  }

  const normalized = value.trim();
  if (!normalized) {
    throw new BadRequestException('Field "listingType" cannot be empty.');
  }

  if (normalized.length > 40) {
    throw new BadRequestException('Field "listingType" exceeds maximum length (40 characters).');
  }

  return normalized;
};

const parseListingStatus = (value: unknown, fieldName: string): ListingStatus => {
  if (typeof value !== 'string') {
    throw new BadRequestException(`Field "${fieldName}" must be a string.`);
  }

  const normalized = value.trim().toLowerCase();
  if (!listingStatusSet.has(normalized)) {
    throw new BadRequestException(
      `Field "${fieldName}" must be one of: ${listingStatusValues.join(', ')}.`,
    );
  }

  return normalized as ListingStatus;
};

const parseCurrency = (value: unknown, required: boolean): string | undefined => {
  if (value === undefined) {
    if (required) {
      return 'EUR';
    }

    return undefined;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException('Field "currency" must be a string.');
  }

  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new BadRequestException('Field "currency" must be a valid 3-letter code.');
  }

  return normalized;
};

const parseContactEmail = (
  source: Record<string, unknown>,
  fieldName: string,
): string | null | undefined => {
  const value = parseOptionalString(source, fieldName, 320);
  if (value === undefined || value === null) {
    return value;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(value)) {
    throw new BadRequestException(`Field "${fieldName}" must be a valid email address.`);
  }

  return value;
};

const parseOptionalPositiveInteger = (
  source: Record<string, unknown>,
  fieldName: string,
): number | null => {
  if (!(fieldName in source)) {
    return null;
  }

  const parsed = Number.parseInt(parsePositiveIntegerString(source[fieldName], fieldName), 10);
  return parsed;
};

const parseOptionalBoolean = (
  source: Record<string, unknown>,
  fieldName: string,
  defaultValue: boolean,
): boolean => {
  if (!(fieldName in source)) {
    return defaultValue;
  }

  const value = source[fieldName];
  if (typeof value !== 'boolean') {
    throw new BadRequestException(`Field "${fieldName}" must be a boolean.`);
  }

  return value;
};

const parseBooleanTrue = (source: Record<string, unknown>, fieldName: string): true => {
  const value = source[fieldName];
  if (value !== true) {
    throw new BadRequestException(`Field "${fieldName}" must be true.`);
  }

  return true;
};

const parseContactPayload = (body: unknown): ContactListingInput => {
  const source = asRecord(body);
  const senderName = parseRequiredString(source, 'name', 120);
  const senderEmail = parseContactEmail(source, 'email');
  if (!senderEmail) {
    throw new BadRequestException('Field "email" is required and must be a valid email address.');
  }

  const senderPhone = parseOptionalString(source, 'phone', 40) ?? null;
  const message = parseRequiredString(source, 'message', 2000);
  if (message.length < 20) {
    throw new BadRequestException('Field "message" must be at least 20 characters long.');
  }

  parseBooleanTrue(source, 'privacyConsent');

  const websiteHoneypot = parseOptionalString(source, 'website', 160);
  if (websiteHoneypot && websiteHoneypot.length > 0) {
    throw new BadRequestException('Spam protection triggered.');
  }

  const sourceValue = parseOptionalString(source, 'source', 60) ?? 'web_public_form';

  return {
    senderName,
    senderEmail,
    senderPhone,
    message,
    source: sourceValue.toLowerCase(),
  };
};

const pickFirstHeaderValue = (value: string | string[] | undefined): string | null => {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0]?.trim() || null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const parseSenderIp = (request: RequestWithClientInfo): string | null => {
  const forwardedFor = pickFirstHeaderValue(request.headers['x-forwarded-for']);
  if (forwardedFor) {
    const firstIp = forwardedFor
      .split(',')
      .map((part) => part.trim())
      .find((part) => part.length > 0);
    if (firstIp) {
      return firstIp.slice(0, 64);
    }
  }

  const realIp = pickFirstHeaderValue(request.headers['x-real-ip']);
  if (realIp) {
    return realIp.slice(0, 64);
  }

  const requestIp = typeof request.ip === 'string' ? request.ip.trim() : '';
  return requestIp ? requestIp.slice(0, 64) : null;
};

const parseUserAgent = (request: RequestWithClientInfo): string | null => {
  const userAgentHeader = pickFirstHeaderValue(request.headers['user-agent']);
  return userAgentHeader ? userAgentHeader.slice(0, 400) : null;
};

const parseBase64Payload = (rawPayload: string): Buffer => {
  const normalized = rawPayload.trim();
  if (!normalized) {
    throw new BadRequestException('Field "contentBase64" cannot be empty.');
  }

  const commaIndex = normalized.indexOf(',');
  const payload =
    normalized.startsWith('data:') && commaIndex >= 0
      ? normalized.slice(commaIndex + 1)
      : normalized;

  let decodedPayload: Buffer;
  try {
    decodedPayload = Buffer.from(payload, 'base64');
  } catch {
    throw new BadRequestException('Field "contentBase64" is not a valid base64 payload.');
  }

  if (decodedPayload.length === 0) {
    throw new BadRequestException('Field "contentBase64" is empty after decoding.');
  }

  return decodedPayload;
};

type DbError = Error & { code?: string };

@Controller('v1/listings')
export class ListingsController {
  constructor(
    @Inject(ListingsService)
    private readonly listingsService: ListingsService,
  ) {}

  @Post()
  async create(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    const validation = validateCreateListingDto(body);
    if ('issues' in validation) {
      throw new BadRequestException({
        message: 'Invalid create listing payload.',
        issues: validation.issues,
      });
    }

    const payload = {
      ...validation.dto,
      status: 'pending_review' as const,
    };
    const listing = await this.listingsService.createForUser(user, payload);
    return { listing };
  }

  @Public()
  @Get('public')
  async listPublic(@Query('limit') rawLimit?: string, @Query('offset') rawOffset?: string) {
    const limit = parsePaginationNumber(rawLimit, 'limit');
    const offset = parsePaginationNumber(rawOffset, 'offset');
    const listings = await this.listingsService.listPublished(limit, offset);
    return {
      listings,
      limit,
      offset,
    };
  }

  @Public()
  @Get('public/:id')
  async getPublicById(@Param('id') rawListingId: string) {
    const listingId = parsePositiveIntegerString(rawListingId, 'id');
    const listing = await this.listingsService.getPublishedById(listingId);
    if (!listing) {
      throw new NotFoundException('Listing not found.');
    }

    return { listing };
  }

  @Public()
  @Post(':id/contact')
  async contact(
    @Param('id') rawListingId: string,
    @Req() request: RequestWithClientInfo,
    @Body() body: unknown,
  ) {
    const listingId = parsePositiveIntegerString(rawListingId, 'id');
    const payload = parseContactPayload(body);
    const result = await this.listingsService.submitPublicContactRequest(listingId, payload, {
      senderIp: parseSenderIp(request),
      userAgent: parseUserAgent(request),
    });

    if (!result) {
      throw new NotFoundException('Listing not found.');
    }

    return {
      contactRequest: {
        id: result.requestId,
        listingId: result.listingId,
        createdAt: result.createdAt,
      },
      confirmation: {
        message: result.confirmationMessage,
      },
    };
  }

  @Public()
  @Get('search')
  async searchPublic(@Query() query: Record<string, unknown>) {
    const validation = validateSearchListingsQueryDto(query);
    if ('issues' in validation) {
      throw new BadRequestException({
        message: 'Invalid search listings query.',
        issues: validation.issues,
      });
    }

    return this.listingsService.searchPublic(validation.dto);
  }

  @Get('me')
  async listMine(@CurrentUser() user: RequestUser) {
    const listings = await this.listingsService.listForUser(user);
    return { listings };
  }

  @Patch(':id')
  async update(
    @Param('id') rawListingId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: unknown,
  ) {
    const listingId = parsePositiveIntegerString(rawListingId, 'id');
    const payload = this.parseUpdatePayload(body);
    const listing = await this.listingsService.updateForUser(user, listingId, payload);

    if (!listing) {
      throw new NotFoundException('Listing not found.');
    }

    return { listing };
  }

  @Delete(':id')
  async archive(@Param('id') rawListingId: string, @CurrentUser() user: RequestUser) {
    const listingId = parsePositiveIntegerString(rawListingId, 'id');
    const listing = await this.listingsService.archiveForUser(user, listingId);

    if (!listing) {
      throw new NotFoundException('Listing not found.');
    }

    return { listing };
  }

  @Post(':id/media')
  async uploadMedia(
    @Param('id') rawListingId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: unknown,
  ) {
    const listingId = parsePositiveIntegerString(rawListingId, 'id');
    const payload = this.parseMediaUploadPayload(body);

    try {
      const media = await this.listingsService.uploadMediaForUser(user, listingId, payload);
      if (!media) {
        throw new NotFoundException('Listing not found.');
      }

      return { media };
    } catch (error) {
      const dbError = error as DbError;
      if (dbError.code === uniqueViolationCode) {
        throw new ConflictException(
          'Media ordering conflict. Use a different "position" or update existing media order.',
        );
      }

      throw error;
    }
  }

  @Get(':id/media')
  async listMedia(@Param('id') rawListingId: string, @CurrentUser() user: RequestUser) {
    const listingId = parsePositiveIntegerString(rawListingId, 'id');
    const media = await this.listingsService.listMediaForUser(user, listingId);
    if (!media) {
      throw new NotFoundException('Listing not found.');
    }

    return { media };
  }

  @Delete(':id/media/:mediaId')
  async deleteMedia(
    @Param('id') rawListingId: string,
    @Param('mediaId') rawMediaId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const listingId = parsePositiveIntegerString(rawListingId, 'id');
    const mediaId = parsePositiveIntegerString(rawMediaId, 'mediaId');
    const media = await this.listingsService.deleteMediaForUser(user, listingId, mediaId);
    if (!media) {
      throw new NotFoundException('Listing not found.');
    }

    return { media };
  }

  @Patch(':id/media/order')
  async reorderMedia(
    @Param('id') rawListingId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: unknown,
  ) {
    const listingId = parsePositiveIntegerString(rawListingId, 'id');
    const payload = this.parseMediaReorderPayload(body);
    const media = await this.listingsService.reorderMediaForUser(user, listingId, payload.mediaIds);
    if (!media) {
      throw new NotFoundException('Listing not found.');
    }

    return { media };
  }

  private parseUpdatePayload(body: unknown): UpdateListingInput {
    const source = asRecord(body);
    const payload: UpdateListingInput = {};

    if ('title' in source) {
      payload.title = parseOptionalString(source, 'title', 160) ?? '';
      if (!payload.title) {
        throw new BadRequestException('Field "title" cannot be empty.');
      }
    }

    if ('description' in source) {
      payload.description = parseOptionalString(source, 'description', 6000) ?? '';
      if (!payload.description) {
        throw new BadRequestException('Field "description" cannot be empty.');
      }
    }

    const hasListingTypeAlias =
      'listingType' in source ||
      'listing_type' in source ||
      'type' in source ||
      'listingKind' in source;
    if (hasListingTypeAlias) {
      const listingTypeSource =
        source.listingType ?? source.listing_type ?? source.type ?? source.listingKind;
      payload.listingType = parseListingType(listingTypeSource);
    }

    if ('priceAmount' in source) {
      payload.priceAmount = parsePriceAmount(source.priceAmount);
    }

    if ('currency' in source) {
      payload.currency = parseCurrency(source.currency, false);
    }

    if ('ageText' in source) {
      payload.ageText = parseOptionalString(source, 'ageText', 80) ?? '';
      if (!payload.ageText) {
        throw new BadRequestException('Field "ageText" cannot be empty.');
      }
    }

    if ('sex' in source) {
      payload.sex = parseOptionalString(source, 'sex', 20) ?? '';
      if (!payload.sex) {
        throw new BadRequestException('Field "sex" cannot be empty.');
      }
    }

    if ('breed' in source) {
      payload.breed = parseOptionalString(source, 'breed', 120) ?? null;
    }

    if ('status' in source) {
      payload.status = parseListingStatus(source.status, 'status');
    }

    const hasRegion = 'regionId' in source;
    const hasProvince = 'provinceId' in source;
    const hasComune = 'comuneId' in source;
    const hasAnyLocationField = hasRegion || hasProvince || hasComune;
    if (hasAnyLocationField) {
      if (!hasRegion || !hasProvince || !hasComune) {
        throw new BadRequestException(
          'Fields "regionId", "provinceId" and "comuneId" must be provided together.',
        );
      }

      payload.regionId = parsePositiveIntegerString(source.regionId, 'regionId');
      payload.provinceId = parsePositiveIntegerString(source.provinceId, 'provinceId');
      payload.comuneId = parsePositiveIntegerString(source.comuneId, 'comuneId');
    }

    if ('contactName' in source) {
      payload.contactName = parseOptionalString(source, 'contactName', 120) ?? null;
    }

    if ('contactPhone' in source) {
      payload.contactPhone = parseOptionalString(source, 'contactPhone', 40) ?? null;
    }

    if ('contactEmail' in source) {
      payload.contactEmail = parseContactEmail(source, 'contactEmail') ?? null;
    }

    if (Object.keys(payload).length === 0) {
      throw new BadRequestException('At least one updatable field must be provided.');
    }

    return payload;
  }

  private parseMediaUploadPayload(body: unknown): UploadListingMediaInput {
    const source = asRecord(body);
    const mimeType = parseRequiredString(source, 'mimeType', 120).toLowerCase();
    const contentBase64 = parseRequiredString(source, 'contentBase64', 20_000_000);
    const payload = parseBase64Payload(contentBase64);

    return {
      mimeType,
      payload,
      originalFileName: parseOptionalString(source, 'fileName', 180) ?? null,
      width: parseOptionalPositiveInteger(source, 'width'),
      height: parseOptionalPositiveInteger(source, 'height'),
      hash: parseOptionalString(source, 'hash', 128) ?? null,
      position: parseOptionalPositiveInteger(source, 'position'),
      isPrimary: parseOptionalBoolean(source, 'isPrimary', false),
    };
  }

  private parseMediaReorderPayload(body: unknown): { mediaIds: string[] } {
    const source = asRecord(body);
    const mediaIdsRaw = source.mediaIds;
    if (!Array.isArray(mediaIdsRaw) || mediaIdsRaw.length === 0) {
      throw new BadRequestException('Field "mediaIds" must be a non-empty array.');
    }

    const mediaIds = mediaIdsRaw.map((value, index) =>
      parsePositiveIntegerString(value, `mediaIds[${index}]`),
    );
    const uniqueMediaIds = new Set(mediaIds);
    if (uniqueMediaIds.size !== mediaIds.length) {
      throw new BadRequestException('Field "mediaIds" must contain unique values.');
    }

    return { mediaIds };
  }
}
