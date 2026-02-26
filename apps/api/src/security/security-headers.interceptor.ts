import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Observable } from 'rxjs';

type HeaderAwareResponse = {
  header: (headerName: string, value: string) => unknown;
};

type RequestWithCorrelation = {
  id?: string;
  headers?: Record<string, string | string[] | undefined>;
};

const readRequestId = (request: RequestWithCorrelation): string | undefined => {
  const headerValue = request.headers?.['x-request-id'];
  if (typeof headerValue === 'string' && headerValue.trim().length > 0) {
    return headerValue.trim().slice(0, 128);
  }

  if (Array.isArray(headerValue) && headerValue[0]?.trim()) {
    return headerValue[0].trim().slice(0, 128);
  }

  const requestId = request.id?.trim();
  if (!requestId) {
    return undefined;
  }

  return requestId.slice(0, 128);
};

const isProduction = process.env.NODE_ENV === 'production';

@Injectable()
export class SecurityHeadersInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() === 'http') {
      const request = context.switchToHttp().getRequest<RequestWithCorrelation>();
      const response = context.switchToHttp().getResponse<HeaderAwareResponse>();
      const requestId = readRequestId(request);

      response.header(
        'Content-Security-Policy',
        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
      );
      response.header('Referrer-Policy', 'no-referrer');
      response.header('X-Frame-Options', 'DENY');
      response.header('X-Content-Type-Options', 'nosniff');
      response.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
      if (requestId) {
        response.header('X-Request-Id', requestId);
      }

      if (isProduction) {
        response.header(
          'Strict-Transport-Security',
          'max-age=63072000; includeSubDomains; preload',
        );
      }
    }

    return next.handle();
  }
}
