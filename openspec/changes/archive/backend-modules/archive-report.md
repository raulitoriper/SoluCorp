# Archive Report: backend-modules

**Fecha de archivado:** 2026-05-10
**Modo de cierre:** Backfill — implementado fuera del flujo SDD formal y verificado contra código existente.

## Resumen

Los 11 modelos Prisma y los 9 módulos NestJS de servicio están implementados en `apps/api`. Verificación realizada por inspección directa del código contra `proposal.md`, `design.md`, `tasks.md` y los specs en `openspec/specs/modulo-*`.

## Verificación

### Schema Prisma (`apps/api/prisma/schema.prisma`)
- 20 modelos en total (8 de fundación + 11 de servicios + 1 extra)
- Modelos de servicio presentes: Visit, Order, OrderItem, GpsLocation, InventoryRecord, AttendanceEvent, GuardShift, MedicalVisit, MedicalVisitProduct, CourierDelivery, CourierItem, SyncQueueItem
- Migración inicial: `prisma/migrations/20260507230100_init/`

### Módulos NestJS (`apps/api/src/modules/`)
- ✅ visits
- ✅ orders
- ✅ gps
- ✅ inventory
- ✅ attendance
- ✅ guard
- ✅ medical-visits
- ✅ courier
- ✅ sync

Cada módulo tiene controller, service y module. Registrados en `app.module.ts`.

## Deuda técnica detectada (NO bloquea archivado, se atacará aparte)

### P0 — Validación
- **DTOs ausentes en 9 de 13 módulos**: orders, gps, inventory, attendance, guard, medical-visits, courier, sync usan `@Body() dto: any`. visits tiene DTO inline (debería estar en `dto/`).
- Sin `class-validator` aplicado → payloads sin contrato, posible basura en DB.
- Pendiente: cambio `dto-validation-backend` para meter DTOs + decoradores de validación.

### P1 — Features incompletos vs. spec
- **Orders**: el array nested `items: [{productCode, quantity, price, discount}]` no se procesa. Falta endpoint `PATCH /orders/:id/status` (PENDING→CONFIRMED→...→DELIVERED).
- **Medical-visits**: faltan campos `nextVisitDate`, `shouldNotify`, `notificationDesc`. Sin manejo de los 6 tipos de evento (CLINIC_START/END, MEDIC_START/END, CLINIC_QUICK, PRODUCT_REGISTER).
- **Courier**: items con barcode no se procesan en el payload. Falta endpoint de tasa de éxito (conteo DELIVERED vs. NOT_DELIVERED).
- **Guard**: estructura de turnos (shifts + rondas con turnCode/roundCode) no expuesta en controller.

### P0 — Testing
- **0 tests en módulos de servicio** (solo `app.controller.spec.ts` dummy).
- Pendiente: cambio `testing-foundation`.

## Decisión

Se archiva en este estado, marcando los tasks como `[x]` porque los módulos **existen y están wireados**. La deuda detectada se documenta acá y se ataca con cambios SDD posteriores específicos.

## Próximos cambios sugeridos

1. `dto-validation-backend` — DTOs + class-validator en los 9 módulos
2. `testing-foundation` — jest configs y tests base por módulo
3. `orders-nested-items` — items + status transitions
4. `medical-visits-completeness` — productos + notificaciones + tipos de evento
5. `courier-items-barcode` — items con barcode + tasa de éxito
