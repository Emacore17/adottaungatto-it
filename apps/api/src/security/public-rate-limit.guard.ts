import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PUBLIC_ROUTE_KEY } from '../auth/constants';

type RateLimitedRequest = {
  method?: string;
  url?: string;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
};

type RateLimitProfile = {
  id: 'public_listings' | 'search' | 'analytics_events' | 'contact';
  method: 'GET' | 'POST';
  pathPattern: RegExp;
  windowMs: number;
  maxRequests: number;
};

const parsePositiveInt = (
  rawValue: string | undefined,
  fallback: number,
  minValue = 1,
  maxValue = 10_000,
): number => {
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed < minValue || parsed > maxValue) {
    return fallback;
  }

  return parsed;
};

const readHeader = (
  headers: Record<string, string | string[] | undefined>,
  headerName: string,
): string | null => {
  const value = headers[headerName];
  if (Array.isArray(value)) {
    const first = value[0]?.trim();
    return first ? first : null;
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized ? normalized : null;
  }

  return null;
};

const extractRequestPath = (url: string | undefined): string => {
  if (!url) {
    return '/';
  }

  const [rawPath] = url.split('?', 1);
  if (!rawPath) {
    return '/';
  }

  return rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
};

const extractClientIp = (request: RateLimitedRequest): string => {
  const forwardedFor = readHeader(request.headers, 'x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor
      .split(',')
      .map((entry) => entry.trim())
      .find((entry) => entry.length > 0);
    if (firstIp) {
      return firstIp.slice(0, 64);
    }
  }

  const realIp = readHeader(request.headers, 'x-real-ip');
  if (realIp) {
    return realIp.slice(0, 64);
  }

  const requestIp = request.ip?.trim();
  if (requestIp) {
    return requestIp.slice(0, 64);
  }

  return 'unknown';
};

const buildProfiles = (): RateLimitProfile[] => {
  const publicWindowSeconds = parsePositiveInt(process.env.RATE_LIMIT_PUBLIC_WINDOW_SECONDS, 60);
  const searchWindowSeconds = parsePositiveInt(process.env.RATE_LIMIT_SEARCH_WINDOW_SECONDS, 60);
  const analyticsWindowSeconds = parsePositiveInt(
    process.env.RATE_LIMIT_ANALYTICS_WINDOW_SECONDS,
    60,
  );
  const contactWindowSeconds = parsePositiveInt(process.env.RATE_LIMIT_CONTACT_WINDOW_SECONDS, 60);

  return [
    {
      id: 'public_listings',
      method: 'GET',
      pathPattern: /^\/v1\/listings\/public(?:\/[1-9]\d*)?\/?$/i,
      windowMs: publicWindowSeconds * 1000,
      maxRequests: parsePositiveInt(process.env.RATE_LIMIT_PUBLIC_MAX_REQUESTS, 120),
    },
    {
      id: 'search',
      method: 'GET',
      pathPattern: /^\/v1\/listings\/search\/?$/i,
      windowMs: searchWindowSeconds * 1000,
      maxRequests: parsePositiveInt(process.env.RATE_LIMIT_SEARCH_MAX_REQUESTS, 80),
    },
    {
      id: 'analytics_events',
      method: 'POST',
      pathPattern: /^\/v1\/analytics\/events\/?$/i,
      windowMs: analyticsWindowSeconds * 1000,
      maxRequests: parsePositiveInt(process.env.RATE_LIMIT_ANALYTICS_MAX_REQUESTS, 120),
    },
    {
      id: 'contact',
      method: 'POST',
      pathPattern: /^\/v1\/listings\/[1-9]\d*\/contact\/?$/i,
      windowMs: contactWindowSeconds * 1000,
      maxRequests: parsePositiveInt(process.env.RATE_LIMIT_CONTACT_MAX_REQUESTS, 30),
    },
  ];
};

@Injectable()
export class PublicRateLimitGuard implements CanActivate {
  private readonly profiles = buildProfiles();
  private readonly buckets = new Map<string, number[]>();

  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RateLimitedRequest>();
    const method = (request.method ?? 'GET').toUpperCase();
    const path = extractRequestPath(request.url);

    const profile = this.profiles.find(
      (candidate) => candidate.method === method && candidate.pathPattern.test(path),
    );
    if (!profile) {
      return true;
    }

    const now = Date.now();
    const key = `${profile.id}:${extractClientIp(request)}`;
    const threshold = now - profile.windowMs;
    const storedTimestamps = this.buckets.get(key) ?? [];
    const recentTimestamps = storedTimestamps.filter((timestamp) => timestamp > threshold);

    if (recentTimestamps.length >= profile.maxRequests) {
      const retryAt = recentTimestamps[0] + profile.windowMs;
      const retryAfterSeconds = Math.max(1, Math.ceil((retryAt - now) / 1000));

      throw new HttpException(
        {
          message: `Rate limit exceeded for ${profile.id}.`,
          retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    recentTimestamps.push(now);
    this.buckets.set(key, recentTimestamps);
    return true;
  }
}
