import { loadApiEnv } from '@adottaungatto/config';
import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import type { CreateListingMediaInput, ListingMediaRecord } from './models/listing-media.model';
import type {
  CreateListingInput,
  ListingRecord,
  ListingStatus,
  UpdateListingInput,
} from './models/listing.model';

type OwnerRow = {
  ownerUserId: string;
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

type ListingMediaRow = {
  id: string;
  listingId: string;
  storageKey: string;
  mimeType: string;
  fileSize: string;
  width: number | null;
  height: number | null;
  hash: string | null;
  position: number;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
};

type NextPositionRow = {
  nextPosition: string;
};

type ListingMediaIdRow = {
  id: string;
};

@Injectable()
export class ListingsRepository implements OnModuleDestroy {
  private readonly env = loadApiEnv();
  private readonly pool = new Pool({
    connectionString: this.env.DATABASE_URL,
  });

  private readonly listingSelectSql = `
    SELECT
      id::text AS "id",
      owner_user_id::text AS "ownerUserId",
      title,
      description,
      listing_type AS "listingType",
      price_amount::text AS "priceAmount",
      currency,
      age_text AS "ageText",
      sex,
      breed,
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
      deleted_at::text AS "deletedAt"
    FROM listings
  `;

  private readonly listingMediaSelectSql = `
    SELECT
      id::text AS "id",
      listing_id::text AS "listingId",
      storage_key AS "storageKey",
      mime_type AS "mimeType",
      file_size::text AS "fileSize",
      width,
      height,
      hash,
      position,
      is_primary AS "isPrimary",
      created_at::text AS "createdAt",
      updated_at::text AS "updatedAt"
    FROM listing_media
  `;

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async upsertOwnerUser(user: RequestUser): Promise<string> {
    const result = await this.pool.query<OwnerRow>(
      `
        INSERT INTO app_users (provider, provider_subject, email, roles)
        VALUES ($1, $2, $3, $4::jsonb)
        ON CONFLICT (provider, provider_subject)
        DO UPDATE SET
          email = EXCLUDED.email,
          roles = EXCLUDED.roles,
          updated_at = NOW()
        RETURNING id::text AS "ownerUserId";
      `,
      [user.provider, user.providerSubject, user.email, JSON.stringify(user.roles)],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('Failed to upsert listing owner user.');
    }

    return row.ownerUserId;
  }

  async createListing(ownerUserId: string, input: CreateListingInput): Promise<ListingRecord> {
    const result = await this.pool.query<ListingRow>(
      `
        INSERT INTO listings (
          owner_user_id,
          title,
          description,
          listing_type,
          price_amount,
          currency,
          age_text,
          sex,
          breed,
          status,
          region_id,
          province_id,
          comune_id,
          contact_name,
          contact_phone,
          contact_email,
          published_at,
          archived_at
        )
        VALUES (
          $1::bigint,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10::listing_status,
          $11::bigint,
          $12::bigint,
          $13::bigint,
          $14,
          $15,
          $16,
          $17::timestamptz,
          $18::timestamptz
        )
        RETURNING
          id::text AS "id",
          owner_user_id::text AS "ownerUserId",
          title,
          description,
          listing_type AS "listingType",
          price_amount::text AS "priceAmount",
          currency,
          age_text AS "ageText",
          sex,
          breed,
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
      [
        ownerUserId,
        input.title,
        input.description,
        input.listingType,
        input.priceAmount,
        input.currency,
        input.ageText,
        input.sex,
        input.breed,
        input.status,
        input.regionId,
        input.provinceId,
        input.comuneId,
        input.contactName,
        input.contactPhone,
        input.contactEmail,
        input.publishedAt ?? null,
        input.archivedAt ?? null,
      ],
    );

    const createdRow = result.rows[0];
    if (!createdRow) {
      throw new Error('Failed to create listing.');
    }

    return this.mapListingRow(createdRow);
  }

  async listMine(ownerUserId: string): Promise<ListingRecord[]> {
    const result = await this.pool.query<ListingRow>(
      `
        ${this.listingSelectSql}
        WHERE owner_user_id = $1::bigint
          AND deleted_at IS NULL
        ORDER BY created_at DESC;
      `,
      [ownerUserId],
    );

    return result.rows.map((row) => this.mapListingRow(row));
  }

  async findMineById(ownerUserId: string, listingId: string): Promise<ListingRecord | null> {
    const result = await this.pool.query<ListingRow>(
      `
        ${this.listingSelectSql}
        WHERE id = $1::bigint
          AND owner_user_id = $2::bigint
          AND deleted_at IS NULL
        LIMIT 1;
      `,
      [listingId, ownerUserId],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return this.mapListingRow(row);
  }

  async updateMine(
    ownerUserId: string,
    listingId: string,
    input: UpdateListingInput,
  ): Promise<ListingRecord | null> {
    const setClauses: string[] = [];
    const values: Array<string | number | null> = [];

    const addValue = (
      column: string,
      value: string | number | null,
      castSuffix?: '::bigint' | '::listing_status' | '::numeric' | '::timestamptz',
    ) => {
      values.push(value);
      const placeholder = `$${values.length}${castSuffix ?? ''}`;
      setClauses.push(`${column} = ${placeholder}`);
    };

    if (input.title !== undefined) {
      addValue('title', input.title);
    }
    if (input.description !== undefined) {
      addValue('description', input.description);
    }
    if (input.listingType !== undefined) {
      addValue('listing_type', input.listingType);
    }
    if (input.priceAmount !== undefined) {
      addValue('price_amount', input.priceAmount, '::numeric');
    }
    if (input.currency !== undefined) {
      addValue('currency', input.currency);
    }
    if (input.ageText !== undefined) {
      addValue('age_text', input.ageText);
    }
    if (input.sex !== undefined) {
      addValue('sex', input.sex);
    }
    if (input.breed !== undefined) {
      addValue('breed', input.breed);
    }
    if (input.status !== undefined) {
      addValue('status', input.status, '::listing_status');
    }
    if (input.regionId !== undefined) {
      addValue('region_id', input.regionId, '::bigint');
    }
    if (input.provinceId !== undefined) {
      addValue('province_id', input.provinceId, '::bigint');
    }
    if (input.comuneId !== undefined) {
      addValue('comune_id', input.comuneId, '::bigint');
    }
    if (input.contactName !== undefined) {
      addValue('contact_name', input.contactName);
    }
    if (input.contactPhone !== undefined) {
      addValue('contact_phone', input.contactPhone);
    }
    if (input.contactEmail !== undefined) {
      addValue('contact_email', input.contactEmail);
    }
    if (input.publishedAt !== undefined) {
      addValue('published_at', input.publishedAt, '::timestamptz');
    }
    if (input.archivedAt !== undefined) {
      addValue('archived_at', input.archivedAt, '::timestamptz');
    }

    if (setClauses.length === 0) {
      return this.findMineById(ownerUserId, listingId);
    }

    values.push(listingId);
    const listingIdIndex = values.length;
    values.push(ownerUserId);
    const ownerUserIdIndex = values.length;

    const result = await this.pool.query<ListingRow>(
      `
        UPDATE listings
        SET ${setClauses.join(', ')}
        WHERE id = $${listingIdIndex}::bigint
          AND owner_user_id = $${ownerUserIdIndex}::bigint
          AND deleted_at IS NULL
        RETURNING
          id::text AS "id",
          owner_user_id::text AS "ownerUserId",
          title,
          description,
          listing_type AS "listingType",
          price_amount::text AS "priceAmount",
          currency,
          age_text AS "ageText",
          sex,
          breed,
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
      values,
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return this.mapListingRow(row);
  }

  async softDeleteMine(ownerUserId: string, listingId: string): Promise<ListingRecord | null> {
    const result = await this.pool.query<ListingRow>(
      `
        UPDATE listings
        SET
          status = 'archived',
          archived_at = COALESCE(archived_at, NOW()),
          deleted_at = NOW()
        WHERE id = $1::bigint
          AND owner_user_id = $2::bigint
          AND deleted_at IS NULL
        RETURNING
          id::text AS "id",
          owner_user_id::text AS "ownerUserId",
          title,
          description,
          listing_type AS "listingType",
          price_amount::text AS "priceAmount",
          currency,
          age_text AS "ageText",
          sex,
          breed,
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
      [listingId, ownerUserId],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return this.mapListingRow(row);
  }

  async getNextMediaPosition(listingId: string): Promise<number> {
    const result = await this.pool.query<NextPositionRow>(
      `
        SELECT (COALESCE(MAX(position), 0) + 1)::text AS "nextPosition"
        FROM listing_media
        WHERE listing_id = $1::bigint;
      `,
      [listingId],
    );

    const row = result.rows[0];
    if (!row) {
      return 1;
    }

    return Number.parseInt(row.nextPosition, 10);
  }

  async clearPrimaryMedia(listingId: string): Promise<void> {
    await this.pool.query(
      `
        UPDATE listing_media
        SET is_primary = FALSE
        WHERE listing_id = $1::bigint
          AND is_primary = TRUE;
      `,
      [listingId],
    );
  }

  async createListingMedia(
    listingId: string,
    input: CreateListingMediaInput,
  ): Promise<ListingMediaRecord> {
    const result = await this.pool.query<ListingMediaRow>(
      `
        INSERT INTO listing_media (
          listing_id,
          storage_key,
          mime_type,
          file_size,
          width,
          height,
          hash,
          position,
          is_primary
        )
        VALUES (
          $1::bigint,
          $2,
          $3,
          $4::bigint,
          $5::integer,
          $6::integer,
          $7,
          $8::integer,
          $9
        )
        RETURNING
          id::text AS "id",
          listing_id::text AS "listingId",
          storage_key AS "storageKey",
          mime_type AS "mimeType",
          file_size::text AS "fileSize",
          width,
          height,
          hash,
          position,
          is_primary AS "isPrimary",
          created_at::text AS "createdAt",
          updated_at::text AS "updatedAt";
      `,
      [
        listingId,
        input.storageKey,
        input.mimeType,
        input.fileSize,
        input.width,
        input.height,
        input.hash,
        input.position,
        input.isPrimary,
      ],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('Failed to create listing media.');
    }

    return this.mapListingMediaRow(row);
  }

  async listMediaByListingId(listingId: string): Promise<ListingMediaRecord[]> {
    const result = await this.pool.query<ListingMediaRow>(
      `
        ${this.listingMediaSelectSql}
        WHERE listing_id = $1::bigint
        ORDER BY position ASC, created_at ASC;
      `,
      [listingId],
    );

    return result.rows.map((row) => this.mapListingMediaRow(row));
  }

  async findListingMediaById(
    listingId: string,
    mediaId: string,
  ): Promise<ListingMediaRecord | null> {
    const result = await this.pool.query<ListingMediaRow>(
      `
        ${this.listingMediaSelectSql}
        WHERE listing_id = $1::bigint
          AND id = $2::bigint
        LIMIT 1;
      `,
      [listingId, mediaId],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return this.mapListingMediaRow(row);
  }

  async deleteListingMediaById(
    listingId: string,
    mediaId: string,
  ): Promise<ListingMediaRecord | null> {
    const result = await this.pool.query<ListingMediaRow>(
      `
        DELETE FROM listing_media
        WHERE listing_id = $1::bigint
          AND id = $2::bigint
        RETURNING
          id::text AS "id",
          listing_id::text AS "listingId",
          storage_key AS "storageKey",
          mime_type AS "mimeType",
          file_size::text AS "fileSize",
          width,
          height,
          hash,
          position,
          is_primary AS "isPrimary",
          created_at::text AS "createdAt",
          updated_at::text AS "updatedAt";
      `,
      [listingId, mediaId],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return this.mapListingMediaRow(row);
  }

  async reorderListingMediaPositions(
    listingId: string,
    orderedMediaIds: string[],
  ): Promise<ListingMediaRecord[]> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const existingRows = await client.query<ListingMediaIdRow>(
        `
          SELECT id::text AS "id"
          FROM listing_media
          WHERE listing_id = $1::bigint
          ORDER BY position ASC, created_at ASC;
        `,
        [listingId],
      );

      const existingIds = existingRows.rows.map((row) => row.id);
      const providedIds = new Set(orderedMediaIds);
      const sameLength = existingIds.length === orderedMediaIds.length;
      const sameSet = existingIds.every((id) => providedIds.has(id));

      if (!sameLength || !sameSet) {
        throw new Error('Listing media reorder payload mismatch.');
      }

      await client.query(
        `
          UPDATE listing_media
          SET position = position + 1000
          WHERE listing_id = $1::bigint;
        `,
        [listingId],
      );

      for (const [index, mediaId] of orderedMediaIds.entries()) {
        await client.query(
          `
            UPDATE listing_media
            SET position = $1::integer
            WHERE listing_id = $2::bigint
              AND id = $3::bigint;
          `,
          [index + 1, listingId, mediaId],
        );
      }

      const reorderedRows = await client.query<ListingMediaRow>(
        `
          ${this.listingMediaSelectSql}
          WHERE listing_id = $1::bigint
          ORDER BY position ASC, created_at ASC;
        `,
        [listingId],
      );

      await client.query('COMMIT');
      return reorderedRows.rows.map((row) => this.mapListingMediaRow(row));
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteListingMediaByStorageKey(storageKey: string): Promise<void> {
    await this.pool.query(
      `
        DELETE FROM listing_media
        WHERE storage_key = $1;
      `,
      [storageKey],
    );
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

  private mapListingMediaRow(row: ListingMediaRow): ListingMediaRecord {
    return {
      id: row.id,
      listingId: row.listingId,
      storageKey: row.storageKey,
      mimeType: row.mimeType,
      fileSize: row.fileSize,
      width: row.width,
      height: row.height,
      hash: row.hash,
      position: row.position,
      isPrimary: row.isPrimary,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
