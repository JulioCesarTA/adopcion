import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@prisma/client';
import { ALL_ROLES, RolesGuard } from './roles.guard';

function ctx(role: UserRole | null): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user: role ? { id: 'u', role } : undefined }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard (deny by default para CLIENTE)', () => {
  const make = (roles: UserRole[] | undefined) => {
    const reflector = { getAllAndOverride: () => roles } as unknown as Reflector;
    return new RolesGuard(reflector);
  };

  it('sin @Roles(): el personal entra, el CLIENTE no', () => {
    const guard = make(undefined);
    for (const r of ['ADMIN', 'VETERINARIO', 'GESTION', 'DIRECTIVO'] as const) {
      expect(guard.canActivate(ctx(r))).toBe(true);
    }
    expect(() => guard.canActivate(ctx('CLIENTE'))).toThrow(ForbiddenException);
  });

  it('con @Roles(...ALL_ROLES) el CLIENTE entra', () => {
    expect(make(ALL_ROLES).canActivate(ctx('CLIENTE'))).toBe(true);
  });

  it('con @Roles(ADMIN) solo ADMIN', () => {
    const guard = make(['ADMIN']);
    expect(guard.canActivate(ctx('ADMIN'))).toBe(true);
    expect(() => guard.canActivate(ctx('GESTION'))).toThrow(ForbiddenException);
  });

  it('endpoints @Public() sin usuario pasan (el JwtAuthGuard ya decidió)', () => {
    expect(make(undefined).canActivate(ctx(null))).toBe(true);
  });
});
