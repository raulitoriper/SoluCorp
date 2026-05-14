# Apply Progress: testing-foundation

## Batches ejecutados

### Batch 1 (2026-05-14) — Fase A: setup mínimo

- Tasks completadas: A.1, A.2, A.3 (pre-existente, verificada), A.4, A.5, A.6, A.7, A.8, A.9, A.10, A.11, A.12, A.13
- Archivos creados:
  - `apps/api/.env.test.example`
  - `apps/api/test/setup-env.ts`
  - `apps/api/test/helpers/db.ts`
  - `apps/api/test/helpers/auth.ts`
  - `packages/shared/jest.config.ts`
  - `packages/ui/jest.config.ts`
  - `packages/ui/jest.setup.ts`
- Archivos modificados:
  - `apps/api/package.json` — bump ts-jest a ^29.4.0, collectCoverageFrom con exclusiones, coverageReporters
  - `apps/api/test/jest-e2e.json` — sobrescrito con config completa (setupFiles, testTimeout, maxWorkers)
  - `packages/shared/package.json` — devDeps jest@^30/ts-jest@^29.4/@types/jest@^30, script test
  - `packages/ui/package.json` — devDeps completas para testing React 19, script test
  - `turbo.json` — tasks test (cacheable) y test:e2e (cache:false)
  - `package.json` (raíz) — scripts test/test:e2e + campo packageManager requerido por turbo
- Verificación:
  - tsc --noEmit: OK (sin errores de tipos)
  - npm test (raíz vía turbo): OK — api:test 1 passed, shared:test/ui:test passWithNoTests
  - ts-jest versión instalada: 29.4.9
- Decisiones tomadas:
  - A.1: `ts-jest` estaba en `^29.2.5`, bumpeado a `^29.4.0`. Versión instalada: `29.4.9`. Se usó `npm install` (no `pnpm`) — el proyecto usa npm workspaces con `package-lock.json`.
  - A.3: `.env.test` ya existía (sesión previa, confirmado por orchestrator). Verificado su existencia en disco. NO se tocó. `.gitignore` ya lo cubre con patrón `.env.*`.
  - A.5: `jest-e2e.json` ya existía con config mínima. Sobrescrito con config completa según design.
  - A.9/A.10: Scripts de test usan `--passWithNoTests` para que turbo no falle en Fase A cuando aún no hay specs en shared/ui.
  - A.10: Design usaba `setupFilesAfterEach` (campo incorrecto). Campo real en Jest es `setupFilesAfterEnv`. Corregido.
  - A.12: Root `package.json` también requirió agregar `packageManager: "npm@10.5.0"` para que turbo 2.x pueda resolver workspaces.
  - Gestor de paquetes: pnpm no disponible en PATH del entorno CI bash. Se usó `npm`. Reportado en risks.
- Próximo batch sugerido: Fase B + C (unit P0 + refactor W01)

---

### Batch 2 (2026-05-14) — Fases B + C: unit tests P0 + refactor W01

- Tasks completadas: B.1, B.2, B.3, B.4, B.5, B.6, B.7, B.8, B.9, C.1, C.2, C.3, C.4
- Archivos creados:
  - `apps/api/src/modules/inventory/inventory.service.spec.ts` — 6 tests (companyId, campos explícitos, findAll, findOne)
  - `apps/api/src/modules/attendance/attendance.service.spec.ts` — 6 tests (companyId, empleoyeeCode/eventCategory/eventAction, findAll, findOne)
  - `apps/api/src/modules/guard/guard.service.spec.ts` — 7 tests (companyId, eventType, sin eventType → undefined, findAll, findOne)
  - `apps/api/src/modules/auth/auth.service.spec.ts` — 9 tests (login OK, login email inexistente, usuario inactivo, password incorrecta, suscripción suspendida, refresh OK, refresh revocado, refresh expirado, refresh inexistente)
  - `apps/api/src/modules/auth/guards/jwt-auth.guard.spec.ts` — 4 tests (smoke de instanciación + comportamiento sin Passport)
  - `apps/api/src/common/guards/roles.guard.spec.ts` — 6 tests (sin @Roles, COMPANY_ADMIN OK, FIELD_WORKER denegado, SUPER_ADMIN OK, múltiples roles, reflector key)
  - `apps/api/src/common/guards/module.guard.spec.ts` — 5 tests (sin @RequireModule, módulo habilitado, módulo deshabilitado, módulo null, SUPER_ADMIN sin companyId)
  - `apps/api/src/modules/sync/sync.service.spec.ts` — 5 tests (item nuevo, duplicado ALREADY_SYNCED, batch parcial mezclado, batch vacío, findPending)
  - `apps/api/src/modules/visits/visits.service.spec.ts` — 6 tests (TDD ligero: rojo inicial → verde post-refactor)
- Archivos modificados:
  - `apps/api/src/modules/visits/visits.service.ts` — W01 cerrada: `data: { companyId, userId, ...dto }` → campos explícitos
- Tests totales pasando: 53 (10 suites)
- Verificación:
  - `npx tsc --noEmit`: OK (sin errores de tipos)
  - `npx jest` (raíz api): 53 passed, 10 suites
  - W01 grep `...dto` en visits.service.ts: 0 matches
  - Transición TDD: 1 test falló con código original (rojo C.1) → 6 pasan tras refactor (verde C.3)
- Decisiones tomadas:
  - B.4: `jest.mock('bcrypt', ...)` a nivel de módulo en lugar de `jest.spyOn()`. bcrypt usa propiedades non-configurable en CJS, spyOn lanza "Cannot redefine property". Se documentó en el spec.
  - B.5: JwtAuthGuard extiende AuthGuard('jwt') de Passport — sin Passport configurado en test, `canActivate` lanza error. Los tests verifican que el resultado NO es `true` (denegación semántica). Cobertura de comportamiento real JWT → Fase D (e2e).
  - B.7: ModuleGuard vive en `common/guards/`, no en `auth/guards/` — ajustado según el path real del archivo.
  - roles.guard.spec y module.guard.spec se crearon en `common/guards/` (donde viven los guards reales).
- Próximo batch sugerido: Fase D (e2e, requiere DB up — ya configurada)

---

## Estado por fase

- [x] Fase A (setup)
- [x] Fase B (unit P0)
- [x] Fase C (refactor W01)
- [ ] Fase D (e2e)
- [ ] Fase E (packages)
- [ ] Fase F (docs)
- [ ] Fase G (verificación final)
