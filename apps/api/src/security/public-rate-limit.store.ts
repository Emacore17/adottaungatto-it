import { loadApiEnv } from '@adottaungatto/config';
import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

type ConsumeRateLimitInput = {
  profileId: string;
  clientKey: string;
  windowMs: number;
  maxRequests: number;
};

type ConsumeRateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  backend: 'redis' | 'memory';
};

type MemoryBucket = {
  count: number;
  resetAt: number;
};

const RATE_LIMIT_LUA = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return { current, ttl }
`;

@Injectable()
export class PublicRateLimitStore implements OnModuleDestroy {
  private readonly env = loadApiEnv();
  private readonly logger = new Logger(PublicRateLimitStore.name);
  private readonly redis = new Redis(this.env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });
  private readonly memoryBuckets = new Map<string, MemoryBucket>();
  private hasWarnedRedisFallback = false;
  private consumeCount = 0;

  async onModuleDestroy(): Promise<void> {
    if (this.redis.status !== 'end') {
      this.redis.disconnect();
    }
  }

  async consume(input: ConsumeRateLimitInput): Promise<ConsumeRateLimitResult> {
    const key = `${this.env.RATE_LIMIT_KEY_PREFIX}:${input.profileId}:${input.clientKey}`;
    const redisResult = await this.tryConsumeWithRedis(key, input.windowMs, input.maxRequests);
    if (redisResult) {
      return redisResult;
    }

    return this.consumeWithMemory(key, input.windowMs, input.maxRequests);
  }

  private async tryConsumeWithRedis(
    key: string,
    windowMs: number,
    maxRequests: number,
  ): Promise<ConsumeRateLimitResult | null> {
    try {
      await this.ensureRedisReady();

      const rawResult = await this.redis.eval(RATE_LIMIT_LUA, 1, key, windowMs.toString());
      if (!Array.isArray(rawResult) || rawResult.length < 2) {
        throw new Error('Unexpected Redis rate limit response.');
      }

      const currentCount = Number.parseInt(String(rawResult[0]), 10);
      const ttlMs = Number.parseInt(String(rawResult[1]), 10);
      if (!Number.isFinite(currentCount)) {
        throw new Error('Invalid Redis rate limit counter.');
      }

      if (this.hasWarnedRedisFallback) {
        this.logger.log('Redis-backed public rate limiting recovered.');
        this.hasWarnedRedisFallback = false;
      }

      return {
        allowed: currentCount <= maxRequests,
        retryAfterSeconds: this.toRetryAfterSeconds(ttlMs, windowMs),
        backend: 'redis',
      };
    } catch (error) {
      if (!this.hasWarnedRedisFallback) {
        this.logger.warn(
          `Redis-backed public rate limiting unavailable, falling back to local memory (${this.normalizeError(error)}).`,
        );
        this.hasWarnedRedisFallback = true;
      }

      return null;
    }
  }

  private consumeWithMemory(
    key: string,
    windowMs: number,
    maxRequests: number,
  ): ConsumeRateLimitResult {
    const now = Date.now();
    this.cleanupExpiredMemoryBuckets(now);

    const existingBucket = this.memoryBuckets.get(key);
    if (!existingBucket || existingBucket.resetAt <= now) {
      this.memoryBuckets.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });

      return {
        allowed: true,
        retryAfterSeconds: this.toRetryAfterSeconds(windowMs, windowMs),
        backend: 'memory',
      };
    }

    existingBucket.count += 1;
    this.memoryBuckets.set(key, existingBucket);

    return {
      allowed: existingBucket.count <= maxRequests,
      retryAfterSeconds: this.toRetryAfterSeconds(existingBucket.resetAt - now, windowMs),
      backend: 'memory',
    };
  }

  private async ensureRedisReady(): Promise<void> {
    if (this.redis.status === 'ready') {
      return;
    }

    await this.redis.connect();
  }

  private cleanupExpiredMemoryBuckets(now: number): void {
    this.consumeCount += 1;
    if (this.consumeCount % 100 !== 0 && this.memoryBuckets.size < 500) {
      return;
    }

    for (const [key, bucket] of this.memoryBuckets.entries()) {
      if (bucket.resetAt <= now) {
        this.memoryBuckets.delete(key);
      }
    }
  }

  private toRetryAfterSeconds(ttlMs: number, windowMs: number): number {
    const effectiveTtlMs = Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : windowMs;
    return Math.max(1, Math.ceil(effectiveTtlMs / 1000));
  }

  private normalizeError(error: unknown): string {
    if (error instanceof Error && error.message.trim().length > 0) {
      return error.message;
    }

    return 'unknown redis error';
  }
}
