import { type ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { RequestUser, RequestWithUser } from '../interfaces/request-user.interface';

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<RequestWithUser>();
  return request.requestUser as RequestUser;
});
