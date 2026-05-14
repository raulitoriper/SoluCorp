# Especificación: Módulo de Asistencia

## Propósito
Marcación de presencia, descanso y almuerzo de empleados (entrada/salida).

## Requisitos

### Requisito: Registrar Marca de Asistencia
El sistema DEBE registrar marcas con categoría (PRESENCE/BREAK/LUNCH) y acción (IN/OUT).

#### Escenario: Entrada de presencia
- DADO un FIELD_WORKER con módulo ATTENDANCE
- CUANDO envía POST /api/attendance con employeeCode="EMP01", eventCategory=PRESENCE, eventAction=IN
- ENTONCES se crea la marca con GPS y hora

#### Escenario: Salida de almuerzo
- CUANDO envía con eventCategory=LUNCH, eventAction=OUT
- ENTONCES se registra el fin del almuerzo

### Requisito: Reporte de Asistencia
#### Escenario: Marcas del día
- CUANDO el COMPANY_ADMIN consulta GET /api/attendance?date=2026-05-09
- ENTONCES recibe todas las marcas del día con empleado, categoría, acción y hora

## Validación de entrada (DTOs con class-validator)

### Escenario: Crear evento de asistencia válido
- DADO un FIELD_WORKER con módulo asistencia habilitado
- CUANDO envía POST /api/attendance con body `{ "employeeCode": "EMP-001", "eventCategory": "PRESENCE", "eventAction": "IN", "latitude": -25.28, "longitude": -57.63 }`
- ENTONCES el sistema DEBE retornar HTTP 201
- Y el registro DEBE crearse con `companyId` del JWT (no del body)

### Escenario: Crear sin employeeCode → 400
- DADO un FIELD_WORKER autenticado
- CUANDO envía POST /api/attendance con body `{ "eventCategory": "PRESENCE", "eventAction": "IN" }` (sin `employeeCode`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE contener un error referente a `employeeCode`

### Escenario: eventCategory con valor inválido → 400
- DADO un FIELD_WORKER autenticado
- CUANDO envía POST /api/attendance con `"eventCategory": "VACATION"` (valor fuera del enum `PRESENCE|BREAK|LUNCH`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `eventCategory` no es un valor válido del enum

### Escenario: eventAction con valor inválido → 400
- DADO un FIELD_WORKER autenticado
- CUANDO envía POST /api/attendance con `"eventAction": "PAUSE"` (fuera del enum `IN|OUT`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `eventAction` no es un valor válido del enum

### Escenario: companyId en body es ignorado / rechazado
- DADO un FIELD_WORKER con `companyId="empresa-A"` en el JWT
- CUANDO envía POST /api/attendance con payload válido más `"companyId": "empresa-B"`
- ENTONCES el registro DEBE crearse con `companyId="empresa-A"`
- Y NO DEBE crearse ningún registro con `companyId="empresa-B"`
