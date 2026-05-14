# Especificación: Módulo de Visitas

## Propósito
Registro de visitas de campo a clientes con geolocalización. Soporta inicio, fin y visita rápida.

## Requisitos

### Requisito: Registrar Visita
El sistema DEBE permitir registrar visitas con tipo START, END o QUICK, incluyendo GPS.

#### Escenario: Inicio de visita
- DADO un FIELD_WORKER con módulo VISITS habilitado
- CUANDO envía POST /api/visits con eventType=START, clientCode="CLI001", observation="Primera visita"
- ENTONCES se crea la visita con lat/lng del dispositivo y companyId del usuario

#### Escenario: Visita rápida (entrada+salida)
- DADO un FIELD_WORKER autenticado
- CUANDO envía POST /api/visits con eventType=QUICK, clientCode="CLI001", motiveCode="MOT01"
- ENTONCES se crea la visita con todos los campos completos

#### Escenario: Módulo deshabilitado
- DADO una empresa sin módulo VISITS habilitado
- CUANDO un FIELD_WORKER intenta POST /api/visits
- ENTONCES recibe 403 "Módulo no habilitado para su empresa"

### Requisito: Consultar Visitas
El sistema DEBE listar visitas aisladas por tenant con filtros.

#### Escenario: Listado por empresa
- DADO 20 visitas de empresa "A" y 10 de empresa "B"
- CUANDO el COMPANY_ADMIN de "A" consulta GET /api/visits
- ENTONCES recibe solo las 20 visitas de "A"

## Validación de entrada (DTOs con class-validator)

### Escenario: Crear visita válida
- DADO un FIELD_WORKER con módulo visitas habilitado
- CUANDO envía POST /api/visits con body `{ "clientCode": "CLI-001", "eventType": "START" }`
- ENTONCES el sistema DEBE retornar HTTP 201

### Escenario: clientCode ausente → 400
- DADO un FIELD_WORKER autenticado
- CUANDO envía POST /api/visits con body `{ "eventType": "START" }` (sin `clientCode`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE contener un error referente a `clientCode`

### Escenario: eventType inválido → 400
- DADO un FIELD_WORKER autenticado
- CUANDO envía POST /api/visits con `"eventType": "MEDIO"` (fuera del enum `START|END|QUICK`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `eventType` no es un valor válido del enum

### Escenario: eventType ausente → 400
- DADO un FIELD_WORKER autenticado
- CUANDO envía POST /api/visits con body `{ "clientCode": "CLI-001" }` (sin `eventType`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `eventType` es requerido

### Escenario: DTO movido respeta el mismo contrato observable
- DADO que el `CreateVisitDto` inline del controller es movido a `dto/create-visit.dto.ts`
- CUANDO se realizan las mismas requests que antes del cambio
- ENTONCES el comportamiento observable NO DEBE cambiar (mismos 201 y mismos 400)
- Y la clase DTO DEBE declararse en `dto/create-visit.dto.ts`, no en el controller
