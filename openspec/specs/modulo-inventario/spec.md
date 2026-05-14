# Especificación: Módulo de Inventario

## Propósito
Registro de stock por depósito y producto.

## Requisitos

### Requisito: Registrar Conteo de Inventario
El sistema DEBE permitir registrar cantidad de un producto en un depósito.

#### Escenario: Conteo simple
- DADO un FIELD_WORKER con módulo INVENTORY habilitado
- CUANDO envía POST /api/inventory con depositCode="DEP01", productCode="PROD01", quantity=50
- ENTONCES se crea el registro con GPS y timestamp

### Requisito: Consultar Inventario
#### Escenario: Filtro por depósito
- CUANDO el COMPANY_ADMIN consulta GET /api/inventory?depositCode=DEP01
- ENTONCES recibe todos los registros de ese depósito ordenados por fecha

## Validación de entrada (DTOs con class-validator)

### Escenario: Crear registro válido
- DADO un FIELD_WORKER con módulo inventario habilitado
- CUANDO envía POST /api/inventory con body `{ "depositCode": "DEP01", "productCode": "PROD-001", "quantity": 5.5, "observation": "ok", "latitude": -25.28, "longitude": -57.63 }`
- ENTONCES el sistema DEBE retornar HTTP 201
- Y el registro DEBE crearse con `companyId` y `userId` del JWT

### Escenario: Crear sin depositCode → 400
- DADO un FIELD_WORKER autenticado
- CUANDO envía POST /api/inventory con body `{ "productCode": "PROD-001", "quantity": 5 }` (sin `depositCode`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE contener `"depositCode should not be empty"` o `"depositCode must be a string"`

### Escenario: Crear sin productCode → 400
- DADO un FIELD_WORKER autenticado
- CUANDO envía POST /api/inventory con body `{ "depositCode": "DEP01", "quantity": 5 }` (sin `productCode`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE contener `"productCode should not be empty"` o `"productCode must be a string"`

### Escenario: quantity como string numérico → coerción exitosa
- DADO un FIELD_WORKER autenticado
- CUANDO envía POST /api/inventory con `"quantity": "3.5"` (string)
- ENTONCES el sistema DEBE convertir el valor a `3.5` (number) vía `@Type(() => Number)`
- Y el registro DEBE crearse correctamente (HTTP 201)

### Escenario: quantity como string no numérico → 400
- DADO un FIELD_WORKER autenticado
- CUANDO envía POST /api/inventory con `"quantity": "mucho"`
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE contener un error de tipo numérico para `quantity`

### Escenario: latitude fuera de rango → 400
- DADO un FIELD_WORKER autenticado
- CUANDO envía POST /api/inventory con payload válido más `"latitude": -95`
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `latitude` está fuera del rango permitido (-90 a 90)
