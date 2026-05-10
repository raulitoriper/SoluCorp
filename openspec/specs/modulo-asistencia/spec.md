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
