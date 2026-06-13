# Spec: testing-infrastructure

**Versión:** 1.0  
**Originado en:** Cambio `testing-foundation` (archivado 2026-05-16)  
**Scope:** Infraestructura de testing de SoluCorp backend (apps/api, packages/shared, packages/ui)

## Resumen

Define los contratos permanentes sobre la infraestructura de testing del monorepo SoluCorp: aislamiento de DB de test, organización de archivos, guardarraíles de seguridad, policy de coverage, requisitos mínimos por módulo, y orquestación con Turborepo.

---

## 1. Estructura de tests

### 1.1 Co-located unit (apps/api)

- Archivo: `src/modules/{module}/{module}.service.spec.ts` (al lado del `.ts`)
- Naming: `*.spec.ts`
- Mocking: Prisma inline con `jest.fn()` sin librerías extra
- Module de test: `Test.createTestingModule` de `@nestjs/testing`

Ejemplo:
```typescript
const prisma = { inventoryRecord: { create: jest.fn(), findMany: jest.fn() } };
const module = await Test.createTestingModule({
  providers: [InventoryService, { provide: PrismaService, useValue: prisma }],
}).compile();
```

### 1.2 E2e backend (apps/api)

- Ubicación: `apps/api/test/` (centralizado)
- Naming: `*.e2e-spec.ts`
- Config: `apps/api/test/jest-e2e.json`
- Estructura: 10 archivos por-módulo + 2 transversales (multi-tenant, validation-pipe)

Archivos canónicos:
```
apps/api/test/
├── setup-env.ts (guardarraíl DATABASE_URL)
├── helpers/
│   ├── db.ts (truncateAll con validación "test")
│   └── auth.ts (createTestCompany, createTestUser, signTokenFor)
├── visits.e2e-spec.ts
├── orders.e2e-spec.ts
├── gps.e2e-spec.ts
├── inventory.e2e-spec.ts
├── attendance.e2e-spec.ts
├── guard.e2e-spec.ts
├── medical-visits.e2e-spec.ts
├── courier.e2e-spec.ts
├── sync.e2e-spec.ts
├── metadata.e2e-spec.ts
├── multi-tenant.e2e-spec.ts
└── validation-pipe.e2e-spec.ts
```

### 1.3 Packages

- **packages/shared:** jest.config.ts, rootDir: src, testRegex `\.spec\.ts$`
- **packages/ui:** jest.config.ts, rootDir: src, testEnvironment: jsdom, jest.setup.ts para `@testing-library/jest-dom`
- **apps/client:** jest.config.ts, rootDir: src, testEnvironment: jsdom, testRegex `\.spec\.tsx?$`, moduleNameMapper para `@/*` (alias), CSS mocks, react-icons proxy mock

---

## 2. Aislamiento de DB de test

### 2.1 Guardarraíl en `truncateAll(prisma)`

**Contrato obligatorio:**

- DADO que `truncateAll(prisma)` es invocado en cualquier contexto
- Y que `process.env.DATABASE_URL` NO contiene el literal `"test"`
- ENTONCES la función DEBE lanzar un `Error` con mensaje descriptivo que dirija al desarrollador
- Y NO DEBE ejecutar ninguna sentencia TRUNCATE contra la base de datos

**Implementación requerida:** `apps/api/test/helpers/db.ts`

```typescript
if (!dbUrl.includes('test')) {
  throw new Error(
    `[truncateAll] DATABASE_URL no contiene literal "test". ` +
    `Abortando para proteger datos. URL recibida: ${dbUrl.replace(/:[^:@]+@/, ':***@')}`
  );
}
```

### 2.2 Guardarraíl en `setup-env.ts`

**Contrato obligatorio:**

- DADO que el runner de e2e carga `apps/api/test/setup-env.ts` como `setupFiles`
- CUANDO se intenta usar una `DATABASE_URL` que NO contiene literal `"test"`
- ENTONCES el archivo DEBE lanzar un `Error` con mensaje indicando `apps/api/.env.test`
- Y NINGÚN test e2e DEBE ejecutarse tras ese error

**Implementación requerida:** `apps/api/test/setup-env.ts`

```typescript
config({ path: resolve(__dirname, '../.env.test') });
if (!process.env.DATABASE_URL?.includes('test')) {
  throw new Error(
    `[setup-env] DATABASE_URL debe contener literal "test". Verificá apps/api/.env.test`
  );
}
```

### 2.3 Tabla canónica a truncar

**20 tablas en orden padre-a-hijo (con CASCADE el orden no importa, pero se documenta para facilitar lectura):**

```
courier_items, courier_deliveries,
medical_visit_products, medical_visits,
order_items, orders,
sync_queue,
guard_shifts,
attendance_events,
inventory_records,
gps_locations,
visits,
metadata_items, metadata_types,
refresh_tokens,
users,
company_settings, company_modules, subscriptions,
companies
```

**Operación:** Sentencia única TRUNCATE con CASCADE y RESTART IDENTITY.

---

## 3. ValidationPipe estricto

### 3.1 Configuración global requerida

**Archivo:** `apps/api/src/main.ts`

Contrato obligatorio:
```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,               // ← OBLIGATORIO: rechaza campos extra
    forbidNonWhitelisted: true,    // ← OBLIGATORIO: HTTP 400 si hay campos extra
    enableImplicitConversion: false, // ← OBLIGATORIO: string en numérico -> error
  })
);
```

### 3.2 Escenarios verificables

#### Escenario: campo extra en body → HTTP 400

- DADO un endpoint POST/PATCH con un DTO específico
- CUANDO se envía un body con un campo no declarado en el DTO
- ENTONCES HTTP 400 con `message` que incluye `"property X should not exist"`
- Y el registro NO se crea en la DB

#### Escenario: tipo incorrecto (string en numérico) → HTTP 400

- DADO `quantity: 5` esperado como número
- CUANDO se envía `quantity: "cantidad"`
- ENTONCES HTTP 400
- Y el registro NO se crea

---

## 4. Aislamiento multi-tenant

Contrato transversal cubierto por `test/multi-tenant.e2e-spec.ts`.

### 4.1 GET no devuelve datos de otro tenant

- DADO dos companies (A, B) con datos propios en la misma DB
- CUANDO un usuario autenticado de A hace `GET /api/{recurso}`
- ENTONCES la respuesta contiene SOLO registros donde `companyId === A`
- Y NUNCA contiene registros de company B

Verificable en e2e con 2 companies reales, mismo schema.

### 4.2 POST crea con companyId del JWT, ignorando body

- DADO un usuario autenticado de company A
- CUANDO hace `POST /api/inventory` con body que incluye `companyId: "B"`
- ENTONCES el ValidationPipe rechaza el campo extra con HTTP 400
- Y si llegara al service, el `companyId` del argumento del method prevale

---

## 5. Unit tests obligatorios por módulo

### 5.1 Services P0 (inventory, attendance, guard, sync, visits)

**Contrato para cada service:**

Cada método `create(companyId: string, userId: string, dto)` DEBE tener tests que verifiquen:

1. El `companyId` del argumento es el que se pasa a Prisma, no el del dto
2. Los campos del DTO se asignan explícitamente (sin spread) a `data`
3. Verified by inspeccionar `Object.keys` del argumento real al mock

**Patrón de mock:**

```typescript
const prisma = { model: { create: jest.fn(), findMany: jest.fn() } };
```

### 5.2 Auth service + Guards

**auth.service.spec.ts:**
- Login exitoso → access_token + refresh_token
- Password incorrecta → UnauthorizedException
- Email inexistente → null

**Guards (jwt-auth, roles, module):**
- Sin Authorization → false o UnauthorizedException
- Con JWT válido → true
- Con rol/módulo inválido → false o ForbiddenException

### 5.3 Ausencia de spread en services

**Contrato permanente:**

En todos los services de módulo, método `create`:
```typescript
// ✗ PROHIBIDO
data: { companyId, userId, ...dto }

// ✓ REQUERIDO
data: {
  companyId,
  userId,
  field1: dto.field1,
  field2: dto.field2,
  // ...
}
```

Verificable: `rg "\.\.\.dto" src/modules/*/` debe retornar cero matches en métodos create.

### 5.4 Targets de testing obligatorios para apps/client

**Requisito permanente:** `apps/client` DEBE tener los siguientes 4 archivos de test pasando:

#### Escenario: auth-store — login exitoso

- DADO que `useAuthStore` está en estado inicial (sin usuario)
- CUANDO se llama `login` con credenciales válidas (mock del cliente API retorna token + user)
- ENTONCES `state.user` DEBE contener el usuario retornado
- Y `state.token` DEBE contener el access token
- Y el store DEBE persistir el token vía localStorage

#### Escenario: auth-store — login fallido

- DADO que `useAuthStore` está en estado inicial
- CUANDO se llama `login` y el cliente API lanza un error (ej. 401)
- ENTONCES `state.user` DEBE permanecer `null`
- Y `state.token` DEBE permanecer `null`

#### Escenario: auth-store — logout

- DADO que el store tiene un usuario y token activos
- CUANDO se llama `logout`
- ENTONCES `state.user` DEBE ser `null`
- Y `state.token` DEBE ser `null`
- Y los datos de auth DEBEN eliminarse del storage persistente

#### Escenario: auth-store — rehidratación desde storage

- DADO que localStorage contiene un token persistido de una sesión anterior
- CUANDO el store se inicializa (loadFromStorage o equivalente)
- ENTONCES `state.token` DEBE recuperar el valor almacenado

#### Escenario: AuthGuard — usuario no autenticado es redirigido

- DADO que no hay usuario en el auth store
- CUANDO `AuthGuard` renderiza
- ENTONCES DEBE redirigir a `/login`

#### Escenario: AuthGuard — usuario con rol incorrecto es redirigido

- DADO que el usuario autenticado NO tiene el rol requerido por la ruta
- CUANDO `AuthGuard` evalúa el acceso
- ENTONCES DEBE redirigir a una ruta de acceso denegado (o login)
- Y los children NO DEBEN renderizarse

#### Escenario: AuthGuard — usuario con rol autorizado accede

- DADO que el usuario autenticado tiene el rol requerido por la ruta
- CUANDO `AuthGuard` renderiza la ruta protegida
- ENTONCES los children DEBEN renderizarse
- Y NO DEBE producirse redirección

#### Escenario: ReportPage — renderiza columnas de la tabla

- DADO que el componente `ReportPage` recibe datos de reporte válidos (mock)
- CUANDO se renderiza
- ENTONCES las columnas definidas DEBEN estar presentes en el DOM
- Y los datos DEBEN aparecer en las filas correspondientes

#### Escenario: ReportPage — estado de carga

- DADO que la carga de datos aún no completó (mock en estado pending)
- CUANDO se renderiza `ReportPage`
- ENTONCES DEBE mostrar un indicador de carga
- Y la tabla de datos NO DEBE estar visible

#### Escenario: ReportPage — estado vacío

- DADO que la carga completó pero retornó cero registros
- CUANDO se renderiza `ReportPage`
- ENTONCES DEBE mostrar un mensaje de estado vacío
- Y la tabla NO DEBE renderizar filas de datos

#### Escenario: ReportPage — exportar CSV

- DADO que `ReportPage` tiene datos cargados y un botón/acción de exportar CSV
- CUANDO el usuario activa la exportación
- ENTONCES la función de exportación DEBE ser invocada con los datos del reporte

#### Escenario: login page — submit con credenciales válidas

- DADO que el formulario de login tiene email y contraseña completos
- CUANDO el usuario envía el formulario
- ENTONCES la acción de login del store DEBE ser llamada con los valores ingresados

#### Escenario: login page — muestra error de autenticación

- DADO que el store retorna un error tras un intento de login fallido
- CUANDO la respuesta de error se refleja en el estado
- ENTONCES el mensaje de error DEBE ser visible en el formulario

#### Escenario: login page — botón deshabilitado mientras carga

- DADO que el login está en progreso (estado `isLoading: true`)
- CUANDO el formulario está en pantalla
- ENTONCES el botón de submit DEBE estar deshabilitado
- Y NO DEBE ser posible enviar el formulario nuevamente

---

## 6. Refactor W01 (visits.service)

### 6.1 Cierre de W01

- **Antes:** `data: { companyId, userId, ...dto }`
- **Después:** campos explícitos (clientCode, motiveCode, eventType, observation, latitude, longitude)

**Verificación:** `grep -n "\.\.\.dto" src/modules/visits/visits.service.ts` → 0 matches

### 6.2 Cobertura con TDD ligero

- Spec escrito ANTES del refactor (test rojo)
- Test verifica que `companyId` del argumento no se sobrescribe
- Test verifica que objeto `data` contiene exactamente los campos esperados

---

## 7. Coverage reporting

### 7.1 Reporters obligatorios

- `text` — feedback inmediato en consola
- `lcov` — estándar para IDE (VS Code gutters) y CI futuro
- `html` — `coverage/lcov-report/index.html` para drill-down humano

### 7.2 Exclusiones del coverage (apps/api)

```
**/*.module.ts        — solo wiring DI
**/*.dto.ts           — decoradores, validación se cubre en e2e
**/dto/**             — ídem
**/main.ts            — bootstrap, cubierto por cualquier e2e
**/*.spec.ts          — no se cubre código de test
**/index.ts           — barrels
```

### 7.3 Policy de cobertura

- **Sin `coverageThreshold` que rompa build** — aspiracional en esta fase
- **Métricas de referencia por workspace:**
  - apps/api: ≥ 40% aspiracional (actual: 25.99%)
  - apps/client: sin threshold inicial (baseline: 0%; se establecerán thresholds en cambio futuro)
  - packages/shared: ≥ 70% en utils/format.ts (actual: 100%)
  - packages/ui: 100% en componentes (actual: 100%)

---

## 8. Turborepo orchestration

### 8.1 Dos tasks separadas

**Task `test` — unit, cacheable:**

```json
"test": {
  "dependsOn": ["^build"],
  "outputs": ["coverage/**"],
  "inputs": ["src/**", "test/helpers/**", "package.json", "jest.config.*"]
}
```

- Scripts: `apps/api` + `packages/shared` + `packages/ui`
- Determinístico → cacheable
- Retorna exit 0 si todos los tests pasan

**Task `test:e2e` — e2e, NO cacheable:**

```json
"test:e2e": {
  "dependsOn": ["^build"],
  "cache": false,
  "outputs": []
}
```

- Script: solo `apps/api`
- Depende de estado DB externo → no cacheable
- `maxWorkers: 1` en jest-e2e.json (única DB compartida)

### 8.2 Scripts root (package.json)

```json
"test": "turbo run test",
"test:e2e": "turbo run test:e2e"
```

---

## 9. Jest configuration

### 9.1 apps/api (inline en package.json)

```json
"jest": {
  "rootDir": "src",
  "testRegex": ".*\\.spec\\.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "collectCoverageFrom": ["**/*.(t|j)s", "!**/*.module.ts", ...],
  "coverageDirectory": "../coverage",
  "coverageReporters": ["text", "lcov", "html"]
}
```

### 9.2 apps/api e2e (test/jest-e2e.json)

```json
{
  "rootDir": ".",
  "testRegex": ".e2e-spec.ts$",
  "setupFiles": ["<rootDir>/setup-env.ts"],
  "testTimeout": 30000,
  "maxWorkers": 1
}
```

### 9.3 packages/shared (jest.config.ts)

```typescript
preset: 'ts-jest',
testEnvironment: 'node',
rootDir: 'src',
testRegex: '\\.spec\\.ts$'
```

### 9.4 packages/ui (jest.config.ts)

```typescript
preset: 'ts-jest',
testEnvironment: 'jsdom',
rootDir: 'src',
setupFilesAfterEach: ['<rootDir>/../jest.setup.ts']
```

### 9.5 apps/client (jest.config.ts)

```typescript
preset: 'ts-jest',
testEnvironment: 'jsdom',
rootDir: 'src',
testRegex: '\\.spec\\.tsx?$',
setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1',
  '\\.(css|less|scss)$': '<rootDir>/__mocks__/styleMock.js',
  '^react-icons/.*$': '<rootDir>/__mocks__/reactIconsMock.js',
  '^react$': '<rootDir>/node_modules/react',
  '^react-dom$': '<rootDir>/node_modules/react-dom',
},
testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
```

**Notas sobre react pinning (lines 18–19):** El monorepo tiene react@19.1.0 en root y react@19.2.4 en apps/client. Sin el pin explícito, dos instancias de React coexisten en la cadena de módulos causando "Invalid hook call". El `moduleNameMapper` resuelve ambas a la instancia local de apps/client.

---

## 10. Helpers de DB y auth (apps/api/test)

### 10.1 `helpers/db.ts`

**Función:** `truncateAll(prisma: PrismaService)`

- Valida que `DATABASE_URL` contiene `"test"`
- Ejecuta `TRUNCATE TABLE ... RESTART IDENTITY CASCADE` con 20 tablas
- Llamada en `beforeEach` de cada e2e suite

**Garantía:** imposible ejecutar accidentalmente contra DB de producción o dev.

### 10.2 `helpers/auth.ts`

**Cuatro exports:**

1. **`createTestCompany(prisma, overrides?)`** — crea company + subscription + settings + todos los módulos habilitados
2. **`createTestUser(prisma, companyId, role, overrides?)`** — crea user con bcrypt rounds=4
3. **`signTokenFor(app, user)`** — emite JWT directo vía JwtService (NO HTTP)
4. **`loginViaHttp(app, email, password)`** — POST /api/auth/login para tests que ejerciten el endpoint

**Decisión:** por defecto usar `signTokenFor()` (10x más rápido); solo auth.e2e-spec.ts usa `loginViaHttp()`.

---

## 11. .env.test

### 11.1 Template (`apps/api/.env.test.example`)

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/solucorp_test
JWT_SECRET=test-secret-do-not-use-in-prod
JWT_EXPIRES_IN=8h
```

Commiteable. El `.env.test` real queda en `.gitignore`.

### 11.2 Convención de nombre

Base de datos DEBE contener literal `"test"`:
- ✓ `solucorp_test`
- ✓ `testing_db`
- ✗ `solucorp_dev`
- ✗ `solucorp`

---

## 12. Cobertura de los 47 escenarios runtime

**Referencia:** Los 47 escenarios formales están documentados en `openspec/changes/archive/dto-validation-backend/spec.md`.

**Contrato:** Este spec de testing-infrastructure NO retranscribe los 47 escenarios. Define la INFRAESTRUCTURA que los cubre (e2e con DB real, helpers, guardarraíles). La trazabilidad específica por escenario está en `verify-report` del cambio `testing-foundation`.

**Cobertura confirmada por módulo:**
- visits (5 escenarios) → visits.e2e-spec.ts
- orders (6 escenarios) → orders.e2e-spec.ts
- gps (6 escenarios) → gps.e2e-spec.ts
- inventory (6 escenarios) → inventory.e2e-spec.ts
- attendance (5 escenarios) → attendance.e2e-spec.ts
- guard (5 escenarios) → guard.e2e-spec.ts
- medical-visits (6 escenarios) → medical-visits.e2e-spec.ts
- courier (5 escenarios) → courier.e2e-spec.ts
- sync (5 escenarios) → sync.e2e-spec.ts
- metadata (6 escenarios) → metadata.e2e-spec.ts

---

## 13. Decisiones de arquitectura

| Decisión | Alternativa rechazada | Razón |
|----------|----------------------|-------|
| Co-located `*.spec.ts` para unit | Todo en `test/` (Angular) | NestJS convention, scaling |
| Mock Prisma con `jest.fn()` inline | `jest-mock-extended` | Cero dependencias, explícito |
| Truncate por test | Transactions con rollback | `sync.service` usa `$transaction` internamente |
| Guardarraíl: `includes('test')` | Variable `IS_TEST=1` | Imposible pasar accidentalmente |
| JWT directo vía helper | Login HTTP en `beforeEach` | 10x más rápido, coverage por suite |
| `setupFiles` en jest-e2e.json | `globalSetup` | DATABASE_URL antes de PrismaService |
| Dos tasks Turbo (test + test:e2e) | Una sola task | Unit determinístico → cacheable |

---

## 14. Próximos cambios sugeridos

1. **admin-testing-foundation** (twin slice) — Jest + testing-library/react + jsdom, idéntica config a `frontend-testing-foundation` (apps/admin)
2. **mobile-testing-foundation** — Jest + jest-expo + mocks de NetInfo
3. **ui-in-web-portals** — Refactor de componentes de UI compartida; más seguro con tests en apps/client + apps/admin
4. **shared-in-mobile** — Adopción de `packages/shared` en mobile; requiere mobile-testing-foundation primero
5. **services-explicit-fields-cleanup** — refactor de users/users.service y companies/companies.service
6. **coverage-controllers** — unit specs de controllers si se quiere subir coverage a 40%+

**Estado:** `frontend-testing-foundation` completado 2026-06-13 (apps/client Jest + RTL + 4 test files, 16 tests PASS, CI gate operativo).

---

## 15. Decisión de cierre

**Estado:** Contrato permanente establecido.

El cambio `testing-foundation` fue archivado 2026-05-16 después de:
- 190 tests totales pasando (52 api unit + 80 api e2e + 38 shared + 20 ui)
- 43/43 escenarios del spec cumplidos
- 0 CRITICAL findings, 4 WARNINGs documentados (no bloqueantes)
- 6/7 métricas de éxito cumplidas (1 aspiracional, no bloqueante)

Este spec maestro documenta los contratos que PERMANECEN como guardarraíles para cambios futuros en testing de otros módulos (mobile, admin, client, ci).

---

## Referencias

- **Cambio:** testing-foundation (2026-05-10 a 2026-05-16)
- **Verify Report:** openspec/changes/archive/testing-foundation/verify-report.md
- **Design:** openspec/changes/archive/testing-foundation/design.md
- **Spec Delta:** openspec/changes/archive/testing-foundation/spec.md
