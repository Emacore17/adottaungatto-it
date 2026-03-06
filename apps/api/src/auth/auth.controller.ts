import { loadApiEnv } from '@adottaungatto/config';
import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  Req,
} from '@nestjs/common';
import { pickFirstHeaderValue, resolveClientIp } from '../security/request-client-ip';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import type { RequestUser } from './interfaces/request-user.interface';
import { AUTH_SECURITY_EVENT } from './security-events.constants';
import { AuthPhoneVerificationService } from './services/auth-phone-verification.service';
import { AuthRecoveryService } from './services/auth-recovery.service';
import { AuthSecurityEventsService } from './services/auth-security-events.service';

type AuthRequestWithClientInfo = {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
};

const apiEnv = loadApiEnv();

const parseSenderIp = (request: AuthRequestWithClientInfo): string | null => {
  return resolveClientIp(request, apiEnv.API_TRUST_PROXY_ENABLED);
};

const parseUserAgent = (request: AuthRequestWithClientInfo): string | null => {
  const rawUserAgent = pickFirstHeaderValue(request.headers['user-agent']);
  return rawUserAgent ? rawUserAgent.slice(0, 400) : null;
};

const parseIdentifier = (body: unknown): string => {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new BadRequestException('Request body must be a JSON object.');
  }

  const identifier = (body as Record<string, unknown>).identifier;
  if (typeof identifier !== 'string') {
    throw new BadRequestException('Field "identifier" must be a string.');
  }

  const normalized = identifier.trim();
  if (normalized.length < 3 || normalized.length > 160) {
    throw new BadRequestException('Field "identifier" must be 3..160 characters.');
  }

  return normalized;
};

const asRecord = (body: unknown): Record<string, unknown> => {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new BadRequestException('Request body must be a JSON object.');
  }

  return body as Record<string, unknown>;
};

const parseOptionalPhoneE164 = (body: unknown): string | undefined => {
  if (body === undefined) {
    return undefined;
  }

  const record = asRecord(body);
  if (!('phoneE164' in record)) {
    return undefined;
  }

  const value = record.phoneE164;
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException('Field "phoneE164" must be a string.');
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const parseVerificationCode = (body: unknown): string => {
  const record = asRecord(body);
  const value = record.code;
  if (typeof value !== 'string') {
    throw new BadRequestException('Field "code" must be a string.');
  }

  const normalized = value.trim();
  if (!normalized) {
    throw new BadRequestException('Field "code" cannot be empty.');
  }

  return normalized;
};

@Controller('v1/auth')
export class AuthController {
  constructor(
    @Inject(AuthRecoveryService)
    private readonly authRecoveryService: AuthRecoveryService,
    @Inject(AuthPhoneVerificationService)
    private readonly authPhoneVerificationService: AuthPhoneVerificationService,
    @Inject(AuthSecurityEventsService)
    private readonly authSecurityEventsService: AuthSecurityEventsService,
  ) {}

  @Public()
  @Post('password-recovery')
  @HttpCode(202)
  async requestPasswordRecovery(@Req() request: AuthRequestWithClientInfo, @Body() body: unknown) {
    const identifier = parseIdentifier(body);
    await this.authRecoveryService.requestPasswordRecovery(identifier);
    await this.authSecurityEventsService.recordBestEffort({
      eventType: AUTH_SECURITY_EVENT.PASSWORD_RECOVERY_REQUESTED,
      metadata: {
        identifierHash: this.authSecurityEventsService.createIdentifierHash(identifier),
        identifierKind: identifier.includes('@') ? 'email' : 'username_or_email',
      },
      ip: parseSenderIp(request),
      userAgent: parseUserAgent(request),
    });

    // Always neutral to avoid account enumeration.
    return {
      accepted: true,
      message: 'If the account exists, recovery instructions will be sent.',
    };
  }

  @Post('email-verification/resend')
  @HttpCode(202)
  async resendEmailVerification(
    @Req() request: AuthRequestWithClientInfo,
    @CurrentUser() user: RequestUser,
  ) {
    await this.authRecoveryService.resendEmailVerification({
      provider: user.provider,
      providerSubject: user.providerSubject,
      email: user.email,
      emailVerified: user.emailVerified,
    });
    await this.authSecurityEventsService.recordBestEffort({
      eventType: AUTH_SECURITY_EVENT.EMAIL_VERIFICATION_RESEND_REQUESTED,
      userDatabaseId: user.databaseId ?? null,
      metadata: {
        provider: user.provider,
        providerSubject: user.providerSubject,
        emailHash: this.authSecurityEventsService.createIdentifierHash(user.email),
        emailPreviouslyVerified: user.emailVerified === true,
      },
      ip: parseSenderIp(request),
      userAgent: parseUserAgent(request),
    });

    return {
      accepted: true,
      message: 'If verification is pending, a new email has been sent.',
    };
  }

  @Post('phone-verification/request')
  @HttpCode(202)
  async requestPhoneVerification(
    @Req() request: AuthRequestWithClientInfo,
    @CurrentUser() user: RequestUser,
    @Body() body: unknown,
  ) {
    const phoneE164 = parseOptionalPhoneE164(body);
    const result = await this.authPhoneVerificationService.requestPhoneVerification({
      user,
      phoneE164,
    });

    await this.authSecurityEventsService.recordBestEffort({
      eventType: AUTH_SECURITY_EVENT.PHONE_VERIFICATION_REQUESTED,
      userDatabaseId: user.databaseId ?? null,
      metadata: {
        provider: user.provider,
        providerSubject: user.providerSubject,
        phoneHash: this.authSecurityEventsService.createIdentifierHash(result.phoneE164),
        explicitPhoneProvided: phoneE164 !== undefined,
      },
      ip: parseSenderIp(request),
      userAgent: parseUserAgent(request),
    });

    return result;
  }

  @Post('phone-verification/confirm')
  @HttpCode(200)
  async confirmPhoneVerification(
    @Req() request: AuthRequestWithClientInfo,
    @CurrentUser() user: RequestUser,
    @Body() body: unknown,
  ) {
    const phoneE164 = parseOptionalPhoneE164(body);
    const code = parseVerificationCode(body);

    try {
      const result = await this.authPhoneVerificationService.confirmPhoneVerification({
        user,
        phoneE164,
        code,
      });

      await this.authSecurityEventsService.recordBestEffort({
        eventType: AUTH_SECURITY_EVENT.PHONE_VERIFICATION_CONFIRMED,
        userDatabaseId: user.databaseId ?? null,
        metadata: {
          provider: user.provider,
          providerSubject: user.providerSubject,
          phoneHash: this.authSecurityEventsService.createIdentifierHash(result.phoneE164),
        },
        ip: parseSenderIp(request),
        userAgent: parseUserAgent(request),
      });

      return result;
    } catch (error) {
      await this.authSecurityEventsService.recordBestEffort({
        eventType: AUTH_SECURITY_EVENT.PHONE_VERIFICATION_FAILED,
        userDatabaseId: user.databaseId ?? null,
        metadata: {
          provider: user.provider,
          providerSubject: user.providerSubject,
          explicitPhoneProvided: phoneE164 !== undefined,
          reason: error instanceof Error ? error.message : 'unknown_error',
        },
        ip: parseSenderIp(request),
        userAgent: parseUserAgent(request),
      });
      throw error;
    }
  }
}
