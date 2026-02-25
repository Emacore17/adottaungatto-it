import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { UserRole } from '../auth/roles.enum';
import type { ModerationAction } from './models/moderation.model';
import { ModerationService } from './moderation.service';

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

const parseQueueLimit = (rawLimit: string | undefined): number => {
  if (!rawLimit) {
    return 20;
  }

  const parsed = Number.parseInt(rawLimit, 10);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100) {
    throw new BadRequestException('Query param "limit" must be an integer between 1 and 100.');
  }

  return parsed;
};

const parseModerationReason = (body: unknown): string => {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new BadRequestException('Request body must be a JSON object.');
  }

  const record = body as Record<string, unknown>;
  const reason = record.reason;
  if (typeof reason !== 'string') {
    throw new BadRequestException('Field "reason" is required and must be a string.');
  }

  const normalized = reason.trim();
  if (normalized.length < 3) {
    throw new BadRequestException('Field "reason" must contain at least 3 characters.');
  }

  if (normalized.length > 2000) {
    throw new BadRequestException('Field "reason" exceeds maximum length (2000 characters).');
  }

  return normalized;
};

@Controller('v1/admin/moderation')
@Roles(UserRole.MODERATOR, UserRole.ADMIN)
export class ModerationController {
  constructor(
    @Inject(ModerationService)
    private readonly moderationService: ModerationService,
  ) {}

  @Get('queue')
  async queue(@Query('limit') rawLimit?: string) {
    const limit = parseQueueLimit(rawLimit);
    const items = await this.moderationService.listPendingQueue(limit);
    return { items, limit };
  }

  @Post(':listingId/approve')
  async approve(
    @Param('listingId') rawListingId: string,
    @CurrentUser() actor: RequestUser,
    @Body() body: unknown,
  ) {
    return this.handleModerationAction(actor, rawListingId, body, 'approve');
  }

  @Post(':listingId/reject')
  async reject(
    @Param('listingId') rawListingId: string,
    @CurrentUser() actor: RequestUser,
    @Body() body: unknown,
  ) {
    return this.handleModerationAction(actor, rawListingId, body, 'reject');
  }

  @Post(':listingId/suspend')
  async suspend(
    @Param('listingId') rawListingId: string,
    @CurrentUser() actor: RequestUser,
    @Body() body: unknown,
  ) {
    return this.handleModerationAction(actor, rawListingId, body, 'suspend');
  }

  @Post(':listingId/restore')
  async restore(
    @Param('listingId') rawListingId: string,
    @CurrentUser() actor: RequestUser,
    @Body() body: unknown,
  ) {
    return this.handleModerationAction(actor, rawListingId, body, 'restore');
  }

  private async handleModerationAction(
    actor: RequestUser,
    rawListingId: string,
    body: unknown,
    action: ModerationAction,
  ) {
    const listingId = parsePositiveIntegerString(rawListingId, 'listingId');
    const reason = parseModerationReason(body);
    const result = await this.moderationService.moderateListing(actor, listingId, action, reason);
    if (!result) {
      throw new NotFoundException('Listing not found.');
    }

    return result;
  }
}
