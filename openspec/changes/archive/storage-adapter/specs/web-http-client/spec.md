# Especificación: Web HTTP Client

## Propósito

Contrato del cliente HTTP compartido (`createApiClient`) en `packages/shared`: inyección de `StorageAdapter`, lectura asíncrona del token en cada request, y comportamiento del logout forzado ante 401. Cubre el comportamiento observable del interceptor en entornos web y la garantía de seguridad en entornos SSR/Node.

## Requisitos

### Requisito: Adjuntar token de autenticación

El cliente HTTP DEBE leer el token activo vía `StorageAdapter.getToken()` e incluirlo en el header `Authorization` de cada request saliente, cuando exista un token almacenado.

#### Escenario: Request con token activo

- DADO que existe un `access_token` almacenado en el `StorageAdapter`
- CUANDO el cliente emite cualquier request HTTP
- ENTONCES el header `Authorization: Bearer <token>` DEBE estar presente en ese request

#### Escenario: Request sin token activo

- DADO que `StorageAdapter.getToken()` retorna `null`
- CUANDO el cliente emite un request HTTP
- ENTONCES el request DEBE enviarse sin header `Authorization`
- Y el request NO DEBE fallar por la ausencia de token

---

### Requisito: Logout forzado ante respuesta 401 (clearAuth)

Cuando el servidor responde con HTTP 401, el cliente DEBE limpiar ÚNICAMENTE las claves de autenticación del storage (sin afectar datos no-auth) y redirigir al usuario a `/login`.

DEBE llamar a `StorageAdapter.clearAuth()` — y NUNCA a un `clear()` total del storage.

Los datos no relacionados con autenticación que estén almacenados en el mismo origen DEBEN sobrevivir al evento 401.

> **Nota para diseño**: `clearAuth()` DEBE borrar exactamente las claves que el `auth-store` persiste (`access_token` y refresh token si existe). El diseño DEBE fijar la lista completa de claves de auth. Si alguna clave queda sin borrar, el resultado es un token colgado (token leak).

#### Escenario: Respuesta 401 limpia solo datos de auth

- DADO que el storage contiene `access_token`, datos de sesión de auth, Y también datos no-auth (preferencias de UI, caché de listados, etc.)
- CUANDO el servidor responde con HTTP 401 a cualquier request
- ENTONCES `clearAuth()` DEBE ser llamado
- Y las claves de autenticación (`access_token` y las demás que fije el diseño) DEBEN eliminarse del storage
- Y los datos no-auth DEBEN permanecer intactos en el storage

#### Escenario: Redirección a login tras 401

- DADO que el cliente recibió una respuesta 401
- CUANDO `clearAuth()` completa
- ENTONCES el cliente DEBE redirigir la sesión web a la ruta `/login`

#### Escenario: No invoca clear() total del storage

- DADO cualquier respuesta 401 del servidor
- CUANDO el 401-handler del cliente se ejecuta
- ENTONCES NUNCA DEBE invocarse `localStorage.clear()` ni ninguna operación de borrado total del storage del origen
- Y solo las claves de auth definidas por el diseño DEBEN ser eliminadas

---

### Requisito: StorageAdapter inyectable

`createApiClient` DEBE aceptar un `StorageAdapter` como parámetro de configuración y utilizarlo para todas las operaciones de lectura y limpieza de tokens.

El parámetro DEBE tener un valor por defecto (`localStorageAdapter`) de modo que el código consumidor existente en `apps/admin` y `apps/client` no requiera ningún cambio en sus imports ni llamadas.

#### Escenario: Uso con adapter por defecto (backward-compat)

- DADO que `apps/admin` o `apps/client` instancian `createApiClient(baseURL)` sin pasar storage
- CUANDO el cliente ejecuta un request o maneja un 401
- ENTONCES DEBE utilizar `localStorageAdapter` internamente
- Y el comportamiento observable DEBE ser idéntico al anterior (sin cambios de API ni imports)

#### Escenario: Uso con adapter personalizado

- DADO que se instancia `createApiClient(baseURL, customAdapter)` con un `StorageAdapter` alternativo
- CUANDO el cliente ejecuta un request o maneja un 401
- ENTONCES DEBE delegar `getToken()` y `clearAuth()` al `customAdapter` provisto
- Y NUNCA acceder a `localStorage` directamente

---

### Requisito: Seguridad SSR (entorno Node)

El módulo `packages/shared` DEBE poder ser importado y evaluado en entornos Node (ej. `next build`, SSR) sin lanzar errores por acceso a `localStorage`.

`localStorageAdapter` DEBE chequear `typeof window !== 'undefined'` antes de cualquier acceso a `localStorage`. En entorno Node, `getToken()` DEBE retornar `null` y `clearAuth()` DEBE ser un no-op.

#### Escenario: Importación en entorno Node (build/SSR)

- DADO que el módulo se evalúa en un proceso Node donde `window` no está definido
- CUANDO se importa `localStorageAdapter` o `createApiClient`
- ENTONCES NINGÚN acceso a `localStorage` DEBE ejecutarse durante la importación o la construcción del adapter
- Y el proceso DEBE continuar sin errores de tipo `ReferenceError: localStorage is not defined`

#### Escenario: getToken en SSR retorna null

- DADO un entorno Node (sin `window`)
- CUANDO se llama `localStorageAdapter.getToken()`
- ENTONCES DEBE retornar `null` sin lanzar error

#### Escenario: clearAuth en SSR es no-op

- DADO un entorno Node (sin `window`)
- CUANDO se llama `localStorageAdapter.clearAuth()`
- ENTONCES DEBE completar sin error y sin acceder a `localStorage`
