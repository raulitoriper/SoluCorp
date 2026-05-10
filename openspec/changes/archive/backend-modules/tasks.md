# Tareas: Módulos de Servicio del Backend

## Fase 1: Schema Prisma + Migración
- [ ] 1.1 Agregar 11 modelos al schema.prisma (Visit, Order, OrderItem, GpsLocation, InventoryRecord, AttendanceEvent, GuardShift, MedicalVisit, MedicalVisitProduct, CourierDelivery, CourierItem, SyncQueueItem + enums)
- [ ] 1.2 Ejecutar migración y regenerar cliente

## Fase 2: Módulos Simples (1 tabla, sin items)
- [ ] 2.1 Módulo Visitas: DTO + Service + Controller + Module
- [ ] 2.2 Módulo Inventario: DTO + Service + Controller + Module
- [ ] 2.3 Módulo Asistencia: DTO + Service + Controller + Module
- [ ] 2.4 Módulo Guardia: DTO + Service + Controller + Module

## Fase 3: Módulos Complejos (con items/relaciones)
- [ ] 3.1 Módulo Pedidos: Order + OrderItem, cálculo de total
- [ ] 3.2 Módulo Visita Médica: MedicalVisit + MedicalVisitProduct
- [ ] 3.3 Módulo Courier: CourierDelivery + CourierItem

## Fase 4: GPS + Sync
- [ ] 4.1 Módulo GPS: endpoint batch (POST /api/gps/batch), consulta por usuario/fecha
- [ ] 4.2 Módulo Sync: procesar batch con idempotency, retornar estado por item

## Fase 5: Integración
- [ ] 5.1 Registrar los 9 módulos en app.module.ts
- [ ] 5.2 Verificar compilación y arranque del backend
- [ ] 5.3 Probar endpoints con curl (un POST + GET por módulo)
