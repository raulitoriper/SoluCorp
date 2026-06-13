# Tasks: adopt-shared-packages

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~180–240 net (deletions pesadas: 2×lib/api.ts ~50 líneas c/u; adiciones: imports, transpilePackages, auth-store types, formatters) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR — el refactor es atómico y cada app sigue el mismo patrón |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Pre-paso paquete + apps/admin + apps/client + gate final | PR 1 | Refactor puro; base = main; rollback = git revert |

---

## Phase 1: Paquete compartido — alineación conductual

- [x] 1.1 En `packages/shared/src/api/client.ts`: eliminar el bloque del request interceptor que lee `localStorage.getItem('tenant_id')` y setea el header `X-Tenant-ID`.
- [x] 1.2 En `packages/shared/src/api/client.ts`: en el response interceptor (401-handler), reemplazar los 4 `removeItem` selectivos por `localStorage.clear()`.
- [x] 1.3 En `packages/shared/src/api/client.ts`: confirmar que `timeout: 15000` se conserva intacto (sin cambio, sólo verificar).
- [x] 1.4 Ejecutar `jest` en `packages/shared` (raíz: `npm test --filter=@solucorp/shared` o `turbo run test --filter=@solucorp/shared`) y confirmar verde — valida que ningún spec de roles/format/etc. se rompió.

---

## Phase 2: apps/admin — adopción del paquete

- [x] 2.1 En `apps/admin/package.json`: agregar `"@solucorp/shared": "*"` en `dependencies`.
- [x] 2.2 Desde la raíz del monorepo ejecutar `npm install` para enlazar el workspace.
- [x] 2.3 En `apps/admin/next.config.ts`: agregar `transpilePackages: ["@solucorp/shared"]` a la config de Next.js.
- [x] 2.4 Eliminar `apps/admin/src/lib/api.ts`.
- [x] 2.5 En los ~12 sitios que hacen `import api from '@/lib/api'` dentro de `apps/admin/src/`: reemplazar por `import { api } from '@solucorp/shared'` (default import → named import). Archivos afectados: `stores/auth-store.ts`, `stores/[otro store].ts`, `app/.../ReportPage.tsx`, y ~9 páginas adicionales.
- [x] 2.6 Ejecutar `tsc --noEmit` en `apps/admin` → debe quedar verde (sin errores de módulo no encontrado).
- [x] 2.7 En `apps/admin/src/stores/auth-store.ts`: eliminar la interfaz `User` inline; agregar `import { UserInfo, LoginResponse } from '@solucorp/shared'`; tipar `user: UserInfo | null` en el estado; tipar la llamada `api.post<LoginResponse>(...)`.
- [x] 2.8 En `apps/admin/src/stores/auth-store.ts`: mapear `data.enabledModules` desde el response y persistirlo con default `[]` si está ausente. **No** usar para gatear rutas ni componentes.
- [x] 2.9 En los ~11 sitios con `toLocaleString('es-PY')` dentro de `apps/admin/src/`: reemplazar por `formatDate` (sólo fecha), `formatDateTime` (fecha+hora) o `formatGuarani` (montos ₲), importados de `@solucorp/shared`. Archivos afectados: `MapView.tsx`, páginas de reportes (~6), `dashboard`, `team`, `orders` (formateo ₲).
- [x] 2.10 Ejecutar `tsc --noEmit` en `apps/admin` → verde.
- [x] 2.11 Ejecutar `next build` en `apps/admin` → sin errores de compilación ni transpilación.

---

## Phase 3: apps/client — adopción del paquete

> Los pasos son idénticos a Phase 2 — los archivos de `apps/client` son byte-identical a `apps/admin`.

- [x] 3.1 En `apps/client/package.json`: agregar `"@solucorp/shared": "*"` en `dependencies`.
- [x] 3.2 Ejecutar `npm install` desde la raíz (si no se ejecutó ya tras 2.1–2.2, correr de nuevo para sincronizar).
- [x] 3.3 En `apps/client/next.config.ts`: agregar `transpilePackages: ["@solucorp/shared"]`.
- [x] 3.4 Eliminar `apps/client/src/lib/api.ts`.
- [x] 3.5 En los ~12 sitios que hacen `import api from '@/lib/api'` dentro de `apps/client/src/`: reemplazar por `import { api } from '@solucorp/shared'`.
- [x] 3.6 Ejecutar `tsc --noEmit` en `apps/client` → verde.
- [x] 3.7 En `apps/client/src/stores/auth-store.ts`: eliminar `User` inline; importar `UserInfo`, `LoginResponse`; tipar `user: UserInfo | null`; tipar `api.post<LoginResponse>(...)`.
- [x] 3.8 En `apps/client/src/stores/auth-store.ts`: mapear `data.enabledModules` con default `[]`. **No** gatear rutas.
- [x] 3.9 En los ~11 sitios con `toLocaleString('es-PY')` dentro de `apps/client/src/`: reemplazar por `formatDate`/`formatDateTime`/`formatGuarani` de `@solucorp/shared`.
- [x] 3.10 Ejecutar `tsc --noEmit` en `apps/client` → verde.
- [x] 3.11 Ejecutar `next build` en `apps/client` → sin errores.

---

## Phase 4: Gate de verificación final (DoD)

- [x] 4.1 `grep -r "lib/api" apps/admin/src apps/client/src` → cero resultados.
- [x] 4.2 `grep -r "interface User" apps/admin/src/stores apps/client/src/stores` → cero resultados.
- [x] 4.3 `grep -r "toLocaleString" apps/admin/src apps/client/src` → cero resultados.
- [x] 4.4 `grep -r "X-Tenant-ID\|tenant_id" packages/shared/src` → cero resultados.
- [x] 4.5 Ejecutar suite e2e API (`npm run test:e2e` en `apps/api`) → verde (ningún test de auth/refresh/errores roto).
- [ ] 4.6 Confirmar que `apps/admin` y `apps/client` levantan en modo desarrollo sin errores de consola relacionados a módulos o tipos.
