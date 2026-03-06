import { loadApiEnv } from '@adottaungatto/config';
import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { API_DATABASE_POOL } from '../database/database.constants';
import { upsertAppUserByIdentity } from '../users/upsert-app-user-by-identity';
import type {
  CreateMessageThreadInput,
  CreateThreadMessageInput,
  MessageParticipantRole,
  MessageSummary,
  MessageThreadDetail,
  MessageThreadSummary,
  MessageThreadsPage,
} from './models/message-thread.model';

type ListingMessagingRow = {
  listingId: string;
  listingTitle: string;
  ownerUserId: string;
  ownerProviderSubject: string;
  ownerEmail: string;
};

type ThreadIdRow = {
  threadId: string;
};

type CountRow = {
  count: string;
};

type UserIdRow = {
  userId: string;
};

type ThreadSummaryRow = {
  threadId: string;
  listingId: string;
  listingTitle: string;
  listingStatus: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
  latestMessageAt: string;
  viewerRole: MessageParticipantRole;
  otherParticipantEmail: string;
  otherParticipantProviderSubject: string;
  unreadCount: string;
  totalCount: string;
  latestMessageId: string | null;
  latestMessageBody: string | null;
  latestMessageCreatedAt: string | null;
  latestMessageSenderRole: MessageParticipantRole | null;
  latestMessageSenderEmail: string | null;
};

type MessageRow = {
  messageId: string;
  threadId: string;
  senderRole: MessageParticipantRole;
  senderEmail: string;
  body: string;
  createdAt: string;
};

@Injectable()
export class MessagingRepository {
  private readonly env = loadApiEnv();

  constructor(
    @Inject(API_DATABASE_POOL)
    private readonly pool: Pool,
  ) {}

  async upsertActorUser(user: RequestUser): Promise<string> {
    return upsertAppUserByIdentity(this.pool, user);
  }

  async findPublishedListingForMessaging(listingId: string): Promise<ListingMessagingRow | null> {
    const result = await this.pool.query<ListingMessagingRow>(
      `
        SELECT
          l.id::text AS "listingId",
          l.title AS "listingTitle",
          l.owner_user_id::text AS "ownerUserId",
          owner.provider_subject AS "ownerProviderSubject",
          owner.email AS "ownerEmail"
        FROM listings l
        INNER JOIN app_users owner ON owner.id = l.owner_user_id
        WHERE l.id = $1::bigint
          AND l.status = 'published'
          AND l.deleted_at IS NULL
        LIMIT 1;
      `,
      [listingId],
    );

    return result.rows[0] ?? null;
  }

  async findThreadIdByListingAndUsers(
    listingId: string,
    ownerUserId: string,
    requesterUserId: string,
  ): Promise<string | null> {
    const result = await this.pool.query<ThreadIdRow>(
      `
        SELECT id::text AS "threadId"
        FROM message_threads
        WHERE listing_id = $1::bigint
          AND owner_user_id = $2::bigint
          AND requester_user_id = $3::bigint
          AND deleted_at IS NULL
        LIMIT 1;
      `,
      [listingId, ownerUserId, requesterUserId],
    );

    return result.rows[0]?.threadId ?? null;
  }

  async getOrCreateThread(input: CreateMessageThreadInput): Promise<string> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const threadResult = await client.query<ThreadIdRow>(
        `
          INSERT INTO message_threads (
            listing_id,
            owner_user_id,
            requester_user_id,
            listing_title_snapshot,
            source
          )
          VALUES (
            $1::bigint,
            $2::bigint,
            $3::bigint,
            $4,
            $5
          )
          ON CONFLICT (listing_id, owner_user_id, requester_user_id)
          DO UPDATE SET
            listing_title_snapshot = EXCLUDED.listing_title_snapshot,
            source = EXCLUDED.source,
            deleted_at = NULL,
            deleted_by_user_id = NULL,
            updated_at = NOW()
          RETURNING id::text AS "threadId";
        `,
        [
          input.listingId,
          input.ownerUserId,
          input.requesterUserId,
          input.listingTitle,
          input.source,
        ],
      );

      const threadId = threadResult.rows[0]?.threadId;
      if (!threadId) {
        throw new Error('Failed to create messaging thread.');
      }

      await client.query(
        `
          INSERT INTO message_thread_participants (
            thread_id,
            user_id,
            role
          )
          VALUES
            ($1::bigint, $2::bigint, 'owner'::message_participant_role),
            ($1::bigint, $3::bigint, 'requester'::message_participant_role)
          ON CONFLICT (thread_id, user_id)
          DO UPDATE SET
            archived_at = NULL,
            updated_at = NOW();
        `,
        [threadId, input.ownerUserId, input.requesterUserId],
      );

      await client.query('COMMIT');
      return threadId;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async countRecentThreadsByRequester(requesterUserId: string, sinceIso: string): Promise<number> {
    const result = await this.pool.query<CountRow>(
      `
        SELECT COUNT(*)::text AS "count"
        FROM message_threads
        WHERE requester_user_id = $1::bigint
          AND created_at >= $2::timestamptz;
      `,
      [requesterUserId, sinceIso],
    );

    return Number.parseInt(result.rows[0]?.count ?? '0', 10) || 0;
  }

  async countRecentMessagesBySender(senderUserId: string, sinceIso: string): Promise<number> {
    const result = await this.pool.query<CountRow>(
      `
        SELECT COUNT(*)::text AS "count"
        FROM message_messages
        WHERE sender_user_id = $1::bigint
          AND created_at >= $2::timestamptz;
      `,
      [senderUserId, sinceIso],
    );

    return Number.parseInt(result.rows[0]?.count ?? '0', 10) || 0;
  }

  async countRecentDuplicateMessages(
    threadId: string,
    senderUserId: string,
    messageHash: string,
    sinceIso: string,
  ): Promise<number> {
    const result = await this.pool.query<CountRow>(
      `
        SELECT COUNT(*)::text AS "count"
        FROM message_messages
        WHERE thread_id = $1::bigint
          AND sender_user_id = $2::bigint
          AND message_hash = $3
          AND created_at >= $4::timestamptz;
      `,
      [threadId, senderUserId, messageHash, sinceIso],
    );

    return Number.parseInt(result.rows[0]?.count ?? '0', 10) || 0;
  }

  async findLatestMessageCreatedAtBySender(
    threadId: string,
    senderUserId: string,
  ): Promise<string | null> {
    const result = await this.pool.query<{ createdAt: string }>(
      `
        SELECT created_at::text AS "createdAt"
        FROM message_messages
        WHERE thread_id = $1::bigint
          AND sender_user_id = $2::bigint
        ORDER BY id DESC
        LIMIT 1;
      `,
      [threadId, senderUserId],
    );

    return result.rows[0]?.createdAt ?? null;
  }

  async getThreadMessageCount(threadId: string): Promise<number> {
    const result = await this.pool.query<{ messagesCount: string }>(
      `
        SELECT messages_count::text AS "messagesCount"
        FROM message_threads
        WHERE id = $1::bigint
          AND deleted_at IS NULL
        LIMIT 1;
      `,
      [threadId],
    );

    return Number.parseInt(result.rows[0]?.messagesCount ?? '0', 10) || 0;
  }

  async appendMessageToThread(input: CreateThreadMessageInput): Promise<MessageSummary> {
    const client = await this.pool.connect();
    const messagePreview = this.buildMessagePreview(input.body);

    try {
      await client.query('BEGIN');

      const messageResult = await client.query<MessageRow>(
        `
          WITH inserted AS (
            INSERT INTO message_messages (
              thread_id,
              sender_user_id,
              body,
              message_hash
            )
            VALUES (
              $1::bigint,
              $2::bigint,
              $3,
              $4
            )
            RETURNING
              id::text AS "messageId",
              thread_id::text AS "threadId",
              sender_user_id::text AS "senderUserId",
              body AS "body",
              created_at::text AS "createdAt"
          )
          SELECT
            inserted."messageId",
            inserted."threadId",
            participant.role::text AS "senderRole",
            sender.email AS "senderEmail",
            inserted."body",
            inserted."createdAt"
          FROM inserted
          INNER JOIN message_thread_participants participant
            ON participant.thread_id = inserted."threadId"::bigint
           AND participant.user_id = $2::bigint
          INNER JOIN app_users sender
            ON sender.id = $2::bigint
          LIMIT 1;
        `,
        [input.threadId, input.senderUserId, input.body, input.messageHash],
      );

      const message = messageResult.rows[0];
      if (!message) {
        throw new Error('Failed to append thread message.');
      }

      await client.query(
        `
          UPDATE message_threads
          SET
            latest_message_at = $2::timestamptz,
            latest_message_id = $3::bigint,
            latest_message_preview = $4::varchar(180),
            latest_message_sender_user_id = $5::bigint,
            messages_count = message_threads.messages_count + 1,
            deleted_at = NULL,
            deleted_by_user_id = NULL
          WHERE id = $1::bigint;
        `,
        [
          input.threadId,
          message.createdAt,
          message.messageId,
          messagePreview,
          input.senderUserId,
        ],
      );

      await client.query(
        `
          UPDATE message_thread_participants
          SET
            archived_at = NULL,
            last_read_at = CASE
              WHEN user_id = $2::bigint THEN $3::timestamptz
              ELSE last_read_at
            END,
            unread_count = CASE
              WHEN user_id = $2::bigint THEN 0
              ELSE unread_count + 1
            END
          WHERE thread_id = $1::bigint
        ;
        `,
        [input.threadId, input.senderUserId, message.createdAt],
      );

      if (this.env.MESSAGE_EMAIL_NOTIFICATIONS_ENABLED) {
        await client.query(
          `
            INSERT INTO notification_outbox (
              channel,
              event_type,
              dedupe_key,
              payload,
              max_attempts
            )
            SELECT
              'email',
              'message_received',
              CONCAT('message_received_email:', $2::text, ':', recipient.user_id::text),
              jsonb_build_object(
                'threadId', thread.id::text,
                'messageId', $2::text,
                'listingId', thread.listing_id::text,
                'listingTitle', thread.listing_title_snapshot,
                'recipientUserId', recipient.user_id::text,
                'recipientEmail', recipient_user.email,
                'senderUserId', sender.id::text,
                'senderEmail', sender.email,
                'messagePreview', $3::text,
                'messageCreatedAt', $4::text
              ),
              $5::integer
            FROM message_threads thread
            INNER JOIN message_thread_participants recipient
              ON recipient.thread_id = thread.id
             AND recipient.user_id <> $6::bigint
             AND recipient.archived_at IS NULL
            INNER JOIN app_users recipient_user
              ON recipient_user.id = recipient.user_id
             AND recipient_user.message_email_notifications_enabled = TRUE
            INNER JOIN app_users sender
              ON sender.id = $6::bigint
            WHERE thread.id = $1::bigint
            ON CONFLICT (dedupe_key) DO NOTHING;
          `,
          [
            input.threadId,
            message.messageId,
            messagePreview,
            message.createdAt,
            this.env.MESSAGE_EMAIL_NOTIFICATION_MAX_ATTEMPTS,
            input.senderUserId,
          ],
        );
      }

      await client.query('COMMIT');
      return this.mapMessageRow(message);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listThreadsForUser(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<MessageThreadsPage> {
    const result = await this.pool.query<ThreadSummaryRow>(
      `
        WITH scoped_threads AS (
          SELECT
            t.id::text AS "threadId",
            t.listing_id::text AS "listingId",
            t.listing_title_snapshot AS "listingTitle",
            l.status::text AS "listingStatus",
            t.source AS "source",
            t.created_at::text AS "createdAt",
            t.updated_at::text AS "updatedAt",
            t.latest_message_at::text AS "latestMessageAt",
            p.role::text AS "viewerRole",
            p.unread_count::text AS "unreadCount",
            CASE
              WHEN p.role = 'owner'::message_participant_role THEN t.requester_user_id
              ELSE t.owner_user_id
            END AS "otherUserId",
            t.latest_message_id::text AS "latestMessageId",
            t.latest_message_preview AS "latestMessageBody",
            t.latest_message_sender_user_id::text AS "latestMessageSenderUserId",
            COUNT(*) OVER()::text AS "totalCount"
          FROM message_thread_participants p
          INNER JOIN message_threads t ON t.id = p.thread_id
          LEFT JOIN listings l ON l.id = t.listing_id
          WHERE p.user_id = $1::bigint
            AND p.archived_at IS NULL
            AND t.deleted_at IS NULL
          ORDER BY t.latest_message_at DESC, t.id DESC
          LIMIT $2::integer
          OFFSET $3::integer
        )
        SELECT
          scoped_threads."threadId",
          scoped_threads."listingId",
          scoped_threads."listingTitle",
          scoped_threads."listingStatus",
          scoped_threads."source",
          scoped_threads."createdAt",
          scoped_threads."updatedAt",
          scoped_threads."latestMessageAt",
          scoped_threads."viewerRole",
          other_user.email AS "otherParticipantEmail",
          other_user.provider_subject AS "otherParticipantProviderSubject",
          scoped_threads."unreadCount",
          scoped_threads."totalCount",
          scoped_threads."latestMessageId",
          scoped_threads."latestMessageBody",
          scoped_threads."latestMessageAt" AS "latestMessageCreatedAt",
          latest_sender_participant.role::text AS "latestMessageSenderRole",
          latest_sender.email AS "latestMessageSenderEmail"
        FROM scoped_threads
        INNER JOIN app_users other_user
          ON other_user.id = scoped_threads."otherUserId"
        LEFT JOIN app_users latest_sender
          ON latest_sender.id = scoped_threads."latestMessageSenderUserId"::bigint
        LEFT JOIN message_thread_participants latest_sender_participant
          ON latest_sender_participant.thread_id = scoped_threads."threadId"::bigint
         AND latest_sender_participant.user_id = scoped_threads."latestMessageSenderUserId"::bigint
        ORDER BY scoped_threads."latestMessageAt" DESC, scoped_threads."threadId" DESC;
      `,
      [userId, limit, offset],
    );

    const unreadMessages = await this.countUnreadMessagesForUser(userId);
    const total = Number.parseInt(result.rows[0]?.totalCount ?? '0', 10) || 0;

    return {
      threads: result.rows.map((row) => this.mapThreadSummaryRow(row)),
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
      unreadMessages,
    };
  }

  async findThreadForUser(userId: string, threadId: string): Promise<MessageThreadSummary | null> {
    const result = await this.pool.query<ThreadSummaryRow>(
      `
        WITH scoped_thread AS (
          SELECT
            t.id::text AS "threadId",
            t.listing_id::text AS "listingId",
            t.listing_title_snapshot AS "listingTitle",
            l.status::text AS "listingStatus",
            t.source AS "source",
            t.created_at::text AS "createdAt",
            t.updated_at::text AS "updatedAt",
            t.latest_message_at::text AS "latestMessageAt",
            p.role::text AS "viewerRole",
            p.unread_count::text AS "unreadCount",
            CASE
              WHEN p.role = 'owner'::message_participant_role THEN t.requester_user_id
              ELSE t.owner_user_id
            END AS "otherUserId",
            t.latest_message_id::text AS "latestMessageId",
            t.latest_message_preview AS "latestMessageBody",
            t.latest_message_sender_user_id::text AS "latestMessageSenderUserId"
          FROM message_thread_participants p
          INNER JOIN message_threads t ON t.id = p.thread_id
          LEFT JOIN listings l ON l.id = t.listing_id
          WHERE p.user_id = $1::bigint
            AND t.id = $2::bigint
            AND p.archived_at IS NULL
            AND t.deleted_at IS NULL
          LIMIT 1
        )
        SELECT
          scoped_thread."threadId",
          scoped_thread."listingId",
          scoped_thread."listingTitle",
          scoped_thread."listingStatus",
          scoped_thread."source",
          scoped_thread."createdAt",
          scoped_thread."updatedAt",
          scoped_thread."latestMessageAt",
          scoped_thread."viewerRole",
          other_user.email AS "otherParticipantEmail",
          other_user.provider_subject AS "otherParticipantProviderSubject",
          scoped_thread."unreadCount",
          '1' AS "totalCount",
          scoped_thread."latestMessageId",
          scoped_thread."latestMessageBody",
          scoped_thread."latestMessageAt" AS "latestMessageCreatedAt",
          latest_sender_participant.role::text AS "latestMessageSenderRole",
          latest_sender.email AS "latestMessageSenderEmail"
        FROM scoped_thread
        INNER JOIN app_users other_user
          ON other_user.id = scoped_thread."otherUserId"
        LEFT JOIN app_users latest_sender
          ON latest_sender.id = scoped_thread."latestMessageSenderUserId"::bigint
        LEFT JOIN message_thread_participants latest_sender_participant
          ON latest_sender_participant.thread_id = scoped_thread."threadId"::bigint
         AND latest_sender_participant.user_id = scoped_thread."latestMessageSenderUserId"::bigint;
      `,
      [userId, threadId],
    );

    const row = result.rows[0];
    return row ? this.mapThreadSummaryRow(row) : null;
  }

  async listMessagesForThread(
    threadId: string,
    limit: number,
    beforeMessageId: string | null,
  ): Promise<{ messages: MessageSummary[]; hasMore: boolean }> {
    const values: Array<string | number> = [threadId];
    const beforeClause =
      beforeMessageId === null
        ? ''
        : (() => {
            values.push(beforeMessageId);
            return `AND message.id < $${values.length}::bigint`;
          })();

    values.push(limit + 1);

    const result = await this.pool.query<MessageRow>(
      `
        SELECT
          ordered."messageId",
          ordered."threadId",
          ordered."senderRole",
          ordered."senderEmail",
          ordered."body",
          ordered."createdAt"
        FROM (
          SELECT
            message.id::text AS "messageId",
            message.thread_id::text AS "threadId",
            participant.role::text AS "senderRole",
            sender.email AS "senderEmail",
            message.body AS "body",
            message.created_at::text AS "createdAt"
          FROM message_messages message
          INNER JOIN message_thread_participants participant
            ON participant.thread_id = message.thread_id
           AND participant.user_id = message.sender_user_id
          INNER JOIN app_users sender ON sender.id = message.sender_user_id
          WHERE message.thread_id = $1::bigint
            ${beforeClause}
          ORDER BY message.id DESC
          LIMIT $${values.length}::integer
        ) ordered
        ORDER BY ordered."messageId" ASC;
      `,
      values,
    );

    const hasMore = result.rows.length > limit;
    const rows = hasMore ? result.rows.slice(1) : result.rows;

    return {
      messages: rows.map((row) => this.mapMessageRow(row)),
      hasMore,
    };
  }

  async markThreadRead(threadId: string, userId: string, readAt: string): Promise<void> {
    await this.pool.query(
      `
        UPDATE message_thread_participants
        SET
          last_read_at = GREATEST(COALESCE(last_read_at, to_timestamp(0)), $3::timestamptz),
          unread_count = 0
        WHERE thread_id = $1::bigint
          AND user_id = $2::bigint;
      `,
      [threadId, userId, readAt],
    );
  }

  async archiveThreadForUser(threadId: string, userId: string, archivedAt: string): Promise<boolean> {
    const result = await this.pool.query(
      `
        UPDATE message_thread_participants participant
        SET
          archived_at = $3::timestamptz,
          unread_count = 0
        FROM message_threads thread
        WHERE participant.thread_id = $1::bigint
          AND participant.user_id = $2::bigint
          AND thread.id = participant.thread_id
          AND thread.deleted_at IS NULL;
      `,
      [threadId, userId, archivedAt],
    );

    return (result.rowCount ?? 0) > 0;
  }

  async restoreThreadForUser(threadId: string, userId: string): Promise<boolean> {
    const result = await this.pool.query(
      `
        UPDATE message_thread_participants participant
        SET archived_at = NULL
        FROM message_threads thread
        WHERE participant.thread_id = $1::bigint
          AND participant.user_id = $2::bigint
          AND thread.id = participant.thread_id
          AND thread.deleted_at IS NULL;
      `,
      [threadId, userId],
    );

    return (result.rowCount ?? 0) > 0;
  }

  async deleteThreadForEveryone(
    threadId: string,
    actorUserId: string,
  ): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const deleteResult = await client.query(
        `
          DELETE FROM message_threads thread
          WHERE thread.id = $1::bigint
            AND EXISTS (
              SELECT 1
              FROM message_thread_participants participant
              WHERE participant.thread_id = thread.id
                AND participant.user_id = $2::bigint
            )
          RETURNING thread.id::text AS "threadId";
        `,
        [threadId, actorUserId],
      );

      if ((deleteResult.rowCount ?? 0) === 0) {
        await client.query('ROLLBACK');
        return false;
      }

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listThreadParticipantUserIds(threadId: string): Promise<string[]> {
    const result = await this.pool.query<UserIdRow>(
      `
        SELECT user_id::text AS "userId"
        FROM message_thread_participants
        WHERE thread_id = $1::bigint
          AND archived_at IS NULL;
      `,
      [threadId],
    );

    return result.rows.map((row) => row.userId);
  }

  private async countUnreadMessagesForUser(userId: string): Promise<number> {
    const result = await this.pool.query<CountRow>(
      `
        SELECT COALESCE(SUM(participant.unread_count), 0)::text AS "count"
        FROM message_thread_participants participant
        INNER JOIN message_threads thread
          ON thread.id = participant.thread_id
        WHERE participant.user_id = $1::bigint
          AND participant.archived_at IS NULL
          AND thread.deleted_at IS NULL;
      `,
      [userId],
    );

    return Number.parseInt(result.rows[0]?.count ?? '0', 10) || 0;
  }

  private mapThreadSummaryRow(row: ThreadSummaryRow): MessageThreadSummary {
    return {
      id: row.threadId,
      listingId: row.listingId,
      listingTitle: row.listingTitle,
      listingStatus: row.listingStatus,
      source: row.source,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      latestMessageAt: row.latestMessageAt,
      unreadCount: Number.parseInt(row.unreadCount, 10) || 0,
      viewerRole: row.viewerRole,
      otherParticipant: {
        role: row.viewerRole === 'owner' ? 'requester' : 'owner',
        email: row.otherParticipantEmail,
        providerSubject: row.otherParticipantProviderSubject,
      },
      latestMessage:
        row.latestMessageId &&
        row.latestMessageBody &&
        row.latestMessageCreatedAt &&
        row.latestMessageSenderRole &&
        row.latestMessageSenderEmail
          ? {
              id: row.latestMessageId,
              threadId: row.threadId,
              senderRole: row.latestMessageSenderRole,
              senderEmail: row.latestMessageSenderEmail,
              body: row.latestMessageBody,
              createdAt: row.latestMessageCreatedAt,
            }
          : null,
    };
  }

  private mapMessageRow(row: MessageRow): MessageSummary {
    return {
      id: row.messageId,
      threadId: row.threadId,
      senderRole: row.senderRole,
      senderEmail: row.senderEmail,
      body: row.body,
      createdAt: row.createdAt,
    };
  }

  private buildMessagePreview(body: string): string {
    const normalized = body.replace(/\s+/g, ' ').trim();
    if (normalized.length <= 180) {
      return normalized;
    }

    return `${normalized.slice(0, 177)}...`;
  }
}
