# Propuesta: Módulos de Servicio del Backend

## Intención
Implementar las APIs REST para los 9 módulos de servicio del core de SoluCorp, replicando toda la funcionalidad del APK original con mejoras.

## Alcance

### Incluido
- Modelos Prisma para los 9 módulos (Visit, Order, GpsLocation, InventoryRecord, AttendanceEvent, GuardShift, MedicalVisit, CourierDelivery + tablas de items)
- Migración de BD
- Endpoints CRUD para cada módulo con aislamiento por tenant
- Guard de módulo (empresa debe tener el módulo habilitado)
- Endpoint batch para GPS tracking (recibir múltiples puntos)
- Cola de sincronización (SyncQueue) para soporte offline
- Dashboard endpoints: resumen diario por módulo

### Excluido
- Frontend de los módulos (cambio SDD separado)
- WebSocket para mapa en vivo (cambio SDD separado)
- Notificaciones push (cambio SDD separado)

## Capacidades

### Capacidades Nuevas
- `modulo-visitas`: Registro de visitas de campo con GPS
- `modulo-pedidos`: Registro de pedidos con items y precios
- `modulo-gps-tracking`: Rastreo GPS persistente en batch
- `modulo-inventario`: Registro de stock por depósito
- `modulo-asistencia`: Marcación de empleados P/B/L IN/OUT
- `modulo-guardia`: Marcación de guardias y rondas
- `modulo-visita-medica`: Visitas médicas con productos y notificaciones
- `modulo-courier`: Entregas con escaneo de paquetes
- `cola-sincronizacion`: Cola offline con idempotency

### Capacidades Modificadas
- Ninguna

## Enfoque
Agregar modelos al schema Prisma existente, crear un módulo NestJS por cada servicio. Cada controller usa JwtAuthGuard + ModuleGuard. El GPS tracking acepta batches de hasta 50 puntos.

## Riesgos

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Schema grande (muchas tablas) | Baja | Prisma maneja bien, índices optimizados |
| GPS tracking volumen alto | Media | Batch endpoint + índice en (companyId, userId, recordedAt) |

## Plan de Rollback
Revertir migración con `prisma migrate reset` y eliminar los módulos NestJS nuevos.

## Criterios de Éxito
- [ ] Backend compila con todos los módulos
- [ ] Cada módulo responde a POST/GET con datos correctos
- [ ] ModuleGuard bloquea módulos deshabilitados (403)
- [ ] GPS batch acepta array de puntos
- [ ] SyncQueue procesa items con idempotency
