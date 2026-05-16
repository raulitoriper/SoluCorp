# Exploration: testing-foundation

## Problema

SoluCorp opera en producción (o pre-producción) con **cero tests automatizados** en todas sus capas. El cambio `dto-validation-backend` dejó 47 escenarios de validación verificables solo en runtime mediante curl manual — esa deuda operativa es exactamente el tipo de regresión que un sistema de tests e2e habría detectado automáticamente. La cola de sincronización offline de la app mobile (SQLite + NetInfo + sync-engine) es el componente de mayor riesgo de pérdida de datos del sistema y nunca ha sido testeada. Los tres servicios P0 críticos (inventory, attendance, guard) fueron refactorizados sin cobertura alguna.

El proyecto tiene además una advertencia W01 documentada en el verify-report: `visits.service.ts` usa spread `...dto` en Prisma create, inconsistente con el patrón establecido — este tipo de deuda de estilo solo se detecta como regresión si hay tests de integración. Sin tests, cada cambio futuro es un apuesta ciega.

La magnitud del problema es asimétrica: el backend ya tiene jest + ts-jest + supertest + @nestjs/testing instalados y puede arrancar con tests unitarios HOY sin instalar nada. El resto del stack (mobile, admin, client, packages) parte de cero, sin ninguna librería de testing declarada.

## Estado actual

### apps/api

**Jest configurado:** Sí, inline en `package.json` (no hay `jest.config.ts` separado):
```
rootDir: "src"
testRegex: ".*\\.spec\\.ts$"
transform: { "^.+\\.(t|j)s$": "ts-jest" }
testEnvironment: "node"
coverageDirectory: "../coverage"
```

**Scripts disponibles:** `test`, `test:watch`, `test:cov`, `test:e2e` (este último referencia `./test/jest-e2e.json` pero el archivo NO existe).

**Tests existentes:** 1 archivo — `apps/api/src/app.controller.spec.ts` (dummy, solo verifica "Hello World!")

**Versiones instaladas (devDependencies):**
- `jest@^30.0.0`
- `ts-jest@^29.2.5`
- `@nestjs/testing@^11.0.1`
- `supertest@^7.0.0`
- `@types/jest@^30.0.0`
- `@types/supertest@^7.0.0`

**Conexión a DB:** `PrismaService` usa `process.env.DATABASE_URL`. No hay `.env.test`, no hay Docker, no hay Testcontainers.

**Total archivos a cubrir:** ~64 archivos TS (13 módulos × 3-4 archivos + common + main.ts).

**Qué se puede testear HOY sin instalar nada:** Unit tests de services con PrismaService mockeado, guards, DTOs.

### apps/mobile

**Jest configurado:** No. Cero configuración.
**Scripts de test:** Ninguno.
**Librerías de testing:** Ninguna (sin jest-expo, sin @testing-library/react-native).

**Archivos fuente propios:**
- `src/hooks/` — 3 archivos (useLocation, useServiceMark, useOfflineServiceMark)
- `src/db/` — 2 archivos (database, sync-queue)
- `src/services/` — 2 archivos (sync-engine, background-tracking)
- `src/stores/` — 2 archivos (sync-store, auth-store)
- `src/lib/` — 1 archivo (api)
- `src/screens/` — 11 archivos
- `src/components/` — 3 archivos
- `App.tsx`

**Total: ~25 archivos relevantes.**

**Complejidad mobile:**
- `sync-engine.ts` usa `NetInfo` y API real → requiere mocks
- `background-tracking.ts` usa `expo-location`, `expo-task-manager`, `expo-battery` → todos nativos
- `database.ts` usa `expo-sqlite` con singleton global (`let db`) → reset de estado complicado
- `useOfflineServiceMark.ts` usa `require()` dinámico interno → anti-pattern para testing

### apps/admin y apps/client

**Jest configurado:** No (en ambos).
**Scripts de test:** Ninguno.
**Librerías de testing:** Ninguna.

**apps/admin:** ~12 archivos (6 páginas + 4 componentes)
**apps/client:** ~15 archivos (10 páginas + 5 componentes)

**Nota crítica:** Next.js 16.2.6 tiene breaking changes documentados en `AGENTS.md`. La configuración estándar de jest para App Router puede no aplicar.

### packages

**packages/shared:** 10 archivos. `devDependencies`: solo typescript. `utils/format.ts` es 100% testeable sin mocks.
**packages/ui:** 4 componentes React. `devDependencies`: @types/react + typescript.
**packages/config:** Solo tsconfig presets — no necesita tests.

### Turborepo (root)

**`turbo.json` — task `test` ausente:** Solo define `build`, `dev`, `lint`. `turbo run test` no haría nada útil hoy.

**`package.json` root:** Sin script `test`. `apps/mobile` está fuera de los workspaces de turbo.

## Capacidades existentes vs faltantes

| Capa | Runner instalado | Librerías testing | Qué se puede testear HOY |
|------|-----------------|-------------------|--------------------------|
| apps/api | jest@30 + ts-jest@29 | @nestjs/testing, supertest, tipos | Unit tests de services (Prisma mockeado), guards, DTOs |
| apps/mobile | Nada | Nada | Nada sin instalar |
| apps/admin | Nada | Nada | Nada sin instalar |
| apps/client | Nada | Nada | Nada sin instalar |
| packages/shared | Nada | Nada | Nada (pero podría con jest+ts-jest mínimo) |
| packages/ui | Nada | Nada | Nada sin instalar |

## Magnitud por capa

| App/Package | # archivos | # tests | % cobertura hoy | Meta realista primer pass |
|-------------|------------|---------|-----------------|---------------------------|
| apps/api | ~64 TS | 1 (dummy) | ~2% | 40-50% |
| apps/mobile | ~25 TS/TSX | 0 | 0% | 30-35% |
| apps/admin | ~12 TSX | 0 | 0% | 40% |
| apps/client | ~15 TSX | 0 | 0% | 40% |
| packages/shared | ~10 TS | 0 | 0% | 70% |
| packages/ui | 4 TSX | 0 | 0% | 80% |

## Approaches por capa

### Backend (apps/api)

| Approach | Pros | Contras | Esfuerzo |
|----------|------|---------|----------|
| **A. Unit + Prisma mockeado** | Corre hoy sin instalar; rápido | No detecta queries reales ni multi-tenant DB | Bajo |
| **B. Integration con Testcontainers + PostgreSQL** | Detecta queries reales; multi-tenant real | Requiere Docker; CI debe correrlo | Alto |
| **C. E2e con supertest + SQLite via Prisma** | Cubre los 47 escenarios sin Docker | `$queryRaw` con DISTINCT ON de gps.service.ts no es portable | Medio-Alto |
| **D. E2e con supertest + PostgreSQL test vía env** | Cubre los 47 escenarios; reutiliza test:e2e | Necesita `.env.test` + truncate/transactions entre tests | Medio |

**Recomendación:** A (hoy mismo) + D (para los 47 escenarios runtime).

### Mobile (apps/mobile)

| Approach | Pros | Contras | Esfuerzo |
|----------|------|---------|----------|
| **A. Unit + mocks de expo-sqlite/NetInfo/expo-location** | Testea sync-queue/sync-engine/hooks sin device | Los mocks pueden mentir | Medio |
| **B. Detox / Maestro en simulador** | Flujo real en device | Setup gigante, flaky en CI | Muy Alto |
| **C. jest-expo + @testing-library/react-native + mocks manuales** | Testea componentes y hooks | jest-expo amarrado a SDK específico | Medio |

**Recomendación:** C, priorizando sync-queue > sync-engine > useOfflineServiceMark > componentes.

### Next.js (apps/admin y apps/client)

| Approach | Pros | Contras | Esfuerzo |
|----------|------|---------|----------|
| **A. @testing-library/react + jsdom + jest** | Sin server; rápido para client components | Server Components no testeables con jsdom; Next.js 16 puede no funcionar standard | Medio + curva |
| **B. Playwright e2e** | Cubre Server Components reales | Requiere stack corriendo; lento | Alto |
| **C. Vitest + @testing-library/react** | Mejor soporte ESM/Next 16 que jest | Heterogeneidad: jest en api, vitest en next | Medio |

**Recomendación:** A para componentes client, descartar Server Components en primer pass.

### packages

- **packages/shared:** jest + ts-jest directo. Bajo esfuerzo, alta cobertura posible.
- **packages/ui:** jest + @testing-library/react + jsdom. Componentes simples.

## Prioridad por riesgo (qué testear PRIMERO)

1. **sync-queue.ts + sync-engine.ts (mobile)** — Corazón offline. Si falla, se pierden datos del campo sin traza.
2. **auth.service.ts + RolesGuard + ModuleGuard (backend)** — Login + multi-tenant. Bug en JWT companyId → filtrado entre tenants.
3. **inventory/attendance/guard.service.ts (backend P0)** — Recién refactorizados, sin cobertura.
4. **useOfflineServiceMark.ts (mobile)** — Usado por mayoría de pantallas. Fallback a SQLite si API falla.
5. **sync.service.ts (backend)** — Idempotency del batch. Si falla, registros duplicados.
6. **gps.service.ts (backend)** — Único `$queryRaw`. Solo detectable con PostgreSQL real.
7. **packages/shared/utils/format.ts + constants** — Mínimo riesgo, máximo ROI.
8. **packages/ui** — Bajo riesgo, documenta contratos.

## Riesgos del cambio

- **R1 — jest@30 + ts-jest@29:** Verificar peer dependencies.
- **R2 — Next.js 16.2.6 breaking changes:** Configuración de jest para App Router puede no ser estándar.
- **R3 — jest-expo para SDK 54 + RN 0.81:** Versión específica posiblemente en flux.
- **R4 — expo-sqlite singleton global:** Reset entre tests requiere refactor o factory.
- **R5 — Sin CI/CD:** El valor se materializa solo con CI corriendo tests.
- **R6 — turbo run test no configurado:** Hay que agregar la task.
- **R7 — `require()` dinámico en mobile:** Frágil para mocking.
- **R8 — PrismaService como singleton conectado:** Si no se mockea, falla con error confuso.

## Preguntas abiertas

1. **DB de test para e2e backend** — ¿Testcontainers (Docker), PostgreSQL local dedicado, o aceptar mocks de Prisma también para e2e?
2. **Turborepo orchestration** — ¿Agregar task `test` en `turbo.json`? ¿`test` depende de `build`?
3. **Coverage threshold** — ¿Bloquear build si no se alcanza meta, o solo informativo?
4. **Vitest vs jest para Next.js** — ¿Aceptar heterogeneidad de runners en el monorepo?
5. **Refactor de `require()` dinámico en mobile** — ¿Dentro del scope de testing-foundation?
6. **`$queryRaw` de gps.service.ts** — ¿Aceptar la brecha o incluir integration test con PostgreSQL?
7. **Deuda W01 (visits.service spread)** — ¿Corregir dentro de testing-foundation o cambio separado?
