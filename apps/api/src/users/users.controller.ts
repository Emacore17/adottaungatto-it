import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { UserRole } from '../auth/roles.enum';
import { UsersService } from './users.service';
import type { UserProfileUpdateInput } from './models/app-user.model';

const parseBooleanField = (body: unknown, fieldName: string): boolean => {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new BadRequestException('Request body must be a JSON object.');
  }

  const value = (body as Record<string, unknown>)[fieldName];
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
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new BadRequestException('Request body must be a JSON object.');
  }

  const record = body as Record<string, unknown>;
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

const parseAvatarStorageKey = (body: unknown): string => {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new BadRequestException('Request body must be a JSON object.');
  }

  const value = (body as Record<string, unknown>).avatarStorageKey;
  if (typeof value !== 'string') {
    throw new BadRequestException('Field "avatarStorageKey" must be a string.');
  }

  const normalized = value.trim();
  if (normalized.length < 3 || normalized.length > 512) {
    throw new BadRequestException('Field "avatarStorageKey" must be 3..512 characters.');
  }

  return normalized;
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

const toPublicProfile = (profile: Awaited<ReturnType<UsersService['getCurrentUserProfile']>>) => ({
  firstName: profile.firstName,
  lastName: profile.lastName,
  displayName: profile.displayName,
  phoneE164: profile.phoneE164,
  phoneVerifiedAt: profile.phoneVerifiedAt,
  city: profile.city,
  province: profile.province,
  bio: profile.bio,
  avatarStorageKey: profile.avatarStorageKey,
  createdAt: profile.createdAt,
  updatedAt: profile.updatedAt,
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
    return {
      profile: toPublicProfile(await this.usersService.getCurrentUserProfile(user)),
    };
  }

  @Patch('me/profile')
  async updateMyProfile(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    const input = parseProfileUpdateInput(body);
    return {
      profile: toPublicProfile(await this.usersService.updateCurrentUserProfile(user, input)),
    };
  }

  @Post('me/avatar')
  async upsertMyAvatar(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    const avatarStorageKey = parseAvatarStorageKey(body);
    return {
      profile: toPublicProfile(
        await this.usersService.setCurrentUserAvatarStorageKey(user, avatarStorageKey),
      ),
    };
  }

  @Delete('me/avatar')
  async deleteMyAvatar(@CurrentUser() user: RequestUser) {
    return {
      profile: toPublicProfile(await this.usersService.setCurrentUserAvatarStorageKey(user, null)),
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
