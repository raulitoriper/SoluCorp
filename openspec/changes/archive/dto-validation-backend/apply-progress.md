# Apply Progress: dto-validation-backend

## Batches ejecutados

### Batch 1 (2026-05-14) — Fase 0: Mobile audit
- Tasks completadas: 0.1, 0.2, 0.3, 0.4
- Artefactos generados: mobile-audit.md
- Estado: LIMPIO
- Discrepancias detectadas: 0
- Próximo batch sugerido: Fase 1 (inventory)

### Batch 2 (2026-05-14) — Fases 1-3: módulos P0 (refactor de spread)
- Tasks completadas: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4
- Archivos creados: 3 DTOs (create-inventory.dto.ts, create-attendance.dto.ts, create-guard-shift.dto.ts)
- Archivos modificados: inventory.controller.ts, inventory.service.ts, attendance.controller.ts, attendance.service.ts, guard.controller.ts, guard.service.ts
- Verificación: tsc --noEmit OK (sin errores), cero "dto: any", cero spreads "...data"
- Próximo batch sugerido: Fase 4 (sync) — cierra bug 500→400

### Batch 3 (2026-05-14) — Fases 4, 8, 9, 10: módulos mecánicos
- Tasks completadas: 4.1, 4.2, 4.3, 4.4, 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 10.1, 10.2, 10.3, 10.4
- Archivos creados: 4 DTOs (sync-batch.dto.ts, create-gps-batch.dto.ts, create-visit.dto.ts, metadata-item.dto.ts)
- Archivos modificados: sync.controller.ts, sync.service.ts, gps.controller.ts, gps.service.ts, visits.controller.ts, visits.service.ts, metadata.controller.ts, metadata.service.ts
- Decisión tomada: UpdateMetadataItemDto requiere `value` (no opcional) — PATCH vacío sería no-op, no un feature
- Mejora aplicada: visits — se reemplazó `@IsEnum(['START','END','QUICK'])` con literales por `@IsEnum(VisitEventType)` desde `@prisma/client`; lat/lng mejorados con `@Type(() => Number) + @Min/@Max` consistentes con el patrón de inventory
- Fix de tipos: `Record<string, unknown>` → cast `as Prisma.InputJsonValue` en metadata.service y sync.service para compatibilidad con Prisma JSON fields
- Verificación: tsc --noEmit OK (sin errores), cero "dto: any", cero `@Body('points')` y `@Body('items')` en módulos afectados, cero clase `CreateVisitDto` inline en visits.controller
- Próximo batch sugerido: Fases 5-7 (orders, medical-visits, courier — anidados)

### Batch 4 (2026-05-14) — Fases 5-7: módulos con arrays anidados
- Tasks completadas: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3
- Archivos creados: 3 DTOs anidados (create-order.dto.ts, create-medical-visit.dto.ts, create-courier.dto.ts)
- Archivos modificados: orders.controller.ts, orders.service.ts, medical-visits.controller.ts, medical-visits.service.ts, courier.controller.ts, courier.service.ts
- Cambio notable: PATCH /orders/:id/status pasó de `@Body('status') status: string` a `@Body() dto: UpdateOrderStatusDto` con `@IsEnum(OrderStatus)`; el cast `status as any` en el service fue eliminado, ahora usa el tipo correcto
- Verificación: tsc --noEmit OK (sin errores), cero `dto: any` en los 3 módulos, cero `@Body('status')` en orders, cálculo de `totalAmountGs` preservado en orders.service.ts
- Próximo batch sugerido: Fase 11 (activar forbidNonWhitelisted en main.ts) + Fase 12 (verificación final)

### Batch 5 (2026-05-14) — Fases 11-12: flag estricto + verificación final
- Tasks completadas: 11.1, 11.2, 12.1, 12.2, 12.3
- Tasks pendientes: 11.3, 11.4 (curl con server up — usuario verifica manualmente), 12.4 (smoke test manual — flags en main.ts OK, curl requiere server up)
- Archivos modificados: apps/api/src/main.ts (ValidationPipe estricto: forbidNonWhitelisted: true, enableImplicitConversion: false)
- Verificación: tsc --noEmit OK (sin errores), cero "dto: any" en src/modules, cero spreads en inventory/attendance/guard, CreateVisitDto ya no está inline en visits.controller, los 10 módulos tienen carpeta dto/
- ESLint: FAIL pre-existente — errores de prettier/prettier (formateo) y @typescript-eslint/no-unsafe-member-access en filtros @Query() de varios módulos; NO son regresiones del batch actual
- Estado del cambio: PARTIAL — listo para archive una vez que el usuario ejecute smoke tests con server up (11.3, 11.4, 12.4)
- Bloqueador para activar en producción: usuario debe correr curl smoke test contra server up (campos extra → 400, happy path → 201)

## Estado por fase
- [x] Fase 0 (mobile audit)
- [x] Fase 1 (inventory)
- [x] Fase 2 (attendance)
- [x] Fase 3 (guard)
- [x] Fase 4 (sync)
- [x] Fase 5 (orders)
- [x] Fase 6 (medical-visits)
- [x] Fase 7 (courier)
- [x] Fase 8 (gps)
- [x] Fase 9 (visits)
- [x] Fase 10 (metadata)
- [~] Fase 11 (flag estricto — 11.1 y 11.2 OK; 11.3 y 11.4 pendientes: curl con server up)
- [~] Fase 12 (verificación final — 12.1, 12.2, 12.3 OK; 12.4 pendiente: smoke test con server up)
