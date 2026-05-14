# Propuesta: testing-foundation

## Intent

Cerrar la deuda crítica de testing del backend SoluCorp (apps/api) y los packages compartidos (shared, ui), cubriendo los 47 escenarios runtime heredados de `dto-validation-backend` y los 3 services P0 que fueron refactorizados sin red de seguridad. Este cambio establece la fundación de testing del monorepo backend-only; mobile/admin/client quedan para cambios dedicados posteriores.

## Contexto

El cambio anterior (`dto-validation-backend`, archivado 2026-05-14) dejó documentados 47 escenarios verificables solo con servidor levantado: validación de DTOs, rechazo de campos extra con `forbidNonWhitelisted: true`, idempotency keys, status transitions, rangos numéricos, etc. Hoy esa cobertura depende de curl manual del usuario antes de cada deploy — exactamente el tipo de deuda operativa que un suite e2e elimina.

En paralelo, los 3 services P0 críticos (`inventory`, `attendance`, `guard`) fueron refactorizados en `dto-validation-backend` para eliminar inyección de `companyId` vía spread, pero ese refactor no tiene **ni un solo test** que confirme que el comportamiento se mantiene. Cada cambio futuro en esos módulos es una apuesta ciega.

El verify-report de `dto-validation-backend` además dejó documentada la deuda **W01**: `visits.service.ts:10` sigue usando `...dto` en Prisma create — único módulo inconsistente con el patrón explícito. No es brecha de seguridad activa (el `ValidationPipe` global la bloquea), pero es deuda visible que solo se detecta como regresión si hay tests del módulo.

El backend ya tiene `jest@30 + ts-jest@29 + @nestjs/testing + supertest` instalados y un script `test:e2e` que apunta a `./test/jest-e2e.json` — pero ese archivo **no existe**. Es decir: el camino más corto al primer test e2e útil es crear ese archivo y un `.env.test`. Los packages parten de cero pero son pequeños (10 archivos shared, 4 componentes ui) y de bajo riesgo de configuración.

## Alcance

### Incluye

- **apps/api — unit tests:**
  - `inventory.service.spec.ts`, `attendance.service.spec.ts`, `guard.service.spec.ts` (los 3 P0 críticos, Prisma mockeado)
  - `auth.service.spec.ts` + `RolesGuard`, `ModuleGuard`, `JwtAuthGuard` specs (multi-tenant y JWT)
  - `sync.service.spec.ts` (escenarios de `idempotencyKey`: ausente, duplicado, batch parcial)
  - `visits.service.spec.ts` (cubre el refactor W01)
- **apps/api — e2e tests:**
  - Crear `test/jest-e2e.json` (hoy referenciado por `test:e2e` pero ausente)
  - Crear `.env.test` con `DATABASE_URL` apuntando a PostgreSQL local de test
  - Cubrir los **47 escenarios runtime** del archive de `dto-validation-backend`, agrupados por módulo (visits, orders, gps, inventory, attendance, guard, medical-visits, courier, sync, metadata)
  - Validar el flag estricto en `main.ts` (POST con `extraField` → HTTP 400 con mensaje `should not exist`)
  - Test e2e adicional de aislamiento multi-tenant (2 companies en la misma DB, validar no-leak)
- **packages/shared:**
  - Setup `jest + ts-jest` mínimo (sin nada extra)
  - Specs para `utils/format.ts` (alta cobertura, sin mocks)
  - Smoke tests de `constants` (validar shapes y que los enums no rompan)
- **packages/ui:**
  - Setup `jest + @testing-library/react@16 + jest-environment-jsdom + ts-jest`
  - Spec por componente (Button, Input, Card, Modal): render + 1-2 props clave + 1 interacción cuando aplique
- **Refactor W01 (in-scope):**
  - `visits.service.ts`: cambiar `...dto` por campos explícitos (clientCode, eventType, etc.) — mismo patrón que inventory/attendance/guard
  - El spec del refactor se escribe ANTES del cambio (TDD ligero para garantizar no-regresión)
- **Turborepo:**
  - Agregar task `test` en `turbo.json` que dispare los suites del scope
- **Documentación:**
  - `apps/api/README.md` sección "Testing" con: cómo correr unit, cómo levantar DB de test, cómo correr e2e, cómo leer coverage
  - READMEs mínimos en `packages/shared` y `packages/ui` documentando `pnpm test`

### No incluye (fuera de scope, cambios separados)

- **apps/mobile** → cambio futuro `mobile-testing-foundation` (incluye refactor de `require()` dinámico y singleton de `expo-sqlite`)
- **apps/admin** → cambio futuro `admin-testing-foundation` (resuelve compatibilidad con Next.js 16.2.6)
- **apps/client** → cambio futuro `client-testing-foundation`
- **CI/CD GitHub Actions** → cambio futuro `ci-pipeline` (sin CI corriendo, el valor del suite es local)
- **Coverage threshold obligatorio** → explícitamente **aspiracional**: configurar `--coverage` pero NO usar `coverageThreshold` que rompa builds
- **Testcontainers / Docker** → descartado por decisión firme del usuario (PostgreSQL local vía `.env.test`)
- **Integration tests con stubs avanzados de Prisma** → solo unit (mocks) + e2e (DB real)
- **Refactor de `gps.service.ts` `$queryRaw`** → el e2e con PostgreSQL local lo cubre naturalmente, no requiere refactor
- **Limpieza de S01 (`Number()` redundante en orders.service)** y W02 (`@Body('isEnabled')` en companies) — fuera de scope

## Aproximación propuesta

### Fase A — Setup mínimo (cero cambios funcionales)

1. `apps/api`: crear `test/jest-e2e.json` (root `./`, testRegex `.e2e-spec.ts$`, setupFiles cargando `.env.test`)
2. `apps/api`: crear `.env.test` con `DATABASE_URL=postgresql://.../solucorp_test` (template; el valor real lo configura cada dev)
3. `packages/shared`: agregar `jest`, `ts-jest`, `@types/jest` a devDependencies + `jest.config.ts` mínimo
4. `packages/ui`: agregar `jest`, `ts-jest`, `@types/jest`, `@testing-library/react`, `@testing-library/jest-dom`, `jest-environment-jsdom` + `jest.config.ts`
5. `turbo.json`: agregar task `test` con outputs `coverage/**`

### Fase B — Unit tests backend (P0 primero, por prioridad de riesgo)

1. `inventory.service.spec.ts` — Prisma mockeado, validar campos explícitos, validar `companyId` no inyectable
2. `attendance.service.spec.ts` — ídem
3. `guard.service.spec.ts` — ídem
4. `auth.service.spec.ts` + `roles.guard.spec.ts` + `module.guard.spec.ts` + `jwt-auth.guard.spec.ts` — JWT payload con `companyId`, denegación por rol/módulo
5. `sync.service.spec.ts` — `idempotencyKey` ausente → error, duplicado → no-op, batch parcial → resultado por item

### Fase C — E2e backend

1. Helper `test/helpers/db.ts`: función `truncateAll()` que valida `DATABASE_URL` contiene literal `test` antes de truncar (guardarraíl contra accidentes en dev)
2. Helper `test/helpers/auth.ts`: crear company + user + emitir JWT válido para el test
3. Beforeach: `truncateAll()` + seed mínimo (1 company, 1 user con rol relevante)
4. Cubrir los 47 escenarios agrupados en suites por módulo (10 archivos `*.e2e-spec.ts`)
5. Suite `multi-tenant.e2e-spec.ts`: 2 companies con datos cruzados, validar que los GET nunca devuelvan datos de la otra
6. Suite `validation-pipe.e2e-spec.ts`: confirma `forbidNonWhitelisted` (campo extra → 400) y `enableImplicitConversion: false` (string en campo numérico → 400)

### Fase D — Tests de packages

1. `packages/shared/src/utils/format.spec.ts` — todos los formatters con casos válidos + edge cases
2. `packages/shared/src/constants/*.spec.ts` — smoke (existe, tiene shape esperado)
3. `packages/ui/src/{Button,Input,Card,Modal}/index.spec.tsx` — render + props + 1 interacción

### Fase E — Refactor W01 y docs

1. Escribir `visits.service.spec.ts` con el comportamiento esperado (campos explícitos, sin spread)
2. Refactorizar `visits.service.ts:10` (cambiar `...dto` por campos explícitos)
3. Confirmar test verde
4. Actualizar `apps/api/README.md` con sección "Testing"
5. READMEs en `packages/shared` y `packages/ui`

## Impacto

### Módulos/paquetes afectados

- `apps/api`: nuevos archivos `test/`, `*.spec.ts` en cada módulo, `.env.test`, refactor menor de `visits.service.ts`
- `packages/shared`: `jest.config.ts`, devDependencies, `*.spec.ts`
- `packages/ui`: `jest.config.ts`, devDependencies, `*.spec.tsx`
- `turbo.json`: nueva task
- READMEs de los 3 paquetes

### Aislamiento multi-tenant

Los e2e con PostgreSQL real son **defensa adicional contra regresiones de `companyId`**: tests con 2 tenants en la misma DB confirman aislamiento real, no solo mockeado. Esto valida lo que el refactor P0 de `dto-validation-backend` solo afirmaba estructuralmente.

### Compatibilidad

Sin breaking changes. Los tests son aditivos. El refactor W01 mantiene comportamiento idéntico (el `ValidationPipe` ya garantiza el mismo input shape — el refactor solo lo hace explícito en código).

## Plan de rollback

- Tests son aditivos: si un suite falla, no afecta código de producción (revert del commit del test)
- W01 refactor: revert atómico del commit si rompe lógica de visits
- Jest configs de packages: revert atómico por paquete
- `turbo.json` task `test`: revert atómico de una sola línea

## Riesgos

| # | Riesgo | Severidad | Mitigación |
|---|--------|-----------|------------|
| 1 | `jest@30` + `ts-jest@29` peer conflict | MEDIA | Verificar en Fase A.1 al primer `pnpm test`. Si falla, bumpear `ts-jest` a `^29.4` o `^30` según matriz oficial. |
| 2 | `.env.test` usado accidentalmente en dev → pérdida de datos | MEDIA | Helper `truncateAll()` valida que `DATABASE_URL` contenga literal `"test"` antes de truncar. Documentado en README. `.env.test` en `.gitignore` opcional. |
| 3 | E2e flaky por orden de ejecución (state compartido) | MEDIA | `truncateAll()` en `beforeEach` + tests independientes. Jest por defecto serial por archivo está bien. |
| 4 | Refactor W01 introduce regresión silenciosa en visits | BAJA | Spec ANTES del refactor (TDD ligero). Cubre create con campos explícitos + verificación de que `companyId` no se acepta del body. |
| 5 | `@testing-library/react@16` + React 19 (si lo usa packages/ui) puede tener mismatch | BAJA | Verificar versión de React en `packages/ui`. Si es 19, usar `@testing-library/react@^16.1` que tiene soporte. |
| 6 | `gps.service.ts` `$queryRaw` con `DISTINCT ON` no testeable sin PostgreSQL | BAJA | Justamente la decisión de usar PostgreSQL local lo cubre — está ya mitigado por la decisión firme. |
| 7 | Decisión de `turbo run test` (depende de `build`? cache outputs?) tiene matices | BAJA | Detalle se resuelve en `sdd-design`; la propuesta solo compromete "task existe". |

## Métricas de éxito

1. **apps/api: ≥ 40% statement coverage** (medido con `pnpm --filter api test:cov`, sin threshold bloqueante)
2. **apps/api: los 47 escenarios runtime del archive `dto-validation-backend` tienen al menos 1 test e2e que los cubre** (trazabilidad explícita en spec)
3. **packages/shared: ≥ 70% statement coverage**
4. **packages/ui: 100% de los 4 componentes con al menos 1 spec** (smoke + props/interacción)
5. **`pnpm turbo run test` corre todos los suites del scope sin errores** desde la raíz
6. **W01 cerrada:** `grep -n "\.\.\.dto" apps/api/src/modules/visits/visits.service.ts` → 0 matches
7. **Documentación:** `apps/api/README.md` tiene sección "Testing" con instrucciones reproducibles para correr unit + e2e + coverage localmente
