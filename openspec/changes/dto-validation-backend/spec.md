# Spec Delta: dto-validation-backend

## Resumen

Este cambio introduce contratos de entrada explícitos (DTOs con `class-validator`) en los 10 módulos que hoy aceptan `@Body() dto: any` o tipos TypeScript inline sin decoradores. El delta agrega escenarios de validación que hoy no existen: rechazo de campos faltantes, tipos incorrectos, campos extra prohibidos y, para `inventory`/`attendance`/`guard`, el bloqueo de inyección de `companyId` vía body. También documenta el comportamiento de `forbidNonWhitelisted: true` como contrato global una vez activado en `main.ts`.

---

## Convenciones de validación globales

### ValidationPipe estricto (aplica a todos los endpoints después del paso 11)

El sistema DEBE rechazar con HTTP 400 cualquier campo del body que no esté declarado en el DTO del endpoint receptor.

#### Escenario: Campo extra rechazado globalmente

- DADO cualquier endpoint autenticado después de activar `forbidNonWhitelisted: true`
- CUANDO un cliente envía un body que incluye un campo no declarado en el DTO (`deviceModel`, `appVersion`, u otro campo arbitrario)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y el body de la respuesta DEBE tener la forma:
  ```json
  { "statusCode": 400, "message": ["property appVersion should not exist"], "error": "Bad Request" }
  ```
- Y el campo extra NO DEBE llegar al service ni escribirse en la base de datos

### Formato de error 400

El sistema DEBE retornar errores de validación usando el formato por defecto del `ValidationPipe` de NestJS.

#### Escenario: Shape estándar de respuesta de error

- CUANDO cualquier validación de DTO falla (campo faltante, tipo incorrecto, enum inválido, campo extra)
- ENTONCES la respuesta DEBE tener:
  - `statusCode: 400`
  - `message: string[]` — array con uno o más mensajes descriptivos en inglés
  - `error: "Bad Request"`
- Y el `Content-Type` DEBE ser `application/json`

### Aislamiento multi-tenant reforzado

El `companyId` de un registro DEBE provenir siempre del JWT autenticado, nunca del payload del cliente.

#### Escenario: companyId en body es rechazado (post paso 11)

- DADO un FIELD_WORKER autenticado con `companyId="empresa-A"` en el JWT
- CUANDO envía POST a cualquier endpoint de creación incluyendo `companyId: "empresa-B"` en el body
- ENTONCES el sistema DEBE retornar HTTP 400 con `"property companyId should not exist"`
- Y NO DEBE crear ningún registro con `companyId="empresa-B"`

#### Escenario: companyId del JWT prevalece incluso sin flag estricto (inventory, attendance, guard)

- DADO el servicio de `inventory`, `attendance` o `guard` después del refactor de spread
- CUANDO el service construye el `data` del INSERT de Prisma
- ENTONCES `companyId` en el objeto `data` DEBE ser `user.companyId` (del JWT)
- Y NO DEBE existir ningún spread del payload (`...data`, `...dto`) en ese objeto

---

## Por módulo

### inventory

#### Escenario 1: Crear registro válido

- DADO un FIELD_WORKER con módulo `inventory` habilitado
- CUANDO envía `POST /api/inventory` con body `{ "depositCode": "DEP01", "productCode": "PROD-001", "quantity": 5.5, "observation": "ok", "latitude": -25.28, "longitude": -57.63 }`
- ENTONCES el sistema DEBE retornar HTTP 201
- Y el registro DEBE crearse con `companyId` y `userId` del JWT

#### Escenario 2: Crear sin depositCode → 400

- DADO un FIELD_WORKER autenticado
- CUANDO envía `POST /api/inventory` con body `{ "productCode": "PROD-001", "quantity": 5 }` (sin `depositCode`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE contener `"depositCode should not be empty"` o `"depositCode must be a string"`

#### Escenario 3: Crear sin productCode → 400

- DADO un FIELD_WORKER autenticado
- CUANDO envía `POST /api/inventory` con body `{ "depositCode": "DEP01", "quantity": 5 }` (sin `productCode`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE contener `"productCode should not be empty"` o `"productCode must be a string"`

#### Escenario 4: quantity como string numérico → coerción exitosa

- DADO un FIELD_WORKER autenticado
- CUANDO envía `POST /api/inventory` con `"quantity": "3.5"` (string)
- ENTONCES el sistema DEBE convertir el valor a `3.5` (number) vía `@Type(() => Number)`
- Y el registro DEBE crearse correctamente (HTTP 201)

#### Escenario 5: quantity como string no numérico → 400

- DADO un FIELD_WORKER autenticado
- CUANDO envía `POST /api/inventory` con `"quantity": "mucho"`
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE contener un error de tipo numérico para `quantity`

#### Escenario 6: latitude fuera de rango → 400

- DADO un FIELD_WORKER autenticado
- CUANDO envía `POST /api/inventory` con payload válido más `"latitude": -95`
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `latitude` está fuera del rango permitido (-90 a 90)

---

### attendance

#### Escenario 1: Crear evento de asistencia válido

- DADO un FIELD_WORKER con módulo `attendance` habilitado
- CUANDO envía `POST /api/attendance` con body `{ "employeeCode": "EMP-001", "eventCategory": "PRESENCE", "eventAction": "IN", "latitude": -25.28, "longitude": -57.63 }`
- ENTONCES el sistema DEBE retornar HTTP 201
- Y el registro DEBE crearse con `companyId` del JWT (no del body)

#### Escenario 2: Crear sin employeeCode → 400

- DADO un FIELD_WORKER autenticado
- CUANDO envía `POST /api/attendance` con body `{ "eventCategory": "PRESENCE", "eventAction": "IN" }` (sin `employeeCode`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE contener un error referente a `employeeCode`

#### Escenario 3: eventCategory con valor inválido → 400

- DADO un FIELD_WORKER autenticado
- CUANDO envía `POST /api/attendance` con `"eventCategory": "VACATION"` (valor fuera del enum `PRESENCE|BREAK|LUNCH`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `eventCategory` no es un valor válido del enum

#### Escenario 4: eventAction con valor inválido → 400

- DADO un FIELD_WORKER autenticado
- CUANDO envía `POST /api/attendance` con `"eventAction": "PAUSE"` (fuera del enum `IN|OUT`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `eventAction` no es un valor válido del enum

#### Escenario 5: companyId en body es ignorado / rechazado

- DADO un FIELD_WORKER con `companyId="empresa-A"` en el JWT
- CUANDO envía `POST /api/attendance` con payload válido más `"companyId": "empresa-B"`
- ENTONCES el registro DEBE crearse con `companyId="empresa-A"`
- Y NO DEBE crearse ningún registro con `companyId="empresa-B"`

---

### guard

#### Escenario 1: Crear turno de guardia válido

- DADO un FIELD_WORKER con módulo `guard` habilitado
- CUANDO envía `POST /api/guard-shifts` con body `{ "guardCode": "GRD-001", "eventType": "SHIFT_START", "place": "Entrada principal" }`
- ENTONCES el sistema DEBE retornar HTTP 201
- Y el registro DEBE crearse con `companyId` del JWT

#### Escenario 2: Crear sin guardCode → 400

- DADO un FIELD_WORKER autenticado
- CUANDO envía `POST /api/guard-shifts` con body `{ "eventType": "MARK" }` (sin `guardCode`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE contener un error referente a `guardCode`

#### Escenario 3: eventType con valor inválido → 400

- DADO un FIELD_WORKER autenticado
- CUANDO envía `POST /api/guard-shifts` con `"eventType": "BREAK"` (fuera del enum `SHIFT_START|SHIFT_END|MARK`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `eventType` no es un valor válido del enum

#### Escenario 4: eventType omitido → creación con default de DB

- DADO un FIELD_WORKER autenticado
- CUANDO envía `POST /api/guard-shifts` con body `{ "guardCode": "GRD-001" }` (sin `eventType`)
- ENTONCES el sistema DEBE retornar HTTP 201
- Y el registro DEBE crearse con `eventType="MARK"` (default definido en el schema Prisma)

#### Escenario 5: companyId en body no afecta el registro creado

- DADO un FIELD_WORKER con `companyId="empresa-A"` en el JWT
- CUANDO envía `POST /api/guard-shifts` con payload válido más `"companyId": "empresa-B"`
- ENTONCES el registro DEBE crearse con `companyId="empresa-A"`
- Y el servicio DEBE construir el INSERT con campos explícitos (no spread del body)

---

### sync

#### Escenario 1: Batch válido con idempotencyKey → 200

- DADO un usuario autenticado
- CUANDO envía `POST /api/sync/batch` con body `{ "items": [{ "entityType": "inventory", "idempotencyKey": "uuid-abc-123", "payload": {} }] }`
- ENTONCES el sistema DEBE procesar el batch y retornar HTTP 200

#### Escenario 2: idempotencyKey vacío → 400 (no 500)

- DADO un usuario autenticado
- CUANDO envía `POST /api/sync/batch` con `"idempotencyKey": ""` (string vacío) en algún item
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `idempotencyKey` no puede estar vacío
- Y NO DEBE ocurrir un error 500 por constraint Prisma `P2002`

#### Escenario 3: idempotencyKey ausente → 400

- DADO un usuario autenticado
- CUANDO envía `POST /api/sync/batch` con un item que no incluye el campo `idempotencyKey`
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE contener un error referente a `idempotencyKey`

#### Escenario 4: entityType ausente → 400

- DADO un usuario autenticado
- CUANDO envía `POST /api/sync/batch` con un item sin campo `entityType`
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `entityType` es requerido

#### Escenario 5: payload como objeto arbitrario → aceptado

- DADO un usuario autenticado
- CUANDO envía un item con `"payload": { "cualquierCampo": true, "otro": 42 }`
- ENTONCES el sistema DEBE aceptar el payload como objeto libre (`@IsObject()`)
- Y NO DEBE rechazar el request por la estructura interna del `payload`

---

### orders

#### Escenario 1: Crear pedido válido con items

- DADO un FIELD_WORKER con módulo `orders` habilitado
- CUANDO envía `POST /api/orders` con body `{ "clientCode": "CLI-001", "items": [{ "productCode": "PROD-A", "quantity": 2 }] }`
- ENTONCES el sistema DEBE retornar HTTP 201

#### Escenario 2: items vacío → 400

- DADO un FIELD_WORKER autenticado
- CUANDO envía `POST /api/orders` con `"items": []`
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `items` debe tener al menos 1 elemento (`@ArrayMinSize(1)`)

#### Escenario 3: items ausente → 400

- DADO un FIELD_WORKER autenticado
- CUANDO envía `POST /api/orders` con body `{ "clientCode": "CLI-001" }` (sin `items`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `items` es requerido o no es un array

#### Escenario 4: item sin productCode → 400

- DADO un FIELD_WORKER autenticado
- CUANDO envía `POST /api/orders` con `"items": [{ "quantity": 3 }]` (sin `productCode` en el item)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE contener un error de validación anidado referente a `items[0].productCode`

#### Escenario 5: clientCode ausente → 400

- DADO un FIELD_WORKER autenticado
- CUANDO envía `POST /api/orders` con body `{ "items": [{ "productCode": "P1", "quantity": 1 }] }` (sin `clientCode`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE contener un error referente a `clientCode`

#### Escenario 6: PATCH status con valor inválido → 400

- DADO un COMPANY_ADMIN autenticado
- CUANDO envía `PATCH /api/orders/{id}/status` con body `{ "status": "ABANDONADO" }` (fuera del enum `OrderStatus`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `status` no es un valor válido del enum `OrderStatus`

---

### medical-visits

#### Escenario 1: Crear visita médica válida sin productos

- DADO un FIELD_WORKER con módulo `medical-visits` habilitado
- CUANDO envía `POST /api/medical-visits` con body `{ "eventType": "CLINIC_START", "clinicCode": "CLIN-001", "latitude": -25.28, "longitude": -57.63 }`
- ENTONCES el sistema DEBE retornar HTTP 201

#### Escenario 2: eventType ausente → 400

- DADO un FIELD_WORKER autenticado
- CUANDO envía `POST /api/medical-visits` con body `{}` o sin campo `eventType`
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `eventType` es requerido

#### Escenario 3: eventType inválido → 400

- DADO un FIELD_WORKER autenticado
- CUANDO envía `POST /api/medical-visits` con `"eventType": "VISITA_NORMAL"` (fuera del enum `CLINIC_START|CLINIC_END|MEDIC_START|MEDIC_END|CLINIC_QUICK|PRODUCT_REGISTER`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `eventType` no es un valor válido del enum

#### Escenario 4: products con item sin productCode → 400

- DADO un FIELD_WORKER autenticado
- CUANDO envía `POST /api/medical-visits` con `"products": [{ "quantity": 2 }]` (item sin `productCode`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE contener un error anidado referente a `products[0].productCode`

#### Escenario 5: products ausente o vacío → aceptado

- DADO un FIELD_WORKER autenticado
- CUANDO envía `POST /api/medical-visits` con payload válido y `"products": []` o sin el campo `products`
- ENTONCES el sistema DEBE retornar HTTP 201
- Y DEBE crear la visita sin productos (campo es `@IsOptional()`)

#### Escenario 6: nextVisitDate con formato inválido → 400

- DADO un FIELD_WORKER autenticado
- CUANDO envía `POST /api/medical-visits` con `"nextVisitDate": "mañana"` (no es ISO 8601)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `nextVisitDate` debe ser una fecha ISO 8601 válida

---

### courier

#### Escenario 1: Crear entrega válida con items

- DADO un FIELD_WORKER con módulo `courier` habilitado
- CUANDO envía `POST /api/courier` con body `{ "status": "DELIVERED", "receiverName": "Juan Pérez", "items": [{ "barcode": "COD-001" }] }`
- ENTONCES el sistema DEBE retornar HTTP 201

#### Escenario 2: status ausente → 400

- DADO un FIELD_WORKER autenticado
- CUANDO envía `POST /api/courier` con body `{ "items": [] }` (sin `status`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `status` es requerido

#### Escenario 3: status inválido → 400

- DADO un FIELD_WORKER autenticado
- CUANDO envía `POST /api/courier` con `"status": "PARCIAL"` (fuera del enum `DELIVERED|NOT_DELIVERED`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `status` no es un valor válido del enum

#### Escenario 4: item sin barcode → 400

- DADO un FIELD_WORKER autenticado
- CUANDO envía `POST /api/courier` con `"items": [{ "descripcion": "paquete" }]` (item sin `barcode`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE contener un error anidado referente a `items[0].barcode`

#### Escenario 5: items vacío → aceptado (NOT_DELIVERED sin bultos)

- DADO un FIELD_WORKER autenticado
- CUANDO envía `POST /api/courier` con `"status": "NOT_DELIVERED", "items": []`
- ENTONCES el sistema DEBE retornar HTTP 201
- Y DEBE crear la entrega sin items (el array puede estar vacío, no tiene `@ArrayMinSize`)

---

### gps

#### Escenario 1: Batch de puntos GPS válido

- DADO un FIELD_WORKER con módulo `gps` habilitado
- CUANDO envía `POST /api/gps/batch` con body `{ "points": [{ "latitude": -25.28, "longitude": -57.63, "recordedAt": "2026-05-10T14:00:00Z" }] }`
- ENTONCES el sistema DEBE retornar HTTP 201

#### Escenario 2: latitude fuera de rango → 400

- DADO un FIELD_WORKER autenticado
- CUANDO envía un punto con `"latitude": -95` (fuera del rango -90 a 90)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `points[0].latitude` está fuera del rango permitido (`@Min(-90) @Max(90)`)

#### Escenario 3: longitude fuera de rango → 400

- DADO un FIELD_WORKER autenticado
- CUANDO envía un punto con `"longitude": 200` (fuera del rango -180 a 180)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `points[0].longitude` está fuera del rango permitido (`@Min(-180) @Max(180)`)

#### Escenario 4: recordedAt con formato inválido → 400

- DADO un FIELD_WORKER autenticado
- CUANDO envía un punto con `"recordedAt": "hoy-a-las-2"` (no es ISO 8601)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `points[0].recordedAt` debe ser una fecha ISO 8601

#### Escenario 5: batch con más de 50 puntos → 400

- DADO un FIELD_WORKER autenticado
- CUANDO envía `POST /api/gps/batch` con `"points"` conteniendo 51 o más elementos
- ENTONCES el sistema DEBE retornar HTTP 400
- NOTA: esta validación la realiza el service (lógica de negocio), no el DTO; el escenario documenta el contrato observable independientemente de dónde resida la lógica

#### Escenario 6: punto sin latitude → 400

- DADO un FIELD_WORKER autenticado
- CUANDO envía un punto sin el campo `latitude`
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE contener un error referente a `points[0].latitude`

---

### visits

#### Escenario 1: Crear visita válida

- DADO un FIELD_WORKER con módulo `visits` habilitado
- CUANDO envía `POST /api/visits` con body `{ "clientCode": "CLI-001", "eventType": "START" }`
- ENTONCES el sistema DEBE retornar HTTP 201

#### Escenario 2: clientCode ausente → 400

- DADO un FIELD_WORKER autenticado
- CUANDO envía `POST /api/visits` con body `{ "eventType": "START" }` (sin `clientCode`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE contener un error referente a `clientCode`

#### Escenario 3: eventType inválido → 400

- DADO un FIELD_WORKER autenticado
- CUANDO envía `POST /api/visits` con `"eventType": "MEDIO"` (fuera del enum `START|END|QUICK`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `eventType` no es un valor válido del enum

#### Escenario 4: eventType ausente → 400

- DADO un FIELD_WORKER autenticado
- CUANDO envía `POST /api/visits` con body `{ "clientCode": "CLI-001" }` (sin `eventType`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `eventType` es requerido

#### Escenario 5: DTO movido respeta el mismo contrato observable

- DADO que el `CreateVisitDto` inline del controller es movido a `dto/create-visit.dto.ts`
- CUANDO se realizan las mismas requests que antes del cambio
- ENTONCES el comportamiento observable NO DEBE cambiar (mismos 201 y mismos 400)
- Y la clase DTO DEBE declararse en `dto/create-visit.dto.ts`, no en el controller

---

### metadata

#### Escenario 1: Crear item de metadata válido

- DADO un usuario autenticado con módulo `metadata` habilitado
- CUANDO envía `POST /api/metadata/{typeCode}/items` con body `{ "code": "ESTADO_ACTIVO", "value": "Activo" }`
- ENTONCES el sistema DEBE retornar HTTP 201

#### Escenario 2: code ausente → 400

- DADO un usuario autenticado
- CUANDO envía `POST /api/metadata/{typeCode}/items` con body `{ "value": "Activo" }` (sin `code`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `code` es requerido

#### Escenario 3: value ausente → 400

- DADO un usuario autenticado
- CUANDO envía `POST /api/metadata/{typeCode}/items` con body `{ "code": "ESTADO_ACTIVO" }` (sin `value`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y `message` DEBE indicar que `value` es requerido

#### Escenario 4: PATCH con body válido → 200

- DADO un item de metadata existente con id=42
- CUANDO envía `PATCH /api/metadata/items/42` con body `{ "value": "Inactivo" }`
- ENTONCES el sistema DEBE retornar HTTP 200 con el item actualizado

#### Escenario 5: PATCH con body vacío → 400

- DADO un item de metadata existente
- CUANDO envía `PATCH /api/metadata/items/42` con body `{}` (sin ningún campo modificable)
- ENTONCES el sistema DEBERÍA retornar HTTP 400
- NOTA: el DTO `UpdateMetadataItemDto` DEBE requerir al menos `value` como campo válido; si ambos (`value` y `extraData`) son opcionales, un body vacío pasa validación — el equipo DEBE decidir si `value` es requerido en el PATCH

#### Escenario 6: extraData como objeto libre → aceptado

- DADO un usuario autenticado
- CUANDO envía `POST /api/metadata/{typeCode}/items` con `"extraData": { "color": "rojo", "orden": 1 }`
- ENTONCES el sistema DEBE aceptar `extraData` como objeto libre
- Y DEBE persistirlo en el campo JSON del schema Prisma

---

## Restricciones transversales

### Restricción: cero spreads del body en services de alta criticidad

Los services de `inventory`, `attendance` y `guard` NO DEBEN usar `...data` ni `...dto` al construir el objeto `data` para `prisma.*.create()`. Cada campo DEBE ser asignado explícitamente.

### Restricción: enums siempre desde @prisma/client

Los DTOs DEBEN importar los enums (`OrderStatus`, `VisitEventType`, `AttendanceCategory`, `AttendanceAction`, `GuardShiftEventType`, `MedicalVisitEventType`, `CourierDeliveryStatus`) desde `@prisma/client`. NO DEBEN redefinir los valores como literales de string en el DTO.

### Restricción: mobile-audit.md bloquea el paso 11

El flag `forbidNonWhitelisted: true` NO DEBE activarse en `main.ts` hasta que exista el artefacto `openspec/changes/dto-validation-backend/mobile-audit.md` con cero discrepancias sin resolver.

### Restricción: payload de sync es objeto libre

El campo `payload` en `SyncItemDto` DEBE aceptar cualquier objeto (`@IsObject()`). NO DEBE validarse la estructura interna del `payload` en este cambio.
