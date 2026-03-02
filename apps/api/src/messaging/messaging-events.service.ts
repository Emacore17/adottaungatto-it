import { loadApiEnv } from '@adottaungatto/config';
import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

export type MessagingThreadUpdatedEvent = {
  eventType: 'thread_updated';
  threadId: string;
  reason: 'message_created' | 'read_state_changed' | 'thread_archived' | 'thread_deleted';
  occurredAt: string;
};

export type MessagingTypingChangedEvent = {
  eventType: 'typing_changed';
  threadId: string;
  userId: string;
  isTyping: boolean;
  occurredAt: string;
};

export type MessagingStreamEvent = MessagingThreadUpdatedEvent | MessagingTypingChangedEvent;

@Injectable()
export class MessagingEventsService implements OnModuleDestroy {
  private readonly env = loadApiEnv();
  private readonly logger = new Logger(MessagingEventsService.name);
  private readonly publisher = new Redis(this.env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });

  async onModuleDestroy(): Promise<void> {
    if (this.publisher.status !== 'end') {
      this.publisher.disconnect();
    }
  }

  async publishThreadUpdated(
    userIds: string[],
    payload: Omit<MessagingThreadUpdatedEvent, 'eventType' | 'occurredAt'>,
  ): Promise<void> {
    try {
      await this.publishToUsers(userIds, {
        eventType: 'thread_updated',
        threadId: payload.threadId,
        reason: payload.reason,
        occurredAt: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.warn(
        `Unable to publish messaging realtime event (${this.normalizeError(error)}).`,
      );
    }
  }

  async publishTypingChanged(
    userIds: string[],
    payload: {
      threadId: string;
      userId: string;
      isTyping: boolean;
    },
  ): Promise<void> {
    try {
      await this.ensurePublisherReady();

      if (payload.isTyping) {
        const throttleCount = await this.publisher.incr(
          this.buildTypingRateLimitKey(payload.threadId, payload.userId),
        );
        if (throttleCount === 1) {
          await this.publisher.expire(
            this.buildTypingRateLimitKey(payload.threadId, payload.userId),
            this.env.MESSAGE_TYPING_EVENT_WINDOW_SECONDS,
          );
        }

        if (throttleCount > this.env.MESSAGE_TYPING_EVENT_MAX_REQUESTS) {
          return;
        }
      }

      const stateKey = this.buildTypingStateKey(payload.threadId, payload.userId);
      const existingState = await this.publisher.get(stateKey);
      if (payload.isTyping) {
        await this.publisher.set(stateKey, '1', 'EX', this.env.MESSAGE_TYPING_EVENT_TTL_SECONDS);
        if (existingState === '1') {
          return;
        }
      } else {
        if (existingState !== '1') {
          return;
        }
        await this.publisher.del(stateKey);
      }

      await this.publishToUsers(userIds, {
        eventType: 'typing_changed',
        threadId: payload.threadId,
        userId: payload.userId,
        isTyping: payload.isTyping,
        occurredAt: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.warn(
        `Unable to publish messaging typing event (${this.normalizeError(error)}).`,
      );
    }
  }

  async createSubscriber(userId: string): Promise<Redis> {
    const subscriber = new Redis(this.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });

    await subscriber.connect();
    await subscriber.subscribe(this.buildChannelName(userId));
    return subscriber;
  }

  private buildChannelName(userId: string): string {
    return `messages:user:${userId}`;
  }

  private buildTypingStateKey(threadId: string, userId: string): string {
    return `messages:typing:${threadId}:${userId}`;
  }

  private buildTypingRateLimitKey(threadId: string, userId: string): string {
    return `messages:typing:rate:${threadId}:${userId}`;
  }

  private async ensurePublisherReady(): Promise<void> {
    if (this.publisher.status !== 'ready') {
      await this.publisher.connect();
    }
  }

  private async publishToUsers(userIds: string[], payload: MessagingStreamEvent): Promise<void> {
    const normalizedUserIds = Array.from(
      new Set(userIds.map((value) => value.trim()).filter((value) => /^[1-9]\d*$/.test(value))),
    );
    if (normalizedUserIds.length === 0) {
      return;
    }

    await this.ensurePublisherReady();
    const message = JSON.stringify(payload);
    await Promise.all(
      normalizedUserIds.map((userId) => this.publisher.publish(this.buildChannelName(userId), message)),
    );
  }

  private normalizeError(error: unknown): string {
    if (error instanceof Error && error.message.trim().length > 0) {
      return error.message;
    }

    return 'unknown Redis error';
  }
}
