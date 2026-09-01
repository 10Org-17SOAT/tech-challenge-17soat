import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Opts a route out of the global JwtAuthGuard. Authentication is the default
 * for every route; anonymous access must always be declared explicitly here.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
