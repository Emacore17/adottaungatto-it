import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { UserRole } from '../auth/roles.enum';
import { PromotionsService } from './promotions.service';

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

const parseOptionalBooleanQuery = (
  rawValue: string | undefined,
  defaultValue: boolean,
): boolean => {
  if (rawValue === undefined) {
    return defaultValue;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') {
    return true;
  }

  if (normalized === 'false' || normalized === '0') {
    return false;
  }

  throw new BadRequestException('Query param must be a boolean.');
};

const parseAssignPayload = (
  value: unknown,
): { planCode: string; startsAt?: string; metadata?: Record<string, unknown> } => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BadRequestException('Request body must be a JSON object.');
  }

  const record = value as Record<string, unknown>;
  if (typeof record.planCode !== 'string') {
    throw new BadRequestException('Field "planCode" is required and must be a string.');
  }

  const planCode = record.planCode.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,80}$/.test(planCode)) {
    throw new BadRequestException(
      'Field "planCode" must contain only lowercase letters, numbers or underscore (3..80).',
    );
  }

  let startsAt: string | undefined;
  if ('startsAt' in record && record.startsAt !== undefined && record.startsAt !== null) {
    if (typeof record.startsAt !== 'string') {
      throw new BadRequestException('Field "startsAt" must be a string.');
    }

    startsAt = record.startsAt.trim();
    if (!startsAt) {
      startsAt = undefined;
    }
  }

  let metadata: Record<string, unknown> | undefined;
  if ('metadata' in record && record.metadata !== undefined && record.metadata !== null) {
    if (typeof record.metadata !== 'object' || Array.isArray(record.metadata)) {
      throw new BadRequestException('Field "metadata" must be an object.');
    }

    metadata = record.metadata as Record<string, unknown>;
  }

  return {
    planCode,
    startsAt,
    metadata,
  };
};

@Controller('v1/admin/promotions')
@Roles(UserRole.ADMIN)
export class PromotionsController {
  constructor(
    @Inject(PromotionsService)
    private readonly promotionsService: PromotionsService,
  ) {}

  @Get('plans')
  async listPlans(@Query('includeInactive') includeInactive?: string) {
    const shouldIncludeInactive = parseOptionalBooleanQuery(includeInactive, false);
    const plans = await this.promotionsService.listPlans(!shouldIncludeInactive);
    return {
      plans,
      includeInactive: shouldIncludeInactive,
    };
  }

  @Get('listings/:listingId')
  async listListingPromotions(@Param('listingId') rawListingId: string) {
    const listingId = parsePositiveIntegerString(rawListingId, 'listingId');
    const promotions = await this.promotionsService.listListingPromotions(listingId);
    return {
      listingId,
      promotions,
    };
  }

  @Post('listings/:listingId/assign')
  async assignPromotion(
    @Param('listingId') rawListingId: string,
    @CurrentUser() actor: RequestUser,
    @Body() body: unknown,
  ) {
    const listingId = parsePositiveIntegerString(rawListingId, 'listingId');
    const payload = parseAssignPayload(body);
    const result = await this.promotionsService.assignListingPromotion(actor, {
      listingId,
      planCode: payload.planCode,
      startsAt: payload.startsAt,
      metadata: payload.metadata,
    });

    return result;
  }
}
