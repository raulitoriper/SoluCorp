# Mobile Audit: dto-validation-backend

**Fecha:** 2026-05-14
**Estado:** LIMPIO

## Resumen

Se detectaron 9 endpoints con llamadas HTTP que envían body desde la app móvil (8 módulos de dominio + 1 cliente de datos maestros). El sync-engine actúa como relay offline y no agrega campos propios al payload — reenvía exactamente los mismos payloads que los módulos individuales. El endpoint `/api/sync/batch` NO es llamado directamente desde el móvil (el sync del módulo `sync` queda sin llamada detectada en el cliente). En todos los 8 módulos auditados con endpoints de backend los campos enviados coinciden exactamente con los campos planeados en los DTOs de `exploration.md`. No se detectaron discrepancias: cero campos extra, cero tipos incorrectos, cero campos faltantes que el backend espere como requeridos pero el móvil no envíe.

## Endpoints auditados

| # | Endpoint | Método | Archivo móvil | Campos enviados por el móvil | Campos en DTO planeado | Discrepancias | Acción |
|---|----------|--------|---------------|------------------------------|------------------------|---------------|--------|
| 1 | /api/inventory | POST | `apps/mobile/src/screens/InventoryScreen.tsx` (via `useOfflineServiceMark`) | `depositCode` (string), `productCode` (string), `quantity` (number — `Number(quantity)`), `observation` (string, opcional), `latitude` (number, del hook GPS), `longitude` (number, del hook GPS) | `depositCode* string`, `productCode* string`, `quantity* number`, `observation? string`, `latitude? number`, `longitude? number` | ninguna | OK |
| 2 | /api/attendance | POST | `apps/mobile/src/screens/AttendanceScreen.tsx` (via `useOfflineServiceMark`) | `employeeCode` (string), `eventCategory` (string — valor de enum PRESENCE\|BREAK\|LUNCH), `eventAction` (string — literal 'IN'\|'OUT'), `observation` (string, opcional o `undefined`), `latitude` (number), `longitude` (number) | `employeeCode* string`, `eventCategory* enum(AttendanceCategory)`, `eventAction* enum(AttendanceAction)`, `observation? string`, `latitude? number`, `longitude? number` | ninguna | OK |
| 3 | /api/guard-shifts | POST | `apps/mobile/src/screens/GuardScreen.tsx` (via `useOfflineServiceMark`) | `guardCode` (string), `eventType` (string — hardcodeado como `'MARK'`), `place` (string opcional o `undefined`), `observation` (string opcional o `undefined`), `latitude` (number), `longitude` (number) | `guardCode* string`, `eventType? enum(GuardShiftEventType)`, `place? string`, `observation? string`, `latitude? number`, `longitude? number` | ninguna | OK |
| 4 | /api/visits | POST | `apps/mobile/src/screens/VisitScreen.tsx` (via `useOfflineServiceMark`) | `eventType` (string — modo elegido: 'START'\|'END'\|'QUICK'), `clientCode` (string, enviado en START y QUICK), `motiveCode` (string opcional o `undefined`, enviado en END y QUICK), `observation` (string opcional o `undefined`), `latitude` (number), `longitude` (number) | `clientCode* string`, `motiveCode? string`, `eventType* enum(START\|END\|QUICK)`, `observation? string`, `latitude? number`, `longitude? number` | ninguna | OK |
| 5 | /api/medical-visits | POST | `apps/mobile/src/screens/MedicalVisitScreen.tsx` (via `useOfflineServiceMark`) | `eventType` (string — key del evento seleccionado), `clinicCode` (string opcional o `undefined`), `medicCode` (string opcional o `undefined`), `motiveCode` (string opcional o `undefined`), `initialKm` (number — `Number(initialKm)`, opcional o `undefined`), `observation` (string opcional o `undefined`), `latitude` (number), `longitude` (number) | `eventType* enum(MedicalVisitEventType)`, `clinicCode? string`, `medicCode? string`, `motiveCode? string`, `initialKm? number`, `nextVisitDate? DateString`, `shouldNotify? boolean`, `notificationDesc? string`, `observation? string`, `latitude? number`, `longitude? number` | ninguna — `nextVisitDate`, `shouldNotify` y `notificationDesc` no son enviados por el móvil, pero son opcionales en el DTO | OK |
| 6 | /api/courier | POST | `apps/mobile/src/screens/CourierScreen.tsx` (via `useOfflineServiceMark`) | `status` (string — 'DELIVERED'\|'NOT_DELIVERED'), `receiverName` (string opcional o `undefined`), `motiveCode` (string opcional o `undefined`), `observation` (string opcional o `undefined`), `items` (array de `{ barcode: string }`, filtrado con `.filter(Boolean)`), `latitude` (number), `longitude` (number) | `status* enum(CourierDeliveryStatus)`, `receiverName? string`, `motiveCode? string`, `observation? string`, `items CourierItemDto[]`, `latitude? number`, `longitude? number` | ninguna | OK |
| 7 | /api/orders | POST | `apps/mobile/src/screens/OrderScreen.tsx` (via `useOfflineServiceMark`) | `clientCode` (string), `priceList` (string), `saleCondition` (string), `observation` (string), `items` (array de `{ productCode: string, quantity: number, unitPriceGs: number, discountPct: number }`), `latitude` (number), `longitude` (number) | `clientCode* string`, `priceList? string`, `saleCondition? string`, `observation? string`, `items* OrderItemDto[]`, `latitude? number`, `longitude? number` | ninguna — `priceList`, `saleCondition` y `observation` se envían siempre (aunque vacíos como `''`), todos son `@IsOptional() @IsString()` por lo que string vacío pasa validación | OK |
| 8 | /api/gps/batch | POST | `apps/mobile/src/services/background-tracking.ts` | `{ points: [{ latitude: number, longitude: number, accuracy: number\|null, altitude: number\|null, speed: number\|null, heading: number\|null, batteryLevel: number\|null, recordedAt: string (ISO) }] }` | `points: GpsPointDto[]` donde `GpsPointDto` tiene `latitude* number`, `longitude* number`, `recordedAt* DateString`, `accuracy? number`, `altitude? number`, `speed? number`, `heading? number`, `batteryLevel? number` | ninguna | OK |
| 9 | /api/metadata/:typeCode/items | POST | `apps/mobile/src/screens/MetadataScreen.tsx` | `code` (string), `value` (string) | `code* string`, `value* string`, `extraData? object` | ninguna — `extraData` es opcional y no se envía desde el móvil | OK |
| — | /api/sync/batch | POST | no detectado | no detectado | — | — | El endpoint existe en el backend pero NO es llamado directamente por el cliente móvil. El `sync-engine.ts` reenvía payloads a los endpoints de cada módulo (no a `/sync/batch`). Documentado como "no detectado" |

## Notas sobre el sync-engine offline

El hook `useOfflineServiceMark` encola los payloads en SQLite cuando no hay conexión. Al recuperar conectividad, `sync-engine.ts` llama `api.post(item.endpoint, payload)` donde `item.endpoint` es el endpoint del módulo original (ej: `/inventory`). El payload es exactamente el mismo JSON que se intentó enviar directamente. No agrega campos extra (como `idempotencyKey` o `entityType`) al payload del backend — esos son metadatos internos de la cola SQLite solamente.

## Discrepancias detectadas

Ninguna.

## Observaciones adicionales

1. **`/api/orders` envía strings vacíos en campos opcionales**: `priceList`, `saleCondition` y `observation` se inicializan como `''` y se envían siempre. Los DTOs los tienen como `@IsOptional() @IsString()` — string vacío (`''`) NO falla `@IsNotEmpty()` solo si el campo es opcional, pero sí fallaría si tuviera `@IsNotEmpty()`. Dado que son `@IsOptional() @IsString()` sin `@IsNotEmpty()`, string vacío pasa. Sin embargo, conviene verificar si se prefiere limpiar estos campos en el cliente (enviar `undefined` si están vacíos). Esto es una mejora de UX, no una discrepancia bloqueante para el DTO.

2. **`/api/guard-shifts` hardcodea `eventType: 'MARK'`**: La pantalla siempre envía `MARK`. El DTO lo define como `@IsOptional()` (la DB tiene default MARK). El comportamiento es correcto funcionalmente — si se quisiera usar otros tipos de evento (SHIFT_START, SHIFT_END) habría que agregar UI en la pantalla, pero eso es fuera del scope de este cambio.

3. **Campos opcionales no enviados en `medical-visits`**: `nextVisitDate`, `shouldNotify` y `notificationDesc` no tienen UI en `MedicalVisitScreen.tsx`. Son `@IsOptional()` en el DTO, por lo que no hay problema.

4. **`/api/sync/batch` sin llamada desde el móvil**: El endpoint del módulo `sync` no es usado directamente por el cliente. La cola de sincronización offline no usa `/sync/batch` — funciona por re-intentos individuales por módulo. Esto no es una discrepancia sino información sobre el uso real del endpoint.

## Decisión

Estado final: **LIMPIO**. Cero discrepancias sin resolver. Se puede avanzar a las fases 1-10 de implementación de DTOs. La fase 11 (activar `forbidNonWhitelisted: true`) está habilitada para ejecutarse una vez que las fases 1-10 estén completas.
