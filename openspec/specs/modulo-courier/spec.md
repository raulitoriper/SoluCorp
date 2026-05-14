# Especificación: Módulo de Courier

## Propósito
Registro de entregas de paquetes con escaneo de códigos de barra.

## Requisitos

### Requisito: Registrar Entrega
El sistema DEBE registrar entregas con estado (DELIVERED/NOT_DELIVERED) y paquetes escaneados.

#### Escenario: Entrega exitosa
- CUANDO envía POST /api/courier con status=DELIVERED, receiverName="María López", items=[{barcode:"PKG001"},{barcode:"PKG002"}]
- ENTONCES se crea con GPS y los 2 paquetes registrados

#### Escenario: No entregado
- CUANDO envía con status=NOT_DELIVERED, motiveCode="AUSENTE"
- ENTONCES se registra con el motivo de no entrega

### Requisito: Consultar Entregas
#### Escenario: Tasa de éxito
- CUANDO consulta GET /api/courier?from=2026-05-01&to=2026-05-09
- ENTONCES recibe las entregas con conteo de entregadas vs no entregadas

## Validación de entrada (DTOs con class-validator)

### Escenario: Crear entrega válida con items
- DADO un FIELD_WORKER con módulo courier habilitado
- CUANDO envía POST /api/courier con body `{ "status": "DELIVERED", "receiverName": "Juan Pérez", "items": [{ "barcode": "COD-001" }] }`
- ENTONCES el sistema DEBE retornar HTTP 201

### Escenario: status ausente → 400
- DADO un FIELD_WORKER autenticado
- CUANDO envía POST /api/courier con body `{ "items": [] }` (sin `status`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `status` es requerido

### Escenario: status inválido → 400
- DADO un FIELD_WORKER autenticado
- CUANDO envía POST /api/courier con `"status": "PARCIAL"` (fuera del enum `DELIVERED|NOT_DELIVERED`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `status` no es un valor válido del enum

### Escenario: item sin barcode → 400
- DADO un FIELD_WORKER autenticado
- CUANDO envía POST /api/courier con `"items": [{ "descripcion": "paquete" }]` (item sin `barcode`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE contener un error anidado referente a `items[0].barcode`

### Escenario: items vacío → aceptado (NOT_DELIVERED sin bultos)
- DADO un FIELD_WORKER autenticado
- CUANDO envía POST /api/courier con `"status": "NOT_DELIVERED", "items": []`
- ENTONCES el sistema DEBE retornar HTTP 201
- Y DEBE crear la entrega sin items (el array puede estar vacío, no tiene `@ArrayMinSize`)
