# Diseño: Módulos de Servicio del Backend

## Enfoque Técnico
Agregar 9 tablas al schema Prisma + 1 tabla de sync queue. Crear un módulo NestJS por cada servicio siguiendo el patrón existente (Service + Controller + DTOs + Module). Cada controller usa JwtAuthGuard + ModuleGuard.

## Decisiones de Arquitectura

### Decisión: Patrón uniforme por módulo
**Elección**: Cada módulo tiene exactamente: create (POST), findAll (GET), findOne (GET/:id)
**Razón**: Consistencia. Los módulos de campo son append-only (no se editan visitas pasadas desde el campo).

### Decisión: GPS batch separado
**Elección**: Endpoint dedicado POST /api/gps/batch que acepta array de hasta 50 puntos
**Razón**: El tracking background genera muchos puntos. Un endpoint batch reduce requests.

### Decisión: SyncQueue con idempotency
**Elección**: Tabla SyncQueueItem con idempotencyKey único. El endpoint procesa y retorna resultado por item.
**Razón**: La app offline puede reenviar items. El key previene duplicados.

## Archivos a Crear

| Archivo | Descripción |
|---|---|
| `prisma/schema.prisma` | Agregar: Visit, Order+OrderItem, GpsLocation, InventoryRecord, AttendanceEvent, GuardShift, MedicalVisit+MedicalVisitProduct, CourierDelivery+CourierItem, SyncQueueItem |
| `src/modules/visits/` | Service, Controller, DTO, Module |
| `src/modules/orders/` | Service, Controller, DTO, Module |
| `src/modules/gps/` | Service, Controller, DTO, Module |
| `src/modules/inventory/` | Service, Controller, DTO, Module |
| `src/modules/attendance/` | Service, Controller, DTO, Module |
| `src/modules/guard/` | Service, Controller, DTO, Module |
| `src/modules/medical-visits/` | Service, Controller, DTO, Module |
| `src/modules/courier/` | Service, Controller, DTO, Module |
| `src/modules/sync/` | Service, Controller, DTO, Module |
| `src/app.module.ts` | Registrar los 9 módulos nuevos |
