# Tasks: storage-adapter

## Review Workload Forecast

| Campo | Valor |
|-------|-------|
| Líneas estimadas cambiadas | ~178 (new: adapter ~40 + tests ~120; modified: client ~12 + index ~3 + client.spec.ts ~3 overhead) |
| Archivos tocados | 5 (`storage-adapter.ts`, `client.ts`, `index.ts`, `storage-adapter.spec.ts`, `client.spec.ts`) |
| Riesgo presupuesto 400 líneas | Low |
| PRs encadenados recomendados | No |
| Split sugerido | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending (no requerido — single PR) |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Adapter + client refactor + exports + tests + DoD | PR 1 (único) | Cambio aislado a `packages/shared`; ~178 líneas; sin impacto en admin/client |

---

## Phase 1: Foundation — StorageAdapter interface + localStorageAdapter

- [x] 1.1 Crear `packages/shared/src/api/storage-adapter.ts` con la interfaz `StorageAdapter { getToken(): Promise<string | null>; setToken(token: string): Promise<void>; clearAuth(): Promise<void> }`.
- [x] 1.2 En el mismo archivo, definir la constante privada `AUTH_KEYS = ['access_token', 'refresh_token', 'user'] as const`.
- [x] 1.3 Implementar `localStorageAdapter: StorageAdapter` con guard `typeof window !== 'undefined'` DENTRO de cada método: `getToken` retorna `localStorage.getItem('access_token')` o `null`; `setToken` llama `localStorage.setItem`; `clearAuth` itera `AUTH_KEYS` con `removeItem`. En entorno Node los tres métodos son no-op / retornan `null`.

**Dependencias**: ninguna. Puede ejecutarse primero.

---

## Phase 2: Core Implementation — Refactor client.ts

- [x] 2.1 En `packages/shared/src/api/client.ts`, agregar import de `StorageAdapter` y `localStorageAdapter` desde `./storage-adapter`.
- [x] 2.2 Cambiar la firma a `createApiClient(baseURL: string, storage: StorageAdapter = localStorageAdapter)`. Mantener `timeout: 15000`.
- [x] 2.3 Reemplazar el request interceptor por una función `async`: `async (config) => { const token = await storage.getToken(); if (token) config.headers.Authorization = \`Bearer \${token}\`; return config; }`.
- [x] 2.4 En el 401-handler del response interceptor, reemplazar `localStorage.clear()` (o acceso directo previo) por `await storage.clearAuth()` seguido de `window.location.href = '/login'`. Errores no-401 DEBEN propagar con `Promise.reject(error)` sin llamar `clearAuth`.

**Dependencias**: Phase 1 completada (requiere `storage-adapter.ts`).

---

## Phase 3: Integration — Exports from index.ts

- [x] 3.1 En `packages/shared/src/index.ts`, agregar `export type { StorageAdapter } from './api/storage-adapter'`.
- [x] 3.2 En `packages/shared/src/index.ts`, agregar `export { localStorageAdapter } from './api/storage-adapter'`. Verificar que el export de `api` (instancia default) sigue presente e inalterado.

**Dependencias**: Phase 1 completada.

---

## Phase 4: Testing

- [x] 4.1 Crear `packages/shared/src/api/storage-adapter.spec.ts`. Stub `globalThis.window` + `globalThis.localStorage` (mock Map-based) en `beforeEach`; restaurar en `afterEach`. Todos los tests `async`. Descripciones en español.
- [x] 4.2 Test adapter — `getToken` con token: stub retorna `'tok'` → `getToken()` resuelve `'tok'`. (Escenario spec: "Request con token activo")
- [x] 4.3 Test adapter — `getToken` sin token: stub retorna `null` → `getToken()` resuelve `null`. (Escenario: "Request sin token activo")
- [x] 4.4 Test adapter — guard SSR `getToken`: sin stub de `window` (entorno Node default) → `getToken()` resuelve `null` sin lanzar error. (Escenario: "getToken en SSR retorna null")
- [x] 4.5 Test adapter — guard SSR `clearAuth`: sin stub de `window` → `clearAuth()` completa sin error. (Escenario: "clearAuth en SSR es no-op")
- [x] 4.6 Test adapter — `clearAuth` selectivo: sembrar mock con `access_token`, `refresh_token`, `user` + clave no-auth `'pref_theme'` → `clearAuth()` → las 3 claves auth borradas, `'pref_theme'` sobrevive. (Escenario: "Respuesta 401 limpia solo datos de auth")
- [x] 4.7 Crear `packages/shared/src/api/client.spec.ts`. Definir `fakeAdapter` inyectable. Todos los tests `async`. Descripciones en español.
- [x] 4.8 Test client — Bearer adjuntado: `fakeAdapter.getToken → 'tok'`; invocar el request interceptor; assert `config.headers.Authorization === 'Bearer tok'`. (Escenario: "Request con token activo")
- [x] 4.9 Test client — sin token, sin header: `fakeAdapter.getToken → null`; invocar el request interceptor; assert `Authorization` ausente. (Escenario: "Request sin token activo")
- [x] 4.10 Test client — 401 → `clearAuth` + redirect: stub `globalThis.window.location.href`; spy `fakeAdapter.clearAuth`; invocar el error-handler con `{ response: { status: 401 } }`; await → `clearAuth` llamado 1 vez, `window.location.href === '/login'`. (Escenario: "Redirección a login tras 401")
- [x] 4.11 Test client — no-401 (500) no llama `clearAuth`: spy `fakeAdapter.clearAuth`; invocar error-handler con `{ response: { status: 500 } }`; await rejected → `clearAuth` no llamado. (Escenario: "No invoca clear() total del storage")

**Dependencias**: Phases 1 y 2 completadas.

---

## Phase 5: DoD Verification Gate

- [x] 5.1 Ejecutar `npm test -- --testPathPattern="packages/shared"` (o equivalente turbo). TODOS los tests (incluyendo 4.2–4.11) DEBEN estar en verde.
- [x] 5.2 Ejecutar `tsc --noEmit` en `packages/shared`. Sin errores de tipo.
- [x] 5.3 Ejecutar `tsc --noEmit` en `apps/admin`. Sin errores de tipo.
- [x] 5.4 Ejecutar `tsc --noEmit` en `apps/client`. Sin errores de tipo.
- [x] 5.5 Ejecutar `next build` en `apps/admin`. Build exitoso (valida SSR guard + backward-compat).
- [x] 5.6 Ejecutar `next build` en `apps/client`. Build exitoso (idéntico a 5.5).
- [x] 5.7 Verificar que `apps/admin/src/**` y `apps/client/src/**` no tienen cambios (ningún archivo de los consumidores fue modificado).
- [x] 5.8 Verificar que `client.ts` no contiene `localStorage.clear()` (grep negativo confirma que el clear total fue eliminado).

**Dependencias**: Phases 1–4 completadas. Esta fase es el gate final antes de PR.
