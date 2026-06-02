import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { UserRole, ServiceModule } from '@prisma/client';

export async function createTestCompany(
  prisma: PrismaService,
  overrides: Partial<{ name: string; ruc: string }> = {},
) {
  const company = await prisma.company.create({
    data: {
      name: overrides.name ?? 'Test Co',
      ruc:
        overrides.ruc ??
        `RUC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      subscription: { create: { status: 'ACTIVE', planType: 'STANDARD' } },
      settings: { create: {} },
      modules: {
        create: Object.values(ServiceModule).map((m) => ({
          module: m,
          isEnabled: true,
        })),
      },
    },
  });
  return { companyId: company.id, name: company.name };
}

export async function createTestUser(
  prisma: PrismaService,
  companyId: string,
  role: UserRole = 'FIELD_WORKER',
  overrides: Partial<{ email: string; password: string }> = {},
) {
  const password = overrides.password ?? 'Password123!';
  const passwordHash = await bcrypt.hash(password, 4); // rounds bajos para tests rápidos
  const email =
    overrides.email ??
    `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.local`;
  const user = await prisma.user.create({
    data: {
      companyId,
      email,
      passwordHash,
      firstName: 'Test',
      lastName: 'User',
      role,
    },
  });
  return { userId: user.id, email, password };
}

/**
 * Emite un JWT directamente vía JwtService — NO va por POST /api/auth/login.
 * Razón: 10x más rápido por test, sin tocar refreshTokens table.
 * Para tests que SÍ deben ejercitar el endpoint completo, usar loginViaHttp().
 */
export function signTokenFor(
  app: INestApplication,
  user: {
    userId: string;
    email: string;
    role: UserRole;
    companyId: string | null;
  },
): string {
  const jwt = app.get(JwtService);
  return jwt.sign(
    {
      sub: user.userId,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    },
    { expiresIn: '8h' },
  );
}

/**
 * Crea un usuario SUPER_ADMIN con companyId: null (no pertenece a tenant).
 * Reutilizable para tests de endpoints admin transversales.
 */
export async function createSuperAdmin(
  prisma: PrismaService,
  overrides: Partial<{ email: string; password: string }> = {},
) {
  const password = overrides.password ?? 'SuperAdmin123!';
  const passwordHash = await bcrypt.hash(password, 4);
  const email =
    overrides.email ??
    `superadmin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.local`;
  const user = await prisma.user.create({
    data: {
      companyId: null,
      email,
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
    },
  });
  return { userId: user.id, email, password };
}

export async function loginViaHttp(
  app: INestApplication,
  email: string,
  password: string,
) {
  const request = (await import('supertest')).default;
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);
  return {
    accessToken: res.body.access_token,
    refreshToken: res.body.refresh_token,
  };
}
