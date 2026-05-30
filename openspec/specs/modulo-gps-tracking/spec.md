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

## Validación de entrada (DTOs con class-validator)

### Escenario: Batch de puntos GPS válido
- DADO un FIELD_WORKER con módulo GPS habilitado
- CUANDO envía POST /api/gps/batch con body `{ "points": [{ "latitude": -25.28, "longitude": -57.63, "recordedAt": "2026-05-10T14:00:00Z" }] }`
- ENTONCES el sistema DEBE retornar HTTP 201

### Escenario: latitude fuera de rango → 400
- DADO un FIELD_WORKER autenticado
- CUANDO envía un punto con `"latitude": -95` (fuera del rango -90 a 90)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `points[0].latitude` está fuera del rango permitido (`@Min(-90) @Max(90)`)

### Escenario: longitude fuera de rango → 400
- DADO un FIELD_WORKER autenticado
- CUANDO envía un punto con `"longitude": 200` (fuera del rango -180 a 180)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `points[0].longitude` está fuera del rango permitido (`@Min(-180) @Max(180)`)

### Escenario: recordedAt con formato inválido → 400
- DADO un FIELD_WORKER autenticado
- CUANDO envía un punto con `"recordedAt": "hoy-a-las-2"` (no es ISO 8601)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `points[0].recordedAt` debe ser una fecha ISO 8601

### Escenario: batch con más de 50 puntos → 400
- DADO un FIELD_WORKER autenticado
- CUANDO envía POST /api/gps/batch con `"points"` conteniendo 51 o más elementos
- ENTONCES el sistema DEBE retornar HTTP 400
- NOTA: esta validación la realiza el service (lógica de negocio), no el DTO; el escenario documenta el contrato observable independientemente de dónde resida la lógica

### Escenario: punto sin latitude → 400
- DADO un FIELD_WORKER autenticado
- CUANDO envía un punto sin el campo `latitude`
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE contener un error referente a `points[0].latitude`

---

## Monitoreo cross-tenant (SUPER_ADMIN)

> Agregado por el cambio `admin-monitoring-endpoint` el 2026-05-30.
> Permite al rol SUPER_ADMIN consultar últimas posiciones GPS de cualquier empresa.

### Endpoint
`GET /api/admin/gps/last-positions` con query param opcional `companyId`.

### Autorización
- DEBE estar protegido por `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('SUPER_ADMIN')`.
- COMPANY_ADMIN, FIELD_WORKER y cualquier otro rol DEBE recibir HTTP 403.
- Sin token o token expirado DEBE recibir HTTP 401.

### Escenario: Cross-tenant sin filtro
- DADO un SUPER_ADMIN autenticado
- CUANDO ejecuta `GET /api/admin/gps/last-positions` sin parámetros
- ENTONCES DEBE retornar HTTP 200 con un array de últimas posiciones de TODAS las empresas
- Y cada elemento DEBE incluir `userId`, `latitude`, `longitude`, `accuracy`, `speed`, `batteryLevel`, `recordedAt`, `userName`

### Escenario: Filtrado por empresa
- DADO un SUPER_ADMIN y una empresa con ID `X`
- CUANDO ejecuta `GET /api/admin/gps/last-positions?companyId=X`
- ENTONCES DEBE retornar SOLO las últimas posiciones de la empresa `X`

### Escenario: Shape de respuesta con userName
- ENTONCES la respuesta DEBE incluir `userName` con formato `"FirstName LastName"`
- Si el `user_id` referenciado fue eliminado, `userName` DEBE ser `null` (LEFT JOIN preserva el row)

### Escenario: Aislamiento de roles
- DADO un COMPANY_ADMIN autenticado con `companyId: Y`
- CUANDO ejecuta `GET /api/admin/gps/last-positions?companyId=Y` (su propia empresa)
- ENTONCES DEBE recibir HTTP 403 — el endpoint admin está reservado para SUPER_ADMIN, incluso para datos de la propia empresa del COMPANY_ADMIN
