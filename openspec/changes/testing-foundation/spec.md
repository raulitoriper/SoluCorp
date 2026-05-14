# Spec Delta: testing-foundation

## Resumen

Este cambio introduce contratos sobre la **suite de tests** de SoluCorp, no sobre el código de producción. Define qué DEBE ser verdad sobre los archivos de test, los helpers de infraestructura, la cobertura de los 47 escenarios runtime heredados de `dto-validation-backend` (referenciados, no transcritos), el comportamiento de los guardarraíles de seguridad de DB, los contratos mínimos por módulo en unit tests, y la orquestación vía Turborepo. La referencia canónica de los escenarios runtime heredados es `openspec/changes/archive/dto-validation-backend/spec.md`.

---

## 1. Aislamiento de DB de test

### 1.1 Guardarraíl en `truncateAll`

#### Escenario: rechazo de truncate sobre DB que no es de test

- DADO que `truncateAll(prisma)` es invocado en cualquier contexto
- Y que `process.env.DATABASE_URL` NO contiene el literal `"test"` (por ejemplo, apunta a `solucorp_dev` o `solucorp`)
- ENTONCES la función DEBE lanzar un `Error` con mensaje que contenga `"Refusing to truncate non-test database"` o `"DATABASE_URL no contiene literal"test""` o equivalente descriptivo
- Y NO DEBE ejecutar ninguna sentencia `TRUNCATE` contra la base de datos
- Y el mensaje de error DEBE incluir la URL ofuscada (contraseña reemplazada por `***`) para diagnóstico

#### Escenario: truncate exitoso sobre DB de test

- DADO que `truncateAll(prisma)` es invocado
- Y que `process.env.DATABASE_URL` contiene el literal `"test"` (por ejemplo, `solucorp_test`)
- ENTONCES la función DEBE ejecutar una única sentencia `TRUNCATE TABLE ... RESTART IDENTITY CASCADE` con todas las tablas del schema en una sola operación
- Y DEBE cubrir la lista canónica de tablas: `courier_items`, `courier_deliveries`, `medical_visit_products`, `medical_visits`, `order_items`, `orders`, `sync_queue`, `guard_shifts`, `attendance_events`, `inventory_records`, `gps_locations`, `visits`, `metadata_items`, `metadata_types`, `refresh_tokens`, `users`, `company_settings`, `company_modules`, `subscriptions`, `companies`
- Y DEBE completar sin error cuando todas las tablas existen en el schema

### 1.2 Guardarraíl en `setup-env.ts`

#### Escenario: `setup-env.ts` rechaza inicialización si DATABASE_URL no es de test

- DADO que el runner de e2e carga `apps/api/test/setup-env.ts` como `setupFiles`
- Y que `apps/api/.env.test` NO existe o su `DATABASE_URL` NO contiene `"test"`
- ENTONCES el proceso DEBE lanzar un `Error` con mensaje que dirija al desarrollador a verificar `apps/api/.env.test`
- Y NINGÚN test e2e DEBE ejecutarse tras ese error

#### Escenario: `setup-env.ts` inicializa correctamente cuando `.env.test` es válido

- DADO que `apps/api/.env.test` existe y contiene `DATABASE_URL` con literal `"test"`
- CUANDO `setupFiles` carga `setup-env.ts`
- ENTONCES `process.env.DATABASE_URL` DEBE estar definido en el proceso antes de que cualquier provider de NestJS se construya
- Y la variable DEBE estar disponible cuando `PrismaService` se inicializa

---

## 2. Cobertura de los 47 escenarios runtime de `dto-validation-backend`

Los 47 escenarios están definidos en `openspec/changes/archive/dto-validation-backend/spec.md`. Este spec NO los retranscribe. El contrato aquí es de **trazabilidad**: cada escenario heredado DEBE tener al menos un test e2e que lo cubra.

### 2.1 Módulo visits (`test/visits.e2e-spec.ts`)

| Escenario heredado | Test e2e que lo cubre |
|--------------------|-----------------------|
| POST sin `clientCode` → 400 | `POST /api/visits sin clientCode retorna 400` |
| POST sin `eventType` → 400 | `POST /api/visits sin eventType retorna 400` |
| POST con `eventType` inválido (no enum) → 400 | `POST /api/visits con eventType inválido retorna 400` |
| POST con campo extra (`companyId` en body) → 400 | `POST /api/visits con companyId en body retorna 400` |
| POST válido → 201 con `companyId` del JWT, no del body | `POST /api/visits válido retorna 201 con companyId del JWT` |

### 2.2 Módulo orders (`test/orders.e2e-spec.ts`)

| Escenario heredado | Test e2e que lo cubre |
|--------------------|-----------------------|
| POST sin `clientCode` → 400 | `POST /api/orders sin clientCode retorna 400` |
| POST sin `items` → 400 | `POST /api/orders sin items retorna 400` |
| POST con `status` inválido (no enum `OrderStatus`) → 400 | `POST /api/orders con status inválido retorna 400` |
| POST con campo extra → 400 | `POST /api/orders con campo extra retorna 400` |
| POST válido → 201 | `POST /api/orders válido retorna 201` |
| PATCH transición de status → 200 | `PATCH /api/orders/:id con status válido retorna 200` |

### 2.3 Módulo gps (`test/gps.e2e-spec.ts`)

| Escenario heredado | Test e2e que lo cubre |
|--------------------|-----------------------|
| POST sin `latitude` → 400 | `POST /api/gps sin latitude retorna 400` |
| POST sin `longitude` → 400 | `POST /api/gps sin longitude retorna 400` |
| POST con `latitude` fuera de rango (-90..90) → 400 | `POST /api/gps con latitude fuera de rango retorna 400` |
| POST con `longitude` fuera de rango (-180..180) → 400 | `POST /api/gps con longitude fuera de rango retorna 400` |
| POST con campo extra → 400 | `POST /api/gps con campo extra retorna 400` |
| POST válido → 201 | `POST /api/gps válido retorna 201` |

### 2.4 Módulo inventory (`test/inventory.e2e-spec.ts`)

| Escenario heredado | Test e2e que lo cubre |
|--------------------|-----------------------|
| POST sin `depositCode` → 400 | `POST /api/inventory sin depositCode retorna 400` |
| POST sin `productCode` → 400 | `POST /api/inventory sin productCode retorna 400` |
| POST sin `quantity` → 400 | `POST /api/inventory sin quantity retorna 400` |
| POST con `companyId` en body → 400 | `POST /api/inventory con companyId en body retorna 400` |
| POST válido → 201 con `companyId` del JWT | `POST /api/inventory válido retorna 201 con companyId del JWT` |
| GET → devuelve solo registros del tenant | `GET /api/inventory devuelve solo registros del tenant` |

### 2.5 Módulo attendance (`test/attendance.e2e-spec.ts`)

| Escenario heredado | Test e2e que lo cubre |
|--------------------|-----------------------|
| POST sin `category` → 400 | `POST /api/attendance sin category retorna 400` |
| POST con `category` inválida (no enum) → 400 | `POST /api/attendance con category inválida retorna 400` |
| POST con `action` inválida (no enum) → 400 | `POST /api/attendance con action inválida retorna 400` |
| POST con `companyId` en body → 400 | `POST /api/attendance con companyId en body retorna 400` |
| POST válido → 201 con `companyId` del JWT | `POST /api/attendance válido retorna 201 con companyId del JWT` |

### 2.6 Módulo guard (`test/guard.e2e-spec.ts`)

| Escenario heredado | Test e2e que lo cubre |
|--------------------|-----------------------|
| POST sin `eventType` → 400 | `POST /api/guard sin eventType retorna 400` |
| POST con `eventType` inválido (no enum `GuardShiftEventType`) → 400 | `POST /api/guard con eventType inválido retorna 400` |
| POST con `companyId` en body → 400 | `POST /api/guard con companyId en body retorna 400` |
| POST válido → 201 con `companyId` del JWT | `POST /api/guard válido retorna 201 con companyId del JWT` |
| GET → devuelve solo turnos del tenant | `GET /api/guard devuelve solo turnos del tenant` |

### 2.7 Módulo medical-visits (`test/medical-visits.e2e-spec.ts`)

| Escenario heredado | Test e2e que lo cubre |
|--------------------|-----------------------|
| POST sin `clientCode` → 400 | `POST /api/medical-visits sin clientCode retorna 400` |
| POST con `eventType` inválido (no enum `MedicalVisitEventType`) → 400 | `POST /api/medical-visits con eventType inválido retorna 400` |
| POST con campo extra → 400 | `POST /api/medical-visits con campo extra retorna 400` |
| POST válido → 201 | `POST /api/medical-visits válido retorna 201` |
| GET → filtra por tenant | `GET /api/medical-visits devuelve solo registros del tenant` |
| POST item de producto sin `productCode` → 400 | `POST /api/medical-visits/:id/products sin productCode retorna 400` |

### 2.8 Módulo courier (`test/courier.e2e-spec.ts`)

| Escenario heredado | Test e2e que lo cubre |
|--------------------|-----------------------|
| POST sin `recipientName` → 400 | `POST /api/courier sin recipientName retorna 400` |
| POST con `status` inválido (no enum `CourierDeliveryStatus`) → 400 | `POST /api/courier con status inválido retorna 400` |
| POST con campo extra → 400 | `POST /api/courier con campo extra retorna 400` |
| POST válido → 201 | `POST /api/courier válido retorna 201` |
| GET → filtra por tenant | `GET /api/courier devuelve solo entregas del tenant` |

### 2.9 Módulo sync (`test/sync.e2e-spec.ts`)

| Escenario heredado | Test e2e que lo cubre |
|--------------------|-----------------------|
| POST batch sin `idempotencyKey` → 400 | `POST /api/sync sin idempotencyKey retorna 400` |
| POST batch con `idempotencyKey` duplicado → 200 no-op | `POST /api/sync con idempotencyKey ya procesado retorna 200 sin duplicar` |
| POST batch parcial (3 items, 1 falla) → respuesta por item | `POST /api/sync con batch mixto retorna resultado por item` |
| POST con `payload` objeto libre → 201 | `POST /api/sync con payload objeto libre retorna 201` |
| POST con `payload` no-objeto (string) → 400 | `POST /api/sync con payload string retorna 400` |

### 2.10 Módulo metadata (`test/metadata.e2e-spec.ts`)

| Escenario heredado | Test e2e que lo cubre |
|--------------------|-----------------------|
| POST type sin `name` → 400 | `POST /api/metadata/types sin name retorna 400` |
| POST item sin `typeId` → 400 | `POST /api/metadata/items sin typeId retorna 400` |
| POST con campo extra → 400 | `POST /api/metadata con campo extra retorna 400` |
| POST type válido → 201 | `POST /api/metadata/types válido retorna 201` |
| GET items → filtra por tenant | `GET /api/metadata/items devuelve solo items del tenant` |
| POST item con `typeId` inexistente → 404 o 400 | `POST /api/metadata/items con typeId inexistente retorna error` |

---

## 3. Aislamiento multi-tenant (suite transversal)

Archivo: `test/multi-tenant.e2e-spec.ts`

#### Escenario: GET no devuelve datos de otro tenant

- DADO dos empresas (`empresa-A` y `empresa-B`) con datos propios en la misma DB de test
- Y un FIELD_WORKER autenticado con JWT de `empresa-A`
- CUANDO realiza `GET /api/visits` (o cualquier endpoint de listado)
- ENTONCES la respuesta DEBE contener solo registros donde `companyId` es el de `empresa-A`
- Y NO DEBE contener ningún registro cuyo `companyId` sea el de `empresa-B`

#### Escenario: POST crea registro con companyId del JWT, ignorando body

- DADO un FIELD_WORKER de `empresa-A`
- CUANDO realiza `POST /api/inventory` con body válido que incluye cualquier intento de inyección (campo extra `companyId`)
- ENTONCES el registro creado en la DB DEBE tener `companyId` igual al del JWT de `empresa-A`
- Y el campo extra DEBE ser rechazado por el `ValidationPipe` con HTTP 400 antes de llegar al service

#### Escenario: Token de empresa-B no permite ver datos de empresa-A

- DADO un FIELD_WORKER autenticado con JWT de `empresa-B`
- CUANDO realiza `GET /api/visits`
- ENTONCES la respuesta DEBE ser un array vacío si `empresa-B` no tiene visitas
- Y NUNCA DEBE devolver visitas de `empresa-A`

---

## 4. ValidationPipe estricto (suite transversal)

Archivo: `test/validation-pipe.e2e-spec.ts`

#### Escenario: campo extra en cualquier endpoint → HTTP 400

- DADO un endpoint autenticado que acepta un DTO concreto
- CUANDO el cliente envía un body con al menos un campo no declarado en ese DTO (ejemplo: `appVersion: "1.0.0"`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y el body DEBE contener `message` como array con al menos un ítem con la forma `"property appVersion should not exist"`
- Y el campo extra NO DEBE persistirse ni procesarse

#### Escenario: string en campo numérico con `enableImplicitConversion: false` → HTTP 400

- DADO un endpoint que espera un campo `number` (ejemplo: `quantity` en inventory)
- CUANDO el cliente envía ese campo como string no numérico (`"cantidad"`)
- ENTONCES el sistema DEBE retornar HTTP 400
- Y el mensaje de error DEBE indicar que el campo no es un número

#### Escenario: shape estándar de error 400

- CUANDO cualquier validación de DTO falla
- ENTONCES la respuesta DEBE tener exactamente:
  - `statusCode: 400`
  - `message: string[]` — al menos un elemento descriptivo
  - `error: "Bad Request"`
- Y `Content-Type` DEBE ser `application/json`

---

## 5. Unit tests obligatorios por módulo

### 5.1 `inventory.service.spec.ts`

- DEBE incluir al menos un test que confirme que `companyId` del argumento de `create(companyId, userId, dto)` es el que se pasa a `prisma.inventoryRecord.create`, independientemente del contenido del dto
- DEBE incluir al menos un test que verifique que los campos del DTO (`depositCode`, `productCode`, `quantity`) son asignados explícitamente al objeto `data` de Prisma, sin uso de spread (`...dto` o `...data`)
- DEBE verificar esa ausencia de spread inspeccionando `Object.keys` del argumento real recibido por el mock
- DEBE mockear `PrismaService` con `jest.fn()` inline, sin librerías adicionales
- DEBE usar `@nestjs/testing` con `Test.createTestingModule`

### 5.2 `attendance.service.spec.ts`

- DEBE incluir al menos un test que confirme que `companyId` del argumento prevalece sobre cualquier intento de inyección vía dto
- DEBE incluir al menos un test que verifique asignación explícita de campos (`category`, `action`) en el `data` de Prisma
- DEBE mockear `PrismaService` con `jest.fn()` inline

### 5.3 `guard.service.spec.ts`

- DEBE incluir al menos un test que confirme que `companyId` del argumento prevalece
- DEBE incluir al menos un test que verifique asignación explícita de `eventType` y demás campos en el `data` de Prisma
- DEBE mockear `PrismaService` con `jest.fn()` inline

### 5.4 `sync.service.spec.ts`

- DEBE incluir al menos un test: batch con `idempotencyKey` ausente → el service DEBE lanzar error o retornar status de fallo por item
- DEBE incluir al menos un test: `idempotencyKey` ya procesado → el service NO DEBE crear un nuevo registro duplicado (no-op verificable sobre el mock de Prisma)
- DEBE incluir al menos un test: batch parcial con 3 items donde 1 es inválido → el resultado DEBE incluir respuesta individual por item (éxito para los válidos, fallo para el inválido)
- DEBE mockear `PrismaService` con `jest.fn()` inline

### 5.5 `visits.service.spec.ts` (incluye cobertura de W01)

- DEBE escribirse ANTES del refactor W01 con las expectativas del comportamiento final (TDD ligero)
- DEBE incluir un test: `create(companyId, userId, dto)` donde dto incluye una propiedad `companyId` adicional → `prisma.visit.create` DEBE ser llamado con `companyId` igual al argumento, NO al del dto
- DEBE verificar que el objeto `data` pasado a Prisma contiene exactamente los campos explícitos: `companyId`, `userId`, `clientCode`, `motiveCode`, `eventType`, `observation`, `latitude`, `longitude`
- DEBE verificar que el objeto `data` NO contiene `...dto` ni `...data` (verificable por `Object.keys` del llamado al mock)
- DEBE fallar inicialmente (test rojo) hasta que el refactor W01 se aplique, momento en que DEBE pasar (test verde)

### 5.6 `auth.service.spec.ts`

- DEBE incluir al menos un test: login exitoso con credenciales válidas → retorna `access_token` y `refresh_token`
- DEBE incluir al menos un test: login con contraseña incorrecta → lanza `UnauthorizedException`
- DEBE incluir al menos un test: `validateUser` con email inexistente → retorna `null`
- DEBE mockear `PrismaService` y `JwtService` con `jest.fn()` inline

### 5.7 Guards de auth

#### `jwt-auth.guard.spec.ts`

- DEBE incluir al menos un test: request sin header `Authorization` → guard retorna `false` o lanza `UnauthorizedException`
- DEBE incluir al menos un test: request con JWT válido y `companyId` en payload → guard retorna `true` y el payload queda en `request.user`
- DEBE incluir al menos un test: JWT con firma inválida → guard retorna `false` o lanza `UnauthorizedException`

#### `roles.guard.spec.ts`

- DEBE incluir al menos un test: usuario con rol requerido (`COMPANY_ADMIN`) accede a ruta marcada con `@Roles('COMPANY_ADMIN')` → guard retorna `true`
- DEBE incluir al menos un test: usuario con rol insuficiente (`FIELD_WORKER`) intenta ruta de `COMPANY_ADMIN` → guard retorna `false` o lanza `ForbiddenException`

#### `module.guard.spec.ts`

- DEBE incluir al menos un test: companyId con módulo habilitado → guard retorna `true`
- DEBE incluir al menos un test: companyId con módulo deshabilitado → guard retorna `false` o lanza `ForbiddenException`
- DEBE mockear `PrismaService` para simular el estado de `company_modules` sin DB real

---

## 6. Refactor W01 (`visits.service.ts`)

### Contrato sobre el código resultante

#### Escenario: campos explícitos sin spread del DTO

- DADO el método `create(companyId: string, userId: string, dto: CreateVisitDto)` de `VisitsService` después del refactor W01
- CUANDO se invoca con cualquier dto
- ENTONCES el objeto `data` pasado a `prisma.visit.create` DEBE contener SOLO estas claves: `companyId`, `userId`, `clientCode`, `motiveCode`, `eventType`, `observation`, `latitude`, `longitude`
- Y NO DEBE existir ningún spread `...dto` ni `...data` en la implementación de `visits.service.ts`
- Verificable en CI: `grep -n "\.\.\." apps/api/src/modules/visits/visits.service.ts` → cero matches en el método `create`

#### Escenario: `companyId` del argumento no es sobrescribible desde el DTO

- DADO el método `create` de `VisitsService` después del refactor W01
- CUANDO se invoca con `companyId = "empresa-real"` y un dto que hipotéticamente contuviera `companyId: "empresa-otro"` (aunque el `ValidationPipe` lo bloquearía antes)
- ENTONCES el mock de `prisma.visit.create` DEBE haber sido llamado con `data.companyId === "empresa-real"`
- Y NUNCA con `data.companyId === "empresa-otro"`

---

## 7. Tests de packages

### 7.1 `packages/shared`

#### Contratos de `utils/format.spec.ts`

- DEBE incluir al menos un test con caso válido y al menos un edge case para CADA función exportada por `utils/format.ts`
- Los edge cases DEBEN incluir: valor vacío (`""`), `null`, `undefined`, y valores en los límites del dominio de la función
- Los tests NO DEBEN tener dependencias externas ni mocks (todas las funciones DEBEN ser puras)

#### Contratos de `constants/*.spec.ts`

- Cada archivo de constantes (`service-codes`, `meta-names`, `roles`) DEBE tener al menos un smoke test que verifique que el módulo exporta un objeto o array con la forma esperada
- Los smoke tests DEBEN verificar al menos: el tipo del export (`typeof`), que el objeto no está vacío, y que al menos una clave conocida existe con el valor esperado
- NO DEBEN ser tests de snapshot (los snapshots se rompen con cambios legítimos de constantes)

### 7.2 `packages/ui`

#### Contrato de render sin error

- Cada componente (`Button`, `Input`, `Card`, `Modal`) DEBE tener al menos un test que renderice el componente sin lanzar excepciones usando `@testing-library/react`
- El test DEBE verificar que el elemento renderizado está presente en el documento (`toBeInTheDocument()`)

#### Contrato de prop clave

- `Button`: DEBE incluir un test que verifique que cuando `disabled={true}` el elemento tiene el atributo `disabled`
- `Input`: DEBE incluir un test que verifique que `placeholder` se renderiza correctamente
- `Card`: DEBE incluir un test que verifique que el contenido pasado como children se renderiza
- `Modal`: DEBE incluir un test que verifique que cuando `open={false}` el modal NO está visible, y cuando `open={true}` SÍ lo está

#### Contrato de interacción

- `Button`: DEBE incluir al menos un test que simule un click y verifique que el handler `onClick` fue invocado
- `Input`: DEBE incluir al menos un test que simule un cambio de valor (`fireEvent.change`) y verifique que `onChange` fue invocado con el valor correcto

---

## 8. Turborepo orchestration

#### Escenario: `pnpm test` desde la raíz invoca todos los suites unit

- DADO un workspace con `pnpm install` completo
- CUANDO se ejecuta `pnpm test` desde el directorio raíz del monorepo
- ENTONCES `turbo run test` DEBE invocar el script `test` de `apps/api`, `packages/shared` y `packages/ui`
- Y DEBE ejecutar `jest` (unit) en cada workspace
- Y DEBE retornar exit code `0` si todos los suites pasan, exit code distinto de `0` si alguno falla

#### Escenario: `pnpm test:e2e` requiere DB de test activa

- DADO que `apps/api/.env.test` existe y contiene `DATABASE_URL` con literal `"test"` apuntando a un PostgreSQL accesible
- CUANDO se ejecuta `pnpm test:e2e` desde la raíz
- ENTONCES `turbo run test:e2e` DEBE invocar el script `test:e2e` de `apps/api`
- Y DEBE levantar la aplicación NestJS completa contra la DB de test
- Y DEBE retornar exit code `0` si todos los tests e2e pasan

#### Escenario: `pnpm test:e2e` sin DB activa falla rápido y con mensaje claro

- DADO que `apps/api/.env.test` NO existe o `DATABASE_URL` no contiene `"test"`
- CUANDO se ejecuta `pnpm test:e2e`
- ENTONCES `setup-env.ts` DEBE lanzar un error antes de ejecutar cualquier test
- Y el mensaje de error DEBE indicar qué archivo configurar (`apps/api/.env.test`)
- Y exit code DEBE ser distinto de `0`

#### Escenario: task `test` es cacheable, `test:e2e` no lo es

- DADO que los archivos de `src/` de `apps/api` no cambiaron desde el último `pnpm test`
- CUANDO se ejecuta `pnpm test` nuevamente
- ENTONCES Turborepo DEBE retornar el resultado cacheado sin re-ejecutar Jest
- Y si `test:e2e` se ejecuta dos veces consecutivas con los mismos inputs, DEBE re-ejecutarse siempre (sin cache)

---

## 9. Coverage reporting

#### Escenario: `pnpm --filter api test:cov` genera artefactos de cobertura

- DADO que se ejecuta `pnpm --filter api test:cov`
- ENTONCES DEBE generarse `apps/api/coverage/lcov.info`
- Y DEBE generarse `apps/api/coverage/lcov-report/index.html`
- Y DEBE imprimirse el resumen de cobertura por archivo en consola

#### Escenario: cobertura insuficiente no rompe el build

- DADO que la cobertura de `apps/api` es inferior a 40% en cualquier métrica
- CUANDO se ejecuta `pnpm test` o `pnpm test:cov`
- ENTONCES el proceso DEBE completar sin fallo por cobertura
- Y el exit code DEBE reflejar SOLO el resultado de los tests (pass/fail), no un threshold de cobertura
- (La métrica de ≥40% es aspiracional en este cambio, no bloqueante)

---

## Archivos que DEBEN existir al cierre del cambio

| Archivo | Estado | Descripción |
|---------|--------|-------------|
| `apps/api/test/setup-env.ts` | NUEVO | Carga `.env.test`, guardarraíl de DATABASE_URL |
| `apps/api/test/helpers/db.ts` | NUEVO | `truncateAll` con guardarraíl |
| `apps/api/test/helpers/auth.ts` | NUEVO | `createTestCompany`, `createTestUser`, `signTokenFor`, `loginViaHttp` |
| `apps/api/test/jest-e2e.json` | MODIFICADO | Config completa con `setupFiles`, `testTimeout`, `maxWorkers: 1` |
| `apps/api/.env.test.example` | NUEVO | Template commitable |
| `apps/api/src/modules/inventory/inventory.service.spec.ts` | NUEVO | Unit test P0 |
| `apps/api/src/modules/attendance/attendance.service.spec.ts` | NUEVO | Unit test P0 |
| `apps/api/src/modules/guard/guard.service.spec.ts` | NUEVO | Unit test P0 |
| `apps/api/src/modules/auth/auth.service.spec.ts` | NUEVO | Unit test auth |
| `apps/api/src/modules/auth/guards/jwt-auth.guard.spec.ts` | NUEVO | Guard spec |
| `apps/api/src/modules/auth/guards/roles.guard.spec.ts` | NUEVO | Guard spec |
| `apps/api/src/modules/auth/guards/module.guard.spec.ts` | NUEVO | Guard spec |
| `apps/api/src/modules/sync/sync.service.spec.ts` | NUEVO | Unit test sync |
| `apps/api/src/modules/visits/visits.service.spec.ts` | NUEVO | Unit test + cobertura W01 |
| `apps/api/src/modules/visits/visits.service.ts` | MODIFICADO | Refactor W01: campos explícitos |
| `apps/api/test/visits.e2e-spec.ts` | NUEVO | 5 escenarios heredados |
| `apps/api/test/orders.e2e-spec.ts` | NUEVO | 6 escenarios heredados |
| `apps/api/test/gps.e2e-spec.ts` | NUEVO | 6 escenarios heredados |
| `apps/api/test/inventory.e2e-spec.ts` | NUEVO | 6 escenarios heredados |
| `apps/api/test/attendance.e2e-spec.ts` | NUEVO | 5 escenarios heredados |
| `apps/api/test/guard.e2e-spec.ts` | NUEVO | 5 escenarios heredados |
| `apps/api/test/medical-visits.e2e-spec.ts` | NUEVO | 6 escenarios heredados |
| `apps/api/test/courier.e2e-spec.ts` | NUEVO | 5 escenarios heredados |
| `apps/api/test/sync.e2e-spec.ts` | NUEVO | 5 escenarios heredados |
| `apps/api/test/metadata.e2e-spec.ts` | NUEVO | 6 escenarios heredados |
| `apps/api/test/multi-tenant.e2e-spec.ts` | NUEVO | 3 escenarios transversales |
| `apps/api/test/validation-pipe.e2e-spec.ts` | NUEVO | 3 escenarios transversales |
| `packages/shared/jest.config.ts` | NUEVO | Config Jest con ts-jest preset |
| `packages/shared/src/utils/format.spec.ts` | NUEVO | Cobertura utils |
| `packages/shared/src/constants/*.spec.ts` | NUEVO | Smoke tests |
| `packages/ui/jest.config.ts` | NUEVO | Config Jest con jsdom |
| `packages/ui/jest.setup.ts` | NUEVO | Import de `@testing-library/jest-dom` |
| `packages/ui/src/Button/index.spec.tsx` | NUEVO | Render + disabled + click |
| `packages/ui/src/Input/index.spec.tsx` | NUEVO | Render + placeholder + change |
| `packages/ui/src/Card/index.spec.tsx` | NUEVO | Render + children |
| `packages/ui/src/Modal/index.spec.tsx` | NUEVO | Render + open/closed |
| `turbo.json` | MODIFICADO | Tasks `test` (cacheable) y `test:e2e` (no-cacheable) |
| `apps/api/README.md` | MODIFICADO | Sección "Testing" |
| `packages/shared/README.md` | NUEVO o MODIFICADO | Instrucciones `pnpm test` |
| `packages/ui/README.md` | NUEVO o MODIFICADO | Instrucciones `pnpm test` |

---

## Métricas de aceptación

1. `pnpm --filter api test` pasa con ≥ 40% statement coverage (métrica aspiracional, no bloqueante)
2. Los 47 escenarios runtime de `dto-validation-backend` tienen trazabilidad explícita: cada fila de las tablas de la sección 2 tiene un test e2e correspondiente
3. `packages/shared` alcanza ≥ 70% statement coverage en `utils/format.ts`
4. Los 4 componentes de `packages/ui` tienen al menos 1 spec cada uno
5. `pnpm turbo run test` desde la raíz termina con exit code `0` con todos los suites pasando
6. `grep -rn "\.\.\." apps/api/src/modules/visits/visits.service.ts` retorna cero matches en el método `create` (W01 cerrada)
7. `grep -rn "truncateAll" apps/api/test/helpers/db.ts` existe y la función incluye la validación de `includes('test')`
