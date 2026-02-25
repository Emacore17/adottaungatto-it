import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { UserRole } from '../auth/roles.enum';

@Controller('v1/users')
export class UsersController {
  @Get('me')
  getMe(@CurrentUser() user: RequestUser) {
    return { user };
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
