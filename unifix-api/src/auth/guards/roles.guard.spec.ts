import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from '../../../generated/prisma/enums';
import { RolesGuard } from './roles.guard';

function makeContext(user: { role: RoleName } | null): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows access when no roles are required', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) };
    const guard = new RolesGuard(reflector as unknown as Reflector);

    expect(guard.canActivate(makeContext({ role: RoleName.STUDENT_STAFF }))).toBe(
      true,
    );
  });

  it('denies access when the user role is not in the required list', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([RoleName.ADMINISTRATOR]),
    };
    const guard = new RolesGuard(reflector as unknown as Reflector);

    expect(
      guard.canActivate(makeContext({ role: RoleName.STUDENT_STAFF })),
    ).toBe(false);
  });

  it('allows access when the user role is in the required list', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([RoleName.ADMINISTRATOR]),
    };
    const guard = new RolesGuard(reflector as unknown as Reflector);

    expect(
      guard.canActivate(makeContext({ role: RoleName.ADMINISTRATOR })),
    ).toBe(true);
  });

  it('denies access when there is no authenticated user', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([RoleName.ADMINISTRATOR]),
    };
    const guard = new RolesGuard(reflector as unknown as Reflector);

    expect(guard.canActivate(makeContext(null))).toBe(false);
  });
});
