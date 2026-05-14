# Mobile Audit: dto-validation-backend

**Fecha:** 2026-05-14
**Estado:** LIMPIO

## Resumen

Se detectaron 9 endpoints con llamadas HTTP que envían body desde la app móvil (8 módulos de dominio + 1 cliente de datos maestros). El sync-engine actúa como relay offline y no agrega campos propios al payload — reenvía exactamente los mismos payloads que los módulos individuales. El endpoint `/api/sync/batch` NO es llamado directamente desde el móvil (el sync del módulo `sync` queda sin llamada detectada en el cliente). En todos los 8 módulos auditados con endpoints de backend los campos enviados coinciden exactamente con los campos planeados en los DTOs de `exploration.md`. No se detectaron discrepancias: cero campos extra, cero tipos incorrectos, cero campos faltantes que el backend espere como requeridos pero el móvil no envíe.

## Endpoints auditados

| # | Endpoint | Método | Archivo móvil | Campos enviados por el móvil | Campos en DTO planeado | Discrepancias | Acción |
|---|----------|--------|---------------|------------------------------|------------------------|---------------|--------|
| 1 | /api/inventory | POST | `apps/mobile/src/screens/InventoryScreen.tsx` | `depositCode` (string), `productCode` (string), `quantity` (number), `observation` (string, opcional), `latitude` (number), `longitude` (number) | `depositCode* string`, `productCode* string`, `quantity* number`, `observation? string`, `latitude? number`, `longitude? number` | ninguna | OK |
| 2 | /api/attendance | POST | `apps/mobile/src/screens/AttendanceScreen.tsx` | `employeeCode` (string), `eventCategory` (string), `eventAction` (string), `observation` (string, opcional), `latitude` (number), `longitude` (number) | `employeeCode* string`, `eventCategory* enum`, `eventAction* enum`, `observation? string`, `latitude? number`, `longitude? number` | ninguna | OK |
| 3 | /api/guard-shifts | POST | `apps/mobile/src/screens/GuardScreen.tsx` | `guardCode` (string), `eventType` (string), `place` (string opcional), `observation` (string opcional), `latitude` (number), `longitude` (number) | `guardCode* string`, `eventType? enum`, `place? string`, `observation? string`, `latitude? number`, `longitude? number` | ninguna | OK |
| 4 | /api/visits | POST | `apps/mobile/src/screens/VisitScreen.tsx` | `eventType` (string), `clientCode` (string), `motiveCode` (string opcional), `observation` (string opcional), `latitude` (number), `longitude` (number) | `clientCode* string`, `motiveCode? string`, `eventType* enum`, `observation? string`, `latitude? number`, `longitude? number` | ninguna | OK |
| 5 | /api/medical-visits | POST | `apps/mobile/src/screens/MedicalVisitScreen.tsx` | `eventType` (string), `clinicCode` (string opcional), `medicCode` (string opcional), `motiveCode` (string opcional), `initialKm` (number opcional), `observation` (string opcional), `latitude` (number), `longitude` (number) | `eventType* enum`, `clinicCode? string`, `medicCode? string`, `motiveCode? string`, `initialKm? number`, `nextVisitDate? DateString`, `shouldNotify? boolean`, `notificationDesc? string`, `observation? string`, `latitude? number`, `longitude? number` | ninguna | OK |
| 6 | /api/courier | POST | `apps/mobile/src/screens/CourierScreen.tsx` | `status` (string), `receiverName` (string opcional), `motiveCode` (string opcional), `observation` (string opcional), `items` (array), `latitude` (number), `longitude` (number) | `status* enum`, `receiverName? string`, `motiveCode? string`, `observation? string`, `items CourierItemDto[]`, `latitude? number`, `longitude? number` | ninguna | OK |
| 7 | /api/orders | POST | `apps/mobile/src/screens/OrderScreen.tsx` | `clientCode` (string), `priceList` (string), `saleCondition` (string), `observation` (string), `items` (array), `latitude` (number), `longitude` (number) | `clientCode* string`, `priceList? string`, `saleCondition? string`, `observation? string`, `items* OrderItemDto[]`, `latitude? number`, `longitude? number` | ninguna | OK |
| 8 | /api/gps/batch | POST | `apps/mobile/src/services/background-tracking.ts` | `{ points: [{ latitude: number, longitude: number, accuracy: number, altitude: number, speed: number, heading: number, batteryLevel: number, recordedAt: string }] }` | `points: GpsPointDto[]` | ninguna | OK |
| 9 | /api/metadata/:typeCode/items | POST | `apps/mobile/src/screens/MetadataScreen.tsx` | `code` (string), `value` (string) | `code* string`, `value* string`, `extraData? object` | ninguna | OK |
| — | /api/sync/batch | POST | no detectado | no detectado | — | — | El endpoint existe en el backend pero NO es llamado directamente por el cliente móvil |

## Notas sobre el sync-engine offline

El hook `useOfflineServiceMark` encola los payloads en SQLite cuando no hay conexión. Al recuperar conectividad, `sync-engine.ts` llama `api.post(item.endpoint, payload)` donde `item.endpoint` es el endpoint del módulo original (ej: `/inventory`). El payload es exactamente el mismo JSON que se intentó enviar directamente. No agrega campos extra.

## Discrepancias detectadas

Ninguna.

## Observaciones adicionales

1. **`/api/orders` envía strings vacíos en campos opcionales**: `priceList`, `saleCondition` y `observation` se inicializan como `''` y se envían siempre. Los DTOs los tienen como `@IsOptional() @IsString()` — string vacío (`''`) NO falla `@IsNotEmpty()` solo si el campo es opcional. Sin embargo, conviene verificar si se prefiere limpiar estos campos en el cliente.

2. **`/api/guard-shifts` hardcodea `eventType: 'MARK'`**: La pantalla siempre envía `MARK`. El DTO lo define como `@IsOptional()` (la DB tiene default MARK). El comportamiento es correcto funcionalmente.

3. **Campos opcionales no enviados en `medical-visits`**: `nextVisitDate`, `shouldNotify` y `notificationDesc` no tienen UI en `MedicalVisitScreen.tsx`. Son `@IsOptional()` en el DTO, por lo que no hay problema.

4. **`/api/sync/batch` sin llamada desde el móvil**: El endpoint del módulo `sync` no es usado directamente por el cliente. La cola de sincronización offline no usa `/sync/batch`.

## Decisión

Estado final: **LIMPIO**. Cero discrepancias sin resolver. Se puede avanzar a las fases 1-10 de implementación de DTOs. La fase 11 (activar `forbidNonWhitelisted: true`) está habilitada para ejecutarse una vez que las fases 1-10 estén completas.
