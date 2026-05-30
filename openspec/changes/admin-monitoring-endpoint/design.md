# Design: admin-monitoring-endpoint

## Resumen ejecutivo

Crear un módulo nuevo `apps/api/src/modules/admin/` con un único endpoint `GET /api/admin/gps/last-positions`, protegido por `JwtAuthGuard + RolesGuard` con `@Roles('SUPER_ADMIN')` a nivel de clase. El service usa `$queryRaw` con `Prisma.sql` para WHERE condicional + `LEFT JOIN users` que aporta `userName`. El helper `signTokenFor` relaja su tipo de `companyId` a `string | null` y se agrega `createSuperAdmin()` reutilizable. Frontend cambia 5 líneas en `monitoring/page.tsx`.

## Estructura del módulo

Archivo: `apps/api/src/modules/admin/admin.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { AdminGpsController } from './admin-gps.controller';
import { AdminGpsService } from './admin-gps.service';

@Module({
  controllers: [AdminGpsController],
  providers: [AdminGpsService],
})
export class AdminModule {}
```

**Decisión clave**: NO declarar imports porque `PrismaModule` es global. NO exportar nada — el módulo es self-contained.

## Controller

Archivo: `apps/api/src/modules/admin/admin-gps.controller.ts`

```typescript
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../../common/guards/roles.guard';
import { AdminGpsService } from './admin-gps.service';
import { AdminGpsQueryDto } from './dto/admin-gps-query.dto';

@Controller('admin/gps')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminGpsController {
  constructor(private readonly svc: AdminGpsService) {}

  @Get('last-positions')
  getLastPositions(@Query() query: AdminGpsQueryDto) {
    return this.svc.getLastPositions(query.companyId);
  }
}
```

**Decisiones clave**:
- Path `admin/gps` (no `gps/admin`) — el prefijo `admin/` agrupa futuros endpoints SUPER_ADMIN.
- Guards a nivel de clase: si se agrega otro `@Get(...)` después, hereda la protección.
- DTO en lugar de raw query — `ValidationPipe` global con `forbidNonWhitelisted` aplica solo a DTOs.
- NO se aplica `ModuleGuard` — admin es transversal, no depende de módulos contratados por tenant.

## DTO

Archivo: `apps/api/src/modules/admin/dto/admin-gps-query.dto.ts`

```typescript
import { IsOptional, IsString } from 'class-validator';

export class AdminGpsQueryDto {
  @IsOptional()
  @IsString()
  companyId?: string;
}
```

**Decisión clave**: usar `@IsString()`, NO `@IsUUID()`. El schema usa `@default(cuid())`. Un CUID no matchea UUID v4 — `@IsUUID()` rechazaría IDs reales con 400.

## Service

Archivo: `apps/api/src/modules/admin/admin-gps.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface AdminLastPositionRow {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  batteryLevel: number | null;
  recordedAt: Date;
  userName: string | null;
}

@Injectable()
export class AdminGpsService {
  constructor(private readonly prisma: PrismaService) {}

  async getLastPositions(
    companyId?: string,
  ): Promise<AdminLastPositionRow[]> {
    const whereClause = companyId
      ? Prisma.sql`WHERE gl.company_id = ${companyId}`
      : Prisma.empty;

    return this.prisma.$queryRaw<AdminLastPositionRow[]>`
      SELECT DISTINCT ON (gl.user_id)
        gl.user_id        AS "userId",
        gl.latitude       AS "latitude",
        gl.longitude      AS "longitude",
        gl.accuracy       AS "accuracy",
        gl.speed          AS "speed",
        gl.battery_level  AS "batteryLevel",
        gl.recorded_at    AS "recordedAt",
        CASE
          WHEN u.id IS NOT NULL
          THEN CONCAT(u.first_name, ' ', u.last_name)
          ELSE NULL
        END               AS "userName"
      FROM gps_locations gl
      LEFT JOIN users u ON u.id = gl.user_id
      ${whereClause}
      ORDER BY gl.user_id, gl.recorded_at DESC
    `;
  }
}
```

**Decisiones clave**:
- `Prisma.sql` template + interpolación segura (`${companyId}` se serializa como parámetro preparado).
- `Prisma.empty` para el caso sin WHERE — patrón oficial Prisma.
- `LEFT JOIN` (no INNER) → si un usuario fue borrado pero quedan filas en `gps_locations`, devuelve `userName: null`.
- `DISTINCT ON (gl.user_id)` + `ORDER BY gl.user_id, gl.recorded_at DESC` → garantiza última posición por usuario (sintaxis PostgreSQL).

## Helper signTokenFor

Archivo: `apps/api/test/helpers/auth.ts`

**Diff exacto**:

```diff
 export function signTokenFor(
   app: INestApplication,
-  user: { userId: string; email: string; role: UserRole; companyId: string },
+  user: { userId: string; email: string; role: UserRole; companyId: string | null },
 ): string {
```

Sin cambios en el body — `jwt.sign` acepta `null` en payload sin problemas.

**Helper nuevo al final del archivo**:

```typescript
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
```

**Decisión clave**: `User.companyId` es `String?` en schema. No reusamos `createTestUser` porque su firma obliga `companyId: string` no nullable.

## Registro en app.module.ts

**Diff exacto**:

```diff
 import { SyncModule } from './modules/sync/sync.module';
+import { AdminModule } from './modules/admin/admin.module';

 @Module({
   imports: [
     ...
     SyncModule,
+    // Módulos transversales (SUPER_ADMIN)
+    AdminModule,
   ],
 })
```

## Test e2e

Archivo: `apps/api/test/admin-monitoring.e2e-spec.ts` (NUEVO)

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/common/prisma/prisma.service';
import { truncateAll } from './helpers/db';
import {
  createTestCompany,
  createTestUser,
  createSuperAdmin,
  signTokenFor,
} from './helpers/auth';

describe('Admin Monitoring — GET /api/admin/gps/last-positions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let superAdminToken: string;
  let companyAdminToken: string;
  let fieldWorkerToken: string;

  let companyIdA: string;
  let companyIdB: string;
  let userIdA: string;
  let userIdB: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: false },
      }),
    );
    app.setGlobalPrefix('api');
    await app.init();

    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await truncateAll(prisma);

    const companyA = await createTestCompany(prisma, { name: 'Empresa A' });
    const companyB = await createTestCompany(prisma, { name: 'Empresa B' });
    companyIdA = companyA.companyId;
    companyIdB = companyB.companyId;

    const userA = await createTestUser(prisma, companyIdA, 'FIELD_WORKER', {
      email: `worker-a-${Date.now()}@test.local`,
    });
    const userB = await createTestUser(prisma, companyIdB, 'FIELD_WORKER', {
      email: `worker-b-${Date.now()}@test.local`,
    });
    userIdA = userA.userId;
    userIdB = userB.userId;

    await prisma.user.update({
      where: { id: userIdA },
      data: { firstName: 'Juan', lastName: 'Perez' },
    });
    await prisma.user.update({
      where: { id: userIdB },
      data: { firstName: 'Maria', lastName: 'Lopez' },
    });

    const companyAdmin = await createTestUser(
      prisma,
      companyIdA,
      'COMPANY_ADMIN',
      { email: `ca-${Date.now()}@test.local` },
    );

    const superAdmin = await createSuperAdmin(prisma);

    superAdminToken = signTokenFor(app, {
      userId: superAdmin.userId,
      email: superAdmin.email,
      role: 'SUPER_ADMIN',
      companyId: null,
    });

    companyAdminToken = signTokenFor(app, {
      userId: companyAdmin.userId,
      email: companyAdmin.email,
      role: 'COMPANY_ADMIN',
      companyId: companyIdA,
    });

    fieldWorkerToken = signTokenFor(app, {
      userId: userIdA,
      email: userA.email,
      role: 'FIELD_WORKER',
      companyId: companyIdA,
    });

    await prisma.gpsLocation.createMany({
      data: [
        {
          companyId: companyIdA, userId: userIdA,
          latitude: -25.0, longitude: -57.0,
          recordedAt: new Date('2026-05-29T10:00:00Z'),
        },
        {
          companyId: companyIdA, userId: userIdA,
          latitude: -25.3, longitude: -57.5,
          accuracy: 5, batteryLevel: 80,
          recordedAt: new Date('2026-05-29T11:00:00Z'),
        },
        {
          companyId: companyIdB, userId: userIdB,
          latitude: -27.0, longitude: -55.0,
          recordedAt: new Date('2026-05-29T09:00:00Z'),
        },
        {
          companyId: companyIdB, userId: userIdB,
          latitude: -27.3, longitude: -55.8,
          accuracy: 10, batteryLevel: 65,
          recordedAt: new Date('2026-05-29T12:00:00Z'),
        },
      ],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. SUPER_ADMIN sin companyId → 200, devuelve posiciones cross-tenant', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/gps/last-positions')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    const userIds = res.body.map((r: any) => r.userId).sort();
    expect(userIds).toEqual([userIdA, userIdB].sort());
  });

  it('2. SUPER_ADMIN con ?companyId=A → 200, solo posiciones de A', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/gps/last-positions')
      .query({ companyId: companyIdA })
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    expect(res.body.length).toBe(1);
    expect(res.body[0].userId).toBe(userIdA);
    expect(res.body[0].latitude).toBe(-25.3);
    expect(res.body[0].longitude).toBe(-57.5);
  });

  it('3. COMPANY_ADMIN autenticado → 403', async () => {
    await request(app.getHttpServer())
      .get('/api/admin/gps/last-positions')
      .set('Authorization', `Bearer ${companyAdminToken}`)
      .expect(403);
  });

  it('4. FIELD_WORKER autenticado → 403', async () => {
    await request(app.getHttpServer())
      .get('/api/admin/gps/last-positions')
      .set('Authorization', `Bearer ${fieldWorkerToken}`)
      .expect(403);
  });

  it('5. Sin token → 401', async () => {
    await request(app.getHttpServer())
      .get('/api/admin/gps/last-positions')
      .expect(401);
  });

  it('6. Shape de respuesta incluye userName "FirstName LastName"', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/gps/last-positions')
      .query({ companyId: companyIdA })
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    expect(res.body[0]).toMatchObject({
      userId: userIdA,
      latitude: -25.3,
      longitude: -57.5,
      accuracy: 5,
      batteryLevel: 80,
      userName: 'Juan Perez',
    });
    expect(res.body[0].recordedAt).toBeDefined();
  });
});
```

## Frontend

Archivo: `apps/admin/src/app/monitoring/page.tsx`

**Diff exacto** (líneas 33-39):

```diff
 const loadPositions = async (companyId: string) => {
+  if (!companyId) {
+    setPositions([]);
+    return;
+  }
   setLoading(true);
   try {
-    // Para monitoreo global necesitaríamos un endpoint admin específico
-    setPositions([]);
+    const r = await api.get('/admin/gps/last-positions', {
+      params: { companyId },
+    });
+    setPositions(r.data);
   } catch {
     setPositions([]);
   } finally {
     setLoading(false);
   }
 };
```

**Decisión clave**: el guard `if (!companyId)` evita una llamada con string vacío que dispararía full-scan cross-tenant accidentalmente al cargar la página.

## Decisiones de arquitectura

| # | Decisión | Alternativas | Razón |
|---|---|---|---|
| 1 | Módulo nuevo `admin/` | Endpoint en GpsController; param en endpoint existente | Separation of concerns; admin transversal no hereda ModuleGuard; espacio para futuros endpoints |
| 2 | DTO con class-validator | Raw query string | ValidationPipe global solo aplica a DTOs; raw param ignora validaciones |
| 3 | `@IsString()` vs `@IsUUID()` | @IsUUID | Schema usa `cuid()`, no UUID; @IsUUID rechazaría IDs reales |
| 4 | `LEFT JOIN users` en SQL | Segundo query + merge en JS | 1 query vs 2; PK indexada; LEFT preserva posiciones de users borrados |
| 5 | `Prisma.sql` + `Prisma.empty` | String concat, 2 métodos separados | Patrón oficial safe; cero SQL injection risk |
| 6 | Guards a nivel de clase | Nivel de método | Hereda protección para futuros endpoints en el mismo controller |
| 7 | RolesGuard explícito en `@UseGuards` | Registro global | Cambio global afectaría todos los endpoints — riesgoso y out of scope |
| 8 | Helper `createSuperAdmin()` nuevo | Modificar createTestUser para nullable | createTestUser usado en 8+ specs; cambiar firma rompe DX |
| 9 | `signTokenFor` con `string \| null` | `companyId?: string` opcional | JWT debe incluir `companyId: null` explícito, no `undefined` |
| 10 | Guard `if (!companyId)` en frontend | Llamar siempre y dejar al backend | Evita cross-tenant scan accidental por estado inicial del componente |

## Orden de implementación

1. **Helper de tests** — relajar `signTokenFor` + agregar `createSuperAdmin`. Verificar `tsc --noEmit` no rompe specs existentes.
2. **DTO** — crear `admin-gps-query.dto.ts`.
3. **Service** — crear `admin-gps.service.ts` con `$queryRaw`.
4. **Controller** — crear `admin-gps.controller.ts` con guards.
5. **Module** — crear `admin.module.ts`.
6. **Registrar** en `app.module.ts`.
7. **Tests e2e** — crear `admin-monitoring.e2e-spec.ts` con los 6 escenarios. Verificar pasan.
8. **Verificación full** — `tsc --noEmit` + suite completa de e2e (cero regresiones).
9. **Frontend** — aplicar diff en `monitoring/page.tsx`.
10. **Smoke manual** — levantar API + admin, ver markers en `/monitoring`.

## Open Questions

Ninguna pendiente. Todas las preguntas abiertas de exploration quedaron resueltas en decisiones 1-10.
