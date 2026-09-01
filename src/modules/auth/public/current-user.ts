/**
 * The auth module's published surface for caller identity, sibling to
 * `roles.ts`: that one answers "who may reach this route", this one answers
 * "who is asking".
 */
export { CurrentUser } from '../decorators/current-user.decorator';
export type { AuthenticatedUser } from '../decorators/current-user.decorator';
