import { loadApiEnv } from '@adottaungatto/config';
import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import type {
  CreateMessageThreadInput,
  CreateThreadMessageInput,
  MessageParticipantRole,
  MessageSummary,
  MessageThreadDetail,
  MessageThreadSummary,
  MessageThreadsPage,
} from './models/message-thread.model';

type OwnerRow = {
  userId: string;
};

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
export class MessagingRepository implements OnModuleDestroy {
  private readonly env = loadApiEnv();
  private readonly pool = new Pool({
    connectionString: this.env.DATABASE_URL,
  });

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async upsertActorUser(user: RequestUser): Promise<string> {
    const result = await this.pool.query<OwnerRow>(
      `
        INSERT INTO app_users (provider, provider_subject, email, roles)
        VALUES ($1, $2, $3, $4::jsonb)
        ON CONFLICT (provider, provider_subject)
        DO UPDATE SET
          email = EXCLUDED.email,
          roles = EXCLUDED.roles,
          updated_at = NOW()
        RETURNING id::text AS "userId";
      `,
      [user.provider, user.providerSubject, user.email, JSON.stringify(user.roles)],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('Failed to upsert messaging actor.');
    }

    return row.userId;
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
            listing_title_snapshot = message_threads.listing_title_snapshot
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
          DO NOTHING;
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

  async appendMessageToThread(input: CreateThreadMessageInput): Promise<MessageSummary> {
    const client = await this.pool.connect();

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
          SET latest_message_at = $2::timestamptz
          WHERE id = $1::bigint;
        `,
        [input.threadId, message.createdAt],
      );

      await client.query(
        `
          UPDATE message_thread_participants
          SET last_read_at = $3::timestamptz
          WHERE thread_id = $1::bigint
            AND user_id = $2::bigint;
        `,
        [input.threadId, input.senderUserId, message.createdAt],
      );

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
            p.last_read_at AS "lastReadAt",
            CASE
              WHEN p.role = 'owner'::message_participant_role THEN t.requester_user_id
              ELSE t.owner_user_id
            END AS "otherUserId",
            COUNT(*) OVER()::text AS "totalCount"
          FROM message_thread_participants p
          INNER JOIN message_threads t ON t.id = p.thread_id
          LEFT JOIN listings l ON l.id = t.listing_id
          WHERE p.user_id = $1::bigint
            AND p.archived_at IS NULL
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
          COALESCE(unread_stats."unreadCount", '0') AS "unreadCount",
          scoped_threads."totalCount",
          latest_message."latestMessageId",
          latest_message."latestMessageBody",
          latest_message."latestMessageCreatedAt",
          latest_message."latestMessageSenderRole",
          latest_message."latestMessageSenderEmail"
        FROM scoped_threads
        INNER JOIN app_users other_user
          ON other_user.id = scoped_threads."otherUserId"
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::text AS "unreadCount"
          FROM message_messages message
          WHERE message.thread_id = scoped_threads."threadId"::bigint
            AND message.sender_user_id <> $1::bigint
            AND (
              scoped_threads."lastReadAt" IS NULL
              OR message.created_at > scoped_threads."lastReadAt"
            )
        ) unread_stats ON TRUE
        LEFT JOIN LATERAL (
          SELECT
            message.id::text AS "latestMessageId",
            message.body AS "latestMessageBody",
            message.created_at::text AS "latestMessageCreatedAt",
            sender_participant.role::text AS "latestMessageSenderRole",
            sender_user.email AS "latestMessageSenderEmail"
          FROM message_messages message
          INNER JOIN message_thread_participants sender_participant
            ON sender_participant.thread_id = message.thread_id
           AND sender_participant.user_id = message.sender_user_id
          INNER JOIN app_users sender_user ON sender_user.id = message.sender_user_id
          WHERE message.thread_id = scoped_threads."threadId"::bigint
          ORDER BY message.id DESC
          LIMIT 1
        ) latest_message ON TRUE
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
            p.last_read_at AS "lastReadAt",
            CASE
              WHEN p.role = 'owner'::message_participant_role THEN t.requester_user_id
              ELSE t.owner_user_id
            END AS "otherUserId"
          FROM message_thread_participants p
          INNER JOIN message_threads t ON t.id = p.thread_id
          LEFT JOIN listings l ON l.id = t.listing_id
          WHERE p.user_id = $1::bigint
            AND t.id = $2::bigint
            AND p.archived_at IS NULL
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
          COALESCE(unread_stats."unreadCount", '0') AS "unreadCount",
          '1' AS "totalCount",
          latest_message."latestMessageId",
          latest_message."latestMessageBody",
          latest_message."latestMessageCreatedAt",
          latest_message."latestMessageSenderRole",
          latest_message."latestMessageSenderEmail"
        FROM scoped_thread
        INNER JOIN app_users other_user
          ON other_user.id = scoped_thread."otherUserId"
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::text AS "unreadCount"
          FROM message_messages message
          WHERE message.thread_id = scoped_thread."threadId"::bigint
            AND message.sender_user_id <> $1::bigint
            AND (
              scoped_thread."lastReadAt" IS NULL
              OR message.created_at > scoped_thread."lastReadAt"
            )
        ) unread_stats ON TRUE
        LEFT JOIN LATERAL (
          SELECT
            message.id::text AS "latestMessageId",
            message.body AS "latestMessageBody",
            message.created_at::text AS "latestMessageCreatedAt",
            sender_participant.role::text AS "latestMessageSenderRole",
            sender_user.email AS "latestMessageSenderEmail"
          FROM message_messages message
          INNER JOIN message_thread_participants sender_participant
            ON sender_participant.thread_id = message.thread_id
           AND sender_participant.user_id = message.sender_user_id
          INNER JOIN app_users sender_user ON sender_user.id = message.sender_user_id
          WHERE message.thread_id = scoped_thread."threadId"::bigint
          ORDER BY message.id DESC
          LIMIT 1
        ) latest_message ON TRUE;
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
        SET last_read_at = GREATEST(COALESCE(last_read_at, to_timestamp(0)), $3::timestamptz)
        WHERE thread_id = $1::bigint
          AND user_id = $2::bigint;
      `,
      [threadId, userId, readAt],
    );
  }

  private async countUnreadMessagesForUser(userId: string): Promise<number> {
    const result = await this.pool.query<CountRow>(
      `
        SELECT COUNT(*)::text AS "count"
        FROM message_thread_participants participant
        INNER JOIN message_messages message
          ON message.thread_id = participant.thread_id
        WHERE participant.user_id = $1::bigint
          AND participant.archived_at IS NULL
          AND message.sender_user_id <> $1::bigint
          AND (
            participant.last_read_at IS NULL
            OR message.created_at > participant.last_read_at
          );
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
}
