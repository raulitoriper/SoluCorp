# Design: Frontend Testing Foundation (apps/client)

## Technical Approach

Replicar el toolchain probado de `packages/ui` (Jest 30 + ts-jest + jsdom + RTL 16 + jest-dom) dentro de `apps/client`, agregando solo lo que los portales necesitan: `moduleNameMapper` para el alias `@/*` y para CSS, y mocks de módulo para `next/navigation`, `next/link`, `react-icons` y `@solucorp/shared`. Las dependencias ya existen en el workspace npm; no hay nueva toolchain. El gate de CI bloqueante se obtiene automáticamente al declarar el script `"test"` (la task `test` de `turbo.json` y el job `unit-tests` ya existen). Cubre la spec `testing-infrastructure` §1.3/§7.3 y `ci-infrastructure` §6.1.

## Architecture Decisions

### Decision: NO se necesita `tsconfig.test.json` (moduleResolution)

| Opción | Tradeoff | Decisión |
|---|---|---|
| Crear `tsconfig.test.json` con `moduleResolution:"node16"` | Config extra, divergencia del tsconfig real | Rechazada |
| Usar el `tsconfig.json` existente (`bundler`) tal cual | Cero config extra; idéntico a `packages/ui` | **Elegida** |

**Verificación empírica**: `packages/ui` hereda `moduleResolution:"bundler"` de `packages/config/tsconfig/base.json`, usa `preset:'ts-jest'` SIN `tsconfig.test.json`, y sus 4 specs pasan. ts-jest delega la resolución de módulos al resolver de Jest (no a `tsc`), por lo que `"bundler"` no rompe la compilación. **Respuesta definitiva: NO hace falta `tsconfig.test.json`.** ts-jest usa el `tsconfig.json` raíz de la app.

### Decision: `react-icons` se mockea (no transformIgnorePatterns)

**Verificación empírica**: `react-icons/ri` SÍ está en la cadena de imports — directo en `ReportPage` (`RiSearchLine`, `RiDownloadLine`) y vía `ReportPage → AppLayout → Sidebar` (14 íconos + `usePathname` + `next/link`). `recharts` NO aparece en ninguno de los 4 targets (no es problema en este slice).

| Opción para react-icons | Tradeoff | Decisión |
|---|---|---|
| `transformIgnorePatterns` para transpilar react-icons | Lento, frágil ante cambios de empaquetado ESM | Rechazada |
| `moduleNameMapper` → proxy que devuelve stubs | Rápido, determinista, sin transpilar ESM | **Elegida** |

`react-icons/ri` se mapea a un mock liviano (`__mocks__/reactIconsMock.js`) que exporta un Proxy de componentes no-op. Esto evita el `SyntaxError: Cannot use import statement` de ESM y desacopla los tests del set de íconos.

### Decision: Mock de `@solucorp/shared` y `next/navigation` a nivel módulo

El `api` (axios) y `useRouter`/`usePathname` se mockean por test con `jest.mock(...)`. No se centralizan en `jest.setup.ts` porque cada test necesita controlar el retorno (`api.get`/`api.post` con datos distintos, `push` espía). `localStorage` lo provee jsdom — solo se limpia en `beforeEach`. `window.location.href` (en `logout`) se redefine con `Object.defineProperty` (patrón del `client.spec.ts` de shared).

## Data Flow

    LoginPage ──login()──→ auth-store ──api.post──→ [api mock]
        │                      │
     router.push          localStorage.setItem
        │
    AuthGuard ──loadFromStorage──→ auth-store ──→ router.push('/login') si !user

    ReportPage ──api.get(endpoint)──→ [api mock] ──→ tabla / "Sin datos"
        └─ AppLayout → AuthGuard + Sidebar (mockeados o reales con react-icons stub)

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/client/jest.config.ts` | Create | preset ts-jest, jsdom, moduleNameMapper (`@/*`, css, react-icons), setupFilesAfterEnv |
| `apps/client/jest.setup.ts` | Create | `import '@testing-library/jest-dom'` |
| `apps/client/__mocks__/styleMock.js` | Create | `module.exports = {}` (CSS stub) |
| `apps/client/__mocks__/reactIconsMock.js` | Create | Proxy de componentes no-op para `react-icons/ri` |
| `apps/client/package.json` | Modify | devDeps testing + `"test": "jest"` |
| `apps/client/src/stores/auth-store.spec.ts` | Create | Tests del store (sin DOM) |
| `apps/client/src/components/layout/AuthGuard.spec.tsx` | Create | Tests del guard de rol |
| `apps/client/src/components/ReportPage.spec.tsx` | Create | Tests del reporte genérico |
| `apps/client/src/app/login/page.spec.tsx` | Create | Tests del formulario de login |
| `.github/workflows/ci.yml` | Unchanged | `unit-tests` ya corre `turbo run test`; gate automático |
| `turbo.json` | Unchanged | Task `test` ya existe |

## Interfaces / Contracts

**jest.config.ts** (forma):

```ts
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1',
  '\\.(css|less|scss)$': '<rootDir>/__mocks__/styleMock.js',
  '^react-icons/.*$': '<rootDir>/__mocks__/reactIconsMock.js',
}
testEnvironment: 'jsdom', preset: 'ts-jest', testRegex: '\\.spec\\.tsx?$'
```

**devDependencies a agregar** (mismas versiones que `packages/ui`): `jest@^30`, `ts-jest@^29.4`, `@types/jest@^30`, `jest-environment-jsdom@^30`, `@testing-library/react@^16.1`, `@testing-library/jest-dom@^6.6`.

## Mock list por target

| Target | Mocks necesarios | recharts/react-icons en cadena |
|---|---|---|
| `auth-store.ts` | `@solucorp/shared` (`api.post/get`); `localStorage.clear()`; redefinir `window.location` | No |
| `AuthGuard.tsx` | `next/navigation` (`useRouter().push`); `@/stores/auth-store` (`useAuthStore`); `alert` espía | No (vía mock de store no monta Sidebar) |
| `ReportPage.tsx` | `@solucorp/shared` (`api.get`); `react-icons/ri`; mock de `./layout/AppLayout` para no montar AuthGuard/Sidebar | react-icons SÍ (mapeado); recharts no |
| `login/page.tsx` | `@/stores/auth-store` (`login`, `isLoading`); `next/navigation` (`useRouter().push`) | No |

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit (store) | `login` éxito set user+token+localStorage; `login` falla lanza "Credenciales inválidas"; `logout` limpia + redirige; `loadFromStorage` con/sin token | Jest puro + jsdom localStorage |
| Unit (componente) | AuthGuard: null→push('/login'); rol≠COMPANY_ADMIN→alert+clear+push; COMPANY_ADMIN→children. Login: submit llama login+push('/dashboard'); error muestra mensaje; botón disabled con isLoading | RTL render + `waitFor` (no `act()` directo, React 19) |
| Unit (ReportPage) | render columnas; loading "Cargando..."; tabla vacía "Sin datos"; `api.get` con params; export deshabilitado sin datos | RTL + mock api + mock AppLayout |
| Integration / E2E | N/A en este slice | — |

## Migration / Rollout

No migration required. Rollback aislado: eliminar archivos nuevos de `apps/client` + quitar devDeps y script `"test"`. Sin el script, `turbo run test` deja de incluir client y el pipeline vuelve al estado previo. Sin cambios de runtime en producción.

## Open Questions

- None — los riesgos de `moduleResolution` y `react-icons` quedaron resueltos empíricamente contra el código real.
