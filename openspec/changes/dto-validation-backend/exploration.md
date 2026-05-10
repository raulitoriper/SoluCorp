# Exploration: dto-validation-backend

## Problema

El backend NestJS del proyecto SoluCorp tiene 13 módulos de dominio. De estos, 4 tienen DTOs con validación class-validator (`auth`, `companies`, `users`) y 1 con tipado TypeScript inline sin class-validator (`metadata`), pero **9 módulos operativos aceptan `@Body() dto: any`** sin ningún contrato de tipo ni validación de entrada. Esto significa que cualquier payload llega directamente al `PrismaService.create()` — campos malformados, tipos incorrectos, campos extra y hasta inyecciones de `companyId` desde el cliente pueden escribirse en la base de datos.

El riesgo es especialmente grave en un sistema multi-tenant: los services de `inventory`, `attendance` y `guard` hacen `{ companyId, userId, ...data }` con el body sin filtrar. Un payload que incluya `companyId` puede sobreescribir el companyId del token JWT autenticado, rompiendo el aislamiento de tenant. Adicionalmente, el módulo `sync` recibe `items: any[]` sin validar que `idempotencyKey` esté presente, lo que produce errores 500 (constraint Prisma) en lugar de 400 cuando el campo llega vacío.

## Estado actual

### Patrón existente en módulos con DTO

Los módulos `auth`, `companies` y `users` siguen un patrón consistente:

- Archivo `dto/create-{entity}.dto.ts` por entidad (y `update-*.dto.ts` cuando existe PATCH)
- Decoradores de `class-validator`: `@IsString()`, `@IsNotEmpty()`, `@IsEmail()`, `@IsEnum()`, `@IsOptional()`, `@IsArray()`, `@IsBoolean()`, `@MinLength()`
- No usan `class-transformer` explícitamente (solo el activado globalmente por `transform: true`)
- `companies` agrupa tres DTOs en un archivo: `CreateCompanyDto`, `UpdateCompanyDto`, `UpdateSubscriptionDto`
- `users` agrupa dos: `CreateUserDto`, `UpdateUserDto`
- `auth` solo tiene DTOs de entrada (login, refresh) — no hay UpdateDto
- `metadata`: NO tiene carpeta `dto/` — el controller usa destructuring TypeScript inline sin class-validator

### ValidationPipe

Configurado en `apps/api/src/main.ts`:

```typescript
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
```

Tiene `whitelist: true` (elimina campos extra) y `transform: true` (coerción de tipos básica), pero **falta `forbidNonWhitelisted: true`**. Los campos extra son silenciosamente descartados en lugar de retornar 400. Esto puede enmascarar errores en clientes móviles.

### Módulos sin DTO (9)

#### visits — DTO inline en el controller

El controller define `CreateVisitDto` como clase local dentro del mismo archivo, usando decoradores class-validator correctamente. Funciona, pero viola la convención del proyecto.

| Verbo | Path | Payload |
|-------|------|---------|
| POST | `/api/visits` | `CreateVisitDto` inline |
| GET | `/api/visits` | — (query params) |
| GET | `/api/visits/:id` | — |

Campos: `clientCode* string`, `motiveCode? string`, `eventType* enum(START\|END\|QUICK)`, `observation? string`, `latitude? number`, `longitude? number`. No tiene PATCH.

---

#### orders — Sin DTO

| Verbo | Path | Payload |
|-------|------|---------|
| POST | `/api/orders` | `dto: any` |
| GET | `/api/orders` | — (query params) |
| GET | `/api/orders/:id` | — |
| PATCH | `/api/orders/:id/status` | `@Body('status') status: string` |

Campos del body (inferidos del service): `clientCode* string`, `priceList? string`, `saleCondition? string`, `observation? string`, `latitude? number`, `longitude? number`, `items* OrderItemDto[]` (anidado). Cada item: `productCode* string`, `quantity* number`, `unitPriceGs? number`, `discountPct? number`.

PATCH actualiza solo `status` — enum `OrderStatus`: `PENDING | CONFIRMED | PROCESSING | SHIPPED | DELIVERED | CANCELLED`.

Complejidad: requiere `@ValidateNested({ each: true })` + `@Type(() => OrderItemDto)` para el array anidado.

---

#### gps — Sin DTO (endpoint batch)

| Verbo | Path | Payload |
|-------|------|---------|
| POST | `/api/gps/batch` | `@Body('points') points: any[]` |
| GET | `/api/gps` | — (query params) |
| GET | `/api/gps/last-positions` | — |

El controller recibe `points` como campo directo del body, no como objeto wrapeado. Campos por punto GPS: `latitude* number`, `longitude* number`, `accuracy? number`, `altitude? number`, `speed? number`, `heading? number`, `batteryLevel? number`, `recordedAt* string|Date`.

El service valida manualmente `points.length > 50` → BadRequest. Esa lógica permanece en el service.

---

#### inventory — Sin DTO (RIESGO ALTO: spread directo)

| Verbo | Path | Payload |
|-------|------|---------|
| POST | `/api/inventory` | `dto: any` |
| GET | `/api/inventory` | — (query params) |
| GET | `/api/inventory/:id` | — |

Service hace `{ companyId, userId, ...data }`. Campos del schema `InventoryRecord`: `depositCode* string`, `productCode* string`, `quantity* Decimal(12,4)`, `observation? string`, `latitude? number`, `longitude? number`. No tiene PATCH.

---

#### attendance — Sin DTO (RIESGO ALTO: spread directo)

| Verbo | Path | Payload |
|-------|------|---------|
| POST | `/api/attendance` | `dto: any` |
| GET | `/api/attendance` | — (query params) |
| GET | `/api/attendance/:id` | — |

Service hace `{ companyId, userId, ...data }`. Campos del schema `AttendanceEvent`: `employeeCode* string`, `eventCategory* enum(PRESENCE\|BREAK\|LUNCH)`, `eventAction* enum(IN\|OUT)`, `observation? string`, `latitude? number`, `longitude? number`. No tiene PATCH.

---

#### guard — Sin DTO (RIESGO ALTO: spread directo)

| Verbo | Path | Payload |
|-------|------|---------|
| POST | `/api/guard-shifts` | `dto: any` |
| GET | `/api/guard-shifts` | — (query params) |
| GET | `/api/guard-shifts/:id` | — |

Service hace `{ companyId, userId, ...data }`. Campos del schema `GuardShift`: `guardCode* string`, `eventType? enum(SHIFT_START\|SHIFT_END\|MARK)` (default MARK en DB), `place? string`, `observation? string`, `latitude? number`, `longitude? number`. No tiene PATCH.

---

#### medical-visits — Sin DTO (array anidado)

| Verbo | Path | Payload |
|-------|------|---------|
| POST | `/api/medical-visits` | `dto: any` |
| GET | `/api/medical-visits` | — (query params) |
| GET | `/api/medical-visits/:id` | — |

Campos del schema `MedicalVisit`: `eventType* enum(CLINIC_START\|CLINIC_END\|MEDIC_START\|MEDIC_END\|CLINIC_QUICK\|PRODUCT_REGISTER)`, `clinicCode? string`, `medicCode? string`, `motiveCode? string`, `initialKm? Decimal(10,2)`, `nextVisitDate? Date`, `shouldNotify? boolean`, `notificationDesc? string`, `observation? string`, `latitude? number`, `longitude? number`, `products? MedicalVisitProductDto[]`.

Cada producto: `productCode* string`, `quantity* Decimal(12,4)`. Requiere `@ValidateNested`.

---

#### courier — Sin DTO (array anidado)

| Verbo | Path | Payload |
|-------|------|---------|
| POST | `/api/courier` | `dto: any` |
| GET | `/api/courier` | — (query params) |
| GET | `/api/courier/:id` | — |

Campos del schema `CourierDelivery`: `status* enum(DELIVERED\|NOT_DELIVERED)`, `receiverName? string`, `motiveCode? string`, `observation? string`, `latitude? number`, `longitude? number`, `items CourierItemDto[]` (array, puede ser vacío).

Cada item: `barcode* string`. Requiere `@ValidateNested`.

---

#### sync — Sin DTO (batch libre)

| Verbo | Path | Payload |
|-------|------|---------|
| POST | `/api/sync/batch` | `@Body('items') items: any[]` |
| GET | `/api/sync/pending` | — |

El service tipea el array internamente: `{ entityType: string; idempotencyKey: string; payload: any }[]`. Sin DTO, si `idempotencyKey` llega undefined, Prisma lanza error 500 por unique constraint. El campo `payload` es Json libre — validación estricta no aplicable.

Sin `ModuleGuard` — accesible por cualquier usuario autenticado.

---

#### metadata — Tipos TypeScript inline sin class-validator

| Verbo | Path | Payload |
|-------|------|---------|
| POST | `/api/metadata/:typeCode/items` | `{ code, value, extraData? }` inline |
| PATCH | `/api/metadata/items/:id` | `{ value, extraData? }` inline |
| GET | `/api/metadata/types` | — |
| GET | `/api/metadata/:typeCode/items` | — |
| DELETE | `/api/metadata/items/:id` | — |

El destructuring TypeScript inline no activa el `whitelist` del ValidationPipe. Necesita `CreateMetadataItemDto` y `UpdateMetadataItemDto` con class-validator.

---

## Specs relevantes existentes

Todos los módulos tienen spec documentada en `openspec/specs/`:

- `modulo-visitas/spec.md` — enum START/END/QUICK, escenario módulo deshabilitado
- `modulo-pedidos/spec.md` — items requerido, flujo de estados OrderStatus
- `modulo-gps-tracking/spec.md` — batch hasta 50 puntos, campos lat/lng/recordedAt
- `modulo-inventario/spec.md` — depositCode y productCode requeridos
- `modulo-asistencia/spec.md` — enums PRESENCE/BREAK/LUNCH, IN/OUT
- `modulo-guardia/spec.md` — guardCode y eventType (SHIFT_START/SHIFT_END/MARK)
- `modulo-visita-medica/spec.md` — 6 tipos de evento, array products, nextVisitDate, shouldNotify
- `modulo-courier/spec.md` — enum DELIVERED/NOT_DELIVERED, items con barcode
- `cola-sincronizacion/spec.md` — idempotencyKey, estados ALREADY_SYNCED/SYNCED/FAILED

## Dependencias

| Paquete | Versión | Ubicación |
|---------|---------|-----------|
| `class-validator` | `^0.15.1` | `apps/api/package.json` (producción) |
| `class-transformer` | `^0.5.1` | `apps/api/package.json` (producción) |

Ambos instalados. No requieren instalación adicional. Para `@ValidateNested` con arrays anidados (orders, medical-visits, courier) se requiere `@Type()` de class-transformer, que ya está disponible.

## Riesgos detectados

1. **Inyección de tenant vía spread** — `inventory`, `attendance` y `guard` hacen `{ companyId, userId, ...data }` con el payload sin filtrar. El `whitelist: true` del ValidationPipe limpia campos extra solo cuando el tipo del parámetro es una clase con decoradores. Si el tipo es `any`, el whitelist no aplica — los campos llegan íntegros al spread.

2. **`forbidNonWhitelisted: false`** — Activarlo es un breaking change si clientes móviles envían campos extra. Requiere validación contra el código de la app móvil React Native.

3. **`@ValidateNested` requiere instancias de clase** — Para que class-validator valide arrays anidados (orders.items, medical-visits.products, courier.items), el ValidationPipe necesita `transform: true` Y el decorador `@Type(() => ClassName)` en el DTO padre. Ya existe `transform: true`, solo falta el `@Type`.

4. **`idempotencyKey` sin validación** — Si llega vacío o undefined, Prisma lanza error de unique constraint (código `P2002`) que NestJS retorna como 500. Con un DTO explícito se convierte en 400.

5. **`orders` acepta items vacío** — El spec exige "Se requiere al menos un item" pero hoy el service acepta `dto.items || []`. El DTO puede resolver esto con `@ArrayMinSize(1)`.

6. **Scope de `metadata`** — El contexto del cambio lista 9 módulos sin DTO, pero metadata tiene el mismo problema (tipos inline sin class-validator). No está en la lista original de módulos a atacar.

## Preguntas abiertas

1. **¿Se activa `forbidNonWhitelisted: true`?** — Impacto en clientes móviles existentes desconocido sin revisar el código de la app. La proposal debe decidir si se incluye en este cambio.

2. **¿Los services con spread se refactorizan para usar campos explícitos?** — La alternativa más segura es que los services lean del DTO tipado (`dto.depositCode`, `dto.productCode`) en lugar de hacer `...data`. ¿Entra en scope de este cambio?

3. **¿El endpoint GPS mantiene `@Body('points')` o se wrappea en objeto?** — Cambiar a `@Body() dto: CreateGpsBatchDto` con `dto.points` es más consistente pero modifica el binding del controller (no el contrato HTTP, ya que el cliente sigue enviando `{ "points": [...] }`).

4. **¿`metadata` entra en el scope?** — Tiene el mismo problema pero no fue listado en los 9 módulos objetivo.

5. **¿Se acepta que `orders` empiece a rechazar campos numéricos como strings?** — Con `transform: true` y `@IsNumber()`, valores como `"50"` pueden fallar si el transformador no puede convertirlos. Depende del comportamiento actual de los clientes móviles.
