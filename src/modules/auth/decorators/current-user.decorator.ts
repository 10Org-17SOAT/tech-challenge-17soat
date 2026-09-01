import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { UserRole } from '../roles/role.enum';

/**
 * What `JwtStrategy.validate` puts on the request. Note `user_id`, not `sub`:
 * the strategy renames the JWT subject on the way in.
 */
export interface AuthenticatedUser {
  user_id: string;
  email: string;
  role_id: UserRole;
}

/**
 * The caller behind the token. Roles say what kind of user this is; this says
 * which one — the difference that ownership checks are built on.
 *
 * Always populated on a guarded route: the global JwtAuthGuard rejects the
 * request before a handler runs unless it is @Public().
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser =>
    context.switchToHttp().getRequest<{ user: AuthenticatedUser }>().user,
);
