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
