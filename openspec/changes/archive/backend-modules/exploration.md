## Exploración: backend-modules

### Estado Actual
El monorepo tiene el backend NestJS funcionando con auth JWT multi-tenant, CRUD de empresas, usuarios y metadata. Faltan los 9 módulos de servicio que son el core de la app (decompilados del APK original).

### Módulos a Implementar (del análisis del APK)

| # | Módulo | Código Original | Eventos | Datos Clave |
|---|---|---|---|---|
| 1 | Visitas | 1 | START, END, QUICK | clientCode, motiveCode, observation, GPS |
| 2 | Pedidos | 2 | REGISTER | clientCode, priceList, saleCondition, items[] (productCode, qty, price, discount) |
| 3 | Rastreo GPS | 4 | REGISTER | lat, lng, accuracy, speed, battery, timestamp (batch) |
| 4 | Inventario | 10 | REGISTER | depositCode, productCode, quantity |
| 5 | Asistencia | 11 | PI/PF, BI/BF, LI/LF | employeeCode, category (P/B/L), action (IN/OUT) |
| 6 | Guardia | 6+15 | REGISTER | guardCode, place, observation, GPS |
| 7 | Visita Médica | 17 | CS, CE, MS, ME, CQ, PR | clinicCode, medicCode, motiveCode, products[], nextVisit, notification |
| 8 | Courier | 18 | DELIVERED, NOT_DELIVERED | receiverName, motiveCode, barcodes[], observation |
| 9 | Cola Sync | - | - | Queue offline: entityType, payload, status, retries, idempotencyKey |

### Enfoque
Todos los módulos siguen un patrón similar:
1. DTO de entrada con validación
2. Service con lógica + aislamiento por companyId
3. Controller con guards (JwtAuth + Module)
4. Cada acción guarda GPS (lat/lng) del dispositivo

### Recomendación
Implementar en orden de complejidad: simples primero (Inventario, Guardia, Asistencia), luego complejos (Pedidos, Visita Médica, Courier), y finalmente el GPS tracking batch + cola de sincronización.

### ¿Listo para Propuesta?
Sí.
