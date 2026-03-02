import { BadRequestException, Body, Controller, Get, Inject, Patch } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { UserRole } from '../auth/roles.enum';
import { UsersService } from './users.service';

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

@Controller('v1/users')
export class UsersController {
  constructor(
    @Inject(UsersService)
    private readonly usersService: UsersService,
  ) {}

  @Get('me')
  async getMe(@CurrentUser() user: RequestUser) {
    return { user: await this.usersService.getCurrentUser(user) };
  }

  @Patch('me/preferences')
  async updatePreferences(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    const messageEmailNotificationsEnabled = parseBooleanField(
      body,
      'messageEmailNotificationsEnabled',
    );

    return {
      user: await this.usersService.updateCurrentUserMessagingPreferences(user, {
        messageEmailNotificationsEnabled,
      }),
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
