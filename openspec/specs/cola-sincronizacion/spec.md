# Especificación: Cola de Sincronización

## Propósito
Endpoint para recibir operaciones encoladas desde la app móvil offline, con protección por idempotency key.

## Requisitos

### Requisito: Procesar Cola de Sync
El sistema DEBE recibir items de la cola offline y procesarlos sin duplicados.

#### Escenario: Enviar batch de operaciones pendientes
- DADO un FIELD_WORKER que estuvo offline y acumuló 5 visitas
- CUANDO envía POST /api/sync/batch con array de 5 items, cada uno con idempotencyKey único
- ENTONCES se procesan las 5 visitas y se retorna el estado de cada una

#### Escenario: Idempotency - item duplicado
- DADO un item ya procesado con idempotencyKey="abc-123"
- CUANDO se envía nuevamente el mismo idempotencyKey
- ENTONCES se retorna el resultado anterior sin re-procesar (status=ALREADY_SYNCED)

#### Escenario: Item con error
- DADO un item con datos inválidos
- CUANDO se procesa el batch
- ENTONCES ese item retorna status=FAILED con el error, pero los demás se procesan normalmente

## Validación de entrada (DTOs con class-validator)

### Escenario: Batch válido con idempotencyKey → 200
- DADO un usuario autenticado
- CUANDO envía POST /api/sync/batch con body `{ "items": [{ "entityType": "inventory", "idempotencyKey": "uuid-abc-123", "payload": {} }] }`
- ENTONCES el sistema DEBE procesar el batch y retornar HTTP 200

### Escenario: idempotencyKey vacío → 400 (no 500)
- DADO un usuario autenticado
- CUANDO envía POST /api/sync/batch con `"idempotencyKey": ""` (string vacío) en algún item
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `idempotencyKey` no puede estar vacío
- Y NO DEBE ocurrir un error 500 por constraint Prisma `P2002`

### Escenario: idempotencyKey ausente → 400
- DADO un usuario autenticado
- CUANDO envía POST /api/sync/batch con un item que no incluye el campo `idempotencyKey`
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE contener un error referente a `idempotencyKey`

### Escenario: entityType ausente → 400
- DADO un usuario autenticado
- CUANDO envía POST /api/sync/batch con un item sin campo `entityType`
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `entityType` es requerido

### Escenario: payload como objeto arbitrario → aceptado
- DADO un usuario autenticado
- CUANDO envía un item con `"payload": { "cualquierCampo": true, "otro": 42 }`
- ENTONCES el sistema DEBE aceptar el payload como objeto libre (`@IsObject()`)
- Y NO DEBE rechazar el request por la estructura interna del `payload`
