import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const buildContext = (user: unknown): ExecutionContext =>
    ({
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  const buildGuard = (requiredRoles: number[] | undefined) => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(requiredRoles),
    } as unknown as Reflector;

    return new RolesGuard(reflector);
  };

  it('allows the request when the route has no @Roles metadata', () => {
    const guard = buildGuard(undefined);

    expect(guard.canActivate(buildContext({ role_id: 1 }))).toBe(true);
  });

  it('allows the request when @Roles is present but empty', () => {
    const guard = buildGuard([]);

    expect(guard.canActivate(buildContext({ role_id: 1 }))).toBe(true);
  });

  it('throws when the route requires roles and there is no user on the request', () => {
    const guard = buildGuard([1]);

    expect(() => guard.canActivate(buildContext(undefined))).toThrow(
      ForbiddenException,
    );
  });

  it('throws when the user has no role_id', () => {
    const guard = buildGuard([1]);

    expect(() => guard.canActivate(buildContext({}))).toThrow(
      ForbiddenException,
    );
  });

  it('throws when the user role is not in the required list', () => {
    const guard = buildGuard([1, 2]);

    expect(() => guard.canActivate(buildContext({ role_id: 3 }))).toThrow(
      ForbiddenException,
    );
  });

  it('allows the request when the user role is in the required list', () => {
    const guard = buildGuard([1, 2]);

    expect(guard.canActivate(buildContext({ role_id: 2 }))).toBe(true);
  });

  it('coerces a string role_id before comparing it', () => {
    const guard = buildGuard([1]);

    expect(guard.canActivate(buildContext({ role_id: '1' }))).toBe(true);
  });
});
