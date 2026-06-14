# Proposal: Frontend Testing Foundation (apps/client)

## Intent

Los portales web tienen **cero tests automatizados**. Hoy cada cambio de UI viaja sin red: solo `tsc --noEmit` + `next build` validan, lo cual no captura regresiones de lógica (auth, guards de rol, render condicional, llamadas a API). Esto bloquea adoptar `packages/ui` y refactorizar con seguridad. Este primer slice instala la base Jest + RTL en `apps/client` y deja 4 tests de mayor valor pasando bajo gate de CI bloqueante.

## Scope

### In Scope
- Config Jest+RTL en `apps/client`: `jest.config.ts`, `jest.setup.ts`, `tsconfig.test.json` (si ts-jest lo requiere), `__mocks__/styleMock.js` — replicando el patrón de `packages/ui`.
- `devDependencies` de testing en `apps/client/package.json` + script `"test": "jest"`.
- Mocks reutilizables: `next/navigation` (`useRouter`) y la instancia `api` de `@solucorp/shared`.
- 4 archivos de test: `src/stores/auth-store.ts`, `src/components/layout/AuthGuard.tsx`, `src/components/ReportPage.tsx`, `src/app/login/page.tsx`.
- Verificar que `turbo run test` (raíz `npm test`) incluye `apps/client`; confirmar gate de CI bloqueante.

### Out of Scope (non-goals explícitos)
- `apps/admin` — slice gemelo posterior (config idéntica).
- Testing móvil (Expo) — cambio separado `mobile-testing-foundation`.
- Playwright / e2e browser.
- Cualquier `coverageThreshold` que rompa el build.
- Refactor de código del portal para hacerlo más testeable (se testea lo que existe).

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `testing-infrastructure`: extender §1.3 (Packages → incluir `apps/client` como workspace con Jest+RTL+jsdom) y §7.3 (policy de cobertura sin threshold para client; referencia inicial 0%).
- `ci-infrastructure`: confirmar/clarificar §6.1 — el job `unit-tests` ya corre `turbo run test -- --coverage`; el gate bloqueante para client se obtiene automáticamente al declarar el script `"test"`. **NO requiere job nuevo.**

## Approach

Replicar exactamente el toolchain probado de `packages/ui` (Jest 30 + ts-jest + jsdom + RTL 16 + @testing-library/jest-dom), sin nueva toolchain. Diferencia clave: los portales necesitan `moduleNameMapper` para `^@/(.*)$` → `<rootDir>/src/$1` y para CSS → `styleMock.js`. Mockear `next/navigation` y `@solucorp/shared` a nivel módulo. Los 4 targets se eligieron por ROI: el store de auth y `ReportPage` (usado por 6 rutas de reporte) cubren la mayor superficie crítica.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/client/jest.config.ts`, `jest.setup.ts`, `__mocks__/` | New | Config Jest+RTL |
| `apps/client/package.json` | Modified | devDeps + script `test` |
| `apps/client/src/**/*.spec.tsx` (4 files) | New | Primeros tests |
| `.github/workflows/ci.yml` | Unchanged (confirmar) | Gate ya cubre client vía `turbo run test` |
| `turbo.json` | Unchanged | Task `test` ya existe |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Módulos ESM (`react-icons`, `recharts`) rompen ts-jest | Med | `transformIgnorePatterns` o mockear con `jest.fn()` |
| `moduleResolution: "bundler"` no soportado por ts-jest | Med | `tsconfig.test.json` con `moduleResolution: "node16"` |
| Mock incompleto de `next/navigation` / `api` | Med | Mocks centralizados reutilizables; `localStorage.clear()` en `beforeEach` |
| `turbo run test` falla si falta script `test` | Low | Agregar script + config en el mismo cambio |
| React 19 `act()` async en efectos | Low | Usar `waitFor` (patrón de `packages/ui`), no `act()` directo |

## Rollback Plan

Revertir es de bajo riesgo y aislado: eliminar los archivos nuevos de `apps/client` (config, mocks, specs), quitar las devDeps y el script `"test"` del `package.json`. Sin la declaración del script `test`, `turbo run test` deja de incluir client y el pipeline vuelve al estado previo. No hay migraciones ni cambios de runtime en producción.

## Dependencies

- Toolchain ya instalado en el workspace (jest 30, ts-jest, jsdom, RTL) vía `packages/ui` — sin instalación nueva en raíz.

## Success Criteria (DoD)

- [ ] Los 4 tests de `apps/client` pasan localmente con `jest`.
- [ ] `turbo run test` (y `npm test` en raíz) incluye y ejecuta los tests de `apps/client`.
- [ ] El job `unit-tests` de CI bloquea el merge si los tests de client fallan (sin job nuevo).
- [ ] No se aplica ningún `coverageThreshold` que rompa el build.
- [ ] `apps/admin` y `apps/mobile` quedan intactos.
