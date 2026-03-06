import { createHash } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { API_DATABASE_POOL } from '../../database/database.constants';
import type { AuthSecurityEventType } from '../security-events.constants';

interface RecordAuthSecurityEventInput {
  eventType: AuthSecurityEventType;
  userDatabaseId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}

type PostgresError = Error & {
  code?: string;
};

const normalizeOptionalString = (
  value: string | null | undefined,
  maxLength: number,
): string | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
};

const normalizeOptionalUserDatabaseId = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  if (!/^[1-9]\d*$/.test(normalized)) {
    return null;
  }

  return normalized;
};

const normalizeMetadata = (value: Record<string, unknown> | undefined): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value;
};

@Injectable()
export class AuthSecurityEventsService {
  private readonly logger = new Logger(AuthSecurityEventsService.name);

  constructor(
    @Inject(API_DATABASE_POOL)
    private readonly pool: Pool,
  ) {}

  createIdentifierHash(identifier: string): string {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    return createHash('sha256').update(normalizedIdentifier).digest('hex');
  }

  async recordBestEffort(input: RecordAuthSecurityEventInput): Promise<void> {
    try {
      await this.insertEvent(input);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Auth security event insert failed: ${message}`);
    }
  }

  private async insertEvent(input: RecordAuthSecurityEventInput): Promise<void> {
    const normalizedUserId = normalizeOptionalUserDatabaseId(input.userDatabaseId);
    const normalizedIp = normalizeOptionalString(input.ip, 64);
    const normalizedUserAgent = normalizeOptionalString(input.userAgent, 400);
    const metadata = normalizeMetadata(input.metadata);

    let serializedMetadata = '{}';
    try {
      serializedMetadata = JSON.stringify(metadata);
    } catch {}

    try {
      await this.pool.query(
        `
          INSERT INTO user_security_events (user_id, event_type, metadata, ip, user_agent)
          VALUES ($1::bigint, $2, $3::jsonb, $4::inet, $5);
        `,
        [normalizedUserId, input.eventType, serializedMetadata, normalizedIp, normalizedUserAgent],
      );
    } catch (error) {
      const postgresError = error as PostgresError;
      if (postgresError.code === '42P01') {
        // Best effort fallback while migration rollout completes.
        return;
      }

      if (postgresError.code === '22P02' && normalizedIp) {
        await this.pool.query(
          `
            INSERT INTO user_security_events (user_id, event_type, metadata, ip, user_agent)
            VALUES ($1::bigint, $2, $3::jsonb, NULL, $4);
          `,
          [normalizedUserId, input.eventType, serializedMetadata, normalizedUserAgent],
        );
        return;
      }

      throw error;
    }
  }
}
