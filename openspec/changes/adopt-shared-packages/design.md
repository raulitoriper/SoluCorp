# Diseño: adopt-shared-packages (slice `shared-in-web-portals`)

## Enfoque técnico

Refactor puro que adopta `@solucorp/shared` en `apps/admin` y `apps/client`. El criterio rector es **equivalencia conductual exacta**: la instancia `api` del paquete debe comportarse en runtime igual que las copias inline actuales. Donde el paquete diverge (timeout, 401-handler, `X-Tenant-ID`), el diseño alinea el paquete al comportamiento web actual en lugar de aceptar la divergencia, porque LOCKED #2 prohíbe cambio observable y los no-goals fijan `localStorage.clear()` como conducta a preservar. El consumo es desde fuente TS (`main: src/index.ts`), lo que obliga a `transpilePackages` en ambos `next.config.ts`.

## Hallazgos de verificación previa

- Ambos `lib/api.ts` (admin/client) son **idénticos**: sin timeout, sin `X-Tenant-ID`, 401 → `localStorage.clear()` + redirect a `/login`.
- `createApiClient` del paquete: timeout **15000ms**, envía `X-Tenant-ID` desde `localStorage.getItem('tenant_id')`, 401 → `removeItem` selectivo (4 claves) + redirect.
- Backend `apps/api/src`: `grep X-Tenant|tenant_id` = **0 coincidencias**. El header no se lee ni se requiere.
- `packages/shared`: **no existe** test de `api/client` (`*.api/*.test.ts` = 0). Sí hay specs de `roles`, `service-codes`, `meta-names`, `format`. Quitar `X-Tenant-ID` no rompe ningún test del paquete.
- `index.ts` exporta `createApiClient`, `api`, `UserInfo`, `LoginResponse`, `formatDate`, `formatDateTime`, `formatGuarani`, `UserRole`, `ROLES`.
- `package.json`: `main`/`types` → `src/index.ts` (sin build output consumible). `dependencies`: `axios`, `zustand`.
- tsconfig de ambos portales: `moduleResolution: bundler`, sólo alias `@/*`. **Sin** alias a packages.
- `next.config.ts` de ambos portales: **vacío, sin `transpilePackages`** (gotcha real de monorepo).
- `AuthGuard.tsx` compara `user.role` contra literales `'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'FIELD_WORKER'` — todos miembros de `UserRole`. `ready` es estado local del componente, no del store.
- Sitios consumidores de `@/lib/api` (12): 2 stores, `ReportPage.tsx`, y 9 páginas. Sitios `toLocaleString('es-PY')` (11): MapView (admin+client), team, dashboard, 6 reports, y formateo `₲` en orders.

## Decisiones de arquitectura

### Decisión: Alinear el 401-handler del paquete a `localStorage.clear()`

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| Adoptar el `removeItem` selectivo del paquete | Es "mejora", pero CAMBIA conducta observable → viola LOCKED #2 | Rechazada |
| Documentar la diferencia como aceptada | Sigue siendo cambio de runtime en web | Rechazada |
| Parametrizar el handler | Sobre-ingeniería para un slice quirúrgico | Rechazada |
| **Alinear el paquete a `localStorage.clear()`** | El paquete pasa a coincidir con la conducta web actual; mobile aún no consume el paquete, así que no hay impacto cruzado | **Elegida** |

**Justificación**: el no-goal explícito dice "`localStorage.clear()` se mantiene como está en web". Como ninguna app consume el paquete hoy, cambiar su handler no regresa a nadie y produce equivalencia exacta. Es la única opción coherente con refactor puro.

### Decisión: Quitar `X-Tenant-ID` de `createApiClient`

**Elegida**: eliminar el bloque que lee `tenant_id` y setea `X-Tenant-ID` (y su `removeItem` en el 401). **Alternativa rechazada**: conservarlo (las copias inline nunca lo enviaron → enviarlo sería cambio observable). El backend no lo lee (grep=0) y no hay test del cliente que romper.

### Decisión: Conservar el timeout 15000ms del paquete

**Elegida**: mantener `timeout: 15000`. Es el único caso donde NO se alinea al inline (que no tiene timeout). **Justificación**: un timeout es un límite superior defensivo; en operación normal (respuestas < 15s) la conducta observable es idéntica. Documentado como diferencia teórica aceptada, no como regresión. Alternativa (quitar timeout) rechazada por degradar la robustez del paquete sin beneficio.

### Decisión: Consumo desde fuente vía `transpilePackages`

**Elegida**: añadir `transpilePackages: ["@solucorp/shared"]` a ambos `next.config.ts`. **Justificación**: `main: src/index.ts` es TS crudo; Next.js no transpila node_modules por defecto y el build fallaría. `moduleResolution: bundler` + workspace npm resuelve el módulo, pero la transpilación es obligatoria. Alternativa (agregar build step al paquete) rechazada: amplía el slice y no es necesaria con `transpilePackages`.

### Decisión: Migrar `User` inline a `UserInfo` tipando la respuesta de login

**Elegida**: importar `UserInfo` y `LoginResponse`; tipar `const { data } = await api.post<LoginResponse>(...)`. `data.user` ya es `UserInfo`; `data.enabledModules` se persiste pero NO se gatea. **Justificación**: evita el cast de `role: string`; las comparaciones de `AuthGuard` contra literales siguen válidas porque son miembros de `UserRole`.

## Estrategia de migración (orden que mantiene `tsc` verde)

**Pre-paso (paquete, una sola vez)**:
0. En `createApiClient`: quitar bloque `X-Tenant-ID` (request + `removeItem('tenant_id')`); cambiar el 401-handler de 4 `removeItem` a `localStorage.clear()`. Conservar `timeout: 15000`. Correr `jest` del paquete (verde, no hay test del cliente).

**Por app — primero `apps/admin`, luego `apps/client` (idénticos)**:
1. Agregar `"@solucorp/shared": "*"` a `dependencies` del `package.json` de la app; `npm install` en raíz para enlazar el workspace.
2. Añadir `transpilePackages: ["@solucorp/shared"]` a `next.config.ts`. (Sin esto el build rompe, no `tsc`.)
3. Borrar `src/lib/api.ts`.
4. Reapuntar los 12 imports `import api from '@/lib/api'` → `import { api } from '@solucorp/shared'`. (Default import → named import.)
5. `tsc --noEmit` → debe quedar verde tras reapuntar todos los imports.
6. En `auth-store.ts`: reemplazar `interface User` por `import { UserInfo, LoginResponse } from '@solucorp/shared'`; tipar `AuthState.user: UserInfo | null`; tipar `api.post<LoginResponse>`; mapear/persistir `data.enabledModules` (sin gatear).
7. Reemplazar `toLocaleString('es-PY')` por `formatDateTime` (fecha+hora) / `formatDate` (sólo fecha) / `formatGuarani` (monto `₲` en orders), importados de `@solucorp/shared`, en los 11 sitios.
8. `tsc --noEmit` + `next build` de la app → verde.

Repetir 1–8 para `apps/client`. Al terminar ambas, correr e2e API.

## Análisis de equivalencia conductual

| Diferencia | Inline (actual) | Paquete (original) | Resolución |
|-----------|-----------------|--------------------|-----------|
| `X-Tenant-ID` | No envía | Envía desde `tenant_id` | **Quitar del paquete** → equivalente |
| 401-handler | `localStorage.clear()` | `removeItem` selectivo | **Alinear paquete a `clear()`** → equivalente |
| Timeout | Ninguno | 15000ms | **Conservar 15000ms**; equivalente en operación normal (<15s), diferencia teórica documentada |
| Redirect 401 | `window.location.href='/login'` | igual | Sin cambio |
| Auth header | `Bearer` desde `access_token` | igual | Sin cambio |
| baseURL | `NEXT_PUBLIC_API_URL` o localhost | igual | Sin cambio |

**Contradicción resuelta**: el 401-handler del paquete divergía y adoptarlo *as-is* habría violado refactor puro. Se alinea el paquete a la conducta web actual (`clear()`), no al revés.

## Plan de type-drift

- `role: string` → `role: UserRole`: cubierto al asignar `data.user` ya tipado como `UserInfo` vía `LoginResponse`. No requiere cast.
- `AuthGuard`/`team`: comparaciones contra `'SUPER_ADMIN'`/`'COMPANY_ADMIN'`/`'FIELD_WORKER'` son literales válidos de `UserRole` → `tsc` verde sin tocar.
- `enabledModules`: vive en `LoginResponse.enabledModules` (top-level, no en `user`). Se persiste como adición de datos; default seguro `[]` si ausente; **no** se usa para gatear módulos.

## Cambios de archivo

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `packages/shared/src/api/client.ts` | MOD | Quitar `X-Tenant-ID`; 401 → `localStorage.clear()`; conservar timeout |
| `apps/admin/package.json`, `apps/client/package.json` | MOD | + `"@solucorp/shared": "*"` |
| `apps/admin/next.config.ts`, `apps/client/next.config.ts` | MOD | + `transpilePackages: ["@solucorp/shared"]` |
| `apps/admin/src/lib/api.ts`, `apps/client/src/lib/api.ts` | ELIMINAR | Reemplazado por instancia del paquete |
| `apps/{admin,client}/src/stores/auth-store.ts` | MOD | `User` → `UserInfo`; tipar `LoginResponse`; mapear `enabledModules` |
| 12 sitios `@/lib/api` | MOD | → `import { api } from '@solucorp/shared'` |
| 11 sitios `toLocaleString('es-PY')` | MOD | → `formatDate`/`formatDateTime`/`formatGuarani` |

## Estrategia de testing

| Capa | Qué | Cómo |
|------|-----|------|
| Type | Equivalencia de tipos | `tsc --noEmit` verde en admin + client |
| Build | Resolución de workspace + transpilación | `next build` verde en ambos |
| Unit (paquete) | No-regresión tras editar `client.ts` | `jest` en `packages/shared` (specs de roles/format/etc.) |
| E2E | Auth/refresh/errores backend intactos | suite e2e API verde |

## Migración / rollout

Sin migración de datos. Revertible por commit: el revert restaura `lib/api.ts` inline, los tipos `User` inline, los `next.config.ts` vacíos y el `client.ts` original del paquete. Al ser refactor puro, no hay pérdida de estado en runtime.

## Frontera de rollback y DoD

Rollback = `git revert` del/los commit(s) del slice. DoD verificado por: `tsc --noEmit` limpio (admin+client) · `next build` OK (ambos) · `jest` paquete verde · e2e API verde · sin `lib/api.ts` inline · sin `User` inline · sin `toLocaleString('es-PY')` en sitios migrados · `X-Tenant-ID` removido.

## Open Questions

- Ninguna que bloquee. (El `enabledModules` se mapea como dato; su uso para gating es slice futuro fuera de alcance.)
