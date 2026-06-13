# Propuesta: storage-adapter

## Intent

Habilitar el uso de `@solucorp/shared` (cliente HTTP `createApiClient`) en `apps/mobile` sin romper los portales web. Hoy el cliente lee el token con `localStorage.getItem('access_token')` de forma **síncrona y hardcodeada**: `localStorage` no existe en React Native y `expo-secure-store` solo expone API async (`getItemAsync`). Ese acoplamiento es el bloqueador que dejó mobile fuera del slice previo `adopt-shared-packages`.

Este slice introduce una abstracción de storage inyectable (`StorageAdapter`) y vuelve async el interceptor de request, preservando el comportamiento observable en web. **No es un refactor puro**: el manejo del 401 pasa de `localStorage.clear()` (borra TODO) a `storage.clearAuth()` (borra solo claves de auth) — cambio funcional intencional y aceptado.

## Scope

### In Scope
- `StorageAdapter` (`getToken`, `setToken`, `clearAuth`) + `localStorageAdapter` con guard SSR, en `packages/shared/src/api/storage-adapter.ts`.
- Refactor `createApiClient(baseURL, storage = localStorageAdapter)`: interceptor request async; 401 vía `storage.clearAuth()`.
- Export de `StorageAdapter` y `localStorageAdapter` desde `index.ts`.
- Tests nuevos de `storage-adapter.ts` y `client.ts` (interceptor async, 401-handler, guard SSR). Hoy `client.ts` = 0% cobertura.
- Build verification de `apps/admin` y `apps/client` SIN tocar su código.

### Out of Scope (non-goals explícitos)
- `expoSecureStoreAdapter`, config Metro, import de `@solucorp/shared` en `apps/mobile` → slice `shared-in-mobile`.
- Unificar la escritura del token: el `auth-store` de admin/client sigue escribiendo `access_token` directo a localStorage → slice `shared-in-mobile`.

## Capabilities

### New Capabilities
- `web-http-client`: contrato del cliente HTTP compartido — inyección de `StorageAdapter`, lectura async del token en cada request, y comportamiento del logout forzado ante 401 (`clearAuth`). Ninguna spec actual cubre el comportamiento client-side del interceptor.

### Modified Capabilities
- None. `auth-multi-tenant` es backend/API (endpoints login/refresh); no describe el interceptor cliente, así que el 401-handler client-side es capacidad nueva, no delta de una existente.

> Nota spec: el cambio de conducta del 401 (clear → clearAuth) SÍ genera escenarios reales en la spec nueva `web-http-client`, no es solo implementación.

## Approach

Estrategia B de la exploración (interfaz mínima por tokens). `clearAuth()` borra EXACTAMENTE las claves que escribe el `auth-store` (`access_token` y refresh token si existe) — no `localStorage.clear()` — para no dejar tokens colgados ni borrar datos no-auth. Backward-compat: `storage` es segundo parámetro con default `localStorageAdapter`; la instancia `api` exportada no cambia y admin/client no tocan ningún import. Interceptor request async retorna Promise; el adapter web envuelve localStorage en `Promise.resolve` (resuelve en el mismo microtask → sin cambio observable en web). Guard SSR: `localStorageAdapter` chequea `typeof window !== 'undefined'` (el módulo se evalúa en `next build` sobre Node).

## Regla de negocio (cambio de conducta del logout)

| Antes | Ahora |
|-------|-------|
| 401 → `localStorage.clear()` borra TODO el storage del origen | 401 → `clearAuth()` borra solo `access_token` (+ refresh token si existe) |

El logout forzado deja de ser destructivo sobre datos no-auth. Invariante: `clearAuth()` DEBE cubrir todas las claves que persiste el `auth-store`; si omite alguna, queda un token colgado.

## Affected Areas

| Área | Impacto | Descripción |
|------|---------|-------------|
| `packages/shared/src/api/storage-adapter.ts` | New | Interfaz + adapter web con guard SSR |
| `packages/shared/src/api/client.ts` | Modified | Interceptor async + 401 vía clearAuth |
| `packages/shared/src/index.ts` | Modified | Exports nuevos |
| `packages/shared/src/api/*.spec.ts` | New | Tests adapter + cliente |
| `apps/admin`, `apps/client` | Unchanged | Solo build verification |

## Risks

| Riesgo | Prob. | Mitigación |
|--------|-------|------------|
| Crash SSR (`localStorage` undefined en `next build`) | Media | Guard `typeof window !== 'undefined'` dentro del adapter; retorna `null`/no-op en server |
| Token colgado si `clearAuth` no cubre todas las claves | Media | `clearAuth` borra exactamente las claves del `auth-store`; test verifica cada clave |
| Async rompe asserts de tests síncronos | Baja | No hay tests previos; los nuevos usan `async/await` desde el inicio |
| Cambio observable de orden en web | Baja | `Promise.resolve` resuelve en el mismo microtask antes del dispatch |

## Rollback Plan

Cambio aislado a `packages/shared`. Revertir = restaurar `client.ts`/`index.ts` y borrar `storage-adapter.ts` + specs. Admin/client no cambian, así que no hay rollback en apps consumidoras.

## Dependencies

- Slice previo `adopt-shared-packages` (archivado). Ninguna dependencia externa nueva en este slice (`expo-secure-store` llega en `shared-in-mobile`).

## Success Criteria

- [ ] `StorageAdapter` + `localStorageAdapter` (guard SSR) definidos y exportados.
- [ ] `createApiClient(baseURL, storage = localStorageAdapter)`; interceptor request async; 401 → `clearAuth()`.
- [ ] `clearAuth()` borra todas las claves de auth del `auth-store` (sin tokens colgados).
- [ ] Tests nuevos para `storage-adapter.ts` y `client.ts` (request con/sin token, 401-handler, guard SSR) pasan.
- [ ] `tsc --noEmit` y build de `apps/admin` + `apps/client` OK sin modificar su código.
- [ ] La instancia `api` exportada sigue funcionando idéntica en web.
