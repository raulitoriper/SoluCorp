import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { RolesGuard, ROLES_KEY } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(async () => {
    reflector = { getAllAndOverride: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesGuard, { provide: Reflector, useValue: reflector }],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
  });

  function buildContext(userRole: string): ExecutionContext {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: userRole } }),
      }),
    } as unknown as ExecutionContext;
  }

  it('endpoint sin @Roles() → permite (retorna true)', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined); // sin metadata de roles
    const ctx = buildContext('FIELD_WORKER');

    const result = guard.canActivate(ctx);

    expect(result).toBe(true);
  });

  it('usuario COMPANY_ADMIN accediendo a ruta @Roles(COMPANY_ADMIN) → retorna true', () => {
    reflector.getAllAndOverride.mockReturnValue(['COMPANY_ADMIN']);
    const ctx = buildContext('COMPANY_ADMIN');

    const result = guard.canActivate(ctx);

    expect(result).toBe(true);
  });

  it('usuario FIELD_WORKER accediendo a ruta @Roles(COMPANY_ADMIN) → retorna false', () => {
    reflector.getAllAndOverride.mockReturnValue(['COMPANY_ADMIN']);
    const ctx = buildContext('FIELD_WORKER');

    const result = guard.canActivate(ctx);

    expect(result).toBe(false);
  });

  it('usuario SUPER_ADMIN accediendo a ruta @Roles(SUPER_ADMIN) → retorna true', () => {
    reflector.getAllAndOverride.mockReturnValue(['SUPER_ADMIN']);
    const ctx = buildContext('SUPER_ADMIN');

    const result = guard.canActivate(ctx);

    expect(result).toBe(true);
  });

  it('usuario FIELD_WORKER accediendo a ruta con múltiples roles [COMPANY_ADMIN, SUPER_ADMIN] → retorna false', () => {
    reflector.getAllAndOverride.mockReturnValue([
      'COMPANY_ADMIN',
      'SUPER_ADMIN',
    ]);
    const ctx = buildContext('FIELD_WORKER');

    const result = guard.canActivate(ctx);

    expect(result).toBe(false);
  });

  it('el reflector se llama con ROLES_KEY', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const ctx = buildContext('FIELD_WORKER');

    guard.canActivate(ctx);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      ROLES_KEY,
      expect.any(Array),
    );
  });
});
