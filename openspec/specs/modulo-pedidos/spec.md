# Especificación: Módulo de Pedidos

## Propósito
Registro de pedidos de productos con items detallados, precios y descuentos.

## Requisitos

### Requisito: Crear Pedido con Items
El sistema DEBE permitir crear pedidos con líneas de detalle (producto, cantidad, precio, descuento).

#### Escenario: Pedido con 3 productos
- DADO un FIELD_WORKER con módulo ORDERS habilitado
- CUANDO envía POST /api/orders con clientCode, priceList, items con 3 productos
- ENTONCES se crea el pedido con totalAmountGs calculado automáticamente

#### Escenario: Pedido sin items
- CUANDO envía POST /api/orders sin items
- ENTONCES recibe 400 "Se requiere al menos un item"

### Requisito: Consultar y actualizar estado
El sistema DEBE permitir cambiar estado del pedido (PENDING→CONFIRMED→PROCESSING→SHIPPED→DELIVERED).

#### Escenario: Confirmar pedido
- DADO un pedido en estado PENDING
- CUANDO el COMPANY_ADMIN envía PATCH /api/orders/{id} con status=CONFIRMED
- ENTONCES el pedido cambia a CONFIRMED

## Validación de entrada (DTOs con class-validator)

### Escenario: Crear pedido válido con items
- DADO un FIELD_WORKER con módulo pedidos habilitado
- CUANDO envía POST /api/orders con body `{ "clientCode": "CLI-001", "items": [{ "productCode": "PROD-A", "quantity": 2 }] }`
- ENTONCES el sistema DEBE retornar HTTP 201

### Escenario: items vacío → 400
- DADO un FIELD_WORKER autenticado
- CUANDO envía POST /api/orders con `"items": []`
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `items` debe tener al menos 1 elemento (`@ArrayMinSize(1)`)

### Escenario: items ausente → 400
- DADO un FIELD_WORKER autenticado
- CUANDO envía POST /api/orders con body `{ "clientCode": "CLI-001" }` (sin `items`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `items` es requerido o no es un array

### Escenario: item sin productCode → 400
- DADO un FIELD_WORKER autenticado
- CUANDO envía POST /api/orders con `"items": [{ "quantity": 3 }]` (sin `productCode` en el item)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE contener un error de validación anidado referente a `items[0].productCode`

### Escenario: clientCode ausente → 400
- DADO un FIELD_WORKER autenticado
- CUANDO envía POST /api/orders con body `{ "items": [{ "productCode": "P1", "quantity": 1 }] }` (sin `clientCode`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE contener un error referente a `clientCode`

### Escenario: PATCH status con valor inválido → 400
- DADO un COMPANY_ADMIN autenticado
- CUANDO envía PATCH /api/orders/{id}/status con body `{ "status": "ABANDONADO" }` (fuera del enum `OrderStatus`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `status` no es un valor válido del enum `OrderStatus`
