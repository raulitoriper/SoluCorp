# Archive Report: storage-adapter

**Fecha**: 2026-06-13
**Change**: `storage-adapter` (2o slice del esfuerzo orphaned-packages-cleanup)
**Estado**: CERRADO Y ARCHIVADO — LISTO PARA SIGUIENTE SLICE

---

## Resumen Ejecutivo

El change `storage-adapter` ha sido completado, verificado (PASS con 0 CRITICAL) y archivado exitosamente. Implementó la abstracción de storage inyectable (`StorageAdapter`) en `packages/shared`, desbloqueando la adopción de `@solucorp/shared` en `apps/mobile` (slice siguiente: `shared-in-mobile`). La nueva capacidad `web-http-client` ha sido promovida a `openspec/specs/web-http-client/spec.md`.

---

## Qué se Envió

### Nuevos Archivos (change storage-adapter)
1. `packages/shared/src/api/storage-adapter.ts` — Interfaz `StorageAdapter` + `localStorageAdapter` con guard SSR por método
2. `packages/shared/src/api/storage-adapter.spec.ts` — Tests del adapter (async, mock localStorage)
3. `packages/shared/src/api/client.spec.ts` — Tests del cliente HTTP (interceptor async, 401-handler, SSR guard)

### Modificados (change storage-adapter)
1. `packages/shared/src/api/client.ts` — `createApiClient` ahora acepta `storage: StorageAdapter` como parámetro opcional; interceptor request async; 401-handler vía `storage.clearAuth()` en lugar de `localStorage.clear()`
2. `packages/shared/src/index.ts` — Exports nuevos: `StorageAdapter` (type) y `localStorageAdapter`

### Capacidad Nueva (promovida a specs)
1. `openspec/specs/web-http-client/spec.md` — Especificación del cliente HTTP compartido: inyección de adapter, lectura async del token, logout selectivo ante 401, seguridad SSR.

### Cambios de Comportamiento (Intencional, Aceptado)
- **401-handler**: de `localStorage.clear()` (borra TODO el storage) → `storage.clearAuth()` (borra SOLO claves de auth: `access_token`, `refresh_token`, `user`)
- Impacto: logout forzado deja de ser destructivo sobre datos no-auth

---

## Veredicto de Verificación

**PASS — READY FOR ARCHIVE** (2026-06-12)

| Dimensión | Resultado |
|-----------|-----------|
| Completitud de tareas | PASS: 5 fases × 3-11 subtareas = 24/24 ✓ |
| Suite de tests (@solucorp/shared) | PASS: 47/47 tests en verde |
| Type-check (tsc --noEmit) | PASS: packages/shared, apps/admin, apps/client |
| Next.js build | PASS: apps/admin (9 pages) + apps/client (16 pages) |
| Cobertura de escenarios spec | PASS: 12/12 escenarios cubiertos por tests |
| Token-leak check | PASS: 3/3 claves de auth cubiertas por clearAuth() |
| Backward-compat | PASS: consumidores (admin/client) sin cambios de imports |
| CRITICAL | 0 |
| WARNING | 1 |
| SUGGESTION | 1 |

---

## Hallazgos Llevados Adelante

### WARNING: auth-store.logout() usa localStorage.clear() (fuera de alcance)

**Severidad**: WARNING
**Ubicación**: `apps/admin/src/stores/auth-store.ts:42` y `apps/client/src/stores/auth-store.ts:42`
**Descripción**: El método `logout()` manual del auth-store sigue llamando `localStorage.clear()` (borra TODO el storage), mientras que el 401-handler del cliente HTTP (en este change) ahora usa `storage.clearAuth()` (borra SOLO claves de auth). Inconsistencia semántica.
**Impacto**: El logout manual es destructivo sobre datos no-auth; el logout forzado (401) es selectivo.
**Candidato para siguiente slice**: Unificar manual logout a `clearAuth()`, posiblemente junto con el slice `shared-in-mobile` que también toca auth-store.
**Razón de no-fix en este slice**: fuera del alcance declarado (design.md: "auth-store no se toca").

### SUGGESTION: Assertion explícita de no-acceso a localStorage con adapter custom

**Severidad**: SUGGESTION
**Descripción**: Los tests verifiquen que cuando se inyecta un `customAdapter` personalizado, `localStorage` NUNCA es accedido directamente. Hoy está cubierto funcionalmente (los tests usan adapter falso sin tocar localStorage), pero una assertion explícita sería defensa adicional.
**Esfuerzo**: Bajo (test adicional con spy)
**Impacto**: Nulo en este change; utile para futuro (p.ej. si alguien refactoriza el adapter).

---

## Notas sobre Delta Specs

**Delta spec procesada**: `openspec/changes/storage-adapter/specs/web-http-client/spec.md`

Esta spec es NUEVA (no es delta de una existente): define el contrato completo del cliente HTTP compartido con inyección de adapter, interceptor async, y logout selectivo ante 401.

**Acción realizada**: Copiada a `openspec/specs/web-http-client/spec.md` (creación de nueva spec en el main specs registry).

**Motivo**: La capacidad de "cliente HTTP compartido con abstracción de storage" no estaba cubierta en specs anteriores. Auth-multi-tenant (backend) y la instancia pre-construida `api` (web) eran implícitas. Este change hace explícito y testeable el contrato del cliente web.

---

## Integración Continua y Próximos Slices

### Slice Actual: storage-adapter (ARCHIVADO)
- Aislado a `packages/shared`
- Backward-compat: apps/admin y apps/client sin cambios de código
- Instancia `api` sigue exportada con default adapter (`localStorageAdapter`)
- Mobile adoption BLOQUEADA por esto: DESBLOQUEADA ✓

### Slice Siguiente: shared-in-mobile (UNDESBLOQUEADO)
Ahora es posible:
- Implementar `expoSecureStoreAdapter` en `packages/shared` (adapter mobile)
- Configurar Metro para resolver monorepo en `apps/mobile`
- Adoptar `@solucorp/shared` en `apps/mobile`, inyectando `expoSecureStoreAdapter`
- Apps/mobile podrá usar `createApiClient(baseURL, expoSecureStoreAdapter)` para autenticación tipo-segura con `expo-secure-store`

### Slices Pendientes (Roadmap del esfuerzo)
1. **shared-in-mobile** (UNDESBLOQUEADO por este change) — adopción de @solucorp/shared en mobile; expoSecureStoreAdapter.
2. **Unificar logout manual a clearAuth** (aprovechable en shared-in-mobile o slice separado) — fix el WARNING de auth-store.logout().
3. **ui-in-web-portals** (planeado) — adopción de packages/ui en portales; actualización de Tailwind.
4. Tailwind preset migration (planeado) — migración de estilos a preset centralizado.

---

## Artefactos Finales

### Archivado (movido a openspec/changes/archive/)
- `storage-adapter/explore.md`
- `storage-adapter/proposal.md`
- `storage-adapter/design.md`
- `storage-adapter/tasks.md`
- `storage-adapter/verify-report.md`
- `storage-adapter/specs/web-http-client/spec.md` (delta)
- `storage-adapter/archive-report.md` (este archivo)

### Promovido a Main Specs (openspec/specs/)
- `web-http-client/spec.md` — Nueva capacidad, ahora parte de la fuente de verdad

### Observaciones Engram (Topic Keys para Traceabilidad)
- `sdd/storage-adapter/explore` — Exploración inicial
- `sdd/storage-adapter/proposal` — Propuesta SDD
- `sdd/storage-adapter/spec` — Especificación de web-http-client (observación #36)
- `sdd/storage-adapter/design` — Diseño técnico (observación #37)
- `sdd/storage-adapter/tasks` — Plan de tareas y fases (observación #39)
- `sdd/storage-adapter/verify-report` — Reporte de verificación PASS (observación #44, recuperado)
- `sdd/storage-adapter/archive-report` — **Este archivo** (archivo local + engram)

---

## Ciclo SDD Completado

```
proposal ✓ → spec ✓ → design ✓ → tasks ✓ → apply ✓ → verify (PASS) ✓ → archive ✓
```

El change `storage-adapter` ha completado todas las fases del ciclo SDD:
- **Propuesta**: Desbloqueador de mobile (abstracción de storage)
- **Especificación**: web-http-client (contrato del cliente HTTP)
- **Diseño**: Estrategia B, interfaz mínima, SSR guard por método
- **Tareas**: 5 fases, 24 subtareas, todas completadas ✓
- **Implementación**: 3 archivos nuevos, 2 modificados, ~178 líneas
- **Verificación**: PASS (47/47 tests, 0 CRITICAL)
- **Archivo**: Promovido a main specs, carpeta archivada

**Próximo state**: Lanzar slice `shared-in-mobile`.

---

## Observación Final

Este es el 2o slice del esfuerzo `orphaned-packages-cleanup`. El slice anterior (`adopt-shared-packages`) adoptó `@solucorp/shared` en web (admin, client). Este slice (`storage-adapter`) preparó shared para mobile quitando el acoplamiento a localStorage. El siguiente slice (`shared-in-mobile`) completará la adopción en mobile usando un adapter secure-store.

El cambio de conducta del 401 (clear → clearAuth) es intencional y aceptado, mejorando la semántica de logout forzado. El WARNING del logout() manual es una inconsistencia futura a resolver.
