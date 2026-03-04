import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { loadApiEnv } from '@adottaungatto/config';
import { Reflector } from '@nestjs/core';
import { PUBLIC_ROUTE_KEY } from '../auth/constants';
import { resolveClientIp, type RequestWithClientIp } from './request-client-ip';
import { PublicRateLimitStore } from './public-rate-limit.store';

type RateLimitedRequest = RequestWithClientIp & {
  method?: string;
  url?: string;
};

type RateLimitProfile = {
  id: 'public_listings' | 'search' | 'analytics_events' | 'contact';
  method: 'GET' | 'POST';
  pathPattern: RegExp;
  windowMs: number;
  maxRequests: number;
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

const buildProfiles = (env: ReturnType<typeof loadApiEnv>): RateLimitProfile[] => {
  return [
    {
      id: 'public_listings',
      method: 'GET',
      pathPattern: /^\/v1\/listings\/public(?:\/[1-9]\d*)?\/?$/i,
      windowMs: env.RATE_LIMIT_PUBLIC_WINDOW_SECONDS * 1000,
      maxRequests: env.RATE_LIMIT_PUBLIC_MAX_REQUESTS,
    },
    {
      id: 'search',
      method: 'GET',
      pathPattern: /^\/v1\/listings\/search\/?$/i,
      windowMs: env.RATE_LIMIT_SEARCH_WINDOW_SECONDS * 1000,
      maxRequests: env.RATE_LIMIT_SEARCH_MAX_REQUESTS,
    },
    {
      id: 'analytics_events',
      method: 'POST',
      pathPattern: /^\/v1\/analytics\/events\/?$/i,
      windowMs: env.RATE_LIMIT_ANALYTICS_WINDOW_SECONDS * 1000,
      maxRequests: env.RATE_LIMIT_ANALYTICS_MAX_REQUESTS,
    },
    {
      id: 'contact',
      method: 'POST',
      pathPattern: /^\/v1\/listings\/[1-9]\d*\/contact\/?$/i,
      windowMs: env.RATE_LIMIT_CONTACT_WINDOW_SECONDS * 1000,
      maxRequests: env.RATE_LIMIT_CONTACT_MAX_REQUESTS,
    },
  ];
};

type HeaderAwareResponse = {
  header: (headerName: string, value: string) => unknown;
};

@Injectable()
export class PublicRateLimitGuard implements CanActivate {
  private readonly env = loadApiEnv();
  private readonly profiles = buildProfiles(this.env);

  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
    @Inject(PublicRateLimitStore)
    private readonly rateLimitStore: PublicRateLimitStore,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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
    const response = context.switchToHttp().getResponse<HeaderAwareResponse>();
    const method = (request.method ?? 'GET').toUpperCase();
    const path = extractRequestPath(request.url);

    const profile = this.profiles.find(
      (candidate) => candidate.method === method && candidate.pathPattern.test(path),
    );
    if (!profile) {
      return true;
    }

    const clientIp = resolveClientIp(request, this.env.API_TRUST_PROXY_ENABLED) ?? 'unknown';
    const decision = await this.rateLimitStore.consume({
      profileId: profile.id,
      clientKey: clientIp,
      windowMs: profile.windowMs,
      maxRequests: profile.maxRequests,
    });

    if (!decision.allowed) {
      response.header('Retry-After', decision.retryAfterSeconds.toString());
      throw new HttpException(
        {
          message: `Rate limit exceeded for ${profile.id}.`,
          retryAfterSeconds: decision.retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
