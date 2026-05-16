import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ModuleGuard } from './module.guard';
import { PrismaService } from '../prisma/prisma.service';

describe('ModuleGuard', () => {
  let guard: ModuleGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let prisma: { companyModule: { findUnique: jest.Mock } };

  beforeEach(async () => {
    reflector = { getAllAndOverride: jest.fn() };
    prisma = {
      companyModule: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModuleGuard,
        { provide: Reflector, useValue: reflector },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    guard = module.get<ModuleGuard>(ModuleGuard);
  });

  function buildContext(user: {
    companyId: string | null;
    role?: string;
  }): ExecutionContext {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  it('endpoint sin @RequireModule() → permite (retorna true)', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined); // sin módulo requerido
    const ctx = buildContext({ companyId: 'cmp-1' });

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(prisma.companyModule.findUnique).not.toHaveBeenCalled();
  });

  it('con @RequireModule(INVENTORY) y módulo habilitado → retorna true', async () => {
    reflector.getAllAndOverride.mockReturnValue('INVENTORY');
    prisma.companyModule.findUnique.mockResolvedValue({ isEnabled: true });
    const ctx = buildContext({ companyId: 'cmp-1' });

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(prisma.companyModule.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId_module: { companyId: 'cmp-1', module: 'INVENTORY' },
        },
      }),
    );
  });

  it('con @RequireModule(INVENTORY) y módulo deshabilitado → lanza ForbiddenException', async () => {
    reflector.getAllAndOverride.mockReturnValue('INVENTORY');
    prisma.companyModule.findUnique.mockResolvedValue({ isEnabled: false });
    const ctx = buildContext({ companyId: 'cmp-1' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('con @RequireModule(VISITS) y módulo no encontrado (null) → lanza ForbiddenException', async () => {
    reflector.getAllAndOverride.mockReturnValue('VISITS');
    prisma.companyModule.findUnique.mockResolvedValue(null);
    const ctx = buildContext({ companyId: 'cmp-1' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('usuario sin companyId (SUPER_ADMIN) → permite sin consultar DB', async () => {
    reflector.getAllAndOverride.mockReturnValue('INVENTORY');
    const ctx = buildContext({ companyId: null });

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(prisma.companyModule.findUnique).not.toHaveBeenCalled();
  });
});
