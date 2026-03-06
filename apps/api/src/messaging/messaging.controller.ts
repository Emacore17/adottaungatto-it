import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireVerifiedEmail } from '../auth/decorators/require-verified-email.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { UsersService } from '../users/users.service';
import { MessagingEventsService } from './messaging-events.service';
import { MessagingService } from './messaging.service';

type EventStreamRequest = {
  raw: {
    on: (eventName: 'close', listener: () => void) => void;
  };
};

type EventStreamReply = {
  hijack: () => void;
  raw: {
    writableEnded: boolean;
    setHeader: (name: string, value: string) => void;
    flushHeaders?: () => void;
    write: (chunk: string) => void;
    end: () => void;
  };
};

const parsePositiveIntegerString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!/^[1-9]\d*$/.test(normalized)) {
    throw new BadRequestException(`Field "${fieldName}" must be a positive integer.`);
  }

  return normalized;
};

const parseBooleanBodyField = (body: unknown, fieldName: string): boolean => {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new BadRequestException('Request body must be a JSON object.');
  }

  const value = (body as Record<string, unknown>)[fieldName];
  if (typeof value !== 'boolean') {
    throw new BadRequestException(`Field "${fieldName}" is required and must be a boolean.`);
  }

  return value;
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
@RequireVerifiedEmail()
export class MessagingController {
  constructor(
    @Inject(MessagingService)
    private readonly messagingService: MessagingService,
    @Inject(MessagingEventsService)
    private readonly messagingEventsService: MessagingEventsService,
    @Inject(UsersService)
    private readonly usersService: UsersService,
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

  @Get('events')
  async streamEvents(
    @CurrentUser() user: RequestUser,
    @Query('threadId') rawThreadId: string | undefined,
    @Req() request: EventStreamRequest,
    @Res() reply: EventStreamReply,
  ) {
    const persistedUser = await this.usersService.getCurrentUser(user);
    const threadId = rawThreadId ? parsePositiveIntegerString(rawThreadId, 'threadId') : null;
    const subscriber = await this.messagingEventsService.createSubscriber(persistedUser.id);

    reply.hijack();
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('X-Accel-Buffering', 'no');
    reply.raw.flushHeaders?.();

    const writeEvent = (eventName: string, payload: Record<string, string>) => {
      reply.raw.write(`event: ${eventName}\n`);
      reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    writeEvent('connected', {
      userId: persistedUser.id,
      occurredAt: new Date().toISOString(),
    });

    const heartbeat = setInterval(() => {
      writeEvent('ping', {
        occurredAt: new Date().toISOString(),
      });
    }, 15_000);

    const cleanup = () => {
      clearInterval(heartbeat);
      subscriber.removeAllListeners('message');
      subscriber.disconnect();
      if (!reply.raw.writableEnded) {
        reply.raw.end();
      }
    };

    subscriber.on('message', (_channel: string, message: string) => {
      try {
        const payload = JSON.parse(message) as {
          eventType?: unknown;
          threadId?: unknown;
          reason?: unknown;
          isTyping?: unknown;
          occurredAt?: unknown;
          userId?: unknown;
        };
        if (typeof payload.threadId !== 'string') {
          return;
        }
        if (threadId && payload.threadId !== threadId) {
          return;
        }
        if (payload.eventType === 'typing_changed') {
          writeEvent('typing_changed', {
            threadId: payload.threadId,
            userId: typeof payload.userId === 'string' ? payload.userId : '',
            isTyping: payload.isTyping === true ? 'true' : 'false',
            occurredAt:
              typeof payload.occurredAt === 'string' ? payload.occurredAt : new Date().toISOString(),
          });
          return;
        }

        writeEvent('thread_updated', {
          threadId: payload.threadId,
          reason: typeof payload.reason === 'string' ? payload.reason : 'message_created',
          occurredAt:
            typeof payload.occurredAt === 'string' ? payload.occurredAt : new Date().toISOString(),
        });
      } catch {
        // Ignore malformed payloads so a single bad publish does not break the stream.
      }
    });

    request.raw.on('close', cleanup);
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

  @Delete('threads/:threadId')
  async archiveThread(@Param('threadId') rawThreadId: string, @CurrentUser() user: RequestUser) {
    const threadId = parsePositiveIntegerString(rawThreadId, 'threadId');
    const result = await this.messagingService.archiveThreadForUser(user, threadId);
    if (!result) {
      throw new NotFoundException('Message thread not found.');
    }

    return {
      threadId,
      archivedAt: result.archivedAt,
    };
  }

  @Delete('threads/:threadId/everyone')
  async deleteThreadForEveryone(
    @Param('threadId') rawThreadId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const threadId = parsePositiveIntegerString(rawThreadId, 'threadId');
    const result = await this.messagingService.deleteThreadForEveryone(user, threadId);
    if (!result) {
      throw new NotFoundException('Message thread not found.');
    }

    return {
      threadId,
      deletedAt: result.deletedAt,
    };
  }

  @Post('threads/:threadId/typing')
  async setTyping(
    @Param('threadId') rawThreadId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: unknown,
  ) {
    const threadId = parsePositiveIntegerString(rawThreadId, 'threadId');
    const isTyping = parseBooleanBodyField(body, 'isTyping');
    const result = await this.messagingService.setTypingForUser(user, threadId, isTyping);
    if (!result) {
      throw new NotFoundException('Message thread not found.');
    }

    return {
      threadId,
      accepted: result.accepted,
      isTyping,
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
