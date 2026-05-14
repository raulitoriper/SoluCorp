# Especificación: Módulo de Guardia

## Propósito
Marcación de guardias de seguridad: turnos y rondas de patrulla.

## Requisitos

### Requisito: Registrar Turno/Marca de Guardia
El sistema DEBE registrar marcas de guardia con código, observación y GPS.

#### Escenario: Marca de ronda
- DADO un FIELD_WORKER con módulo GUARD_SECURITY
- CUANDO envía POST /api/guard-shifts con guardCode="G001", eventType=MARK, observation="Todo en orden"
- ENTONCES se crea el registro con lat/lng

### Requisito: Consultar Rondas
#### Escenario: Rondas del día por guardia
- CUANDO consulta GET /api/guard-shifts?guardCode=G001&date=2026-05-09
- ENTONCES recibe todas las marcas de ese guardia en el día

## Validación de entrada (DTOs con class-validator)

### Escenario: Crear turno de guardia válido
- DADO un FIELD_WORKER con módulo guardia habilitado
- CUANDO envía POST /api/guard-shifts con body `{ "guardCode": "GRD-001", "eventType": "SHIFT_START", "place": "Entrada principal" }`
- ENTONCES el sistema DEBE retornar HTTP 201
- Y el registro DEBE crearse con `companyId` del JWT

### Escenario: Crear sin guardCode → 400
- DADO un FIELD_WORKER autenticado
- CUANDO envía POST /api/guard-shifts con body `{ "eventType": "MARK" }` (sin `guardCode`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE contener un error referente a `guardCode`

### Escenario: eventType con valor inválido → 400
- DADO un FIELD_WORKER autenticado
- CUANDO envía POST /api/guard-shifts con `"eventType": "BREAK"` (fuera del enum `SHIFT_START|SHIFT_END|MARK`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `eventType` no es un valor válido del enum

### Escenario: eventType omitido → creación con default de DB
- DADO un FIELD_WORKER autenticado
- CUANDO envía POST /api/guard-shifts con body `{ "guardCode": "GRD-001" }` (sin `eventType`)
- ENTONCES el sistema DEBE retornar HTTP 201
- Y el registro DEBE crearse con `eventType="MARK"` (default definido en el schema Prisma)

### Escenario: companyId en body no afecta el registro creado
- DADO un FIELD_WORKER con `companyId="empresa-A"` en el JWT
- CUANDO envía POST /api/guard-shifts con payload válido más `"companyId": "empresa-B"`
- ENTONCES el registro DEBE crearse con `companyId="empresa-A"`
- Y el servicio DEBE construir el INSERT con campos explícitos (no spread del body)
