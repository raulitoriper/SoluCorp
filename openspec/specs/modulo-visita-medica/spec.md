# Especificación: Módulo de Visita Médica

## Propósito
Gestión de visitas a clínicas y médicos con registro de productos y programación de próxima visita.

## Requisitos

### Requisito: Registrar Eventos de Visita Médica
El sistema DEBE soportar 6 tipos de evento: CLINIC_START, CLINIC_END, MEDIC_START, MEDIC_END, CLINIC_QUICK, PRODUCT_REGISTER.

#### Escenario: Inicio de visita a clínica
- CUANDO envía POST /api/medical-visits con eventType=CLINIC_START, clinicCode="CLIN01", initialKm=45230
- ENTONCES se registra con GPS

#### Escenario: Visita rápida con productos y notificación
- CUANDO envía con eventType=CLINIC_QUICK, clinicCode, medicCode, motiveCode, products=[{code,qty}], nextVisitDate, shouldNotify=true, notificationDesc
- ENTONCES se crea la visita con productos y se programa notificación

### Requisito: Consultar Visitas Médicas
#### Escenario: Por clínica
- CUANDO consulta GET /api/medical-visits?clinicCode=CLIN01
- ENTONCES recibe las visitas a esa clínica con detalle de productos

## Validación de entrada (DTOs con class-validator)

### Escenario: Crear visita médica válida sin productos
- DADO un FIELD_WORKER con módulo visita médica habilitado
- CUANDO envía POST /api/medical-visits con body `{ "eventType": "CLINIC_START", "clinicCode": "CLIN-001", "latitude": -25.28, "longitude": -57.63 }`
- ENTONCES el sistema DEBE retornar HTTP 201

### Escenario: eventType ausente → 400
- DADO un FIELD_WORKER autenticado
- CUANDO envía POST /api/medical-visits con body `{}` o sin campo `eventType`
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `eventType` es requerido

### Escenario: eventType inválido → 400
- DADO un FIELD_WORKER autenticado
- CUANDO envía POST /api/medical-visits con `"eventType": "VISITA_NORMAL"` (fuera del enum `CLINIC_START|CLINIC_END|MEDIC_START|MEDIC_END|CLINIC_QUICK|PRODUCT_REGISTER`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `eventType` no es un valor válido del enum

### Escenario: products con item sin productCode → 400
- DADO un FIELD_WORKER autenticado
- CUANDO envía POST /api/medical-visits con `"products": [{ "quantity": 2 }]` (item sin `productCode`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE contener un error anidado referente a `products[0].productCode`

### Escenario: products ausente o vacío → aceptado
- DADO un FIELD_WORKER autenticado
- CUANDO envía POST /api/medical-visits con payload válido y `"products": []` o sin el campo `products`
- ENTONCES el sistema DEBE retornar HTTP 201
- Y DEBE crear la visita sin productos (campo es `@IsOptional()`)

### Escenario: nextVisitDate con formato inválido → 400
- DADO un FIELD_WORKER autenticado
- CUANDO envía POST /api/medical-visits con `"nextVisitDate": "mañana"` (no es ISO 8601)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `nextVisitDate` debe ser una fecha ISO 8601 válida
