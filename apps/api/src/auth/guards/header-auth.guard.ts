import { loadApiEnv } from '@adottaungatto/config';
import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersService } from '../../users/users.service';
import {
  AUTHORIZATION_HEADER,
  AUTH_USER_EMAIL_HEADER,
  AUTH_USER_ID_HEADER,
  AUTH_USER_ROLES_HEADER,
  AUTH_USER_SUBJECT_HEADER,
  PUBLIC_ROUTE_KEY,
} from '../constants';
import type { RequestWithUser } from '../interfaces/request-user.interface';
import { UserRole } from '../roles.enum';
import { KeycloakTokenService } from '../services/keycloak-token.service';

const roleValues = new Set<string>(Object.values(UserRole));

@Injectable()
export class HeaderAuthGuard implements CanActivate {
  private readonly env = loadApiEnv();

  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
    @Inject(UsersService)
    private readonly usersService: UsersService,
    @Inject(KeycloakTokenService)
    private readonly keycloakTokenService: KeycloakTokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();

    const bearerToken = this.extractBearerToken(this.readHeader(request, AUTHORIZATION_HEADER));
    if (bearerToken) {
      const tokenUser = await this.keycloakTokenService.verifyBearerToken(bearerToken);

      request.requestUser = this.usersService.upsertFromIdentity({
        provider: 'keycloak',
        providerSubject: tokenUser.subject,
        email: tokenUser.email,
        roles: tokenUser.roles,
      });
      return true;
    }

    if (!this.env.AUTH_DEV_HEADERS_ENABLED) {
      throw new UnauthorizedException('Missing bearer token.');
    }

    const userId = this.readHeader(request, AUTH_USER_ID_HEADER);
    if (!userId) {
      throw new UnauthorizedException(`Missing required auth header: ${AUTH_USER_ID_HEADER}.`);
    }

    const subject = this.readHeader(request, AUTH_USER_SUBJECT_HEADER) ?? userId;
    const email = this.readHeader(request, AUTH_USER_EMAIL_HEADER) ?? `${userId}@local.invalid`;
    const roles = this.parseRoles(this.readHeader(request, AUTH_USER_ROLES_HEADER));

    request.requestUser = this.usersService.upsertFromIdentity({
      provider: 'dev-header',
      providerSubject: subject,
      email,
      roles,
    });
    return true;
  }

  private readHeader(request: RequestWithUser, headerName: string): string | undefined {
    const value = request.headers[headerName];
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }

  private parseRoles(rawRoles: string | undefined): UserRole[] {
    if (!rawRoles) {
      return [UserRole.USER];
    }

    const parsed = rawRoles
      .split(',')
      .map((role) => role.trim().toLowerCase())
      .filter(Boolean);

    if (parsed.length === 0) {
      return [UserRole.USER];
    }

    for (const role of parsed) {
      if (!roleValues.has(role)) {
        throw new UnauthorizedException(`Invalid role in ${AUTH_USER_ROLES_HEADER}: "${role}".`);
      }
    }

    return Array.from(new Set(parsed)) as UserRole[];
  }

  private extractBearerToken(authorizationHeader: string | undefined): string | undefined {
    if (!authorizationHeader) {
      return undefined;
    }

    const [type, token] = authorizationHeader.split(' ');
    if (!type || !token) {
      return undefined;
    }

    if (type.toLowerCase() !== 'bearer') {
      return undefined;
    }

    return token.trim();
  }
}
