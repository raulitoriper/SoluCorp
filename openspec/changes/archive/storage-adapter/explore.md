## Exploración: storage-adapter

**Cambio**: `storage-adapter`
**Fecha**: 2026-06-12
**Slice previo**: `adopt-shared-packages` (archivado) — adoptó `packages/shared` en portales web, dejó mobile fuera explícitamente por incompatibilidad de storage.

---

### Estado Actual

#### `packages/shared/src/api/client.ts` — estado exacto

```ts
export function createApiClient(baseURL: string) {
  const instance = axios.create({ baseURL, ... });

  // Interceptor de request — SÍNCRONO
  instance.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');   // ← sync
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;  // ← retorna config, no Promise
  });

  // Interceptor de response — maneja 401
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401 && typeof window !== 'undefined') {
        localStorage.clear();           // ← sync
        window.location.href = '/login';
      }
      return Promise.reject(error);
    },
  );

  return instance;
}

// Instancia por defecto — se instancia al cargar el módulo
export const api = createApiClient(
  typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : 'http://localhost:3001/api',
);
```

#### `packages/shared/src/index.ts`

```ts
export { createApiClient, api } from './api/client';
```

Tanto la fábrica como la instancia pre-construida `api` se exportan. Los portales web importan `api` directamente (import estático al cargar el módulo).

#### Consumo en portales web

- `apps/admin` y `apps/client` importan `api` directamente: `import { api } from '@solucorp/shared'`
- 9 archivos `.tsx` + 2 `auth-store.ts` usan `api` como instancia singleton.
- Los `auth-store.ts` de ambos portales llaman `localStorage.setItem/getItem/clear()` directamente (para guardar tokens tras login y para logout). Esto es independiente del interceptor — el interceptor solo LEE `access_token` para adjuntarlo a requests salientes.
- No hay ningún uso de `createApiClient` directo en los portales — solo consumen la instancia `api` pre-construida.

#### Cobertura existente de `client.ts`

0% (0/23 statements). No hay `client.spec.ts`. La refactorización deberá incluir tests nuevos.

---

### El Problema Sync/Async

#### Situación concreta

El interceptor de request actual es **síncrono**: lee `localStorage.getItem('access_token')` y retorna `config` de forma inmediata (no retorna Promise).

`expo-secure-store` expone `getItemAsync(key)` que retorna `Promise<string | null>`. No tiene variante síncrona.

**Dato crítico sobre axios**: el interceptor de request PUEDE retornar una Promise. Si lo hace, axios espera la resolución antes de despachar el request. Esto es comportamiento documentado y estable de axios ≥ 0.19.

#### ¿Se puede preservar el comportamiento observable web?

**Sí, sin cambios observables.** Si el interceptor async wrappea localStorage con `Promise.resolve(localStorage.getItem(...))`, la cadena de promesas se resuelve en el mismo tick del event loop (microtask). Para el portal web no hay diferencia observable en latencia, orden de ejecución, ni manejo de errores. El comportamiento del 401-handler en el interceptor de response tampoco cambia — sigue siendo Promise.reject.

---

### Estrategias de Diseño

#### Estrategia A — Interfaz genérica de storage (tipo `AsyncStorage`)

Definir un adaptador con la API más cercana a `AsyncStorage` de React Native:

```ts
interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}
```

El adaptador web wrappea localStorage con `Promise.resolve(...)`. La firma es idéntica a `@react-native-async-storage/async-storage`.

- **Ventajas**: Alineado con el ecosistema React Native; adaptador mobile trivial (wrapper directo sobre `expo-secure-store`); interfaz ampliamente conocida.
- **Desventajas**: `clear()` en localStorage borra todo el storage del origen — en web esto puede ser demasiado agresivo (un futuro feature podría guardar datos no-auth). El 401-handler actual ya llama `localStorage.clear()` por lo que no es una regresión nueva, pero es un acoplamiento que queda en la interfaz.
- **Esfuerzo**: Bajo

#### Estrategia B — Interfaz mínima enfocada en tokens (recomendada)

```ts
interface StorageAdapter {
  getToken(): Promise<string | null>;
  setToken(value: string): Promise<void>;
  clearAuth(): Promise<void>;
}
```

El adaptador solo gestiona la semántica de autenticación, no el storage genérico. `clearAuth()` borra exactamente las claves de auth (`access_token`, `refresh_token`, `user`, `tenant_id`) en lugar de limpiar todo el storage. El adaptador web implementa esto sobre localStorage. El adaptador mobile implementa sobre `expo-secure-store`.

- **Ventajas**: Interfaz mínima — expone solo lo que `createApiClient` necesita; `clearAuth()` es más seguro que `clear()` (borra solo claves auth); desacoplado de la API de storage genérico.
- **Desventajas**: Nombrado de métodos no estándar (no reutilizable por fuera de `createApiClient`); si en el futuro el cliente necesita leer/escribir otras claves, se necesita extender.
- **Esfuerzo**: Bajo

#### Estrategia C — Interfaz genérica `getItem/setItem/removeItem` + convención de keys

```ts
interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
```

Sin `clear()` — el cliente internamente llama `removeItem` para cada clave auth. Las claves auth (`access_token`, `refresh_token`, `user`) quedan dentro de `createApiClient` como constantes privadas.

- **Ventajas**: Más genérico que B pero más seguro que A (sin `clear()`); las claves auth como implementación interna; fácil de extender si el cliente necesita más claves.
- **Desventajas**: El cliente debe conocer todas las claves a limpiar en el 401-handler — acoplamiento interno pero explícito y testeable.
- **Esfuerzo**: Bajo

---

### Recomendación

**Estrategia B** (`getToken / setToken / clearAuth`).

Justificación:
1. La interfaz es exactamente lo que `createApiClient` necesita — no más. Principio de mínimo acoplamiento.
2. `clearAuth()` es semánticamente correcto: un cliente HTTP de autenticación no debería conocer el storage completo del dominio.
3. El interceptor de request solo necesita `getToken()`. El 401-handler solo necesita `clearAuth()`. La interfaz es autoexplicativa.
4. El adaptador localStorage es trivial (3 métodos sobre `Promise.resolve`). El adaptador expo-secure-store también es trivial (3 llamadas a `getItemAsync`/`setItemAsync`/`deleteItemAsync`).
5. Si en el futuro se necesita `setToken` (por ejemplo, para que el cliente renueve el token automáticamente via refresh), el método ya está en la interfaz.

**Compatibilidad con portales web**: la instancia `api` por defecto se construye con un `localStorage adapter` por defecto en `client.ts`. Los portales no necesitan cambiar ninguna importación.

---

### Compatibilidad con la Instancia `api` por Defecto

El punto crítico: los portales web importan `api` directamente y no pueden pasar un adaptador sin modificar cada archivo de consumo.

**Solución**: mantener la firma de `createApiClient` compatible con un segundo parámetro opcional:

```ts
export function createApiClient(baseURL: string, storage: StorageAdapter = localStorageAdapter): AxiosInstance
```

La instancia `api` por defecto se construye con el `localStorageAdapter` pre-definido en el mismo módulo, condicionado a `typeof window !== 'undefined'` para no romper SSR/builds de Next.js.

Los portales web no cambian ninguna línea de código. La instancia `api` sigue siendo válida. La fábrica `createApiClient` acepta un adaptador custom para mobile (slice siguiente).

---

### Alcance

#### Incluye (este slice)

- Definir interfaz `StorageAdapter` y exportarla desde `packages/shared/src/api/storage-adapter.ts`
- Implementar `localStorageAdapter` (web, sync wrapeado en Promise.resolve) en el mismo archivo
- Refactorizar `createApiClient` para aceptar `storage: StorageAdapter = localStorageAdapter` como segundo parámetro
- Hacer el interceptor de request async (`return async (config) => { ... }`)
- Reemplazar `localStorage.clear()` en el 401-handler por `storage.clearAuth()`
- Exportar `StorageAdapter` e `localStorageAdapter` desde `packages/shared/src/index.ts`
- Escribir tests unitarios para `client.ts` (interceptor request con token, interceptor request sin token, interceptor 401-handler)
- Escribir tests unitarios para `localStorageAdapter`
- Verificar build (`tsc --noEmit`) de `packages/shared`, `apps/admin`, `apps/client` sin errores

#### Excluye (slice siguiente: `shared-in-mobile`)

- Implementar `expoSecureStoreAdapter`
- Configurar Metro para resolver módulos del monorepo en `apps/mobile`
- Adoptar `@solucorp/shared` en `apps/mobile`
- Cualquier cambio en `apps/admin` o `apps/client` más allá del build de verificación

---

### Riesgos

1. **SSR / Next.js build**: `localStorageAdapter` usa `localStorage`, que no existe en Node.js. La instancia `api` por defecto se construye al cargar el módulo. Si Next.js evalúa el módulo en el servidor (edge runtime, SSR), el `typeof window !== 'undefined'` guard ya existe en el interceptor — debe extenderse al adaptador por defecto. **Mitigación**: el adaptador default debe ser un objeto que retorne `null`/`Promise.resolve(null)` cuando `typeof window === 'undefined'`, o el `api` export debe ser lazy. Este es el riesgo más alto del slice.

2. **`auth-store.ts` de portales web escribe tokens con `localStorage.setItem` directamente**: El interceptor de request solo LEE el token. Los portales siguen escribiendo tokens directamente al localStorage después del login — esto NO cambia con este slice y es correcto. El adaptador solo es para `createApiClient`. No hay acoplamiento con `auth-store`.

3. **Orden de microtasks**: Hacer el interceptor async introduce una microtask antes del dispatch. Para `localStorage` (Promise.resolve) esto es imperceptible. En teoría, si hay código que depende de que el interceptor sea estrictamente síncrono (difícil en axios, pero posible en tests unitarios mal escritos), podría necesitar ajuste de assertions. **Mitigación**: los tests nuevos deben usar `async/await` desde el inicio.

4. **Sin tests existentes para `client.ts`**: 0% de cobertura. La refactorización no tiene red de seguridad previa. Los tests nuevos son el único guardián de regresión.

5. **Naming collision**: Si en el futuro se adopta `@react-native-async-storage/async-storage`, su interfaz tiene los mismos métodos que Estrategia A/C pero no que B. Con Estrategia B, el adaptador mobile sería un wrapper de `expo-secure-store`, no un drop-in de AsyncStorage. No es un problema para este slice, pero es una consideración de diseño a largo plazo.

---

### Áreas Afectadas

- `packages/shared/src/api/client.ts` — refactorización principal
- `packages/shared/src/api/storage-adapter.ts` — archivo nuevo (interfaz + adaptador web)
- `packages/shared/src/index.ts` — agregar exports de `StorageAdapter` y `localStorageAdapter`
- `packages/shared/src/api/client.spec.ts` — archivo nuevo (tests)
- `packages/shared/src/api/storage-adapter.spec.ts` — archivo nuevo (tests)

No se toca ningún archivo en `apps/admin`, `apps/client`, ni `apps/mobile`.

---

### ¿Listo para Propuesta?

Sí. El problema está caracterizado con precisión, la solución técnica está definida, el riesgo principal (SSR guard) está identificado con mitigación, y el scope es quirúrgico (un paquete, sin tocar apps consumidoras).
