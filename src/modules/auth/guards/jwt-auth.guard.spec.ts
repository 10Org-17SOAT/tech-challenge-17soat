import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  // Passport reaches for the request, so the double has to carry one. An empty
  // headers bag is exactly the "no token" case.
  const context = {
    getHandler: () => undefined,
    getClass: () => undefined,
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => ({ headers: {} }),
      getResponse: () => ({}),
    }),
  } as unknown as ExecutionContext;

  const guardWith = (isPublic: boolean | undefined): JwtAuthGuard => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(isPublic),
    } as unknown as Reflector;
    return new JwtAuthGuard(reflector);
  };

  it('lets a @Public() route through without a token', () => {
    expect(guardWith(true).canActivate(context)).toBe(true);
  });

  // The whole point of the global guard: anything not explicitly public is
  // handed to Passport, which rejects a request with no valid bearer token.
  // Reaching Passport at all is the assertion here — it rejects because no
  // strategy is registered in a unit context. That it does not short-circuit
  // to `true` is what matters; the resulting 401 is covered end-to-end in
  // test/auth.e2e-spec.ts.
  it('delegates to passport when the route is not public', async () => {
    const guard = guardWith(undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(
      /Unknown authentication strategy/,
    );
  });
});
