import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';

export const REQUIRED_MODULE_KEY = 'required_module';
export const RequireModule = (module: string) => SetMetadata(REQUIRED_MODULE_KEY, module);

@Injectable()
export class ModuleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredModule = this.reflector.getAllAndOverride<string>(REQUIRED_MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredModule) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user?.companyId) return true; // SUPER_ADMIN no tiene restricción

    const companyModule = await this.prisma.companyModule.findUnique({
      where: { companyId_module: { companyId: user.companyId, module: requiredModule as any } },
    });

    if (!companyModule?.isEnabled) {
      throw new ForbiddenException('Módulo no habilitado para su empresa');
    }

    return true;
  }
}
