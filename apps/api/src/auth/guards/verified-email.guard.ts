import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PUBLIC_ROUTE_KEY,
  REQUIRED_VERIFIED_EMAIL_KEY,
} from '../constants';
import type { RequestWithUser } from '../interfaces/request-user.interface';

@Injectable()
export class VerifiedEmailGuard implements CanActivate {
  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiresVerifiedEmail = this.reflector.getAllAndOverride<boolean>(
      REQUIRED_VERIFIED_EMAIL_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiresVerifiedEmail) {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.requestUser;
    if (!user) {
      throw new UnauthorizedException('Missing authenticated user.');
    }

    if (user.emailVerified !== true) {
      throw new ForbiddenException('Email verification required.');
    }

    return true;
  }
}
