# Propuesta: adopt-shared-packages (slice `shared-in-web-portals`)

## Intent

Adoptar `@solucorp/shared` en los portales web (`apps/admin` y `apps/client`), eliminando las copias inline de `lib/api.ts`, unificando los tipos `User` inline al `UserInfo` del paquete y reemplazando el formateo de fecha/moneda hardcodeado por las utils del paquete. Es un **refactor puro**: cero cambio de comportamiento observable en runtime.

## Contexto

`packages/shared` está construido, testeado y exportado, pero ninguna app lo consume. Admin y client redefinen inline lo que el paquete ya encapsula: cliente HTTP, tipos de auth/usuario, y formateo (`new Date(v).toLocaleString('es-PY')` repetido en cada columna de reporte). Esto genera drift de tipos (`role: string` inline vs. `role: UserRole` del paquete) y deuda de mantenimiento: cualquier cambio debe replicarse en dos lugares.

Por qué ahora: el paquete ya existe y está listo; mantener las copias inline solo agranda la deuda. El slice es quirúrgico, verificable y de bajo riesgo (Estrategia 2 incremental de la exploración).

## Alcance

### Incluye

- Declarar `"@solucorp/shared": "*"` en `dependencies` de `apps/admin` y `apps/client`.
- Eliminar `apps/admin/src/lib/api.ts` e `apps/client/src/lib/api.ts`; redirigir importaciones a la instancia `api` / `createApiClient` de `@solucorp/shared`.
- Quitar el header `X-Tenant-ID` de `createApiClient` en `packages/shared`.
- Reemplazar el tipo `User` inline en ambos `stores/auth-store.ts` por `UserInfo` de `@solucorp/shared`; mapear `enabledModules` desde el login response (adición de datos).
- Reemplazar `toLocaleString('es-PY')` inline por `formatDate` / `formatDateTime` / `formatGuarani` del paquete.

### No incluye (no-goals explícitos)

- `packages/ui` (componentes web) — slice futuro.
- `apps/mobile` — fuera del workspace npm raíz; requiere abstracción de storage + config Metro. Queda **intacta**.
- Preset de Tailwind de `packages/config` (incompatibilidad v3/v4).
- Abstracción del `storageAdapter` en `createApiClient` (sigue usando `localStorage`).
- Fix de seguridad de JWT en `localStorage` / XSS.
- Cambiar el 401-handler a limpieza selectiva (`localStorage.clear()` se mantiene como está en web).
- Module-gating en web a partir de `enabledModules`.

## Decisiones de producto bloqueadas

| # | Decisión | Justificación |
|---|----------|---------------|
| 1 | Quitar `X-Tenant-ID` de `createApiClient` | La multi-tenancy va por el `companyId` del JWT; el backend no lee el header (`grep X-Tenant` en `apps/api/src/` = 0). Quitarlo preserva el comportamiento actual (las copias inline nunca lo enviaban). |
| 2 | Refactor puro, cero cambio observable | Las mejoras de seguridad y la diferencia del 401-handler quedan fuera de alcance como cambios separados futuros. Se evita acoplar refactor con cambio de conducta. |
| 3 | Adoptar `UserInfo` rico (`role: UserRole` + `enabledModules`) | `enabledModules` se mapea desde el login response: es adición de datos, NO de conducta. Web NO empieza a gatear módulos en este cambio. |
| 4 | DoD = `tsc --noEmit` limpio + builds OK + e2e API verde | Confirma equivalencia de tipos y compilación sin tocar comportamiento backend. |

## Capabilities

> Refactor puro a nivel de implementación. No cambia ningún requisito de comportamiento a nivel de spec.

### New Capabilities
- None

### Modified Capabilities
- None

## Aproximación propuesta

1. Agregar la dependency workspace en ambas apps; con `moduleResolution: bundler` + npm workspaces resuelve sin path alias extra.
2. Quitar `X-Tenant-ID` de `createApiClient` en `packages/shared` (el header y la lectura de `localStorage.getItem('tenant_id')`).
3. Borrar los `lib/api.ts` inline; reapuntar imports a `@solucorp/shared`.
4. Migrar `auth-store.ts` a `UserInfo`; mapear `enabledModules` del login response sin gatear.
5. Reemplazar formateo inline por `formatDate` / `formatDateTime` / `formatGuarani`.
6. Verificar DoD.

## Impacto

| Área | Impacto | Descripción |
|------|---------|-------------|
| `apps/admin/package.json`, `apps/client/package.json` | MOD | Agregar dependency workspace |
| `apps/admin/src/lib/api.ts`, `apps/client/src/lib/api.ts` | ELIMINAR | Reemplazado por instancia del paquete |
| `apps/admin/src/stores/auth-store.ts`, `apps/client/src/stores/auth-store.ts` | MOD | `User` inline → `UserInfo`; mapear `enabledModules` |
| Páginas de reporte (client) | MOD | `toLocaleString('es-PY')` → utils del paquete |
| `packages/shared` (`createApiClient`) | MOD | Quitar `X-Tenant-ID` |

### Multi-tenant safety
No se altera el aislamiento: la tenancy sigue derivándose del `companyId` del JWT en el backend. Quitar `X-Tenant-ID` no afecta nada porque el backend nunca lo leyó.

## Plan de rollback

Cambio acotado y revertible por commit. Revertir restaura los `lib/api.ts` inline y los tipos `User` inline; al ser refactor puro, el revert no implica pérdida de datos ni cambio de estado en runtime. La dependency workspace se quita del `package.json` en el mismo revert.

## Riesgos

| # | Riesgo | Probabilidad | Mitigación |
|---|--------|--------------|------------|
| 1 | Divergencia de comportamiento al adoptar la instancia del paquete (timeout 15s, 401-handler selectivo) | Media | Verificar que el flujo de auth/refresh y errores se comporta igual; el 401-handler queda explícitamente fuera de alcance (se documenta como cambio futuro) |
| 2 | Drift de tipos `role: string` → `role: UserRole` rompe `tsc` | Media | Son structuralmente compatibles; resolver con cast/ajuste de mapeo en el login response |
| 3 | Mapeo de `enabledModules` desde el login response incompleto o ausente | Baja | Tratar como adición de datos; default seguro (vacío) sin gatear conducta |
| 4 | Mobile afectada indirectamente | Baja | Mobile está fuera del workspace y no importa el paquete; queda intacta por diseño |
| 5 | Quitar `X-Tenant-ID` rompe algo no detectado | Baja | Confirmado por grep que el backend no lo lee; e2e API verde lo valida |

## Dependencias

- `packages/shared` ya construido y exportando (`api`, `createApiClient`, `UserInfo`, `formatDate`, `formatDateTime`, `formatGuarani`). Sin prerequisitos externos.

## Success Criteria (Definition of Done)

- [ ] `tsc --noEmit` limpio en `apps/admin` y `apps/client`.
- [ ] Build de ambos portales OK.
- [ ] Suite e2e de API sigue verde.
- [ ] No quedan `lib/api.ts` inline ni tipos `User` inline en admin/client.
- [ ] No quedan `toLocaleString('es-PY')` inline en reportes.
- [ ] `X-Tenant-ID` removido de `createApiClient`.
