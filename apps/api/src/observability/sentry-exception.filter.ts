import {
  type ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { captureApiException, isApiSentryEnabled } from './sentry';

type HttpRequestLike = {
  method?: string;
  url?: string;
  id?: string;
  headers?: Record<string, string | string[] | undefined>;
};

type HttpReplyLike = {
  header: (headerName: string, value: string) => unknown;
};

const readRequestId = (request: HttpRequestLike): string | undefined => {
  const directHeader = request.headers?.['x-request-id'];
  if (typeof directHeader === 'string' && directHeader.trim().length > 0) {
    return directHeader.trim().slice(0, 128);
  }

  if (Array.isArray(directHeader) && directHeader[0]?.trim()) {
    return directHeader[0].trim().slice(0, 128);
  }

  const requestId = request.id?.trim();
  if (!requestId) {
    return undefined;
  }

  return requestId.slice(0, 128);
};

@Catch()
@Injectable()
export class SentryExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);

  override catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() === 'http' && isApiSentryEnabled()) {
      const request = host.switchToHttp().getRequest<HttpRequestLike>();
      const reply = host.switchToHttp().getResponse<HttpReplyLike>();
      const statusCode =
        exception instanceof HttpException
          ? exception.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;
      const requestId = readRequestId(request);

      if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
        const eventId = captureApiException(exception, {
          source: 'http_exception_filter',
          path: request.url,
          method: request.method,
          statusCode,
          requestId,
        });

        if (eventId) {
          reply.header('x-sentry-event-id', eventId);
        }
        if (requestId) {
          reply.header('x-request-id', requestId);
        }

        this.logger.error(
          `Unhandled ${statusCode} ${request.method ?? 'UNKNOWN'} ${request.url ?? '/'} requestId=${requestId ?? 'n/a'} sentryEventId=${eventId ?? 'n/a'}`,
        );
      }
    }

    super.catch(exception, host);
  }
}
