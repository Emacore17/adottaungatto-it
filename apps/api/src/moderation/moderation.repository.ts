import { loadApiEnv } from '@adottaungatto/config';
import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import type { ListingRecord, ListingStatus } from '../listings/models/listing.model';
import type {
  AdminAuditLogRecord,
  ModerationAction,
  ModerationQueueItem,
} from './models/moderation.model';

type OwnerRow = {
  userId: string;
};

type ListingRow = {
  id: string;
  ownerUserId: string;
  title: string;
  description: string;
  listingType: string;
  priceAmount: string | null;
  currency: string;
  ageText: string;
  sex: string;
  breed: string | null;
  status: ListingStatus;
  regionId: string;
  provinceId: string;
  comuneId: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

type ModerationQueueRow = ListingRow & {
  ownerEmail: string;
  regionName: string;
  provinceName: string;
  provinceSigla: string;
  comuneName: string;
  mediaCount: string;
};

type AuditLogRow = {
  id: string;
  actorUserId: string;
  action: ModerationAction;
  targetType: string;
  targetId: string;
  reason: string;
  fromStatus: ListingStatus | null;
  toStatus: ListingStatus | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

type ApplyModerationActionInput = {
  actorUserId: string;
  listingId: string;
  action: ModerationAction;
  reason: string;
  fromStatus: ListingStatus;
  toStatus: ListingStatus;
  metadata: Record<string, unknown>;
};

@Injectable()
export class ModerationRepository implements OnModuleDestroy {
  private readonly env = loadApiEnv();
  private readonly pool = new Pool({
    connectionString: this.env.DATABASE_URL,
  });

  private readonly listingSelectSql = `
    SELECT
      l.id::text AS "id",
      l.owner_user_id::text AS "ownerUserId",
      l.title AS "title",
      l.description AS "description",
      l.listing_type AS "listingType",
      l.price_amount::text AS "priceAmount",
      l.currency AS "currency",
      l.age_text AS "ageText",
      l.sex AS "sex",
      l.breed AS "breed",
      l.status::text AS "status",
      l.region_id::text AS "regionId",
      l.province_id::text AS "provinceId",
      l.comune_id::text AS "comuneId",
      l.contact_name AS "contactName",
      l.contact_phone AS "contactPhone",
      l.contact_email AS "contactEmail",
      l.published_at::text AS "publishedAt",
      l.archived_at::text AS "archivedAt",
      l.created_at::text AS "createdAt",
      l.updated_at::text AS "updatedAt",
      l.deleted_at::text AS "deletedAt"
    FROM listings l
  `;

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
      throw new Error('Failed to upsert moderation actor.');
    }

    return row.userId;
  }

  async listPendingQueue(limit: number): Promise<ModerationQueueItem[]> {
    const result = await this.pool.query<ModerationQueueRow>(
      `
        SELECT
          l.id::text AS "id",
          l.owner_user_id::text AS "ownerUserId",
          l.title AS "title",
          l.description AS "description",
          l.listing_type AS "listingType",
          l.price_amount::text AS "priceAmount",
          l.currency AS "currency",
          l.age_text AS "ageText",
          l.sex AS "sex",
          l.breed AS "breed",
          l.status::text AS "status",
          l.region_id::text AS "regionId",
          l.province_id::text AS "provinceId",
          l.comune_id::text AS "comuneId",
          l.contact_name AS "contactName",
          l.contact_phone AS "contactPhone",
          l.contact_email AS "contactEmail",
          l.published_at::text AS "publishedAt",
          l.archived_at::text AS "archivedAt",
          l.created_at::text AS "createdAt",
          l.updated_at::text AS "updatedAt",
          l.deleted_at::text AS "deletedAt",
          u.email AS "ownerEmail",
          r.name AS "regionName",
          p.name AS "provinceName",
          p.sigla AS "provinceSigla",
          c.name AS "comuneName",
          COALESCE(media_stats.mediaCount, '0') AS "mediaCount"
        FROM listings l
        INNER JOIN app_users u
          ON u.id = l.owner_user_id
        INNER JOIN regions r
          ON r.id = l.region_id
        INNER JOIN provinces p
          ON p.id = l.province_id
        INNER JOIN comuni c
          ON c.id = l.comune_id
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::text AS "mediaCount"
          FROM listing_media lm
          WHERE lm.listing_id = l.id
        ) media_stats ON TRUE
        WHERE l.status = 'pending_review'
          AND l.deleted_at IS NULL
        ORDER BY l.created_at ASC
        LIMIT $1::integer;
      `,
      [limit],
    );

    return result.rows.map((row) => this.mapModerationQueueRow(row));
  }

  async findListingById(listingId: string): Promise<ListingRecord | null> {
    const result = await this.pool.query<ListingRow>(
      `
        ${this.listingSelectSql}
        WHERE l.id = $1::bigint
          AND l.deleted_at IS NULL
        LIMIT 1;
      `,
      [listingId],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return this.mapListingRow(row);
  }

  async applyModerationAction(
    input: ApplyModerationActionInput,
  ): Promise<{ listing: ListingRecord; auditLog: AdminAuditLogRecord } | null> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const updatedListingResult = await client.query<ListingRow>(
        `
          UPDATE listings
          SET
            status = $1::listing_status,
            published_at = CASE
              WHEN $1::listing_status = 'published'
                THEN COALESCE(published_at, NOW())
              ELSE published_at
            END
          WHERE id = $2::bigint
            AND status = $3::listing_status
            AND deleted_at IS NULL
          RETURNING
            id::text AS "id",
            owner_user_id::text AS "ownerUserId",
            title AS "title",
            description AS "description",
            listing_type AS "listingType",
            price_amount::text AS "priceAmount",
            currency AS "currency",
            age_text AS "ageText",
            sex AS "sex",
            breed AS "breed",
            status::text AS "status",
            region_id::text AS "regionId",
            province_id::text AS "provinceId",
            comune_id::text AS "comuneId",
            contact_name AS "contactName",
            contact_phone AS "contactPhone",
            contact_email AS "contactEmail",
            published_at::text AS "publishedAt",
            archived_at::text AS "archivedAt",
            created_at::text AS "createdAt",
            updated_at::text AS "updatedAt",
            deleted_at::text AS "deletedAt";
        `,
        [input.toStatus, input.listingId, input.fromStatus],
      );

      const updatedListingRow = updatedListingResult.rows[0];
      if (!updatedListingRow) {
        await client.query('ROLLBACK');
        return null;
      }

      const auditLogResult = await client.query<AuditLogRow>(
        `
          INSERT INTO admin_audit_logs (
            actor_user_id,
            action,
            target_type,
            target_id,
            reason,
            from_status,
            to_status,
            metadata
          )
          VALUES (
            $1::bigint,
            $2,
            'listing',
            $3::bigint,
            $4,
            $5::listing_status,
            $6::listing_status,
            $7::jsonb
          )
          RETURNING
            id::text AS "id",
            actor_user_id::text AS "actorUserId",
            action AS "action",
            target_type AS "targetType",
            target_id::text AS "targetId",
            reason AS "reason",
            from_status::text AS "fromStatus",
            to_status::text AS "toStatus",
            metadata AS "metadata",
            created_at::text AS "createdAt";
        `,
        [
          input.actorUserId,
          input.action,
          input.listingId,
          input.reason,
          input.fromStatus,
          input.toStatus,
          JSON.stringify(input.metadata),
        ],
      );

      const auditLogRow = auditLogResult.rows[0];
      if (!auditLogRow) {
        await client.query('ROLLBACK');
        throw new Error('Failed to insert moderation audit log.');
      }

      await client.query('COMMIT');

      return {
        listing: this.mapListingRow(updatedListingRow),
        auditLog: this.mapAuditLogRow(auditLogRow),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findLatestAuditLogByListingId(listingId: string): Promise<AdminAuditLogRecord | null> {
    const result = await this.pool.query<AuditLogRow>(
      `
        SELECT
          id::text AS "id",
          actor_user_id::text AS "actorUserId",
          action AS "action",
          target_type AS "targetType",
          target_id::text AS "targetId",
          reason AS "reason",
          from_status::text AS "fromStatus",
          to_status::text AS "toStatus",
          metadata AS "metadata",
          created_at::text AS "createdAt"
        FROM admin_audit_logs
        WHERE target_type = 'listing'
          AND target_id = $1::bigint
        ORDER BY created_at DESC
        LIMIT 1;
      `,
      [listingId],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return this.mapAuditLogRow(row);
  }

  private mapListingRow(row: ListingRow): ListingRecord {
    return {
      id: row.id,
      ownerUserId: row.ownerUserId,
      title: row.title,
      description: row.description,
      listingType: row.listingType,
      priceAmount: row.priceAmount,
      currency: row.currency,
      ageText: row.ageText,
      sex: row.sex,
      breed: row.breed,
      status: row.status,
      regionId: row.regionId,
      provinceId: row.provinceId,
      comuneId: row.comuneId,
      contactName: row.contactName,
      contactPhone: row.contactPhone,
      contactEmail: row.contactEmail,
      publishedAt: row.publishedAt,
      archivedAt: row.archivedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    };
  }

  private mapModerationQueueRow(row: ModerationQueueRow): ModerationQueueItem {
    return {
      ...this.mapListingRow(row),
      ownerEmail: row.ownerEmail,
      regionName: row.regionName,
      provinceName: row.provinceName,
      provinceSigla: row.provinceSigla,
      comuneName: row.comuneName,
      mediaCount: Number.parseInt(row.mediaCount, 10),
    };
  }

  private mapAuditLogRow(row: AuditLogRow): AdminAuditLogRecord {
    return {
      id: row.id,
      actorUserId: row.actorUserId,
      action: row.action,
      targetType: row.targetType,
      targetId: row.targetId,
      reason: row.reason,
      fromStatus: row.fromStatus,
      toStatus: row.toStatus,
      metadata: row.metadata ?? {},
      createdAt: row.createdAt,
    };
  }
}
