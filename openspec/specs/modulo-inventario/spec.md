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
