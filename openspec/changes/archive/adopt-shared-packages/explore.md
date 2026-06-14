## Exploración: adopt-shared-packages

### Estado Actual

Tres paquetes del workspace (`packages/shared`, `packages/ui`, `packages/config`) están construidos, testeados y exportados correctamente, pero ninguna aplicación consumidora los importa. Las tres apps (`apps/admin`, `apps/client`, `apps/mobile`) mantienen copias inline de la lógica que los paquetes ya encapsulan.

---

### Catálogo de Duplicación

#### `packages/shared` vs. copias inline

**`lib/api.ts`** — presente en las tres apps:

| Aspecto | `packages/shared` | `apps/admin` y `apps/client` | `apps/mobile` |
|---|---|---|---|
| Mecanismo de storage | `localStorage` (solo web) | `localStorage` | `expo-secure-store` |
| Envía `X-Tenant-ID` | Sí — desde `localStorage.getItem('tenant_id')` | **No** | **No** |
| Envía `Authorization` | Sí | Sí | Sí |
| Manejo de 401 | Limpia storage selectivo + redirige | `localStorage.clear()` (borra TODO) | Solo borra tokens, sin redirección |
| Timeout configurado | 15 000 ms | No | 15 000 ms |
| Detección de URL dev | No | No | Sí (debuggerHost/Android emulator) |

**Divergencia clave — `X-Tenant-ID`**: `packages/shared`'s `createApiClient` lee `tenant_id` de `localStorage` y lo agrega al header. Las copias inline de admin y client NO lo hacen. Sin embargo, la API backend (`apps/api/src/`) no tiene ningún middleware, guard, decorador, ni estrategia JWT que lea o requiera ese header: `grep -r "X-Tenant"` en `apps/api/src/` no arroja resultados. El header existe en el paquete compartido pero el backend no lo consume actualmente. **No es una divergencia de comportamiento operativo hoy**, pero sí una deuda de diseño latente.

**`stores/auth-store.ts`** — copias en admin, client y mobile:

| Aspecto | `apps/admin` / `apps/client` | `apps/mobile` |
|---|---|---|
| Tipo `User` inline | `role: string` | `role: string` |
| Tipo `UserInfo` en `packages/shared` | `role: UserRole` (tipo derivado del enum `ROLES`) | — |
| Persiste `enabledModules` | No | Sí |
| `isReady` flag | No | Sí |
| `logout` | Síncrono | Async |
| `loadFromStorage` | Síncrono | Async |

**Drift de tipos**: El `User` inline usa `role: string` en las tres apps. El tipo `UserInfo` de `packages/shared` usa `role: UserRole` (union type de `ROLES` constant). Son structuralmente compatibles en tiempo de ejecución, pero la versión del paquete es más estricta tipológicamente.

**Auth/Company/User types**: Solo `packages/shared` exporta `LoginRequest`, `LoginResponse`, `RefreshRequest`, `RefreshResponse`, `User`, `CreateUserRequest`, `UpdateUserRequest`, `Company`, `Subscription`, `CompanyModule`, `CompanySettings`, `MetadataType`, `MetadataItem`. Los portales web no tienen carpeta `types/` — declaran interfaces inline en cada archivo. La app mobile tampoco tiene carpeta `types/`. No hay duplicación de archivos de tipos, pero sí duplicación inline (en `auth-store.ts` se redefine `User` en cada app).

**Constantes (`ROLES`, `PLAN_TYPES`, `service-codes`, `meta-names`)**: Ninguna app las importa. Admin y client hardcodean strings de roles como literales en página de login y guards de autorización.

**Utils de formato (`formatGuarani`, `formatDate`, `formatDateTime`)**: Ninguna app las usa. `apps/client` tiene `new Date(v).toLocaleString('es-PY')` inlineado en cada columna de reporte en lugar de `formatDateTime`.

#### `packages/ui` vs. copias inline

Los portales web (admin/client) no tienen carpeta `components/ui/`. Sus páginas construyen UI directamente con clases Tailwind inline, sin componentes `Button`, `Input`, `Card`, `Modal` reutilizables. La `packages/ui` exporta esos componentes React web. La app mobile tiene `FormInput.tsx` y `SubmitButton.tsx` nativos (React Native), que son distintos por naturaleza (no son candidatos a ser reemplazados por `packages/ui`).

#### `packages/config` vs. uso actual

- `packages/config/tailwind/preset.js` define colores `primary` y `solucorp`. Ninguna app lo referencia en su configuración de Tailwind — admin y client usan Tailwind v4 con `@import "tailwindcss"` sin preset.
- `packages/config/tsconfig/nextjs.json` y `base.json` existen pero admin/client no los extienden — tienen sus propios `tsconfig.json` autocontenidos.

---

### Bloqueadores de Adopción

1. **`main` apunta a fuente TypeScript sin transpilar**: Ambos `packages/shared` y `packages/ui` tienen `"main": "src/index.ts"`. Next.js (bundler mode) puede importar TS directamente de un workspace sibling, pero requiere que el paquete esté en el campo `dependencies` de la app consumidora con la referencia workspace `"@solucorp/shared": "*"`. Actualmente ni admin ni client tienen esa dependencia declarada.

2. **`packages/shared` asume `localStorage` hardcodeado**: `createApiClient` y la instancia `api` por defecto usan `localStorage` directamente. Esto hace el paquete incompatible con `apps/mobile` sin modificación — mobile usa `expo-secure-store` con API async.

3. **`apps/mobile` está fuera del workspace npm raíz**: La raíz `package.json` lista `workspaces: ["apps/api", "apps/admin", "apps/client", "packages/*"]` — `apps/mobile` está explícitamente excluida y tiene su propio `package-lock.json`. El bundler Metro no soporta symlinks de npm workspaces out-of-the-box. La `metro.config.js` de mobile es la config por defecto sin resolver módulos del monorepo.

4. **Tailwind v4 en portales web**: Admin y client usan Tailwind v4 (CSS-first, `@import "tailwindcss"`). El preset de `packages/config` es un objeto de configuración Tailwind v3 (`module.exports = { theme: { extend: ... } }`). Los formatos son incompatibles. `packages/ui` usa strings de clase Tailwind inline sin configuración de tema — los componentes funcionarían visualmente pero no aprovecharían los colores `solucorp` del preset.

5. **Sin path alias hacia packages**: Los `tsconfig.json` de admin y client solo tienen `"@/*": ["./src/*"]`. No hay alias `@solucorp/shared` ni `@solucorp/ui` configurados — aunque con `"moduleResolution": "bundler"` y npm workspaces, debería resolverse automáticamente si la dependencia está declarada.

---

### Estrategias de Migración

#### Estrategia 1: Big-Bang — Adopción simultánea en todas las apps

Conectar `@solucorp/shared` y `@solucorp/ui` en admin, client y mobile al mismo tiempo.

- **Ventajas**: Elimina toda la deuda en un solo PR; el monorepo queda consistente de inmediato.
- **Desventajas**: Superficie de riesgo máxima; mobile requiere trabajo extra (metro config + storage abstraction); el bloqueo de `localStorage` hardcodeado en `createApiClient` debe resolverse antes de avanzar. Una regresión afecta las tres plataformas a la vez.
- **Esfuerzo**: Alto
- **Riesgo de regresión**: Alto

#### Estrategia 2: Incremental — Un paquete, una app a la vez (recomendada)

Priorizar `packages/shared` en los portales web (`apps/admin` y `apps/client`) primero, luego `packages/ui`, luego evaluar mobile por separado.

Orden de slices:
1. Declarar `"@solucorp/shared": "*"` en admin y client.
2. Reemplazar `lib/api.ts` inline por la instancia `api` de `packages/shared` (ajustando que `packages/shared` NO envíe `X-Tenant-ID` si el backend no lo lee, o limpiando `localStorage.clear()` en la copia inline por la estrategia selectiva del paquete).
3. Reemplazar los tipos `User` inline por `UserInfo` de `packages/shared` y migrar `auth-store.ts` a usar los tipos exportados.
4. Adoptar constantes y utils de formato donde corresponda.
5. Adoptar `packages/ui` en los portales web como paso separado.
6. Mobile: evaluar en un slice independiente — requiere abstraer el mecanismo de storage de `createApiClient`.

- **Ventajas**: Riesgo acotado; cada paso es verificable; no bloquea el trabajo en otras apps; se puede pausar entre slices.
- **Desventajas**: La deuda convive durante más tiempo; requiere disciplina para no dejar la migración a medias.
- **Esfuerzo**: Medio (por slice)
- **Riesgo de regresión**: Bajo por slice

#### Estrategia 3: Abstracción del storage antes de adoptar

Antes de conectar ninguna app, refactorizar `createApiClient` en `packages/shared` para aceptar un `storageAdapter` inyectado (tipo `{ get(key: string): string | null | Promise<string | null>; set(...): void | Promise<void>; remove(...): void | Promise<void> }`). Luego cada app provee su adaptador (localStorage para web, expo-secure-store para mobile).

- **Ventajas**: Elimina el bloqueo de storage de raíz; permite que mobile adopte `packages/shared` legítimamente; solución limpia a largo plazo.
- **Desventajas**: Es trabajo previo que retrasa la adopción; la abstracción agrega complejidad al paquete; requiere actualizar los tests del paquete.
- **Esfuerzo**: Medio-Alto (para el paquete) + Bajo (para cada app después)
- **Riesgo de regresión**: Bajo si se hace con TDD

---

### Recomendación

**Estrategia 2 incremental, comenzando con `packages/shared` en `apps/client`.**

Justificación:
- `apps/client` es el portal de cliente (COMPANY_ADMIN) y tiene mayor volumen de páginas que usan datos de reportes — es donde `formatDate`, `formatDateTime` y las constantes de roles tienen el impacto más visible.
- La adopción de `@solucorp/shared` en un portal web solo requiere agregar la dependencia workspace y reemplazar `lib/api.ts` y los tipos inline — cambio quirúrgico y verificable.
- El problema del `X-Tenant-ID` no genera regresión operativa hoy (el backend no lo lee), pero adoptar el cliente del paquete alinea a admin y client con el comportamiento que el paquete ya define, dejando el backend preparado para leerlo cuando se implemente el multi-tenant real.
- Mobile se deja para un slice posterior que incluya la abstracción de storage (Estrategia 3 aplicada solo a ese contexto).

---

### Riesgos

- **`X-Tenant-ID` silencioso**: `packages/shared`'s `createApiClient` envía el header pero el backend no lo valida. Si en el futuro el backend sí lo requiere y admin/client no lo tienen, será un bug de producción difícil de trazar. La adopción temprana del paquete compartido previene este riesgo.
- **`localStorage.clear()` vs. limpieza selectiva**: Las copias inline hacen `localStorage.clear()` en el 401-handler, lo que borra cualquier dato no-auth guardado en localStorage. `packages/shared` solo limpia las claves de auth. Esto es una mejora de comportamiento, no una regresión.
- **Tailwind v3 preset incompatible con v4**: Adoptar `packages/config/tailwind/preset.js` requeriría migrar el preset a formato v4 (`@theme`) antes de usarlo. No bloquea adoptar `packages/shared`.
- **Mobile fuera del workspace**: Cualquier intento de que mobile importe `@solucorp/shared` directamente requiere configurar Metro con `watchFolders` y `resolver.nodeModulesPaths` apuntando a la raíz del monorepo, además de la abstracción de storage. Es trabajo no trivial que justifica un slice separado.

---

### Alcance Sugerido del Primer Slice

**Nombre**: `shared-in-web-portals`

**Incluye**:
1. Agregar `"@solucorp/shared": "*"` a `dependencies` de `apps/admin` y `apps/client`.
2. Eliminar `apps/admin/src/lib/api.ts` e `apps/client/src/lib/api.ts`; redirigir importaciones a `@solucorp/shared`.
3. Eliminar los tipos `User` inline de `apps/admin/src/stores/auth-store.ts` y `apps/client/src/stores/auth-store.ts`; usar `UserInfo` de `@solucorp/shared`.
4. Reemplazar `new Date(v).toLocaleString('es-PY')` inline en reportes por `formatDate` / `formatDateTime` de `@solucorp/shared`.
5. Verificar build (`tsc --noEmit`) de admin y client sin errores.

**Excluye** (slices futuros):
- Adopción de `packages/ui` en los portales.
- Adopción de `@solucorp/shared` en `apps/mobile`.
- Migración del preset de Tailwind a v4.
- Abstracción del storage en `packages/shared`.

---

### ¿Listo para Propuesta?

Sí — el catálogo de duplicación está mapeado, los bloqueadores son conocidos y acotados, y el primer slice tiene scope claro y bajo riesgo.
