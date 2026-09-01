/**
 * The auth module's published surface for authorization.
 *
 * Other modules declare who may reach a route, so they need this module's role
 * vocabulary — but nothing else. Everything reachable from here is a stable
 * contract; the rest of `auth/` is free to move without breaking them.
 *
 * Deliberately absent: ROLES_KEY and IS_PUBLIC_KEY. Those are the handshake
 * between a decorator and the guard that reads it, and no one else needs them.
 */
export { Roles } from '../decorators/roles.decorator';
export { Public } from '../decorators/public.decorator';
export { UserRole, USER_ROLE_LABELS, getRoleLabel } from '../roles/role.enum';
