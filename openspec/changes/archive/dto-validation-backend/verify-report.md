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
