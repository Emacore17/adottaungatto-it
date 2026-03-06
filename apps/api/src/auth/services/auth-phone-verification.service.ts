import { loadApiEnv } from '@adottaungatto/config';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { Pool } from 'pg';
import { UsersService } from '../../users/users.service';
import { API_DATABASE_POOL } from '../../database/database.constants';
import type { RequestUser } from '../interfaces/request-user.interface';
import { AuthPhoneVerificationDeliveryService } from './auth-phone-verification-delivery.service';

type PhoneVerificationChallengeRow = {
  codeHash: string;
  attempts: number;
  expiresAt: string;
  verifiedAt: string | null;
};

const normalizePhoneE164 = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const compact = trimmed.replace(/[\s()-]/g, '');
  const normalized = compact.startsWith('00') ? `+${compact.slice(2)}` : compact;

  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    return null;
  }

  return normalized;
};

const normalizeVerificationCode = (rawCode: unknown, expectedLength: number): string => {
  if (typeof rawCode !== 'string') {
    throw new BadRequestException('Field "code" must be a string.');
  }

  const normalized = rawCode.trim().replace(/\s+/g, '');
  if (!/^\d+$/.test(normalized)) {
    throw new BadRequestException('Field "code" must contain digits only.');
  }

  if (normalized.length !== expectedLength) {
    throw new BadRequestException(`Field "code" must be ${expectedLength} digits.`);
  }

  return normalized;
};

@Injectable()
export class AuthPhoneVerificationService {
  private readonly env = loadApiEnv();

  constructor(
    @Inject(API_DATABASE_POOL)
    private readonly pool: Pool,
    @Inject(UsersService)
    private readonly usersService: UsersService,
    @Inject(AuthPhoneVerificationDeliveryService)
    private readonly authPhoneVerificationDeliveryService: AuthPhoneVerificationDeliveryService,
  ) {}

  async requestPhoneVerification(input: {
    user: RequestUser;
    phoneE164?: string | null;
  }): Promise<{
    accepted: true;
    message: string;
    phoneE164: string;
    expiresInSeconds: number;
    devCode?: string;
  }> {
    const target = await this.resolvePhoneTarget(input.user, input.phoneE164);
    const code = this.generateVerificationCode();
    const codeHash = this.createCodeHash(target.userDatabaseId, target.phoneE164, code);
    const ttlSeconds = this.env.PHONE_VERIFICATION_CODE_TTL_SECONDS;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `
          INSERT INTO user_phone_verification_challenges (
            user_id,
            phone_e164,
            code_hash,
            attempts,
            expires_at,
            verified_at
          )
          VALUES (
            $1::bigint,
            $2,
            $3,
            0,
            NOW() + ($4::int * INTERVAL '1 second'),
            NULL
          )
          ON CONFLICT (user_id, phone_e164)
          DO UPDATE SET
            code_hash = EXCLUDED.code_hash,
            attempts = 0,
            expires_at = EXCLUDED.expires_at,
            verified_at = NULL,
            updated_at = NOW();
        `,
        [target.userDatabaseId, target.phoneE164, codeHash, ttlSeconds],
      );

      await this.authPhoneVerificationDeliveryService.deliverPhoneVerificationCode({
        phoneE164: target.phoneE164,
        code,
        ttlSeconds,
      });

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return {
      accepted: true,
      message: 'If the phone number is eligible, a verification code has been issued.',
      phoneE164: target.phoneE164,
      expiresInSeconds: ttlSeconds,
      ...(this.env.NODE_ENV === 'production' ? {} : { devCode: code }),
    };
  }

  async confirmPhoneVerification(input: {
    user: RequestUser;
    code: unknown;
    phoneE164?: string | null;
  }): Promise<{
    verified: true;
    phoneE164: string;
    verifiedAt: string;
  }> {
    const target = await this.resolvePhoneTarget(input.user, input.phoneE164);
    const code = normalizeVerificationCode(input.code, this.env.PHONE_VERIFICATION_CODE_LENGTH);

    const challengeResult = await this.pool.query<PhoneVerificationChallengeRow>(
      `
        SELECT
          code_hash AS "codeHash",
          attempts,
          expires_at::text AS "expiresAt",
          verified_at::text AS "verifiedAt"
        FROM user_phone_verification_challenges
        WHERE user_id = $1::bigint
          AND phone_e164 = $2
        LIMIT 1;
      `,
      [target.userDatabaseId, target.phoneE164],
    );
    const challenge = challengeResult.rows[0];

    if (!challenge) {
      throw new BadRequestException(
        'No active phone verification challenge for this phone number.',
      );
    }

    if (challenge.verifiedAt) {
      return {
        verified: true,
        phoneE164: target.phoneE164,
        verifiedAt: challenge.verifiedAt,
      };
    }

    const expiresAtTime = Date.parse(challenge.expiresAt);
    const now = Date.now();
    const retryAfterSeconds = this.toRetryAfterSeconds(expiresAtTime - now);

    if (!Number.isFinite(expiresAtTime) || expiresAtTime <= now) {
      throw new BadRequestException('Verification code expired. Request a new code.');
    }

    if (challenge.attempts >= this.env.PHONE_VERIFICATION_MAX_ATTEMPTS) {
      throw new HttpException(
        {
          message: 'Too many failed verification attempts.',
          retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const expectedHash = this.createCodeHash(target.userDatabaseId, target.phoneE164, code);
    if (!this.isSameHash(challenge.codeHash, expectedHash)) {
      const failedAttemptResult = await this.pool.query<{ attempts: number }>(
        `
          UPDATE user_phone_verification_challenges
          SET
            attempts = attempts + 1,
            updated_at = NOW()
          WHERE user_id = $1::bigint
            AND phone_e164 = $2
          RETURNING attempts;
        `,
        [target.userDatabaseId, target.phoneE164],
      );

      const attemptsAfterFailure = failedAttemptResult.rows[0]?.attempts ?? challenge.attempts + 1;
      if (attemptsAfterFailure >= this.env.PHONE_VERIFICATION_MAX_ATTEMPTS) {
        throw new HttpException(
          {
            message: 'Too many failed verification attempts.',
            retryAfterSeconds,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new BadRequestException('Invalid verification code.');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `
          UPDATE user_phone_verification_challenges
          SET
            verified_at = NOW(),
            updated_at = NOW()
          WHERE user_id = $1::bigint
            AND phone_e164 = $2;
        `,
        [target.userDatabaseId, target.phoneE164],
      );

      const profileResult = await client.query<{ verifiedAt: string }>(
        `
          INSERT INTO user_profiles (
            user_id,
            phone_e164,
            phone_verified_at
          )
          VALUES (
            $1::bigint,
            $2,
            NOW()
          )
          ON CONFLICT (user_id)
          DO UPDATE SET
            phone_e164 = EXCLUDED.phone_e164,
            phone_verified_at = EXCLUDED.phone_verified_at,
            updated_at = NOW()
          RETURNING phone_verified_at::text AS "verifiedAt";
        `,
        [target.userDatabaseId, target.phoneE164],
      );

      await client.query('COMMIT');

      const verifiedAt = profileResult.rows[0]?.verifiedAt;
      if (!verifiedAt) {
        throw new InternalServerErrorException('Failed to store phone verification state.');
      }

      return {
        verified: true,
        phoneE164: target.phoneE164,
        verifiedAt,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async resolvePhoneTarget(
    user: RequestUser,
    explicitPhoneE164?: string | null,
  ): Promise<{
    userDatabaseId: string;
    phoneE164: string;
  }> {
    const persistedUser = await this.usersService.getCurrentUser(user);
    if (!persistedUser.databaseId) {
      throw new InternalServerErrorException('Failed to resolve internal user id.');
    }

    let candidatePhone = explicitPhoneE164 ?? null;
    if (!candidatePhone) {
      const profile = await this.usersService.getCurrentUserProfile(user);
      candidatePhone = profile.phoneE164;
    }

    if (!candidatePhone) {
      throw new BadRequestException(
        'Phone number is required. Provide "phoneE164" or set it in your profile.',
      );
    }

    const normalizedPhone = normalizePhoneE164(candidatePhone);
    if (!normalizedPhone) {
      throw new BadRequestException(
        'Field "phoneE164" must be a valid E.164 number (example: +393331112233).',
      );
    }

    return {
      userDatabaseId: persistedUser.databaseId,
      phoneE164: normalizedPhone,
    };
  }

  private createCodeHash(userDatabaseId: string, phoneE164: string, code: string): string {
    const payload = `${userDatabaseId}:${phoneE164}:${code}`;
    return createHmac('sha256', this.env.PHONE_VERIFICATION_CODE_PEPPER).update(payload).digest('hex');
  }

  private isSameHash(actualHash: string, expectedHash: string): boolean {
    if (actualHash.length !== expectedHash.length) {
      return false;
    }

    const actualBuffer = Buffer.from(actualHash, 'hex');
    const expectedBuffer = Buffer.from(expectedHash, 'hex');
    if (actualBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(actualBuffer, expectedBuffer);
  }

  private generateVerificationCode(): string {
    const digits: string[] = [];
    for (let index = 0; index < this.env.PHONE_VERIFICATION_CODE_LENGTH; index += 1) {
      digits.push(randomInt(0, 10).toString());
    }

    return digits.join('');
  }

  private toRetryAfterSeconds(remainingMs: number): number {
    if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
      return 1;
    }

    return Math.max(1, Math.ceil(remainingMs / 1000));
  }
}
