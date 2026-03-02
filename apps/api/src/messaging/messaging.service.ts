import { createHash } from 'node:crypto';
import { loadApiEnv } from '@adottaungatto/config';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { MessagingEventsService } from './messaging-events.service';
import { MessagingRepository } from './messaging.repository';
import type { MessageThreadDetail, MessageThreadsPage } from './models/message-thread.model';

const defaultThreadPageLimit = 20;
const maxThreadPageLimit = 50;
const defaultMessagePageLimit = 40;
const maxMessagePageLimit = 100;
const urlPattern = /\b((https?:\/\/)|(www\.))\S+/gi;

@Injectable()
export class MessagingService {
  private readonly env = loadApiEnv();

  constructor(
    @Inject(MessagingRepository)
    private readonly messagingRepository: MessagingRepository,
    @Inject(MessagingEventsService)
    private readonly messagingEventsService: MessagingEventsService,
  ) {}

  async openListingThreadForUser(
    user: RequestUser,
    listingId: string,
    body: string,
    source: string,
  ): Promise<{
    createdThread: boolean;
    message: MessageThreadDetail['messages'][number];
    thread: MessageThreadDetail;
  }> {
    const actorUserId = await this.messagingRepository.upsertActorUser(user);
    const listing = await this.messagingRepository.findPublishedListingForMessaging(listingId);
    if (!listing) {
      throw new NotFoundException('Listing not found.');
    }

    if (
      listing.ownerProviderSubject === user.providerSubject ||
      listing.ownerUserId === actorUserId
    ) {
      throw new BadRequestException('You cannot start a conversation on your own listing.');
    }

    const normalizedBody = this.normalizeMessageBody(body);
    const normalizedSource = this.normalizeSource(source);
    const existingThreadId = await this.messagingRepository.findThreadIdByListingAndUsers(
      listing.listingId,
      listing.ownerUserId,
      actorUserId,
    );

    if (!existingThreadId) {
      const recentThreadCount = await this.messagingRepository.countRecentThreadsByRequester(
        actorUserId,
        this.toIsoSecondsAgo(this.env.MESSAGE_THREAD_CREATE_WINDOW_SECONDS),
      );
      if (recentThreadCount >= this.env.MESSAGE_THREAD_CREATE_MAX_REQUESTS) {
        throw new HttpException(
          'Too many new conversations started in a short time.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const threadId = await this.messagingRepository.getOrCreateThread({
      listingId: listing.listingId,
      requesterUserId: actorUserId,
      ownerUserId: listing.ownerUserId,
      listingTitle: listing.listingTitle,
      source: normalizedSource,
    });

    await this.assertMessageCanBeSent(threadId, actorUserId, normalizedBody);
    const message = await this.messagingRepository.appendMessageToThread({
      threadId,
      senderUserId: actorUserId,
      body: normalizedBody,
      messageHash: this.createMessageHash(normalizedBody),
    });

    const threadDetail = await this.getThreadDetailByActorUserId(
      actorUserId,
      threadId,
      defaultMessagePageLimit,
      null,
    );
    if (!threadDetail) {
      throw new NotFoundException('Message thread not found.');
    }

    await this.messagingEventsService.publishThreadUpdated([actorUserId, listing.ownerUserId], {
      threadId,
      reason: 'message_created',
    });
    await this.messagingEventsService.publishTypingChanged([listing.ownerUserId], {
      threadId,
      userId: actorUserId,
      isTyping: false,
    });

    return {
      createdThread: existingThreadId === null,
      message,
      thread: threadDetail.thread,
    };
  }

  async listThreadsForUser(
    user: RequestUser,
    limit = defaultThreadPageLimit,
    offset = 0,
  ): Promise<MessageThreadsPage> {
    const actorUserId = await this.messagingRepository.upsertActorUser(user);
    return this.messagingRepository.listThreadsForUser(
      actorUserId,
      this.normalizeThreadLimit(limit),
      this.normalizeOffset(offset),
    );
  }

  async getThreadForUser(
    user: RequestUser,
    threadId: string,
    messageLimit = defaultMessagePageLimit,
    beforeMessageId: string | null = null,
  ): Promise<{ hasMore: boolean; thread: MessageThreadDetail } | null> {
    const actorUserId = await this.messagingRepository.upsertActorUser(user);
    const threadDetail = await this.getThreadDetailByActorUserId(
      actorUserId,
      threadId,
      this.normalizeMessageLimit(messageLimit),
      beforeMessageId,
    );

    if (!threadDetail) {
      return null;
    }

    return {
      hasMore: threadDetail.hasMore,
      thread: threadDetail.thread,
    };
  }

  async sendMessageForUser(
    user: RequestUser,
    threadId: string,
    body: string,
  ): Promise<{
    message: MessageThreadDetail['messages'][number];
    thread: MessageThreadDetail;
  } | null> {
    const actorUserId = await this.messagingRepository.upsertActorUser(user);
    const thread = await this.messagingRepository.findThreadForUser(actorUserId, threadId);
    if (!thread) {
      return null;
    }

    const normalizedBody = this.normalizeMessageBody(body);
    await this.assertMessageCanBeSent(threadId, actorUserId, normalizedBody);

    const message = await this.messagingRepository.appendMessageToThread({
      threadId,
      senderUserId: actorUserId,
      body: normalizedBody,
      messageHash: this.createMessageHash(normalizedBody),
    });

    const updatedThread = await this.getThreadDetailByActorUserId(
      actorUserId,
      threadId,
      defaultMessagePageLimit,
      null,
    );
    if (!updatedThread) {
      throw new NotFoundException('Message thread not found.');
    }

    const participantUserIds =
      await this.messagingRepository.listThreadParticipantUserIds(threadId);
    await this.messagingEventsService.publishThreadUpdated(participantUserIds, {
      threadId,
      reason: 'message_created',
    });
    await this.messagingEventsService.publishTypingChanged(
      participantUserIds.filter((userId) => userId !== actorUserId),
      {
        threadId,
        userId: actorUserId,
        isTyping: false,
      },
    );

    return {
      message,
      thread: updatedThread.thread,
    };
  }

  async markThreadReadForUser(
    user: RequestUser,
    threadId: string,
  ): Promise<{ readAt: string } | null> {
    const actorUserId = await this.messagingRepository.upsertActorUser(user);
    const thread = await this.messagingRepository.findThreadForUser(actorUserId, threadId);
    if (!thread) {
      return null;
    }

    const readAt = new Date().toISOString();
    await this.messagingRepository.markThreadRead(threadId, actorUserId, readAt);
    await this.messagingEventsService.publishThreadUpdated([actorUserId], {
      threadId,
      reason: 'read_state_changed',
    });
    return { readAt };
  }

  async archiveThreadForUser(
    user: RequestUser,
    threadId: string,
  ): Promise<{ archivedAt: string } | null> {
    const actorUserId = await this.messagingRepository.upsertActorUser(user);
    const thread = await this.messagingRepository.findThreadForUser(actorUserId, threadId);
    if (!thread) {
      return null;
    }

    const archivedAt = new Date().toISOString();
    const archived = await this.messagingRepository.archiveThreadForUser(
      threadId,
      actorUserId,
      archivedAt,
    );
    if (!archived) {
      return null;
    }

    await this.messagingEventsService.publishThreadUpdated([actorUserId], {
      threadId,
      reason: 'thread_archived',
    });

    return { archivedAt };
  }

  async deleteThreadForEveryone(
    user: RequestUser,
    threadId: string,
  ): Promise<{ deletedAt: string } | null> {
    const actorUserId = await this.messagingRepository.upsertActorUser(user);
    const thread = await this.messagingRepository.findThreadForUser(actorUserId, threadId);
    if (!thread) {
      return null;
    }

    const participantUserIds = await this.messagingRepository.listThreadParticipantUserIds(threadId);
    const deletedAt = new Date().toISOString();
    const deleted = await this.messagingRepository.deleteThreadForEveryone(
      threadId,
      actorUserId,
      deletedAt,
    );
    if (!deleted) {
      return null;
    }

    await this.messagingEventsService.publishThreadUpdated(participantUserIds, {
      threadId,
      reason: 'thread_deleted',
    });

    return { deletedAt };
  }

  async setTypingForUser(
    user: RequestUser,
    threadId: string,
    isTyping: boolean,
  ): Promise<{ accepted: boolean } | null> {
    const actorUserId = await this.messagingRepository.upsertActorUser(user);
    const thread = await this.messagingRepository.findThreadForUser(actorUserId, threadId);
    if (!thread) {
      return null;
    }

    const participantUserIds = await this.messagingRepository.listThreadParticipantUserIds(threadId);
    await this.messagingEventsService.publishTypingChanged(
      participantUserIds.filter((userId) => userId !== actorUserId),
      {
        threadId,
        userId: actorUserId,
        isTyping,
      },
    );

    return { accepted: true };
  }

  private async getThreadDetailByActorUserId(
    actorUserId: string,
    threadId: string,
    messageLimit: number,
    beforeMessageId: string | null,
  ): Promise<{ hasMore: boolean; thread: MessageThreadDetail } | null> {
    const thread = await this.messagingRepository.findThreadForUser(actorUserId, threadId);
    if (!thread) {
      return null;
    }

    const messagesPage = await this.messagingRepository.listMessagesForThread(
      threadId,
      messageLimit,
      beforeMessageId,
    );

    return {
      hasMore: messagesPage.hasMore,
      thread: {
        ...thread,
        messages: messagesPage.messages,
      },
    };
  }

  private async assertMessageCanBeSent(
    threadId: string,
    senderUserId: string,
    normalizedBody: string,
  ): Promise<void> {
    const threadMessageCount = await this.messagingRepository.getThreadMessageCount(threadId);
    if (threadMessageCount >= this.env.MESSAGE_THREAD_MAX_MESSAGES) {
      throw new ConflictException(
        'This conversation reached its maximum size. Archive it and start a new contact from the listing if needed.',
      );
    }

    const recentMessageCount = await this.messagingRepository.countRecentMessagesBySender(
      senderUserId,
      this.toIsoSecondsAgo(this.env.MESSAGE_MESSAGE_WINDOW_SECONDS),
    );
    if (recentMessageCount >= this.env.MESSAGE_MESSAGE_MAX_REQUESTS) {
      throw new HttpException(
        'Too many messages sent in a short time.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (this.countUrls(normalizedBody) > this.env.MESSAGE_MESSAGE_MAX_URLS) {
      throw new BadRequestException(
        `Message contains too many links. Maximum allowed: ${this.env.MESSAGE_MESSAGE_MAX_URLS.toString()}.`,
      );
    }

    if (this.env.MESSAGE_THREAD_SLOWMODE_SECONDS > 0) {
      const latestMessageCreatedAt =
        await this.messagingRepository.findLatestMessageCreatedAtBySender(threadId, senderUserId);
      if (latestMessageCreatedAt) {
        const elapsedSeconds =
          (Date.now() - new Date(latestMessageCreatedAt).getTime()) / 1000;
        if (elapsedSeconds < this.env.MESSAGE_THREAD_SLOWMODE_SECONDS) {
          throw new HttpException(
            `Please wait ${this.env.MESSAGE_THREAD_SLOWMODE_SECONDS.toString()} seconds before sending another message in the same conversation.`,
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }
    }

    const duplicateCount = await this.messagingRepository.countRecentDuplicateMessages(
      threadId,
      senderUserId,
      this.createMessageHash(normalizedBody),
      this.toIsoSecondsAgo(this.env.MESSAGE_DUPLICATE_WINDOW_SECONDS),
    );
    if (duplicateCount > 0) {
      throw new ConflictException(
        'Duplicate message detected. Please wait before sending it again.',
      );
    }
  }

  private normalizeMessageBody(value: string): string {
    if (typeof value !== 'string') {
      throw new BadRequestException('Field "body" is required and must be a string.');
    }

    const normalized = value.replace(/\r\n/g, '\n').trim();
    if (!normalized) {
      throw new BadRequestException('Field "body" cannot be empty.');
    }

    if (normalized.length > 2000) {
      throw new BadRequestException('Field "body" exceeds maximum length (2000 characters).');
    }

    return normalized;
  }

  private normalizeSource(value: string): string {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      throw new BadRequestException('Field "source" cannot be empty.');
    }

    if (normalized.length > 60) {
      throw new BadRequestException('Field "source" exceeds maximum length (60 characters).');
    }

    return normalized;
  }

  private normalizeThreadLimit(value: number): number {
    if (!Number.isFinite(value) || value < 1 || value > maxThreadPageLimit) {
      throw new BadRequestException(
        `Query param "limit" must be an integer between 1 and ${maxThreadPageLimit}.`,
      );
    }

    return Math.trunc(value);
  }

  private normalizeMessageLimit(value: number): number {
    if (!Number.isFinite(value) || value < 1 || value > maxMessagePageLimit) {
      throw new BadRequestException(
        `Query param "limit" must be an integer between 1 and ${maxMessagePageLimit}.`,
      );
    }

    return Math.trunc(value);
  }

  private normalizeOffset(value: number): number {
    if (!Number.isFinite(value) || value < 0) {
      throw new BadRequestException('Query param "offset" must be an integer >= 0.');
    }

    return Math.trunc(value);
  }

  private toIsoSecondsAgo(seconds: number): string {
    return new Date(Date.now() - seconds * 1000).toISOString();
  }

  private createMessageHash(body: string): string {
    return createHash('sha256').update(body).digest('hex');
  }

  private countUrls(body: string): number {
    const matches = body.match(urlPattern);
    return matches?.length ?? 0;
  }
}
