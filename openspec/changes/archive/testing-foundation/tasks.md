# Tareas: testing-foundation

> Fundación de testing del backend (apps/api) + packages compartidos (shared, ui).
> Orden: setup mínimo → unit P0 → refactor W01 → e2e → packages → docs → verificación final.

---

## Fase A: Setup mínimo (sin tests funcionales)

- [x] A.1 Bump `ts-jest` a `^29.4.0` en `apps/api/package.json` (campo `devDependencies`) y correr `pnpm install` desde la raíz — resuelve riesgo R1 de compatibilidad con `jest@30`
- [x] A.2 Crear `apps/api/.env.test.example` con las tres variables plantilla: `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/solucorp_test`, `JWT_SECRET=test-secret-do-not-use-in-prod`, `JWT_EXPIRES_IN=8h` (archivo commiteable)
- [x] A.3 Crear `apps/api/.env.test` copiando el example con valores reales de Postgres local y agregar `apps/api/.env.test` a `apps/api/.gitignore` (o al `.gitignore` raíz si el entry no existe)
- [x] A.4 Crear `apps/api/test/setup-env.ts`: llama `dotenv.config({ path: resolve(__dirname, '../.env.test') })` y lanza `Error` con mensaje `"[setup-env] DATABASE_URL debe contener literal "test"..."` si la URL cargada no incluye literal `"test"`
- [x] A.5 Sobrescribir `apps/api/test/jest-e2e.json` (YA EXISTE — no crear) con config completa: `rootDir: "."`, `testRegex: ".e2e-spec.ts$"`, `setupFiles: ["<rootDir>/setup-env.ts"]`, `testTimeout: 30000`, `maxWorkers: 1`
- [x] A.6 Crear `apps/api/test/helpers/db.ts` con función `truncateAll(prisma: PrismaService)`: valida `DATABASE_URL.includes('test')` y lanza error descriptivo si no; ejecuta `TRUNCATE TABLE ... RESTART IDENTITY CASCADE` con la lista canónica de 20 tablas en una sola sentencia
- [x] A.7 Crear `apps/api/test/helpers/auth.ts` con cuatro exports: `createTestCompany`, `createTestUser` (bcrypt rounds=4), `signTokenFor` (JWT directo vía `JwtService` sin HTTP), `loginViaHttp` (supertest contra `POST /api/auth/login`)
- [x] A.8 Actualizar bloque `jest` en `apps/api/package.json`: agregar `collectCoverageFrom` (excluye `*.module.ts`, `*.dto.ts`, `dto/**`, `main.ts`, `*.spec.ts`, `index.ts`) y `coverageReporters: ["text","lcov","html"]` — NO agregar `coverageThreshold`
- [x] A.9 Crear `packages/shared/jest.config.ts` (preset ts-jest, testEnvironment node, rootDir src, testRegex `\.spec\.ts$`, collectCoverageFrom) + agregar `jest@^30.0.0`, `ts-jest@^29.4.0`, `@types/jest@^30.0.0` a devDependencies de `packages/shared/package.json` + script `"test": "jest"`
- [x] A.10 Crear `packages/ui/jest.config.ts` (preset ts-jest, testEnvironment jsdom, rootDir src, setupFilesAfterEach apuntando a `../jest.setup.ts`) + crear `packages/ui/jest.setup.ts` con `import '@testing-library/jest-dom'` + agregar `jest@^30`, `ts-jest@^29.4`, `@types/jest@^30`, `jest-environment-jsdom@^30`, `@testing-library/react@^16.1.0`, `@testing-library/jest-dom@^6.6.0`, `react@^19.0.0` (dev), `react-dom@^19.0.0` (dev) a devDependencies de `packages/ui/package.json` + script `"test": "jest"`
- [x] A.11 Actualizar `turbo.json`: agregar task `test` (dependsOn `^build`, outputs `coverage/**`, inputs `src/**`, `test/helpers/**`, `package.json`, `jest.config.*`, `tsconfig*.json`) y task `test:e2e` (dependsOn `^build`, `cache: false`, outputs `[]`)
- [x] A.12 Agregar scripts `"test": "turbo run test"` y `"test:e2e": "turbo run test:e2e"` al root `package.json`
- [x] A.13 Sanity check: ejecutar `pnpm test` desde la raíz — DEBE correr el único `app.controller.spec.ts` existente sin error y retornar exit 0

---

## Fase B: Unit tests P0 backend (orden por riesgo)

- [x] B.1 Crear `apps/api/src/modules/inventory/inventory.service.spec.ts`: mock de `PrismaService` con `jest.fn()` inline + `Test.createTestingModule`; suite con test "create pasa `companyId` del argumento — NUNCA del dto", test "create asigna campos explícitos (depositCode, productCode, quantity) al data de Prisma", test "findAll filtra solo por `companyId` del argumento"
- [x] B.2 Crear `apps/api/src/modules/attendance/attendance.service.spec.ts`: mismo patrón de mock inline; tests de `companyId` del argumento prevalece, campos explícitos (`category`, `action`) en data de Prisma, findAll filtra por companyId
- [x] B.3 Crear `apps/api/src/modules/guard/guard.service.spec.ts`: mismo patrón; tests de `companyId` del argumento prevalece, `eventType` explícito en data, default `MARK` cuando `eventType` no se provee
- [x] B.4 Crear `apps/api/src/modules/auth/auth.service.spec.ts`: mock de `PrismaService` y `JwtService` con `jest.fn()` inline; tests de login exitoso → retorna `access_token` + `refresh_token`, login con password incorrecta → lanza `UnauthorizedException`, `validateUser` con email inexistente → retorna `null`
- [x] B.5 Crear `apps/api/src/modules/auth/guards/jwt-auth.guard.spec.ts`: tests de header `Authorization` ausente → guard retorna false o lanza `UnauthorizedException`, JWT válido con `companyId` → guard retorna true y payload queda en `request.user`, JWT con firma inválida → falla
- [x] B.6 Crear `apps/api/src/modules/auth/guards/roles.guard.spec.ts`: tests de usuario con rol requerido `COMPANY_ADMIN` → guard retorna true; usuario con rol `FIELD_WORKER` intentando ruta de `COMPANY_ADMIN` → guard retorna false o lanza `ForbiddenException`
- [x] B.7 Crear `apps/api/src/modules/auth/guards/module.guard.spec.ts`: mock de `PrismaService` para simular `company_modules`; tests de módulo habilitado → guard retorna true, módulo deshabilitado → guard retorna false o lanza `ForbiddenException`
- [x] B.8 Crear `apps/api/src/modules/sync/sync.service.spec.ts`: mock de `PrismaService` inline; tests de `idempotencyKey` ausente → error o status fallo por item, `idempotencyKey` duplicado → no-op verificable en el mock (no se llama a `create`), batch parcial 3 items con 1 inválido → resultado por item
- [x] B.9 Verificar: `cd apps/api && pnpm test` — todos los nuevos specs DEBEN pasar; reportar cobertura actual con `pnpm --filter api test:cov`

---

## Fase C: Refactor W01 (visits.service)

- [x] C.1 Crear `apps/api/src/modules/visits/visits.service.spec.ts`: mismos patrones B.x; test "create donde dto incluye `companyId` extra → Prisma recibe `companyId` del argumento, no del dto"; test "data de Prisma contiene exactamente: companyId, userId, clientCode, motiveCode, eventType, observation, latitude, longitude — sin spread". **Estos tests DEBEN fallar (rojo) con el código actual**
- [x] C.2 Refactorizar `apps/api/src/modules/visits/visits.service.ts`: cambiar `data: { companyId, userId, ...dto }` por campos explícitos (`clientCode`, `motiveCode`, `eventType`, `observation`, `latitude`, `longitude`) — mismo patrón que inventory/attendance/guard
- [x] C.3 Verificar: `cd apps/api && pnpm test` — los specs de visits ahora pasan (rojo → verde); confirmar que la suite completa sigue en verde
- [x] C.4 Verificar cierre de W01: `rg "\.\.\.dto" apps/api/src/modules/visits/visits.service.ts` — DEBE retornar cero matches

---

## Fase D: E2e backend (47 escenarios runtime + transversales)

- [x] D.1 Crear `apps/api/test/validation-pipe.e2e-spec.ts` (transversal): tests de campo extra en cualquier endpoint autenticado → 400 con mensaje `"property X should not exist"`; string en campo numérico (`quantity: "cantidad"`) → 400; shape estándar del error (`statusCode: 400`, `message: string[]`, `error: "Bad Request"`)
- [x] D.2 Crear `apps/api/test/multi-tenant.e2e-spec.ts` (transversal): setup con 2 companies y datos propios; test "GET /api/visits con JWT de empresa-A solo devuelve visitas de empresa-A"; test "POST /api/inventory con campo extra `companyId` en body → 400 antes de llegar al service"; test "GET /api/visits con JWT de empresa-B retorna array vacío si empresa-B no tiene visitas"
- [x] D.3 Crear `apps/api/test/visits.e2e-spec.ts`: 5 escenarios — POST sin `clientCode` → 400; POST sin `eventType` → 400; POST con `eventType` inválido → 400; POST con `companyId` en body → 400; POST válido → 201 con `companyId` del JWT
- [x] D.4 Crear `apps/api/test/orders.e2e-spec.ts`: 6 escenarios — POST sin `clientCode` → 400; POST sin `items` → 400; POST con `status` inválido → 400; POST con campo extra → 400; POST válido → 201; PATCH transición de status → 200
- [x] D.5 Crear `apps/api/test/inventory.e2e-spec.ts`: 6 escenarios — POST sin `depositCode` → 400; POST sin `productCode` → 400; POST sin `quantity` → 400; POST con `companyId` en body → 400; POST válido → 201 con `companyId` del JWT; GET → solo registros del tenant
- [x] D.6 Crear `apps/api/test/attendance.e2e-spec.ts`: 5 escenarios — POST sin `category` → 400; POST con `category` inválida → 400; POST con `action` inválida → 400; POST con `companyId` en body → 400; POST válido → 201
- [x] D.7 Crear `apps/api/test/guard.e2e-spec.ts`: 5 escenarios — POST sin `guardCode` → 400; POST con `eventType` inválido → 400; POST con `companyId` en body → 400; POST válido → 201 con `companyId` del JWT; GET → solo turnos del tenant
- [x] D.8 Crear `apps/api/test/medical-visits.e2e-spec.ts`: 6 escenarios — POST sin `eventType` → 400; POST con `eventType` inválido → 400; POST con campo extra → 400; POST válido → 201; GET → filtra por tenant; POST product sin `productCode` → 400
- [x] D.9 Crear `apps/api/test/courier.e2e-spec.ts`: 5 escenarios — POST sin `status` → 400; POST con `status` inválido → 400; POST con campo extra → 400; POST válido → 201; GET → filtra por tenant
- [x] D.10 Crear `apps/api/test/gps.e2e-spec.ts`: 6 escenarios — POST sin `latitude` → 400; POST sin `longitude` → 400; POST con `latitude` fuera de rango → 400; POST con `longitude` fuera de rango → 400; POST con campo extra → 400; POST válido → 201
- [x] D.11 Crear `apps/api/test/sync.e2e-spec.ts`: 5 escenarios — POST batch sin `idempotencyKey` → 400; POST batch con `idempotencyKey` duplicado → 201 ALREADY_SYNCED; POST batch mixto (1 falla) → resultado por item; POST con `payload` objeto libre → 201; POST con `payload` string → 400
- [x] D.12 Crear `apps/api/test/metadata.e2e-spec.ts`: 6 escenarios — POST item sin `code` → 400; POST item sin `value` → 400; POST con campo extra → 400; POST item válido → 201; PATCH con value vacío → 400; GET types → lista filtrada por tenant
- [x] D.13 Verificar: `cd apps/api && npx jest --config test/jest-e2e.json --forceExit` — 80 tests nuevos pasaron (12 suites nuevas + app.e2e preexistente con 1 falla histórica previa a este batch)

---

## Fase E: Tests de packages

- [x] E.1 Crear `packages/shared/src/utils/format.spec.ts`: al menos un test con caso válido + al menos un edge case (null, undefined, vacío, límites de dominio) por CADA función exportada en `utils/format.ts` — sin mocks (funciones puras)
- [x] E.2 Crear `packages/shared/src/constants/service-codes.spec.ts`, `packages/shared/src/constants/meta-names.spec.ts` y `packages/shared/src/constants/roles.spec.ts`: smoke por cada uno — export no vacío, tipo correcto, al menos una clave conocida con valor esperado; NO usar snapshots
- [x] E.4 Crear `packages/ui/src/components/Button.spec.tsx`: tests de render sin error + `toBeInTheDocument()`, `disabled={true}` → atributo disabled presente, click → `onClick` invocado
- [x] E.5 Crear `packages/ui/src/components/Input.spec.tsx`: tests de render + `toBeInTheDocument()`, `placeholder` se renderiza, `fireEvent.change` → `onChange` invocado con valor correcto
- [x] E.6 Crear `packages/ui/src/components/Card.spec.tsx`: tests de render + `toBeInTheDocument()`, children se renderiza en el documento
- [x] E.7 Crear `packages/ui/src/components/Modal.spec.tsx`: tests de render, `isOpen={false}` → modal NO visible, `isOpen={true}` → modal visible
- [x] E.8 Verificar: `npm run test --workspace packages/shared` y `npm run test --workspace packages/ui` DEBEN pasar; `packages/shared` reporta 100% coverage en `utils/format.ts`

---

## Fase F: Documentación

- [x] F.1 Actualizar `apps/api/README.md`: agregar sección "Testing" con subsecciones — cómo correr unit, cómo crear la DB de test, cómo copiar el env template, cómo correr e2e, cómo ver coverage HTML
- [x] F.2 Crear o actualizar `packages/shared/README.md`: descripción del paquete + instrucciones de test
- [x] F.3 Crear o actualizar `packages/ui/README.md`: descripción del paquete + instrucciones de test
- [x] F.4 Crear root `README.md` (no existía): incluye sección "Tests" con `npm test` y `npm run test:e2e`

---

## Fase G: Verificación final del cambio

- [x] G.1 `npm test` desde root retorna exit 0 — 52 (api) + 38 (shared) + 20 (ui) = 110 tests unit
- [x] G.2 `npm run test:e2e` desde root retorna exit 0 — 80 tests e2e (12 suites)
- [x] G.3 `npm run test:cov` en apps/api — 25.99% statements (meta 40% aspiracional — reportado, no bloqueante)
- [x] G.4 `npx jest --coverage` en packages/shared — utils/format.ts: 100%, constants: 100%, total shared: 39.47% (meta 70% en format.ts: superada)
- [x] G.5 Verificar W01: grep `...dto` en visits.service.ts → 0 matches; guardarraíl db.ts → presente
- [x] G.6 `tsc --noEmit` en apps/api → exit 0 (sin errores de tipos)
