# Archive Report: mobile-modules

**Fecha de archivado:** 2026-05-10
**Modo de cierre:** Backfill incompleto — solo proposal escrita, implementado sin spec/design/tasks formales.

## Resumen

La app móvil fue implementada en `apps/mobile` (Expo + expo-router) sin pasar por el flujo SDD completo. Solo se redactó la propuesta inicial.

## Estado verificado

### Pantallas presentes
- `app/(auth)/` — Login
- `app/(app)/attendance` — Asistencia
- `app/(app)/visit` — Visitas
- `app/(app)/order` — Pedidos
- `app/(app)/inventory` — Inventario
- `app/(app)/guard` — Guardia
- `app/(app)/medic-visit` — Visita Médica
- `app/(app)/courier` — Courier
- `app/(app)/metadata` — Metadata
- `src/screens/HomeScreen.tsx` — Menú con 9 módulos
- `src/screens/SettingsScreen.tsx` — Configuración

### Infraestructura offline (`apps/mobile/src/db`, `src/services`, `src/hooks`)
- ✅ SQLite con 2 tablas: `sync_queue` (con `idempotency_key UNIQUE`, `retry_count`, `max_retries=5`) y `gps_buffer`
- ✅ `sync-engine.ts` con `processQueue()` + `startSyncListener()` (NetInfo)
- ✅ `background-tracking.ts` con expo-location + TaskManager (batch a `/gps/batch`)
- ✅ Hook `useOfflineServiceMark` — POST con fallback a cola
- ✅ Store Zustand `sync-store` (isOnline, pendingCount, failedCount, sentCount)
- ✅ Componente `OfflineBanner`

## Deuda técnica detectada

### P2 — Mejoras de infra offline
- **Cleanup automático de items sincronizados**: `clearSent()` existe pero no se llama en cron. Crecimiento ilimitado de `sync_queue`.
- **Exponential backoff real**: solo incrementa `retry_count`, sin delay variable entre reintentos.
- **Validación local antes de encolar**: no hay schema validation, podés encolar payloads malformados.
- **Conflict resolution**: no hay estrategia documentada para offline prolongado (>100 items pendientes).
- **Logging**: sin trace de qué se intentó/falló — debugging difícil.
- **Tests**: 0 tests de la cola ni del sync-engine.

### P2 — Calidad
- **ESLint no configurado** en `apps/mobile`.
- **Prettier no configurado** en `apps/mobile`.

## Decisión

Se archiva con archive-report como única evidencia del cierre. La infra offline funciona y está mejor armada que el resto del proyecto — pero las mejoras P2 se atacan en cambios posteriores.

## Próximos cambios sugeridos

1. `mobile-sync-cleanup` — cron de cleanup + exponential backoff + validación local
2. `mobile-quality-tooling` — ESLint + Prettier + jest config
3. `mobile-sync-tests` — tests de la cola y del motor de sincronización
