# Tareas: dto-validation-backend

> Normalización de DTOs con class-validator en los 10 módulos sin contrato de entrada.
> Orden: mobile audit (bloqueante para fase 11) → módulos P0 → módulos con anidado → mecánicos → flag estricto → verificación final.

---

## Fase 0: Mobile audit (BLOQUEANTE para fase 11)

- [ ] 0.1 Ejecutar `rg "(post|patch|put|delete)\s*\(" apps/mobile/src/ -i` y `rg "fetch\(" apps/mobile/src/` para listar todas las llamadas HTTP que envían body; por cada llamada registrar endpoint, método HTTP y campos del payload enviado.
- [ ] 0.2 Comparar campo a campo los payloads del móvil contra los campos definidos en exploration.md: detectar campos que el móvil envía y no están en el DTO, campos enviados como string en vez de number, y campos extra no contemplados.
- [ ] 0.3 Crear `openspec/changes/dto-validation-backend/mobile-audit.md` con tabla `| Endpoint | Método | Campos enviados | Campos en DTO | Discrepancias | Acción |`; resolver cada discrepancia (agregar `@IsOptional()` al campo si el móvil lo envía, o documentar limpieza de cliente).
- [ ] 0.4 Marcar `mobile-audit.md` como **LIMPIO** (cero discrepancias sin resolver) — requisito bloqueante antes de avanzar a la fase 11.

---

## Fase 1: Módulo inventory (P0 — spread directo, inyección de tenant)

- [ ] 1.1 Crear `apps/api/src/modules/inventory/dto/create-inventory.dto.ts` con `CreateInventoryDto` (campos: `depositCode` y `productCode` con `@IsString() @IsNotEmpty()`; `quantity` con `@Type(() => Number) @IsNumber({ maxDecimalPlaces: 4 })`; `observation` con `@IsOptional() @IsString()`; `latitude` con `@IsOptional() @Type(() => Number) @IsNumber() @Min(-90) @Max(90)`; `longitude` con `@IsOptional() @Type(() => Number) @IsNumber() @Min(-180) @Max(180)`).
- [ ] 1.2 Actualizar `apps/api/src/modules/inventory/inventory.controller.ts`: cambiar `@Body() dto: any` por `@Body() dto: CreateInventoryDto` e importar el DTO.
- [ ] 1.3 Refactorizar `apps/api/src/modules/inventory/inventory.service.ts`: tipar el parámetro `create` como `CreateInventoryDto` y reemplazar `{ companyId, userId, ...data }` por campos explícitos (`depositCode: dto.depositCode`, `productCode: dto.productCode`, `quantity: dto.quantity`, `observation: dto.observation`, `latitude: dto.latitude`, `longitude: dto.longitude`).
- [ ] 1.4 Verificar con curl: `POST /api/inventory` con body `{"depositCode":"DEP01","productCode":"PROD-001","quantity":5.5}` → 201; `POST /api/inventory` sin `depositCode` → 400.

---

## Fase 2: Módulo attendance (P0 — spread directo, inyección de tenant)

- [ ] 2.1 Crear `apps/api/src/modules/attendance/dto/create-attendance.dto.ts` con `CreateAttendanceDto` (campos: `employeeCode` con `@IsString() @IsNotEmpty()`; `eventCategory` con `@IsEnum(AttendanceCategory)` importado desde `@prisma/client`; `eventAction` con `@IsEnum(AttendanceAction)` importado desde `@prisma/client`; `observation` con `@IsOptional() @IsString()`; `latitude`/`longitude` con `@IsOptional() @Type(() => Number) @IsNumber() @Min/@Max` geográficos).
- [ ] 2.2 Actualizar `apps/api/src/modules/attendance/attendance.controller.ts`: cambiar `@Body() dto: any` por `@Body() dto: CreateAttendanceDto` e importar el DTO.
- [ ] 2.3 Refactorizar `apps/api/src/modules/attendance/attendance.service.ts`: tipar el parámetro `create` como `CreateAttendanceDto` y reemplazar `{ companyId, userId, ...data }` por campos explícitos (`employeeCode: dto.employeeCode`, `eventCategory: dto.eventCategory`, `eventAction: dto.eventAction`, `observation: dto.observation`, `latitude: dto.latitude`, `longitude: dto.longitude`).
- [ ] 2.4 Verificar con curl: `POST /api/attendance` con body `{"employeeCode":"EMP-001","eventCategory":"PRESENCE","eventAction":"IN"}` → 201; `POST /api/attendance` con `"eventCategory":"VACATION"` → 400.

---

## Fase 3: Módulo guard (P0 — spread directo, inyección de tenant)

- [ ] 3.1 Crear `apps/api/src/modules/guard/dto/create-guard-shift.dto.ts` con `CreateGuardShiftDto` (campos: `guardCode` con `@IsString() @IsNotEmpty()`; `eventType` con `@IsOptional() @IsEnum(GuardShiftEventType)` importado desde `@prisma/client` — es opcional porque la DB tiene default `MARK`; `place` y `observation` con `@IsOptional() @IsString()`; `latitude`/`longitude` con `@IsOptional() @Type(() => Number) @IsNumber() @Min/@Max` geográficos).
- [ ] 3.2 Actualizar `apps/api/src/modules/guard/guard.controller.ts`: cambiar `@Body() dto: any` por `@Body() dto: CreateGuardShiftDto` e importar el DTO.
- [ ] 3.3 Refactorizar `apps/api/src/modules/guard/guard.service.ts`: tipar el parámetro `create` como `CreateGuardShiftDto` y reemplazar `{ companyId, userId, ...data }` por campos explícitos (`guardCode: dto.guardCode`, `eventType: dto.eventType`, `place: dto.place`, `observation: dto.observation`, `latitude: dto.latitude`, `longitude: dto.longitude`).
- [ ] 3.4 Verificar con curl: `POST /api/guard-shifts` con body `{"guardCode":"GRD-001","eventType":"SHIFT_START","place":"Entrada principal"}` → 201; `POST /api/guard-shifts` con `{"guardCode":"GRD-001"}` → 201 con `eventType="MARK"` en respuesta; `POST /api/guard-shifts` con `"eventType":"BREAK"` → 400.

---

## Fase 4: Módulo sync (cierra bug 500 → 400)

- [ ] 4.1 Crear `apps/api/src/modules/sync/dto/sync-batch.dto.ts` con `SyncItemDto` (campos: `entityType` y `idempotencyKey` con `@IsString() @IsNotEmpty()`; `payload` con `@IsObject()`) y `SyncBatchDto` (campo: `items` con `@IsArray() @ValidateNested({ each: true }) @Type(() => SyncItemDto)`).
- [ ] 4.2 Actualizar `apps/api/src/modules/sync/sync.controller.ts`: cambiar `@Body('items') items: any[]` por `@Body() dto: SyncBatchDto` y leer `dto.items` en el body del método.
- [ ] 4.3 Actualizar `apps/api/src/modules/sync/sync.service.ts`: tipar el parámetro del batch como `SyncItemDto[]` (reemplazar `any[]`).
- [ ] 4.4 Verificar con curl: `POST /api/sync/batch` con item donde `idempotencyKey` es string vacío → 400 (no 500); con item sin `idempotencyKey` → 400; con `{"items":[{"entityType":"inventory","idempotencyKey":"uuid-abc-123","payload":{"cualquierCampo":true}}]}` → 200.

---

## Fase 5: Módulo orders (anidado — patrón base)

- [ ] 5.1 Crear `apps/api/src/modules/orders/dto/create-order.dto.ts` con tres clases en el mismo archivo: `OrderItemDto` (campos: `productCode` con `@IsString() @IsNotEmpty()`; `quantity` con `@Type(() => Number) @IsNumber({ maxDecimalPlaces: 4 })`; `unitPriceGs` con `@IsOptional() @Type(() => Number) @IsInt()`; `discountPct` con `@IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 })`), `CreateOrderDto` (campos: `clientCode` con `@IsString() @IsNotEmpty()`; `priceList`, `saleCondition`, `observation` con `@IsOptional() @IsString()`; `latitude`/`longitude` con `@IsOptional() @Type(() => Number) @IsNumber() @Min/@Max` geográficos; `items` con `@IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => OrderItemDto)`), y `UpdateOrderStatusDto` (campo: `status` con `@IsEnum(OrderStatus)` importado desde `@prisma/client`).
- [ ] 5.2 Actualizar `apps/api/src/modules/orders/orders.controller.ts`: tipar `@Body() dto: CreateOrderDto` en el POST y `@Body() dto: UpdateOrderStatusDto` en el PATCH `/status`.
- [ ] 5.3 Actualizar `apps/api/src/modules/orders/orders.service.ts`: tipar los parámetros de `create` y `updateStatus` con los DTOs correspondientes (reemplazar `any`).
- [ ] 5.4 Verificar con curl: `POST /api/orders` con body `{"clientCode":"CLI-001","items":[]}` → 400 (`@ArrayMinSize(1)`); `POST /api/orders` con `{"clientCode":"CLI-001","items":[{"quantity":3}]}` → 400 (`items[0].productCode`); `PATCH /api/orders/1/status` con `{"status":"ABANDONADO"}` → 400.

---

## Fase 6: Módulo medical-visits (anidado — products opcional)

- [ ] 6.1 Crear `apps/api/src/modules/medical-visits/dto/create-medical-visit.dto.ts` con dos clases en el mismo archivo: `MedicalVisitProductDto` (campos: `productCode` con `@IsString() @IsNotEmpty()`; `quantity` con `@Type(() => Number) @IsNumber({ maxDecimalPlaces: 4 })`) y `CreateMedicalVisitDto` (campos: `eventType` con `@IsEnum(MedicalVisitEventType)` importado desde `@prisma/client`; `clinicCode`, `medicCode`, `motiveCode`, `observation`, `notificationDesc` con `@IsOptional() @IsString()`; `initialKm` con `@IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 })`; `nextVisitDate` con `@IsOptional() @IsDateString()`; `shouldNotify` con `@IsOptional() @IsBoolean()`; `latitude`/`longitude` con `@IsOptional() @Type(() => Number) @IsNumber() @Min/@Max` geográficos; `products` con `@IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => MedicalVisitProductDto)` — sin `@ArrayMinSize`).
- [ ] 6.2 Actualizar `apps/api/src/modules/medical-visits/medical-visits.controller.ts`: cambiar `@Body() dto: any` por `@Body() dto: CreateMedicalVisitDto`.
- [ ] 6.3 Actualizar `apps/api/src/modules/medical-visits/medical-visits.service.ts`: tipar el parámetro `create` como `CreateMedicalVisitDto`.
- [ ] 6.4 Verificar con curl: `POST /api/medical-visits` con body `{}` → 400 (falta `eventType`); `POST /api/medical-visits` con `{"eventType":"CLINIC_START"}` sin `products` → 201; `POST /api/medical-visits` con `{"eventType":"CLINIC_START","nextVisitDate":"mañana"}` → 400.

---

## Fase 7: Módulo courier (anidado — items requerido sin @ArrayMinSize)

- [ ] 7.1 Crear `apps/api/src/modules/courier/dto/create-courier.dto.ts` con dos clases en el mismo archivo: `CourierItemDto` (campo: `barcode` con `@IsString() @IsNotEmpty()`) y `CreateCourierDto` (campos: `status` con `@IsEnum(CourierDeliveryStatus)` importado desde `@prisma/client`; `receiverName`, `motiveCode`, `observation` con `@IsOptional() @IsString()`; `latitude`/`longitude` con `@IsOptional() @Type(() => Number) @IsNumber() @Min/@Max` geográficos; `items` con `@IsArray() @ValidateNested({ each: true }) @Type(() => CourierItemDto)` — sin `@ArrayMinSize` porque `NOT_DELIVERED` puede tener `items: []`).
- [ ] 7.2 Actualizar `apps/api/src/modules/courier/courier.controller.ts`: cambiar `@Body() dto: any` por `@Body() dto: CreateCourierDto`.
- [ ] 7.3 Actualizar `apps/api/src/modules/courier/courier.service.ts`: tipar el parámetro `create` como `CreateCourierDto`.
- [ ] 7.4 Verificar con curl: `POST /api/courier` con body `{"items":[]}` (sin `status`) → 400; `POST /api/courier` con `{"status":"NOT_DELIVERED","items":[]}` → 201; `POST /api/courier` con `{"status":"DELIVERED","items":[{"descripcion":"paquete"}]}` → 400 (`items[0].barcode`).

---

## Fase 8: Módulo gps (cambio de binding — contrato HTTP intacto)

- [ ] 8.1 Crear `apps/api/src/modules/gps/dto/create-gps-batch.dto.ts` con dos clases en el mismo archivo: `GpsPointDto` (campos: `latitude` con `@Type(() => Number) @IsNumber() @Min(-90) @Max(90)`; `longitude` con `@Type(() => Number) @IsNumber() @Min(-180) @Max(180)`; `recordedAt` con `@IsDateString()`; `accuracy`, `altitude`, `speed`, `heading`, `batteryLevel` con `@IsOptional() @Type(() => Number) @IsNumber()`) y `CreateGpsBatchDto` (campo: `points` con `@IsArray() @ValidateNested({ each: true }) @Type(() => GpsPointDto)`).
- [ ] 8.2 Actualizar `apps/api/src/modules/gps/gps.controller.ts`: cambiar `@Body('points') points: any[]` por `@Body() dto: CreateGpsBatchDto` y pasar `dto.points` al service (el contrato HTTP no cambia — el cliente sigue enviando `{ "points": [...] }`).
- [ ] 8.3 Actualizar `apps/api/src/modules/gps/gps.service.ts`: tipar el parámetro del batch como `GpsPointDto[]` (reemplazar `any[]`).
- [ ] 8.4 Verificar con curl: `POST /api/gps/batch` con body `{"points":[{"latitude":-25.28,"longitude":-57.63,"recordedAt":"2026-05-10T14:00:00Z"}]}` → 201; `POST /api/gps/batch` con punto donde `"latitude": -95` → 400; `POST /api/gps/batch` con `"recordedAt":"hoy-a-las-2"` → 400.

---

## Fase 9: Módulo visits (mecánico — mover DTO inline a dto/)

- [ ] 9.1 Crear `apps/api/src/modules/visits/dto/create-visit.dto.ts` moviendo el contenido de `CreateVisitDto` definido actualmente inline en el controller; verificar que `VisitEventType` se importe desde `@prisma/client` (no como literal de string).
- [ ] 9.2 En `apps/api/src/modules/visits/visits.controller.ts`: eliminar la definición inline de `CreateVisitDto` e importar la clase desde `./dto/create-visit.dto.ts`; verificar con curl que `POST /api/visits` con `{"clientCode":"CLI-001","eventType":"START"}` sigue retornando 201 y que el body sin `clientCode` retorna 400.

---

## Fase 10: Módulo metadata (mecánico — reemplazar tipos inline)

- [ ] 10.1 Crear `apps/api/src/modules/metadata/dto/metadata-item.dto.ts` con dos clases en el mismo archivo: `CreateMetadataItemDto` (campos: `code` y `value` con `@IsString() @IsNotEmpty()`; `extraData` con `@IsOptional() @IsObject()`) y `UpdateMetadataItemDto` (campos: `value` con `@IsString() @IsNotEmpty()` — requerido en PATCH, un PATCH sin campos no tiene sentido semántico; `extraData` con `@IsOptional() @IsObject()`).
- [ ] 10.2 Actualizar `apps/api/src/modules/metadata/metadata.controller.ts`: reemplazar el destructuring inline `{ code, value, extraData }` por `@Body() dto: CreateMetadataItemDto` en el POST y `@Body() dto: UpdateMetadataItemDto` en el PATCH.
- [ ] 10.3 Actualizar `apps/api/src/modules/metadata/metadata.service.ts`: tipar los parámetros con los DTOs correspondientes (reemplazar destructuring inline o `any`).
- [ ] 10.4 Verificar con curl: `POST /api/metadata/ESTADO/items` con body `{"code":"ESTADO_ACTIVO","value":"Activo"}` → 201; body `{"value":"Activo"}` (sin `code`) → 400; `PATCH /api/metadata/items/1` con body `{}` → 400 (porque `value` es requerido en `UpdateMetadataItemDto`); body con `"extraData":{"color":"rojo","orden":1}` → 201.

---

## Fase 11: Activar ValidationPipe estricto (commit aparte — DEPENDE de fases 0-10 completas)

- [ ] 11.1 Confirmar que `mobile-audit.md` existe y tiene estado **LIMPIO**; ejecutar `rg "@Body\(\) dto: any" apps/api/src/modules/` — DEBE retornar cero matches antes de continuar.
- [ ] 11.2 Modificar `apps/api/src/main.ts`: reemplazar la configuración actual del `ValidationPipe` por `new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: false } })`.
- [ ] 11.3 Verificar que campos extra son rechazados: `POST /api/inventory` con body `{"depositCode":"DEP01","productCode":"PROD-001","quantity":5,"appVersion":"1.2.3"}` → 400 con `"property appVersion should not exist"`; `POST /api/inventory` con `"companyId":"empresa-B"` en el body → 400 con `"property companyId should not exist"`.
- [ ] 11.4 Smoke test de happy path: ejecutar un POST válido en cada uno de los 10 módulos y confirmar que ninguno retorna regresión (todos deben retornar 201 o 200 según el módulo).

---

## Fase 12: Verificación final

- [ ] 12.1 Ejecutar `rg "@Body\(\) dto: any" apps/api/src/modules/` → cero matches; ejecutar `rg "\.\.\.(data|dto)" apps/api/src/modules/inventory/inventory.service.ts apps/api/src/modules/attendance/attendance.service.ts apps/api/src/modules/guard/guard.service.ts` → cero matches de spread del payload.
- [ ] 12.2 Ejecutar `rg "class CreateVisitDto" apps/api/src/modules/visits/visits.controller.ts` → cero matches (el DTO ya no está inline en el controller); inspeccionar visualmente que los 10 módulos tienen su carpeta `dto/` con al menos un archivo.
- [ ] 12.3 Compilación TypeScript sin errores: ejecutar `npx tsc --noEmit` en `apps/api/` y confirmar salida limpia.
- [ ] 12.4 Confirmar que `forbidNonWhitelisted: true` y `enableImplicitConversion: false` están presentes en `apps/api/src/main.ts`; smoke test manual opcional: un POST happy-path por módulo → 201 y un POST con campo requerido faltante por módulo → 400.
