# Especificación: Módulo de Rastreo GPS

## Propósito
Recepción de puntos GPS del dispositivo en batch para rastreo en tiempo real.

## Requisitos

### Requisito: Enviar Batch de Ubicaciones
El sistema DEBE recibir arrays de hasta 50 puntos GPS por request.

#### Escenario: Batch de 10 puntos
- DADO un FIELD_WORKER con tracking activo
- CUANDO envía POST /api/gps/batch con array de 10 puntos (lat, lng, recordedAt, accuracy)
- ENTONCES se guardan los 10 puntos asociados al usuario y empresa

#### Escenario: Consultar trail de un worker
- DADO 100 puntos GPS del worker "Juan" entre 8:00 y 17:00
- CUANDO el COMPANY_ADMIN consulta GET /api/gps?userId=juan&from=2026-05-09&to=2026-05-09
- ENTONCES recibe los 100 puntos ordenados por recordedAt
