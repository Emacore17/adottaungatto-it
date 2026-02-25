import type { AppUser } from '../../users/models/app-user.model';

export interface RequestUser extends AppUser {}

export interface RequestWithUser {
  headers: Record<string, string | string[] | undefined>;
  requestUser?: RequestUser;
}
