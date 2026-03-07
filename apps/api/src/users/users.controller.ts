import { loadApiEnv } from '@adottaungatto/config';
import { isIP } from 'node:net';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { UserRole } from '../auth/roles.enum';
import { pickFirstHeaderValue, resolveClientIp } from '../security/request-client-ip';
import { UsersService } from './users.service';
import type {
  UserAvatarUploadInput,
  UserConsentType,
  UserProfileUpdateInput,
} from './models/app-user.model';

type RequestWithClientInfo = {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
};

const USER_CONSENT_TYPES = ['privacy', 'terms', 'marketing'] as const;
const userConsentTypeSet = new Set<string>(USER_CONSENT_TYPES);

let apiTrustProxyEnabledCache: boolean | null = null;
let avatarBase64MaxLengthCache: number | null = null;

const getApiTrustProxyEnabled = (): boolean => {
  if (apiTrustProxyEnabledCache !== null) {
    return apiTrustProxyEnabledCache;
  }

  apiTrustProxyEnabledCache = loadApiEnv().API_TRUST_PROXY_ENABLED;
  return apiTrustProxyEnabledCache;
};

const parseSenderIp = (request: RequestWithClientInfo): string | null => {
  const resolvedIp = resolveClientIp(request, getApiTrustProxyEnabled());
  if (!resolvedIp || isIP(resolvedIp) === 0) {
    return null;
  }

  return resolvedIp;
};

const parseUserAgent = (request: RequestWithClientInfo): string | null => {
  const rawUserAgent = pickFirstHeaderValue(request.headers['user-agent']);
  return rawUserAgent ? rawUserAgent.slice(0, 400) : null;
};

const asRecord = (body: unknown): Record<string, unknown> => {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new BadRequestException('Request body must be a JSON object.');
  }

  return body as Record<string, unknown>;
};

const parseRequiredString = (
  source: Record<string, unknown>,
  fieldName: string,
  maxLength: number,
): string => {
  const value = source[fieldName];
  if (typeof value !== 'string') {
    throw new BadRequestException(`Field "${fieldName}" is required and must be a string.`);
  }

  const normalized = value.trim();
  if (!normalized) {
    throw new BadRequestException(`Field "${fieldName}" cannot be empty.`);
  }

  if (normalized.length > maxLength) {
    throw new BadRequestException(
      `Field "${fieldName}" exceeds maximum length (${maxLength} characters).`,
    );
  }

  return normalized;
};

const parseBooleanField = (body: unknown, fieldName: string): boolean => {
  const value = asRecord(body)[fieldName];
  if (typeof value !== 'boolean') {
    throw new BadRequestException(`Field "${fieldName}" must be a boolean.`);
  }

  return value;
};

const parseOptionalStringField = (
  body: Record<string, unknown>,
  fieldName: string,
  constraints: { min?: number; max: number },
): string | null | undefined => {
  if (!(fieldName in body)) {
    return undefined;
  }

  const value = body[fieldName];
  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException(`Field "${fieldName}" must be a string or null.`);
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    return null;
  }

  if (constraints.min && normalized.length < constraints.min) {
    throw new BadRequestException(
      `Field "${fieldName}" must be at least ${constraints.min} characters.`,
    );
  }

  if (normalized.length > constraints.max) {
    throw new BadRequestException(
      `Field "${fieldName}" must be at most ${constraints.max} characters.`,
    );
  }

  return normalized;
};

const parseProfileUpdateInput = (body: unknown): UserProfileUpdateInput => {
  const record = asRecord(body);
  const input: UserProfileUpdateInput = {
    firstName: parseOptionalStringField(record, 'firstName', { max: 80 }),
    lastName: parseOptionalStringField(record, 'lastName', { max: 80 }),
    displayName: parseOptionalStringField(record, 'displayName', { max: 120 }),
    phoneE164: parseOptionalStringField(record, 'phoneE164', { min: 5, max: 20 }),
    city: parseOptionalStringField(record, 'city', { max: 120 }),
    province: parseOptionalStringField(record, 'province', { max: 120 }),
    bio: parseOptionalStringField(record, 'bio', { max: 800 }),
  };

  const hasChanges = Object.values(input).some((value) => value !== undefined);
  if (!hasChanges) {
    throw new BadRequestException('At least one profile field must be provided.');
  }

  return input;
};

const getAvatarBase64MaxLength = (): number => {
  if (avatarBase64MaxLengthCache !== null) {
    return avatarBase64MaxLengthCache;
  }

  const env = loadApiEnv();
  avatarBase64MaxLengthCache = Math.ceil(env.AVATAR_UPLOAD_MAX_BYTES * (4 / 3)) + 16_384;
  return avatarBase64MaxLengthCache;
};

const parseBase64Payload = (rawPayload: string): Buffer => {
  const normalized = rawPayload.trim();
  if (!normalized) {
    throw new BadRequestException('Field "contentBase64" cannot be empty.');
  }

  const commaIndex = normalized.indexOf(',');
  const payload =
    normalized.startsWith('data:') && commaIndex >= 0
      ? normalized.slice(commaIndex + 1)
      : normalized;

  let decodedPayload: Buffer;
  try {
    decodedPayload = Buffer.from(payload, 'base64');
  } catch {
    throw new BadRequestException('Field "contentBase64" is not a valid base64 payload.');
  }

  if (decodedPayload.length === 0) {
    throw new BadRequestException('Field "contentBase64" is empty after decoding.');
  }

  return decodedPayload;
};

const parseAvatarUploadInput = (body: unknown): UserAvatarUploadInput => {
  const source = asRecord(body);
  const mimeType = parseRequiredString(source, 'mimeType', 120).toLowerCase();
  const contentBase64 = parseRequiredString(source, 'contentBase64', getAvatarBase64MaxLength());

  return {
    mimeType,
    payload: parseBase64Payload(contentBase64),
    originalFileName: parseOptionalStringField(source, 'fileName', { max: 180 }) ?? null,
  };
};

const parseListingIdParam = (value: string): string => {
  const normalized = value.trim();
  if (!/^[1-9]\d*$/.test(normalized)) {
    throw new BadRequestException('Listing id must be a positive integer.');
  }

  return normalized;
};

const parseProviderAliasParam = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{0,62}$/.test(normalized)) {
    throw new BadRequestException('Provider alias is invalid.');
  }

  return normalized;
};

const parseSessionIdParam = (value: string): string => {
  const normalized = value.trim();
  if (!normalized || normalized.length > 255) {
    throw new BadRequestException('Session id is invalid.');
  }

  return normalized;
};

const parseConsentsUpdateInput = (
  body: unknown,
): {
  consents: Array<{
    type: UserConsentType;
    granted: boolean;
    version: string;
    source: string;
  }>;
} => {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new BadRequestException('Request body must be a JSON object.');
  }

  const consents = (body as Record<string, unknown>).consents;
  if (!Array.isArray(consents) || consents.length === 0) {
    throw new BadRequestException('Field "consents" must be a non-empty array.');
  }

  if (consents.length > USER_CONSENT_TYPES.length) {
    throw new BadRequestException('Field "consents" contains too many entries.');
  }

  const parsedConsents: Array<{
    type: UserConsentType;
    granted: boolean;
    version: string;
    source: string;
  }> = [];
  const visitedTypes = new Set<UserConsentType>();

  for (const consent of consents) {
    if (typeof consent !== 'object' || consent === null || Array.isArray(consent)) {
      throw new BadRequestException('Each consent entry must be a JSON object.');
    }

    const record = consent as Record<string, unknown>;
    const rawType = record.type;
    if (typeof rawType !== 'string' || !userConsentTypeSet.has(rawType)) {
      throw new BadRequestException('Field "type" must be one of: privacy, terms, marketing.');
    }

    const type = rawType as UserConsentType;
    if (visitedTypes.has(type)) {
      throw new BadRequestException(`Duplicate consent entry for type "${type}".`);
    }

    visitedTypes.add(type);

    const rawGranted = record.granted;
    if (typeof rawGranted !== 'boolean') {
      throw new BadRequestException('Field "granted" must be a boolean.');
    }

    const rawVersion = record.version;
    if (typeof rawVersion !== 'string') {
      throw new BadRequestException('Field "version" must be a string.');
    }

    const version = rawVersion.trim();
    if (version.length < 1 || version.length > 64) {
      throw new BadRequestException('Field "version" must be 1..64 characters.');
    }

    const rawSource = record.source;
    let source = 'account_settings';
    if (rawSource !== undefined) {
      if (typeof rawSource !== 'string') {
        throw new BadRequestException('Field "source" must be a string.');
      }

      const normalizedSource = rawSource.trim();
      if (normalizedSource.length < 2 || normalizedSource.length > 64) {
        throw new BadRequestException('Field "source" must be 2..64 characters.');
      }

      source = normalizedSource;
    }

    parsedConsents.push({
      type,
      granted: rawGranted,
      version,
      source,
    });
  }

  return {
    consents: parsedConsents,
  };
};

const toPublicUser = (user: Awaited<ReturnType<UsersService['getCurrentUser']>>) => ({
  id: user.id,
  provider: user.provider,
  providerSubject: user.providerSubject,
  email: user.email,
  emailVerified: user.emailVerified === true,
  roles: user.roles,
  preferences: user.preferences,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const toPublicProfile = (
  profile: Awaited<ReturnType<UsersService['getCurrentUserProfile']>>,
  avatarObjectUrl: string | null,
) => ({
  firstName: profile.firstName,
  lastName: profile.lastName,
  displayName: profile.displayName,
  phoneE164: profile.phoneE164,
  phoneVerifiedAt: profile.phoneVerifiedAt,
  city: profile.city,
  province: profile.province,
  bio: profile.bio,
  avatarStorageKey: profile.avatarStorageKey,
  avatarObjectUrl,
  createdAt: profile.createdAt,
  updatedAt: profile.updatedAt,
});

const toPublicFavorite = (
  favorite: Awaited<ReturnType<UsersService['listCurrentUserFavorites']>>[number],
) => ({
  listingId: favorite.listingId,
  addedAt: favorite.addedAt,
});

const toPublicConsent = (consent: Awaited<ReturnType<UsersService['getCurrentUserConsents']>>[number]) => ({
  type: consent.type,
  granted: consent.granted,
  version: consent.version,
  grantedAt: consent.grantedAt,
  source: consent.source,
});

const toPublicLinkedIdentity = (
  linkedIdentity: Awaited<ReturnType<UsersService['listCurrentUserLinkedIdentities']>>[number],
) => ({
  provider: linkedIdentity.provider,
  providerSubject: linkedIdentity.providerSubject,
  emailAtLink: linkedIdentity.emailAtLink,
  linkedAt: linkedIdentity.linkedAt,
  lastSeenAt: linkedIdentity.lastSeenAt,
  isPrimary: linkedIdentity.isPrimary === true,
});

const toPublicSession = (session: Awaited<ReturnType<UsersService['listCurrentUserSessions']>>[number]) => ({
  sessionId: session.sessionId,
  clientId: session.clientId,
  ipAddress: session.ipAddress,
  startedAt: session.startedAt,
  lastSeenAt: session.lastSeenAt,
  isCurrent: session.isCurrent === true,
});

@Controller('v1/users')
export class UsersController {
  constructor(
    @Inject(UsersService)
    private readonly usersService: UsersService,
  ) {}

  @Get('me')
  async getMe(@CurrentUser() user: RequestUser) {
    return { user: toPublicUser(await this.usersService.getCurrentUser(user)) };
  }

  @Patch('me/preferences')
  async updatePreferences(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    const messageEmailNotificationsEnabled = parseBooleanField(
      body,
      'messageEmailNotificationsEnabled',
    );

    return {
      user: toPublicUser(
        await this.usersService.updateCurrentUserMessagingPreferences(user, {
          messageEmailNotificationsEnabled,
        }),
      ),
    };
  }

  @Get('me/profile')
  async getMyProfile(@CurrentUser() user: RequestUser) {
    const profile = await this.usersService.getCurrentUserProfile(user);
    return {
      profile: toPublicProfile(profile, this.usersService.resolveAvatarObjectUrl(profile.avatarStorageKey)),
    };
  }

  @Patch('me/profile')
  async updateMyProfile(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    const input = parseProfileUpdateInput(body);
    const profile = await this.usersService.updateCurrentUserProfile(user, input);
    return {
      profile: toPublicProfile(profile, this.usersService.resolveAvatarObjectUrl(profile.avatarStorageKey)),
    };
  }

  @Post('me/avatar')
  async upsertMyAvatar(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    const input = parseAvatarUploadInput(body);
    const profile = await this.usersService.uploadCurrentUserAvatar(user, input);
    return {
      profile: toPublicProfile(profile, this.usersService.resolveAvatarObjectUrl(profile.avatarStorageKey)),
    };
  }

  @Delete('me/avatar')
  async deleteMyAvatar(@CurrentUser() user: RequestUser) {
    const profile = await this.usersService.removeCurrentUserAvatar(user);
    return {
      profile: toPublicProfile(profile, this.usersService.resolveAvatarObjectUrl(profile.avatarStorageKey)),
    };
  }

  @Get('me/consents')
  async getMyConsents(@CurrentUser() user: RequestUser) {
    return {
      consents: (await this.usersService.getCurrentUserConsents(user)).map((consent) =>
        toPublicConsent(consent),
      ),
    };
  }

  @Patch('me/consents')
  async updateMyConsents(
    @Req() request: RequestWithClientInfo,
    @CurrentUser() user: RequestUser,
    @Body() body: unknown,
  ) {
    const input = parseConsentsUpdateInput(body);
    return {
      consents: (
        await this.usersService.updateCurrentUserConsents(user, {
          consents: input.consents,
          ip: parseSenderIp(request),
          userAgent: parseUserAgent(request),
        })
      ).map((consent) => toPublicConsent(consent)),
    };
  }

  @Get('me/favorites')
  async getMyFavorites(@CurrentUser() user: RequestUser) {
    return {
      favorites: (await this.usersService.listCurrentUserFavorites(user)).map((favorite) =>
        toPublicFavorite(favorite),
      ),
    };
  }

  @Put('me/favorites/:listingId')
  async addMyFavorite(
    @CurrentUser() user: RequestUser,
    @Param('listingId') rawListingId: string,
  ) {
    const listingId = parseListingIdParam(rawListingId);
    return {
      favorites: (await this.usersService.addCurrentUserFavorite(user, listingId)).map((favorite) =>
        toPublicFavorite(favorite),
      ),
    };
  }

  @Delete('me/favorites/:listingId')
  async deleteMyFavorite(
    @CurrentUser() user: RequestUser,
    @Param('listingId') rawListingId: string,
  ) {
    const listingId = parseListingIdParam(rawListingId);
    return {
      favorites: (await this.usersService.removeCurrentUserFavorite(user, listingId)).map(
        (favorite) => toPublicFavorite(favorite),
      ),
    };
  }

  @Get('me/linked-identities')
  async getMyLinkedIdentities(@CurrentUser() user: RequestUser) {
    return {
      linkedIdentities: (await this.usersService.listCurrentUserLinkedIdentities(user)).map(
        (linkedIdentity) => toPublicLinkedIdentity(linkedIdentity),
      ),
    };
  }

  @Post('me/linked-identities/:provider/start')
  async startMyLinkedIdentity(
    @CurrentUser() user: RequestUser,
    @Param('provider') rawProvider: string,
  ) {
    const provider = parseProviderAliasParam(rawProvider);
    const startedLink = this.usersService.startCurrentUserIdentityLink(user, provider);
    return {
      provider: startedLink.provider,
      redirectUrl: startedLink.redirectUrl,
    };
  }

  @Delete('me/linked-identities/:provider')
  async deleteMyLinkedIdentity(
    @CurrentUser() user: RequestUser,
    @Param('provider') rawProvider: string,
  ) {
    const provider = parseProviderAliasParam(rawProvider);
    return {
      linkedIdentities: (await this.usersService.unlinkCurrentUserIdentity(user, provider)).map(
        (linkedIdentity) => toPublicLinkedIdentity(linkedIdentity),
      ),
    };
  }

  @Get('me/sessions')
  async getMySessions(@CurrentUser() user: RequestUser) {
    return {
      sessions: (await this.usersService.listCurrentUserSessions(user)).map((session) =>
        toPublicSession(session),
      ),
    };
  }

  @Delete('me/sessions/:sessionId')
  async revokeMySession(
    @CurrentUser() user: RequestUser,
    @Param('sessionId') rawSessionId: string,
  ) {
    const sessionId = parseSessionIdParam(rawSessionId);
    return {
      sessions: (await this.usersService.revokeCurrentUserSession(user, sessionId)).map((session) =>
        toPublicSession(session),
      ),
    };
  }

  @Get('moderation-space')
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  getModerationSpace(@CurrentUser() user: RequestUser) {
    return {
      ok: true,
      scope: 'moderation',
      userId: user.id,
      roles: user.roles,
    };
  }

  @Get('admin-space')
  @Roles(UserRole.ADMIN)
  getAdminSpace(@CurrentUser() user: RequestUser) {
    return {
      ok: true,
      scope: 'admin',
      userId: user.id,
      roles: user.roles,
    };
  }
}
