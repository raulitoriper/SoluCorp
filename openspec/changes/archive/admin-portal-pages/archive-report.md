# Archive Report: admin-portal-pages

**Fecha de archivado:** 2026-05-10
**Modo de cierre:** Backfill incompleto — solo proposal escrita, implementado sin spec/design/tasks formales.

## Resumen

El portal admin fue implementado en `apps/admin` sin pasar por el flujo SDD completo. Solo se redactó la propuesta inicial. Specs, design y tasks no se llegaron a escribir.

## Estado verificado

### Páginas presentes (`apps/admin/src/app/`)
- ✅ `/login`
- ✅ `/dashboard` — stats de empresas/usuarios/trials
- ✅ `/clients` — listado con filtros + búsqueda
- ✅ `/clients/new` — wizard 3 pasos (empresa + admin + módulos)
- ✅ `/clients/[id]` — esqueleto (sin tabs reales)
- ✅ `/users`
- ✅ `/settings`
- ✅ `/monitoring` — UI con Leaflet pero sin datos (falta endpoint backend)

## Deuda técnica detectada

### P1 — Funcionalidad incompleta
- **`/monitoring`**: la página renderiza pero `loadPositions` devuelve `[]`. Comentario en código: "Para monitoreo global necesitaríamos un endpoint admin específico". Falta endpoint backend `GET /api/admin/gps/positions`.
- **`/clients/[id]`**: placeholder sin tabs (info / suscripción / módulos / usuarios).

### P2 — Proceso
- Spec, design y tasks nunca se escribieron. Si en el futuro se quieren cambios mayores sobre este portal, conviene formalizar primero las specs de cada página.

## Decisión

Se archiva con archive-report como única evidencia del cierre. No se fabrican specs retroactivos porque sería deuda peor (specs inventados a partir del código no aportan valor real).

## Próximos cambios sugeridos

1. `admin-monitoring-endpoint` — endpoint backend para posiciones GPS globales + integración con el mapa
2. `admin-client-detail-tabs` — completar `/clients/[id]` con tabs reales
