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
