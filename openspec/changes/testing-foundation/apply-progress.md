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

## Estado por fase

- [x] Fase A (setup)
- [ ] Fase B (unit P0)
- [ ] Fase C (refactor W01)
- [ ] Fase D (e2e)
- [ ] Fase E (packages)
- [ ] Fase F (docs)
- [ ] Fase G (verificación final)
