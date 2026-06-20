import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '@crm/database';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

/** Injects the authenticated user (set by JwtStrategy) into a handler param. */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext): AuthUser | AuthUser[keyof AuthUser] => {
    const req = ctx.switchToHttp().getRequest();
    return data ? req.user?.[data] : req.user;
  },
);
