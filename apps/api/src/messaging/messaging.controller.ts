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
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { MessagingService } from './messaging.service';

const parsePositiveIntegerString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!/^[1-9]\d*$/.test(normalized)) {
    throw new BadRequestException(`Field "${fieldName}" must be a positive integer.`);
  }

  return normalized;
};

const parseOptionalBodyString = (body: unknown, fieldName: string, maxLength: number): string => {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new BadRequestException('Request body must be a JSON object.');
  }

  const record = body as Record<string, unknown>;
  const value = record[fieldName];
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

const parseOptionalQueryInteger = (
  value: string | undefined,
  fieldName: 'limit' | 'offset',
  fallbackValue: number,
  maxValue: number,
): number => {
  if (!value) {
    return fallbackValue;
  }

  const parsed = Number.parseInt(value, 10);
  const minValue = fieldName === 'offset' ? 0 : 1;
  if (!Number.isFinite(parsed) || parsed < minValue || parsed > maxValue) {
    const rule =
      fieldName === 'offset'
        ? 'an integer >= 0'
        : `an integer between 1 and ${maxValue.toString()}`;
    throw new BadRequestException(`Query param "${fieldName}" must be ${rule}.`);
  }

  return parsed;
};

@Controller('v1/messages')
export class MessagingController {
  constructor(
    @Inject(MessagingService)
    private readonly messagingService: MessagingService,
  ) {}

  @Post('listings/:listingId/thread')
  async createListingThread(
    @Param('listingId') rawListingId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: unknown,
  ) {
    const listingId = parsePositiveIntegerString(rawListingId, 'listingId');
    const messageBody = parseOptionalBodyString(body, 'body', 2000);
    const source = this.parseOptionalSource(body);

    const result = await this.messagingService.openListingThreadForUser(
      user,
      listingId,
      messageBody,
      source,
    );

    return result;
  }

  @Get('threads')
  async listThreads(
    @CurrentUser() user: RequestUser,
    @Query('limit') rawLimit?: string,
    @Query('offset') rawOffset?: string,
  ) {
    const limit = parseOptionalQueryInteger(rawLimit, 'limit', 20, 50);
    const offset = parseOptionalQueryInteger(rawOffset, 'offset', 0, 10_000);
    return this.messagingService.listThreadsForUser(user, limit, offset);
  }

  @Get('threads/:threadId')
  async getThread(
    @Param('threadId') rawThreadId: string,
    @CurrentUser() user: RequestUser,
    @Query('limit') rawLimit?: string,
    @Query('beforeMessageId') rawBeforeMessageId?: string,
  ) {
    const threadId = parsePositiveIntegerString(rawThreadId, 'threadId');
    const beforeMessageId = rawBeforeMessageId
      ? parsePositiveIntegerString(rawBeforeMessageId, 'beforeMessageId')
      : null;
    const limit = parseOptionalQueryInteger(rawLimit, 'limit', 40, 100);

    const thread = await this.messagingService.getThreadForUser(
      user,
      threadId,
      limit,
      beforeMessageId,
    );
    if (!thread) {
      throw new NotFoundException('Message thread not found.');
    }

    return {
      thread: thread.thread,
      pagination: {
        limit,
        beforeMessageId,
        hasMore: thread.hasMore,
      },
    };
  }

  @Post('threads/:threadId/messages')
  async sendMessage(
    @Param('threadId') rawThreadId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: unknown,
  ) {
    const threadId = parsePositiveIntegerString(rawThreadId, 'threadId');
    const messageBody = parseOptionalBodyString(body, 'body', 2000);
    const result = await this.messagingService.sendMessageForUser(user, threadId, messageBody);

    if (!result) {
      throw new NotFoundException('Message thread not found.');
    }

    return result;
  }

  @Post('threads/:threadId/read')
  async markThreadRead(@Param('threadId') rawThreadId: string, @CurrentUser() user: RequestUser) {
    const threadId = parsePositiveIntegerString(rawThreadId, 'threadId');
    const result = await this.messagingService.markThreadReadForUser(user, threadId);
    if (!result) {
      throw new NotFoundException('Message thread not found.');
    }

    return {
      threadId,
      readAt: result.readAt,
    };
  }

  private parseOptionalSource(body: unknown): string {
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return 'web_listing';
    }

    const record = body as Record<string, unknown>;
    const value = record.source;
    if (typeof value !== 'string') {
      return 'web_listing';
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : 'web_listing';
  }
}
