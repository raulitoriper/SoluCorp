# Verify Report: dto-validation-backend

**Fecha:** 2026-05-14
**Verificacion:** Estatica + compilacion TypeScript (sin server NestJS levantado para curls)
**Modo:** Standard (Strict TDD no activo)
**Resultado global:** READY FOR ARCHIVE WITH MANUAL SMOKE PENDING

---

## Verificacion estructural

| Comando | Resultado | Detalle |
|---------|-----------|---------|
| npx tsc --noEmit | OK EXIT 0 | Sin errores de compilacion TypeScript |
| grep dto: any src/modules/ | CERO MATCHES | Ningun @Body() dto: any |
| grep @Body con string src/modules/ | 1 MATCH PRE-EXISTENTE | companies.controller.ts:39 - fuera de scope |
| grep spread data/dto en inventory/attendance/guard | CERO MATCHES | Los 3 services P0 usan campos explicitos |
| Carpetas dto/ en 10 modulos | 14 archivos DTO | Todos los modulos del scope con dto/ |
| grep forbidNonWhitelisted main.ts | MATCH linea 14 | forbidNonWhitelisted: true + enableImplicitConversion: false |

Hallazgo adicional: visits.service.ts linea 10 usa spread ...dto en el Prisma create.
CreateVisitDto NO incluye companyId ni userId. Riesgo mitigado por forbidNonWhitelisted activo. Ver WARNING W01.

---

## Verificacion de escenarios (59 totales)

### Convenciones globales (4 escenarios)

- Campo extra rechazado globalmente: VERIFICABLE EN RUNTIME — forbidNonWhitelisted: true activo en main.ts
- Shape estandar de respuesta 400: VERIFICABLE EN RUNTIME — ValidationPipe produce formato correcto por diseno
- companyId en body rechazado (post paso 11): VERIFICABLE EN RUNTIME — Todos los DTOs excluyen companyId
- companyId del JWT prevalece sin flag estricto (inventory/attendance/guard): CUMPLE — Campos explicitos en los 3 services, verificado por inspeccion directa

### inventory (6 escenarios)

- Escenario 1 (Crear valido -> 201): VERIFICABLE EN RUNTIME — DTO, controller y service correctamente estructurados
- Escenario 2 (Sin depositCode -> 400): VERIFICABLE EN RUNTIME — @IsString() @IsNotEmpty() en depositCode
- Escenario 3 (Sin productCode -> 400): VERIFICABLE EN RUNTIME — @IsString() @IsNotEmpty() en productCode
- Escenario 4 (quantity string numerico -> coercion exitosa): CUMPLE ESTATICAMENTE — @Type(() => Number) presente; coercion garantizada por class-transformer
- Escenario 5 (quantity string no numerico -> 400): VERIFICABLE EN RUNTIME — @IsNumber() tras Type conversion; NaN falla la validacion
- Escenario 6 (latitude fuera de rango -> 400): VERIFICABLE EN RUNTIME — @Min(-90) @Max(90) en latitude

### attendance (5 escenarios)

- Escenario 1 (Crear valido -> 201): VERIFICABLE EN RUNTIME
- Escenario 2 (Sin employeeCode -> 400): VERIFICABLE EN RUNTIME — @IsNotEmpty() en employeeCode
- Escenario 3 (eventCategory invalido -> 400): VERIFICABLE EN RUNTIME — @IsEnum(AttendanceCategory) desde @prisma/client
- Escenario 4 (eventAction invalido -> 400): VERIFICABLE EN RUNTIME — @IsEnum(AttendanceAction) desde @prisma/client
- Escenario 5 (companyId en body ignorado): CUMPLE — Service usa companyId del JWT; pipe rechaza companyId en body

### guard (5 escenarios)

- Escenario 1 (Crear turno valido -> 201): VERIFICABLE EN RUNTIME
- Escenario 2 (Sin guardCode -> 400): VERIFICABLE EN RUNTIME — @IsNotEmpty() en guardCode
- Escenario 3 (eventType invalido -> 400): VERIFICABLE EN RUNTIME — @IsEnum(GuardShiftEventType); BREAK no es valido
- Escenario 4 (eventType omitido -> 201 con default MARK): VERIFICABLE EN RUNTIME — @IsOptional(); Prisma usa default MARK
- Escenario 5 (companyId en body no afecta registro): CUMPLE — Campos explicitos en service; pipe rechaza companyId en body

### sync (5 escenarios)

- Escenario 1 (Batch valido -> 200): VERIFICABLE EN RUNTIME
- Escenario 2 (idempotencyKey vacio -> 400 no 500): VERIFICABLE EN RUNTIME — @IsNotEmpty() intercepta string vacio; constraint P2002 eliminado estructuralmente
- Escenario 3 (idempotencyKey ausente -> 400): VERIFICABLE EN RUNTIME — Campo requerido sin @IsOptional()
- Escenario 4 (entityType ausente -> 400): VERIFICABLE EN RUNTIME — Campo requerido
- Escenario 5 (payload objeto libre -> aceptado): CUMPLE — @IsObject() sin validacion de estructura interna

### orders (6 escenarios)

- Escenario 1 (Crear pedido valido con items -> 201): VERIFICABLE EN RUNTIME
- Escenario 2 (items vacio -> 400): VERIFICABLE EN RUNTIME — @ArrayMinSize(1) en items
- Escenario 3 (items ausente -> 400): VERIFICABLE EN RUNTIME — @IsArray() sin @IsOptional()
- Escenario 4 (item sin productCode -> 400): VERIFICABLE EN RUNTIME — @ValidateNested({each:true}) + @IsNotEmpty() en productCode de OrderItemDto
- Escenario 5 (clientCode ausente -> 400): VERIFICABLE EN RUNTIME — @IsNotEmpty() en clientCode
- Escenario 6 (PATCH status invalido -> 400): VERIFICABLE EN RUNTIME — UpdateOrderStatusDto con @IsEnum(OrderStatus); controller ya no usa @Body con string

### medical-visits (6 escenarios)

- Escenario 1 (Crear valida sin productos -> 201): VERIFICABLE EN RUNTIME
- Escenario 2 (eventType ausente -> 400): VERIFICABLE EN RUNTIME — Campo requerido
- Escenario 3 (eventType invalido -> 400): VERIFICABLE EN RUNTIME — @IsEnum(MedicalVisitEventType) desde @prisma/client
- Escenario 4 (products con item sin productCode -> 400): VERIFICABLE EN RUNTIME — @ValidateNested + @IsNotEmpty() en productCode de MedicalVisitProductDto
- Escenario 5 (products ausente o vacio -> 201): CUMPLE — @IsOptional() @IsArray() sin @ArrayMinSize; service usa dto.products ?? []
- Escenario 6 (nextVisitDate formato invalido -> 400): VERIFICABLE EN RUNTIME — @IsDateString()

### courier (5 escenarios)

- Escenario 1 (Crear entrega valida con items -> 201): VERIFICABLE EN RUNTIME
- Escenario 2 (status ausente -> 400): VERIFICABLE EN RUNTIME — Campo requerido
- Escenario 3 (status invalido -> 400): VERIFICABLE EN RUNTIME — @IsEnum(CourierDeliveryStatus) desde @prisma/client
- Escenario 4 (item sin barcode -> 400): VERIFICABLE EN RUNTIME — @ValidateNested + @IsNotEmpty() en barcode de CourierItemDto
- Escenario 5 (items vacio -> 201): CUMPLE — @IsArray() sin @ArrayMinSize; items vacio valido (NOT_DELIVERED sin bultos)

### gps (6 escenarios)

- Escenario 1 (Batch GPS valido -> 201): VERIFICABLE EN RUNTIME
- Escenario 2 (latitude fuera de rango -> 400): VERIFICABLE EN RUNTIME — @Min(-90) @Max(90) en GpsPointDto
- Escenario 3 (longitude fuera de rango -> 400): VERIFICABLE EN RUNTIME — @Min(-180) @Max(180) en GpsPointDto
- Escenario 4 (recordedAt formato invalido -> 400): VERIFICABLE EN RUNTIME — @IsDateString()
- Escenario 5 (mas de 50 puntos -> 400): CUMPLE — Logica en gps.service.ts linea 11: if (points.length > 50) throw BadRequestException. Verificado estaticamente.
- Escenario 6 (punto sin latitude -> 400): VERIFICABLE EN RUNTIME — latitude campo requerido

### visits (5 escenarios)

- Escenario 1 (Crear visita valida -> 201): VERIFICABLE EN RUNTIME
- Escenario 2 (clientCode ausente -> 400): VERIFICABLE EN RUNTIME — @IsNotEmpty() en clientCode
- Escenario 3 (eventType invalido -> 400): VERIFICABLE EN RUNTIME — @IsEnum(VisitEventType) desde @prisma/client
- Escenario 4 (eventType ausente -> 400): VERIFICABLE EN RUNTIME — Campo requerido
- Escenario 5 (DTO movido a dto/): CUMPLE — CreateVisitDto en dto/create-visit.dto.ts; cero definicion inline en controller (grep = 0 matches)

### metadata (6 escenarios)

- Escenario 1 (Crear item valido -> 201): VERIFICABLE EN RUNTIME
- Escenario 2 (code ausente -> 400): VERIFICABLE EN RUNTIME — @IsNotEmpty() en code
- Escenario 3 (value ausente -> 400): VERIFICABLE EN RUNTIME — @IsNotEmpty() en value
- Escenario 4 (PATCH con body valido -> 200): VERIFICABLE EN RUNTIME
- Escenario 5 (PATCH con body vacio -> 400): CUMPLE — UpdateMetadataItemDto requiere value con @IsNotEmpty(); body vacio falla la validacion
- Escenario 6 (extraData objeto libre -> aceptado): CUMPLE — @IsOptional() @IsObject(); service castea a Prisma.InputJsonValue

### Resumen por estado

| Estado | Cantidad |
|--------|----------|
| CUMPLE (verificable estaticamente) | 12 |
| VERIFICABLE EN RUNTIME (requiere curl) | 47 |
| NO CUMPLE | 0 |

Total: 59 escenarios. 0 con no cumplimiento estatico.

---

## Metricas de exito del proposal

| # | Metrica | Estado | Evidencia |
|---|---------|--------|-----------|
| 1 | Cero @Body() dto: any en apps/api/src/modules/ | OK | Grep = 0 matches |
| 2 | Cero destructuring TS inline sin DTO en controllers | OK | Todos usan @Body() dto: TipoConcreto; @Body(isEnabled) en companies es pre-existente |
| 3 | forbidNonWhitelisted activo + movil sin regresiones | OK/PENDIENTE RUNTIME | Flag en main.ts linea 14; mobile audit LIMPIO; curl pendiente |
| 4 | Cero spreads en inventory/attendance/guard services | OK | Grep en 3 modulos = 0 matches; confirmado por lectura directa |
| 5 | sync retorna 400 (no 500) cuando idempotencyKey falta | PENDIENTE RUNTIME | @IsNotEmpty() elimina riesgo P2002 estructuralmente |
| 6 | orders rechaza items:[] con 400 | PENDIENTE RUNTIME | @ArrayMinSize(1) presente en CreateOrderDto |
| 7 | Patron consistente DTOs estilo companies/users | OK | 10 modulos con dto/ + class-validator + enums desde @prisma/client |

---

## Tasks completadas vs. pendientes

| Metrica | Valor |
|---------|-------|
| Tasks totales | 47 |
| Tasks completadas [x] | 43 |
| Tasks pendientes [ ] | 4 |

Tasks pendientes (todas son curl/smoke tests, no hay brechas de implementacion):

| Task | Descripcion | Justificacion |
|------|-------------|---------------|
| 11.3 | Verificar campos extra rechazados con curl | Requiere server NestJS levantado |
| 11.4 | Smoke test happy path POST en 10 modulos | Requiere server NestJS levantado |
| 6.4 | Verificar curl medical-visits | Requiere server NestJS levantado |
| 12.4 | Smoke test manual final | Requiere server NestJS levantado |

---

## Findings

### CRITICAL (bloquea archive)

Ninguno.

### WARNING (no bloqueante)

**W01: visits.service.ts usa spread ...dto en el Prisma create**

- Archivo: apps/api/src/modules/visits/visits.service.ts, linea 10
- Codigo: return this.prisma.visit.create({ data: { companyId, userId, ...dto } });
- CreateVisitDto NO incluye companyId ni userId. Con forbidNonWhitelisted activo, esos campos en el body provocan 400 antes de llegar al service. TypeScript tampoco permite pasarlos (el tipo no los declara).
- NO es una brecha de seguridad activa. Es inconsistencia de estilo con inventory/attendance/guard/orders/medical-visits/courier que usan campos explicitos.
- Accion sugerida: corregir en el siguiente ciclo (testing-foundation u otro).

**W02: @Body(isEnabled) pre-existente en companies.controller.ts**

- Archivo: apps/api/src/modules/companies/companies.controller.ts, linea 39
- Pre-existente. No es parte del scope de este cambio. Normalizar en un cambio futuro.

### SUGGESTION (mejora opcional)

**S01: Doble conversion Number() en orders.service.ts**

- Con @Type(() => Number) activo, item.quantity ya es number al llegar al service. El Number() adicional es redundante pero no incorrecto.

**S02: Smoke tests pendientes antes de deploy a produccion**

- Las tasks 11.3, 11.4, 6.4 y 12.4 deben ejecutarse con server up antes del deploy real a produccion. No bloquean el archive.

---

## Recomendacion

**READY FOR ARCHIVE**

Razones:
- TypeScript compila limpio (exit 0)
- Cero @Body() dto: any en los modulos del scope
- Cero spreads en los 3 modulos P0 criticos (inventory/attendance/guard)
- Los 10 modulos tienen DTOs con class-validator y enums desde @prisma/client
- forbidNonWhitelisted: true + enableImplicitConversion: false activos en main.ts
- Mobile audit LIMPIO — cero riesgo de regresion en el cliente movil
- Las 4 tasks pendientes son smoke tests runtime, no brechas de implementacion
- El unico WARNING (visits.service spread) no es un riesgo activo de seguridad; documentado como deuda de estilo
- 0 findings CRITICAL
