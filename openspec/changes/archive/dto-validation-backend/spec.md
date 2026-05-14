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

El spec original documento 59 escenarios en total (4 globales + 6 inventory + 5 attendance + 5 guard + 5 sync + 6 orders + 6 medical-visits + 5 courier + 6 gps + 5 visits + 6 metadata).

Estos escenarios fueron agregados a los specs principales en la fase de archivado, bajo la sección "## Validación de entrada (DTOs con class-validator)".

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
