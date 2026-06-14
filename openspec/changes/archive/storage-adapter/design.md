# Diseño: storage-adapter

## Enfoque Técnico

Estrategia B de la exploración: interfaz mínima `StorageAdapter` enfocada en tokens, inyectada como segundo parámetro de `createApiClient` con default `localStorageAdapter`. El interceptor de request se vuelve async (`await storage.getToken()`); el 401-handler reemplaza `localStorage.clear()` por `await storage.clearAuth()`. La instancia `api` exportada se sigue construyendo con el default, por lo que `apps/admin` y `apps/client` no cambian ninguna línea. El `auth-store` no se toca (fuera de alcance).

## Interfaz / Contrato

```ts
// packages/shared/src/api/storage-adapter.ts
export interface StorageAdapter {
  getToken(): Promise<string | null>;
  setToken(token: string): Promise<void>;
  clearAuth(): Promise<void>;
}

// Claves que el auth-store persiste (verificadas en código real)
const AUTH_KEYS = ['access_token', 'refresh_token', 'user'] as const;

export const localStorageAdapter: StorageAdapter = {
  getToken: () =>
    Promise.resolve(
      typeof window !== 'undefined' ? localStorage.getItem('access_token') : null,
    ),
  setToken: (token) => {
    if (typeof window !== 'undefined') localStorage.setItem('access_token', token);
    return Promise.resolve();
  },
  clearAuth: () => {
    if (typeof window !== 'undefined') {
      AUTH_KEYS.forEach((k) => localStorage.removeItem(k));
    }
    return Promise.resolve();
  },
};
```

El guard `typeof window !== 'undefined'` vive DENTRO de cada método: el objeto adapter se puede construir en Node (`next build`) sin tocar `localStorage`; los métodos retornan `null`/no-op en server.

## Decisiones de Arquitectura

### Decisión: Interfaz mínima por tokens (Estrategia B) vs genérica `getItem/clear` (A/C)

**Choice**: `getToken / setToken / clearAuth`.
**Alternatives considered**: A (`getItem/setItem/removeItem/clear` estilo AsyncStorage); C (`getItem/setItem/removeItem` + claves internas).
**Rationale**: Expone solo lo que `createApiClient` necesita. `clearAuth()` es semánticamente seguro (borra claves auth, no todo el origen) y evita arrastrar el acoplamiento de `clear()` a la interfaz.

### Decisión: `clearAuth()` con `removeItem` selectivo vs `localStorage.clear()`

**Choice**: `removeItem` sobre las 3 claves de auth.
**Alternatives considered**: mantener `clear()` total.
**Rationale**: El logout forzado deja de ser destructivo sobre datos no-auth. Cambio de conducta intencional y aceptado.

### Decisión: Backward-compat por parámetro default vs export lazy de `api`

**Choice**: `storage: StorageAdapter = localStorageAdapter`; `api` se construye eager con el default.
**Alternatives considered**: `api` lazy/getter para diferir construcción.
**Rationale**: Con el guard dentro de cada método del adapter, construir `api` en Node es seguro (no se accede a `localStorage` al cargar el módulo, solo al invocar un método en runtime web). El export eager preserva los imports actuales sin tocar admin/client.

### Decisión: Interceptor request async vs sync

**Choice**: `async (config) => { const t = await storage.getToken(); ... }`.
**Alternatives considered**: mantener sync (incompatible con `expo-secure-store`).
**Rationale**: axios `^1.7.0` espera la Promise del interceptor antes de despachar (documentado desde ≥0.19). El adapter web resuelve en el mismo microtask (`Promise.resolve`), sin cambio observable de latencia ni orden en web.

## Flujo de Datos

```
Request:  caller → api.get() → request interceptor (async)
                                  └─ await storage.getToken() → Authorization: Bearer <t>
                                                                       └─ dispatch HTTP

Response 401: error → response interceptor
                        └─ await storage.clearAuth() → removeItem(access_token,
                           refresh_token, user) → window.location.href = '/login'
```

## Cambios de Archivos

| Archivo | Acción | Descripción |
|------|--------|-------------|
| `packages/shared/src/api/storage-adapter.ts` | Create | Interfaz `StorageAdapter` + `localStorageAdapter` con guard SSR por método |
| `packages/shared/src/api/client.ts` | Modify | `createApiClient(baseURL, storage = localStorageAdapter)`; request interceptor async; 401 → `await storage.clearAuth()` |
| `packages/shared/src/index.ts` | Modify | Exportar `StorageAdapter` (type) y `localStorageAdapter` |
| `packages/shared/src/api/storage-adapter.spec.ts` | Create | Tests del adapter |
| `packages/shared/src/api/client.spec.ts` | Create | Tests del interceptor |

## Lista Definitiva de Claves para `clearAuth()`

Verificado en `apps/admin/src/stores/auth-store.ts` y `apps/client/src/stores/auth-store.ts` (idénticos):

- `'access_token'` — leída por el interceptor; escrita por el auth-store en login.
- `'refresh_token'` — escrita por el auth-store en login.
- `'user'` — escrita por el auth-store (JSON) en login.

No existe `tenant_id` (la exploración lo mencionó especulativamente; NO se persiste). No hay zustand `persist` (store es `create` plano, sin clave `name:`), ni `sessionStorage`, ni otras claves auth. `clearAuth()` DEBE borrar esas 3 y solo esas — cualquier omisión deja token colgado.

## Estrategia de Testing

`packages/shared/jest.config.ts` usa `testEnvironment: 'node'` → `window`/`localStorage` NO existen por defecto. Descripciones en español (convención del repo). Todos los tests `async`.

| Capa | Qué testear | Enfoque |
|------|-------------|---------|
| Unit adapter | `getToken` retorna token / `null` | Stub `globalThis.window` + `globalThis.localStorage` (Map mock) en `beforeEach`, limpiar en `afterEach` |
| Unit adapter | guard SSR: sin `window`, `getToken`→`null`, `setToken`/`clearAuth` no-op sin throw | Estado por defecto del entorno node (no stub) |
| Unit adapter | `clearAuth` borra `access_token`+`refresh_token`+`user` y NO borra clave no-auth | Sembrar mock con clave extra; assert que sobrevive |
| Unit client | request adjunta `Bearer <t>` cuando hay token | Mock adapter `getToken→'tok'`; inspeccionar handler del interceptor |
| Unit client | request sin token → sin header Authorization | Mock adapter `getToken→null` |
| Unit client | 401 → `clearAuth()` llamado + redirect a `/login` | Mock adapter spy en `clearAuth`; stub `window.location` (objeto asignable a `href`); invocar el error-handler con `{ response: { status: 401 } }`; await |
| Unit client | no-401 (p.ej. 500) → NO llama `clearAuth`, propaga `Promise.reject` | Mock adapter spy |

Mock pattern: inyectar adapter falso vía `createApiClient(url, fakeAdapter)`; acceder a los handlers registrados (o usar el adapter inyectado y disparar el flujo). Para `window.location.href`, redefinir con `Object.defineProperty(globalThis, 'window', { value: { location: { href: '' } }, configurable: true })`.

## Migración / Rollout

Sin migración de datos. Cambio aislado a `packages/shared`. Rollback: restaurar `client.ts`/`index.ts` y borrar `storage-adapter.ts` + specs. Admin/client no cambian → no hay rollback en consumidores.

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Crash SSR en `next build` al construir `api` | Guard por método; construir el objeto adapter no toca `localStorage` |
| Token colgado si `clearAuth` no cubre todas las claves | Lista cerrada `AUTH_KEYS` verificada en código; test por clave |
| Cambio de orden async rompe assert | Sin tests previos; los nuevos son `async` desde el inicio |

## DoD

- [x] `StorageAdapter` + `localStorageAdapter` (guard SSR por método) definidos y exportados.
- [x] `createApiClient(baseURL, storage = localStorageAdapter)`; interceptor request async; 401 → `clearAuth()`.
- [x] `clearAuth()` borra `access_token`, `refresh_token`, `user`.
- [x] Tests adapter + client pasan (`jest`, entorno node).
- [x] `tsc --noEmit` + build de admin/client OK sin tocar su código.
- [x] Instancia `api` idéntica en web.

## Open Questions

- Ninguna que bloquee. Las claves de auth quedaron pinneadas por lectura directa del código.
