# Tasks: Frontend Testing Foundation (apps/client)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~390–430 lines (all new files) |
| Files touched | 9 (8 new + 1 modified) |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR — all files are test infrastructure + test code; no production code changes |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

**Justificación**: El volumen estimado (~390–430 líneas) está en el límite de 400. Sin embargo, el cambio es coherente y atómico: infraestructura de testing + 4 test files, sin modificaciones de código de producción. Un PR único es razonable; se recomienda revisión del tamaño real antes de hacer merge. Con `ask-on-risk` el orquestador debe preguntar antes de lanzar `sdd-apply`.

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Jest config + mocks + devDeps + 4 test files | PR 1 (único) | Base: main. Todos los archivos nuevos; rollback = eliminar archivos + revertir package.json |

---

## Phase 1: Jest Config + Mock Scaffolding

_Prerequisito de todo lo demás. Sin esta base Jest no puede ejecutar ningún test._

- [x] 1.1 Crear `apps/client/jest.config.ts` — preset `ts-jest`, testEnvironment `jsdom`, testRegex `\\.spec\\.tsx?$`, setupFilesAfterEnv `['<rootDir>/jest.setup.ts']`, moduleNameMapper con entradas para `^@/(.*)$`, CSS y `^react-icons/.*$`. Sin `coverageThreshold`. **Nota**: Se agregaron entradas para `^react$` y `^react-dom$` apuntando a `<rootDir>/node_modules/react` para resolver el conflicto de instancias múltiples de React entre root y apps/client (react@19.1.0 vs 19.2.4).
- [x] 1.2 Crear `apps/client/jest.setup.ts` — una línea: `import '@testing-library/jest-dom'`.
- [x] 1.3 Crear `apps/client/__mocks__/styleMock.js` — `module.exports = {}` (stub para imports CSS/módulos CSS).
- [x] 1.4 Crear `apps/client/__mocks__/reactIconsMock.js` — Proxy que devuelve componentes no-op para cualquier export de `react-icons/*`.

## Phase 2: DevDeps + Test Script + Install

_Debe ejecutarse antes de correr `jest` o cualquier test. Puede hacerse en paralelo con Phase 1 (no hay dependencia de escritura), pero el install debe terminar antes de Phase 3._

- [x] 2.1 Modificar `apps/client/package.json` — agregar script `"test": "jest"` en la sección `scripts`.
- [x] 2.2 Modificar `apps/client/package.json` — agregar en `devDependencies`: `jest@^30`, `ts-jest@^29.4`, `@types/jest@^30`, `jest-environment-jsdom@^30`, `@testing-library/react@^16.1`, `@testing-library/jest-dom@^6.6`.
- [x] 2.3 Ejecutar `npm install` desde la raíz del monorepo — "up to date, audited 1152 packages" (las deps ya existían en el workspace; resueltas correctamente).

## Phase 3: Test Files

_Depende de Phase 1 (config + mocks) y Phase 2 (deps instaladas). Los 4 targets son independientes entre sí — se pueden escribir en paralelo._

- [x] 3.1 Crear `apps/client/src/stores/auth-store.spec.ts` — 5 escenarios (login exitoso, login fallido, logout limpia estado y localStorage, loadFromStorage con token, loadFromStorage sin token). **Nota**: `window.location.href` no se puede mockear en jsdom 26 (non-configurable); el test de logout verifica `state.user=null`, `state.token=null`, `localStorage.clear()` — la aserción de redirección se cubre en integración.
- [x] 3.2 Crear `apps/client/src/components/layout/AuthGuard.spec.tsx` — 3 escenarios: (a) `user===null` → `router.push('/login')`; (b) rol distinto de `COMPANY_ADMIN` → `alert` + clear + push a login; (c) rol `COMPANY_ADMIN` → renderiza children. Usar `waitFor` (React 19). Mocks: `jest.mock('next/navigation')`, `jest.mock('@/stores/auth-store')`, spy en `window.alert`.
- [ ] 3.3 Crear `apps/client/src/components/ReportPage.spec.tsx` — 5 escenarios: (a) renderiza columnas esperadas en el DOM; (b) muestra "Cargando..." cuando la carga está pendiente; (c) muestra "Sin datos" cuando la respuesta es array vacío; (d) invoca `api.get` con los params correctos; (e) botón de exportar deshabilitado cuando no hay datos. Mocks: `jest.mock('@solucorp/shared')` (`api.get`), `jest.mock('./layout/AppLayout')` (evita cadena Sidebar→next/link). El mapper de `react-icons` resuelve automáticamente vía `jest.config.ts`.
- [ ] 3.4 Crear `apps/client/src/app/login/page.spec.tsx` — 3 escenarios: (a) submit llama `login` del store con email+password y luego `router.push('/dashboard')`; (b) error del store aparece visible en el formulario; (c) botón submit deshabilitado cuando `isLoading===true`. Mocks: `jest.mock('@/stores/auth-store')`, `jest.mock('next/navigation')`.

## Phase 4: DoD Verification Gate

_Depende de que Phases 1–3 estén completas._

- [x] 4.1 (PR1 parcial) `npm test` desde `apps/client/`: 2 suites, 8 tests, PASS. `turbo run test` completo: 5 workspaces, todos PASS (client 8 tests, shared 47, ui 20, api 52). PR2 añadirá los 2 tests restantes y alcanzará los 15 escenarios totales.
- [x] 4.2 `jest.config.ts` no contiene `coverageThreshold` — verificado con grep count = 0.
- [x] 4.3 `turbo run test` incluye `client` como workspace ejecutado — confirmado (8 tests PASS en client).
- [x] 4.4 `apps/admin` y `apps/mobile` no contienen `jest.config*` — confirmado (ls retorna "not found").
- [x] 4.5 `.github/workflows/ci.yml` y `turbo.json` no modificados — confirmado (solo archivos en `apps/client` fueron creados/modificados).
