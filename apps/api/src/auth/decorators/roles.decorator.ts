import { SetMetadata } from '@nestjs/common';
import { REQUIRED_ROLES_KEY } from '../constants';
import type { UserRole } from '../roles.enum';

export const Roles = (...roles: UserRole[]) => SetMetadata(REQUIRED_ROLES_KEY, roles);
