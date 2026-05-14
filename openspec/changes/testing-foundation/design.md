# Design: testing-foundation

## Resumen ejecutivo

Establecer fundación de testing **backend-only** (apps/api, packages/shared, packages/ui) con dos suites Jest paralelos: **unit** con Prisma mockeado vía `jest.fn()` inline (sin librerías extra) y **e2e** con PostgreSQL local real contra `.env.test`, aislado mediante `truncateAll()` en `beforeEach` con guardarraíl literal `"test"` en `DATABASE_URL`. Turborepo gana dos tasks separadas (`test` cacheable, `test:e2e` no-cacheable). El refactor W01 de `visits.service.ts` se cierra dentro del scope con spec previo.

**Hallazgo durante el diseño:** la propuesta declaraba que `apps/api/test/jest-e2e.json` NO existía — **sí existe** (verificado en disco) junto con `apps/api/test/app.e2e-spec.ts` dummy. La fase A se simplifica a "extender el config existente" en lugar de "crear desde cero".

---

## Estructura de archivos de test

**Decisión:** co-located para unit, `test/` separado para e2e. Naming `*.spec.ts` (unit) y `*.e2e-spec.ts` (e2e).

```
apps/api/
├── src/
│   ├── app.controller.spec.ts                       (ya existe)
│   └── modules/
│       ├── inventory/
│       │   ├── inventory.service.ts
│       │   └── inventory.service.spec.ts            (co-located)
│       ├── attendance/attendance.service.spec.ts
│       ├── guard/guard.service.spec.ts
│       ├── visits/visits.service.spec.ts
│       ├── auth/
│       │   ├── auth.service.spec.ts
│       │   └── guards/
│       │       ├── jwt-auth.guard.spec.ts
│       │       ├── roles.guard.spec.ts
│       │       └── module.guard.spec.ts
│       └── sync/sync.service.spec.ts
└── test/
    ├── jest-e2e.json                                (ya existe, ampliar)
    ├── setup-env.ts                                 (NUEVO — carga .env.test)
    ├── helpers/
    │   ├── db.ts                                    (NUEVO — truncateAll)
    │   └── auth.ts                                  (NUEVO — JWT emisor)
    ├── app.e2e-spec.ts                              (ya existe, se mantiene)
    ├── visits.e2e-spec.ts                          (uno por módulo P0)
    ├── orders.e2e-spec.ts
    ├── inventory.e2e-spec.ts
    ├── attendance.e2e-spec.ts
    ├── guard.e2e-spec.ts
    ├── medical-visits.e2e-spec.ts
    ├── courier.e2e-spec.ts
    ├── gps.e2e-spec.ts
    ├── sync.e2e-spec.ts
    ├── metadata.e2e-spec.ts
    ├── multi-tenant.e2e-spec.ts                     (transversal — aislamiento)
    └── validation-pipe.e2e-spec.ts                  (transversal — flags globales)
```

**Razón:** co-located scales mejor con módulos NestJS (el archivo de test vive donde se importa la lógica, hot-reload es trivial). E2e queda en `test/` por convención NestJS y porque comparte `helpers/` + setup global de DB. Mixto en e2e: 10 archivos-por-módulo (granularidad ↔ paralelización futura) + 2 transversales (`multi-tenant`, `validation-pipe`) que cruzan módulos por concepto.

---

## Mock de Prisma

**Decisión: Opción A — Mock inline con `jest.fn()` por spec**, sin librerías extras.

**Razón:** (1) cero dependencias nuevas, alineado con el principio de "arrancar HOY" del exploration. (2) Cada spec declara explícitamente qué métodos mockea, evitando "magia" de helpers compartidos. (3) Para una base ~10 unit specs, DRY de `createPrismaMock()` aporta menos que costo cognitivo de la abstracción. (4) `jest-mock-extended` queda como upgrade futuro si la base crece >30 specs y el autocomplete se vuelve crítico.

**Snippet ejemplo (`inventory.service.spec.ts`):**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: { inventoryRecord: { create: jest.Mock; findMany: jest.Mock; findFirst: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      inventoryRecord: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  describe('create', () => {
    it('debe pasar companyId del argumento, NUNCA del dto', async () => {
      prisma.inventoryRecord.create.mockResolvedValue({ id: 'rec1' });
      await service.create('cmp-1', 'usr-1', {
        depositCode: 'D01', productCode: 'P01', quantity: 10,
      } as any);

      expect(prisma.inventoryRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ companyId: 'cmp-1', userId: 'usr-1', depositCode: 'D01' }),
      });
      // Garantía: campos pasados explícitamente, no por spread
      const callArg = prisma.inventoryRecord.create.mock.calls[0][0].data;
      expect(Object.keys(callArg)).toEqual(
        expect.arrayContaining(['companyId', 'userId', 'depositCode', 'productCode', 'quantity']),
      );
    });
  });
});
```

---

## DB para e2e: truncate vs transactions

**Decisión: Truncate en `beforeEach`.**

**Razón:** (1) `sync.service.ts` usa `prisma.$transaction(...)` internamente para procesar batches — un approach de "transaction-per-test con rollback" rompería porque Prisma+Postgres no permite anidar transacciones explícitas vía `$transaction` sobre una transacción de test ya abierta. (2) Truncate con `TRUNCATE ... RESTART IDENTITY CASCADE` es rápido en Postgres local (~5ms por tabla en una DB vacía) → para ~20 tablas son ~100ms por test, aceptable. (3) Aislamiento real: cada test ve estado completamente reseteado, no estado "shadow" de una transacción. (4) Simple de mantener: cuando se agregue una tabla nueva, basta con agregar el nombre al array.

**Tablas a truncar (orden por FK descendente — hijos primero, padres después):**

```
courier_items, courier_deliveries,
medical_visit_products, medical_visits,
order_items, orders,
sync_queue,
guard_shifts,
attendance_events,
inventory_records,
gps_locations,
visits,
metadata_items, metadata_types,
refresh_tokens,
users,
company_settings, company_modules, subscriptions,
companies
```

**Truco práctico:** usar `TRUNCATE ... CASCADE` en una sola sentencia con la lista completa — Postgres resuelve dependencias automáticamente y es mucho más rápido que truncates individuales.

---

## Helpers

### `apps/api/test/helpers/db.ts` — truncateAll con guardarraíl

```typescript
import { PrismaService } from '../../src/common/prisma/prisma.service';

// Lista canónica de tablas — orden no importa con CASCADE,
// pero se documenta de hojas a raíz para facilitar lectura.
const TABLES = [
  'courier_items', 'courier_deliveries',
  'medical_visit_products', 'medical_visits',
  'order_items', 'orders',
  'sync_queue',
  'guard_shifts',
  'attendance_events',
  'inventory_records',
  'gps_locations',
  'visits',
  'metadata_items', 'metadata_types',
  'refresh_tokens',
  'users',
  'company_settings', 'company_modules', 'subscriptions',
  'companies',
] as const;

export async function truncateAll(prisma: PrismaService): Promise<void> {
  const dbUrl = process.env.DATABASE_URL ?? '';

  // GUARDARRAÍL: nunca truncar una DB que no sea explícitamente de test.
  // El literal "test" debe aparecer en el nombre de la base.
  if (!dbUrl.includes('test')) {
    throw new Error(
      `[truncateAll] DATABASE_URL no contiene literal "test". ` +
      `Abortando para proteger datos. URL recibida: ${dbUrl.replace(/:[^:@]+@/, ':***@')}`,
    );
  }

  // Truncate único con CASCADE y RESTART IDENTITY — mucho más rápido que iterar.
  const list = TABLES.map((t) => `"${t}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`);
}
```

**Por qué guardarraíl con `includes('test')`:** simple, ruidoso, imposible de pasar por alto. Convención de nombre: `solucorp_test` para la DB. Documentado en README + `.env.test.example`.

### `apps/api/test/helpers/auth.ts`

```typescript
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
      ruc: overrides.ruc ?? `RUC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      subscription: { create: { status: 'ACTIVE', planType: 'STANDARD' } },
      settings: { create: {} },
      modules: {
        create: Object.values(ServiceModule).map((m) => ({ module: m, isEnabled: true })),
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
  const email = overrides.email ?? `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.local`;
  const user = await prisma.user.create({
    data: { companyId, email, passwordHash, firstName: 'Test', lastName: 'User', role },
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
  user: { userId: string; email: string; role: UserRole; companyId: string },
): string {
  const jwt = app.get(JwtService);
  return jwt.sign(
    { sub: user.userId, email: user.email, role: user.role, companyId: user.companyId },
    { expiresIn: '8h' },
  );
}

export async function loginViaHttp(app: INestApplication, email: string, password: string) {
  const request = (await import('supertest')).default;
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);
  return { accessToken: res.body.access_token, refreshToken: res.body.refresh_token };
}
```

**Decisión sobre emisión de tokens:** **por defecto se usa `signTokenFor()`** (JWT directo). Solo `auth.e2e-spec.ts` ejercita `loginViaHttp()` para validar el endpoint real. Razón: cada test e2e levanta la app completa una vez por archivo — ejercitar `/login` en cada `beforeEach` agregaría ~200ms × N tests sin valor adicional (el login ya está cubierto por su propio suite).

---

## Configuración Jest

### apps/api unit (en `package.json`)

Cambios mínimos respecto al actual: agregar `collectCoverageFrom` con exclusiones y `coverageReporters`. NO cambiar `rootDir: "src"` (mantiene co-located).

```json
"jest": {
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "src",
  "testRegex": ".*\\.spec\\.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "collectCoverageFrom": [
    "**/*.(t|j)s",
    "!**/*.module.ts",
    "!**/*.dto.ts",
    "!**/main.ts",
    "!**/*.spec.ts",
    "!**/dto/**",
    "!**/index.ts"
  ],
  "coverageDirectory": "../coverage",
  "coverageReporters": ["text", "lcov", "html"],
  "testEnvironment": "node"
}
```

**Por qué las exclusiones:**
- `*.module.ts` — solo cableado DI, sin lógica.
- `*.dto.ts` / `dto/**` — solo decoradores; cubrir validación via e2e contra el endpoint, no unit.
- `main.ts` — bootstrap, cubierto naturalmente por cualquier e2e que levante la app.
- `index.ts` — barrels, sin lógica.

### apps/api e2e (`test/jest-e2e.json`)

Reemplazar el contenido actual (que ya existe pero es mínimo):

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "setupFiles": ["<rootDir>/setup-env.ts"],
  "testTimeout": 30000,
  "maxWorkers": 1
}
```

**Por qué cada valor:**
- `setupFiles` (no `setupFilesAfterEach`): `setupFiles` corre ANTES de cargar el framework de Jest y del módulo de Nest → garantiza que `process.env.DATABASE_URL` ya está seteado cuando `PrismaService` se construye.
- `testTimeout: 30000`: levantar `AppModule` + conexión Postgres + truncate + supertest puede tardar segundos en máquinas modestas.
- `maxWorkers: 1`: única DB compartida, paralelizar arruina el aislamiento. Alternativa futura: schemas por worker, fuera de scope.

### `apps/api/test/setup-env.ts` (NUEVO)

```typescript
import { config } from 'dotenv';
import { resolve } from 'path';

// dotenv ya está en dependencies del backend (^17.4.2).
// Carga .env.test desde apps/api/.env.test (root del workspace api).
config({ path: resolve(__dirname, '../.env.test') });

if (!process.env.DATABASE_URL?.includes('test')) {
  throw new Error(
    `[setup-env] DATABASE_URL debe contener literal "test". ` +
    `Verificá apps/api/.env.test`,
  );
}
```

### packages/shared (archivo separado `jest.config.ts`)

**Decisión:** archivo separado, no inline en `package.json`. Razón: el backend usa inline porque NestJS scaffold lo hizo así; en `packages/shared` no hay convención previa y `jest.config.ts` permite tipado.

```typescript
// packages/shared/jest.config.ts
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '\\.spec\\.ts$',
  collectCoverageFrom: ['**/*.ts', '!**/*.spec.ts', '!**/index.ts'],
  coverageReporters: ['text', 'lcov'],
};

export default config;
```

### packages/ui (archivo separado `jest.config.ts`)

```typescript
// packages/ui/jest.config.ts
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  rootDir: 'src',
  testRegex: '\\.spec\\.tsx?$',
  setupFilesAfterEach: ['<rootDir>/../jest.setup.ts'],
  moduleNameMapper: { '\\.(css|less|scss)$': '<rootDir>/../__mocks__/styleMock.js' },
  collectCoverageFrom: ['**/*.{ts,tsx}', '!**/*.spec.{ts,tsx}', '!**/index.ts'],
};

export default config;
```

`packages/ui/jest.setup.ts`:
```typescript
import '@testing-library/jest-dom';
```

---

## Carga de `.env.test`

**Decisión: `dotenv` directo** (ya está como dependencia del backend, versión `^17.4.2`).

**Razón:** (1) `@nestjs/config` se carga DENTRO de `AppModule.forRoot()`, pero los e2e necesitan `DATABASE_URL` ANTES de que Nest se construya (para que `PrismaService` use el adapter correcto). (2) `dotenv-cli` agrega dependencia extra sin valor para este caso. (3) Una llamada a `config({ path: '...' })` en `setupFiles` resuelve todo.

**Archivo template `apps/api/.env.test.example`** (commiteable; el `.env.test` real queda en `.gitignore`):
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/solucorp_test
JWT_SECRET=test-secret-do-not-use-in-prod
JWT_EXPIRES_IN=8h
```

---

## Turborepo

**Decisión: DOS tasks separadas — `test` (unit, cacheable) y `test:e2e` (e2e, no-cacheable).**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**", "!.next/cache/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": { "dependsOn": ["^build"] },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "inputs": ["src/**", "test/helpers/**", "package.json", "jest.config.*", "tsconfig*.json"]
    },
    "test:e2e": {
      "dependsOn": ["^build"],
      "cache": false,
      "outputs": []
    }
  }
}
```

**Razones:**

- **`dependsOn: ["^build"]` en ambos:** el backend e2e necesita `@prisma/client` generado (Prisma client se emite durante `pnpm prisma generate`, que corre antes/durante build). Sin esto, el primer `turbo run test` en clon limpio falla con "Cannot find module '@prisma/client'". Para packages/shared y packages/ui el `^build` es no-op útil.
- **`test` cacheable:** unit tests son deterministas; mismo `src/` + mismo `test/helpers/` → mismo resultado. Inputs explícitos para invalidar cache cuando corresponde.
- **`test:e2e` con `cache: false`:** depende del estado de la DB local que Turborepo no puede modelar. Mejor no cachear que cachear un falso positivo.
- **Scripts en `apps/api/package.json` ya existen** (`test`, `test:e2e`) → Turborepo los invoca tal cual.
- **Scripts a agregar** en `packages/shared` y `packages/ui`: `"test": "jest"` (sin `test:e2e`).
- **Scripts a agregar** en root `package.json`: `"test": "turbo run test"`, `"test:e2e": "turbo run test:e2e"`.

---

## Versiones de dependencias

### Resolución del riesgo R1 (jest@30 + ts-jest@29)

**Verificación:** `ts-jest@29.x` declara peer `jest@^29`. `ts-jest@29.2.5` con `jest@30` instala pero emite warning de peer y puede romper en transformaciones ESM. La matriz oficial confirma: **`ts-jest@^29.4` agregó compatibilidad con jest@30** vía `ts-jest@29.4.0` (publicado 2025).

**Decisión:** bumpear `ts-jest` a `^29.4.0` en `apps/api`. Más conservador que saltar a `ts-jest@30` (cuyo changelog tiene cambios de API en CJS/ESM aún rodando). Si el bump a `29.4` falla → escalar a `^30` como segunda opción.

### Tabla de devDependencies por paquete

| Paquete | Dependencia | Versión | Razón |
|---------|-------------|---------|-------|
| apps/api | `ts-jest` | `^29.4.0` | Compat con jest@30 (R1) |
| packages/shared | `jest` | `^30.0.0` | Alineado con backend |
| packages/shared | `ts-jest` | `^29.4.0` | ídem |
| packages/shared | `@types/jest` | `^30.0.0` | ídem |
| packages/shared | `typescript` | `^5.7.0` | ya presente |
| packages/ui | `jest` | `^30.0.0` | Alineado |
| packages/ui | `ts-jest` | `^29.4.0` | ídem |
| packages/ui | `@types/jest` | `^30.0.0` | ídem |
| packages/ui | `jest-environment-jsdom` | `^30.0.0` | DOM para tests de React |
| packages/ui | `@testing-library/react` | `^16.1.0` | Soporte React 18 + 19 (peer dep declarada) |
| packages/ui | `@testing-library/jest-dom` | `^6.6.0` | Matchers `toBeInTheDocument`, etc. |
| packages/ui | `@types/react` | `^19.0.0` | ya presente |
| packages/ui | `react` | `^19.0.0` (dev) | Resolver peer para tests; producción usa peer del consumer |
| packages/ui | `react-dom` | `^19.0.0` (dev) | ídem para render |

**Resolución del riesgo R5 (@testing-library/react con React 19):** `packages/ui/package.json` declara peer `react: ^18 || ^19` y `@types/react: ^19.0.0`. `@testing-library/react@16.1` agregó soporte oficial para React 19 (release notes oficial). Decisión: fijar `^16.1.0` (no `^16.0.0`).

---

## Coverage

**Paths incluidos (apps/api):**
```
src/**/*.ts
```

**Excluidos:**
```
**/*.module.ts        — solo wiring DI
**/*.dto.ts           — decoradores; validación se cubre en e2e
**/dto/**             — ídem
**/main.ts            — bootstrap, cubierto por cualquier e2e que levante app
**/*.spec.ts          — no se cubre el código de test
**/index.ts           — barrels
test/**               — código de testing en sí
```

**Reporters:** `["text", "lcov", "html"]`
- `text` — feedback inmediato en consola
- `lcov` — formato estándar consumido por VS Code coverage gutters y por GitHub Actions/Codecov en cambio futuro
- `html` — `coverage/lcov-report/index.html` para drill-down humano

**Sin `coverageThreshold` bloqueante.** Métrica de éxito ≥40% es aspiracional según propuesta. Razón: build no rompe por cobertura en este cambio.

---

## Refactor W01 (visits.service)

### Antes (`apps/api/src/modules/visits/visits.service.ts:9-11`)

```typescript
create(companyId: string, userId: string, dto: CreateVisitDto) {
  return this.prisma.visit.create({ data: { companyId, userId, ...dto } });
}
```

### Después

```typescript
create(companyId: string, userId: string, dto: CreateVisitDto) {
  return this.prisma.visit.create({
    data: {
      companyId,
      userId,
      clientCode: dto.clientCode,
      motiveCode: dto.motiveCode,
      eventType: dto.eventType,
      observation: dto.observation,
      latitude: dto.latitude,
      longitude: dto.longitude,
    },
  });
}
```

### Cobertura de la regresión

- **Unit** (`visits.service.spec.ts`): se escribe ANTES del refactor con el patrón del snippet de InventoryService — afirma que cada campo llega explícito al `create` y que un dto con `companyId` inyectado NO sobrescribe el argumento (el spread vulnerable lo permitiría, los campos explícitos no).
- **E2e** (`visits.e2e-spec.ts`): test "POST /api/visits con campo extra `companyId: 'otro-tenant'` retorna 400 (forbidNonWhitelisted bloquea)". Cubre la regresión a nivel transporte. Adicional: "POST con dto válido crea Visit con `companyId` de JWT, no del body".

---

## Decisiones de arquitectura

| # | Decisión | Alternativas rechazadas | Razón |
|---|----------|-------------------------|-------|
| 1 | Co-located `*.spec.ts` para unit; `test/` para e2e | Todo en `test/` (estilo Angular) | NestJS convention + scaling: módulo modificado = test modificado en el mismo PR |
| 2 | Mock de Prisma con `jest.fn()` inline | `createPrismaMock()` helper, `jest-mock-extended` | Cero dependencias nuevas; explícito > DRY en base chica |
| 3 | DB e2e con truncate por test | Transactions con rollback, mocks también para e2e | `$transaction` interno de `sync.service` rompe rollback approach; mocks ya cubiertos en unit |
| 4 | Guardarraíl: `DATABASE_URL.includes('test')` | Variable `IS_TEST=1`, archivo lock | Imposible de pasar accidentalmente; ruidoso si falla |
| 5 | JWT directo vía `JwtService` en helper de auth | Login HTTP en cada `beforeEach` | 10x más rápido; login se ejercita una vez en su propio suite |
| 6 | `setupFiles` (no `setupFilesAfterEach`) para `.env.test` | `globalSetup`, plugin de Nest config | DATABASE_URL debe existir antes de que PrismaService se construya |
| 7 | dotenv directo, no @nestjs/config para tests | dotenv-cli, ConfigModule.forRoot en setup | @nestjs/config carga DESPUÉS de la construcción de providers |
| 8 | `maxWorkers: 1` en e2e | Schemas por worker, DBs por worker | Simple; futuro upgrade documentado como out-of-scope |
| 9 | Dos tasks Turbo: `test` cacheable + `test:e2e` no-cacheable | Una sola task `test` no-cacheable | Unit es determinista → cachear ahorra tiempo en CI futuro |
| 10 | `dependsOn: ["^build"]` en ambas tasks | Sin dependencia | Prisma client generado debe existir; lo mismo para `packages/shared` consumido por backend |
| 11 | `ts-jest@^29.4` (no bump a 30) | `ts-jest@^30` | Más conservador; 29.4 ya tiene compat con jest@30 |
| 12 | `@testing-library/react@^16.1` | `^16.0`, `^15.x` | 16.1 oficial soporta React 19 que ya está en peer deps de ui |
| 13 | E2e archivo por módulo + 2 transversales | Un solo archivo gigante, agrupación por feature | Granularidad permite paralelizar en futuro; transversales modelan conceptos cross-module |
| 14 | Sin `coverageThreshold` que rompa build | Threshold a 40% como bloqueante | Propuesta marca explícitamente "aspiracional" |
| 15 | `bcrypt` rounds=4 en `createTestUser` | rounds=10 (prod) | 10ms vs 200ms por usuario; aceptable porque test |

---

## Compatibilidad y orden de implementación

### Cohabitación con código existente

- Tests son aditivos: ninguna línea de producción se modifica salvo el refactor W01 (atómico, mismo comportamiento).
- `test/app.e2e-spec.ts` actual (`GET /` → "Hello World!") se mantiene como smoke; no requiere DB ni `.env.test` porque no toca Prisma.
- El nuevo `setup-env.ts` lanza error si `.env.test` no existe — eso bloquea TODOS los e2e, incluido el smoke actual. **Mitigación:** documentar en README que el primer paso es copiar `.env.test.example` a `.env.test`. Si el dev no quiere DB, puede correr solo `pnpm test` (unit) sin tocar e2e.

### Orden recomendado de implementación

1. **Fase A — Setup mínimo (sin tests funcionales todavía)**
   1. Bump `ts-jest` a `^29.4.0` en `apps/api/package.json`, `pnpm install`
   2. Crear `apps/api/.env.test.example` y `apps/api/.env.test` (este último a `.gitignore`)
   3. Crear `apps/api/test/setup-env.ts`
   4. Sobrescribir `apps/api/test/jest-e2e.json` con la config completa
   5. Crear `apps/api/test/helpers/db.ts` y `apps/api/test/helpers/auth.ts`
   6. Actualizar bloque `jest` en `apps/api/package.json` (collectCoverageFrom + reporters)
   7. Crear `packages/shared/jest.config.ts` + agregar devDeps + script `test`
   8. Crear `packages/ui/jest.config.ts` + `jest.setup.ts` + agregar devDeps + script `test`
   9. Actualizar `turbo.json` con tasks `test` y `test:e2e`
   10. Agregar scripts `test` y `test:e2e` al root `package.json`
   11. **Sanity check:** `pnpm test` debe correr el único `*.spec.ts` existente (`app.controller.spec.ts`) sin error
2. **Fase B — Unit tests P0 backend** (orden por riesgo de exploration)
   1. `inventory.service.spec.ts`, `attendance.service.spec.ts`, `guard.service.spec.ts`
   2. `auth.service.spec.ts` + 3 guards specs
   3. `sync.service.spec.ts`
   4. `visits.service.spec.ts` (con expectativas del refactor W01, falla inicialmente)
3. **Fase C — Refactor W01**
   1. Refactorizar `visits.service.ts` para usar campos explícitos
   2. `visits.service.spec.ts` pasa → confirma no-regresión
4. **Fase D — E2e backend** (10 por-módulo + 2 transversales). Empezar por `validation-pipe.e2e-spec.ts` y `multi-tenant.e2e-spec.ts` porque son los que más valor entregan vs los 47 escenarios runtime.
5. **Fase E — Packages**
   1. `packages/shared/src/utils/format.spec.ts`
   2. `packages/shared/src/constants/*.spec.ts` (smoke)
   3. `packages/ui/src/**/*.spec.tsx` (Button, Input, Card, Modal)
6. **Fase F — Documentación**
   1. `apps/api/README.md` sección "Testing"
   2. `packages/shared/README.md` mínimo (cómo correr tests)
   3. `packages/ui/README.md` mínimo
   4. Actualizar root `README.md` con `pnpm test` y `pnpm test:e2e`

---

## Diagrama del flujo de tests

```
┌─────────────────────────────────────────────────────────────────────┐
│                       DEV LOCAL — pnpm test                          │
└─────────────────────────────────────────────────────────────────────┘

    pnpm test                              pnpm test:e2e
        │                                       │
        ▼                                       ▼
    turbo run test                          turbo run test:e2e
        │                                       │
        ├─ apps/api: jest                       └─ apps/api: jest --config test/jest-e2e.json
        │     rootDir=src                            │
        │     mocks Prisma con jest.fn()             ├─ setupFiles: setup-env.ts
        │     (~10 specs P0)                         │     └─ dotenv → .env.test
        │                                            │     └─ guardarraíl includes('test')
        ├─ packages/shared: jest                     │
        │     ts-jest preset                         ├─ beforeEach (cada e2e file):
        │     (utils/format + constants)             │     └─ truncateAll(prisma)
        │                                            │     └─ createTestCompany + createTestUser
        └─ packages/ui: jest                         │     └─ signTokenFor → JWT directo
              jsdom + testing-library/react          │
              (4 componentes)                        ├─ supertest contra app real Nest
                                                     │     ├─ POST /api/visits          ──┐
        ▼                                            │     ├─ POST /api/inventory       ──┤
    coverage/                                        │     ├─ POST /api/orders          ──┤
    ├─ lcov.info                                     │     ├─ ... (10 módulos)          ──┤
    ├─ lcov-report/index.html                        │     ├─ multi-tenant cross-check  ──┤
    └─ coverage-summary.json                         │     └─ validation-pipe flags     ──┘
                                                     │
                                                     ▼
                                              PostgreSQL local
                                              (DATABASE_URL contiene 'test')
                                                     │
                                                     ▼
                                              Resultado: pass/fail

┌─────────────────────────────────────────────────────────────────────┐
│                       FUTURO — CI (fuera de scope)                   │
└─────────────────────────────────────────────────────────────────────┘
    GitHub Actions → service container postgres:16 → mismo flujo
                  └─ lcov.info subido a Codecov / artifact
```
