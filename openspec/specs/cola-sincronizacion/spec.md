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
