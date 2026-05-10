# Design: dto-validation-backend

## Resumen ejecutivo

Aplicamos el mismo patrón de DTOs ya establecido en `companies`/`users` (class-validator + un archivo por entidad, agrupando Create + Update en el mismo archivo cuando coexisten) a los 10 módulos sin contrato. Activamos `forbidNonWhitelisted: true` solo como último paso, después de auditar la app móvil y refactorizar los 3 services con spread (`inventory`, `attendance`, `guard`) para que lean campos explícitos del DTO — eliminando la vía de inyección de `companyId` incluso si el flag fallara.

## Patrón de DTOs

### Estructura de archivos

- **Un archivo por entidad de dominio**, no uno por DTO. Cuando coexisten Create y Update (o variantes como `UpdateSubscriptionDto`), van juntos en el mismo archivo siguiendo `companies/create-company.dto.ts`.
- Naming: `create-{entity}.dto.ts`. Cuando no hay Update, igualmente queda con ese nombre.
- DTOs de items anidados (`OrderItemDto`, `MedicalVisitProductDto`, `CourierItemDto`, `GpsPointDto`) viven en el **mismo archivo** que su DTO padre. No se crean archivos `*-item.dto.ts` separados — el item solo tiene sentido en el contexto del padre.
- Carpeta `dto/` por módulo, hermana de `controller.ts` y `service.ts`.

Resultado por módulo:

| Módulo | Archivos |
|--------|----------|
| `inventory` | `dto/create-inventory.dto.ts` |
| `attendance` | `dto/create-attendance.dto.ts` |
| `guard` | `dto/create-guard-shift.dto.ts` |
| `sync` | `dto/sync-batch.dto.ts` (contiene `SyncBatchDto` + `SyncItemDto`) |
| `orders` | `dto/create-order.dto.ts` (contiene `CreateOrderDto` + `OrderItemDto` + `UpdateOrderStatusDto`) |
| `medical-visits` | `dto/create-medical-visit.dto.ts` (contiene padre + `MedicalVisitProductDto`) |
| `courier` | `dto/create-courier.dto.ts` (contiene padre + `CourierItemDto`) |
| `gps` | `dto/create-gps-batch.dto.ts` (contiene `CreateGpsBatchDto` + `GpsPointDto`) |
| `visits` | `dto/create-visit.dto.ts` (mover desde el controller) |
| `metadata` | `dto/metadata-item.dto.ts` (contiene `CreateMetadataItemDto` + `UpdateMetadataItemDto`) |

### Kit estándar de decoradores

Los decoradores se aplican en la misma línea de la propiedad, estilo `companies`/`users`. Solo se importan los decoradores realmente usados en cada archivo.

| Caso | Decoradores |
|------|-------------|
| String requerido | `@IsString() @IsNotEmpty()` |
| String opcional | `@IsOptional() @IsString()` |
| Enum requerido (de Prisma) | `@IsEnum(EnumName)` importado desde `@prisma/client` |
| Enum opcional | `@IsOptional() @IsEnum(EnumName)` |
| Entero requerido (`Int` Prisma) | `@Type(() => Number) @IsInt()` |
| Número decimal (`Decimal(12,4)`, `Decimal(10,2)`) | `@Type(() => Number) @IsNumber({ maxDecimalPlaces: 4 })` (o `2` según el `@db.Decimal`) |
| Número opcional `Float?` (lat/long/accuracy/speed/etc.) | `@IsOptional() @Type(() => Number) @IsNumber()` |
| Latitud | sumar `@Min(-90) @Max(90)` |
| Longitud | sumar `@Min(-180) @Max(180)` |
| Boolean | `@IsOptional() @IsBoolean()` (o sin `@IsOptional()` si es requerido) |
| Fecha ISO 8601 | `@IsDateString()` — el `transform: true` convierte a `Date` antes de Prisma |
| Array de strings | `@IsArray() @IsString({ each: true })` |
| Array anidado de DTOs | `@IsArray() @ArrayMinSize(N) @ValidateNested({ each: true }) @Type(() => ItemDto)` |
| Json libre (`sync.payload`) | `@IsObject()` sin tipo concreto |

**Regla de enums**: importar siempre desde `@prisma/client` (`OrderStatus`, `VisitEventType`, `AttendanceCategory`, `AttendanceAction`, `GuardShiftEventType`, `MedicalVisitEventType`, `CourierDeliveryStatus`). Esto evita drift entre el enum del DTO y el del schema.

### Coerción numérica

**Decisión: usar `@Type(() => Number)` explícito en TODOS los campos numéricos.**

Razones:
1. El `transform: true` del ValidationPipe sin `@Type` no convierte `"50"` → `50` de forma confiable para `@IsNumber()` (depende del orden de validadores).
2. La app móvil React Native serializa números cuando los lee de inputs como string. Confiar en coerción implícita es frágil.
3. Costo cero en runtime: `@Type` solo se aplica si el valor llega como string.
4. Da fail-fast claro: si el cliente manda `"abc"`, falla con un mensaje de `@IsNumber`, no con un cast silencioso a `NaN`.

### Arrays anidados (orders, medical-visits, courier)

El patrón exacto que rige los tres:

```typescript
class OrderItemDto {
  @IsString() @IsNotEmpty() productCode: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 4 }) quantity: number;
  @IsOptional() @Type(() => Number) @IsInt() unitPriceGs?: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) discountPct?: number;
}

export class CreateOrderDto {
  @IsString() @IsNotEmpty() clientCode: string;
  // ... campos escalares ...
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
```

Para `medical-visits.products` se usa el mismo patrón **sin `@ArrayMinSize`** (el array es opcional según el spec — solo `PRODUCT_REGISTER` los usa, otros eventos no). Se marca como `@IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => MedicalVisitProductDto)`.

Para `courier.items` el array es requerido (el endpoint registra entregas con bultos), pero **sin `@ArrayMinSize`** — un `NOT_DELIVERED` puede tener `items: []`. Se marca como `@IsArray() @ValidateNested({ each: true }) @Type(() => CourierItemDto)`.

### Fechas

`recordedAt` en GPS y `nextVisitDate` en medical-visits → `@IsDateString()`. El cliente móvil envía ISO 8601 strings (formato estándar JSON). El `transform: true` no hace falta para esto: dejamos que el service convierta a `Date` con `new Date(dto.recordedAt)` si el ORM lo requiere, o lo pasamos directo a Prisma que acepta strings ISO.

## ValidationPipe — cambios en main.ts

Configuración final:

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
  }),
);
```

- `forbidNonWhitelisted: true` → 400 ante campos extra (antes se descartaban silenciosos).
- `enableImplicitConversion: false` → desactiva la coerción implícita de class-transformer. Nos apoyamos en `@Type(() => Number)` explícito (más predecible). Aclara intención y evita conversiones sorpresa de strings booleanos.
- `whitelist: true` → permanece igual.
- `transform: true` → permanece igual, necesario para que `@ValidateNested` instancie los DTOs anidados con sus decoradores.

## Manejo de errores

**Decisión: dejar el formato por defecto del ValidationPipe (`{ statusCode: 400, message: string[], error: 'Bad Request' }`).**

Razones:
1. No existe un `ErrorResponse` compartido en `packages/shared` hoy. Crearlo es un cambio aparte (fuera de scope).
2. El formato por defecto ya es el estándar de NestJS y la app móvil debería estar preparada para parsearlo (o se ajusta en `testing-foundation`).
3. Una `exceptionFactory` custom añade superficie de bug sin valor inmediato.

Si en el futuro se define el shape compartido, se agrega la factory en un cambio dedicado sin tocar DTOs.

## Refactor de services con spread

### Patrón

`inventory.service.ts`, `attendance.service.ts`, `guard.service.ts` cambian de:

```typescript
// ANTES
return this.prisma.inventoryRecord.create({
  data: { companyId, userId, ...data },
});
```

a:

```typescript
// DESPUÉS
return this.prisma.inventoryRecord.create({
  data: {
    companyId,
    userId,
    depositCode: dto.depositCode,
    productCode: dto.productCode,
    quantity: dto.quantity,
    observation: dto.observation,
    latitude: dto.latitude,
    longitude: dto.longitude,
  },
});
```

El controller pasa de `@Body() dto: any` a `@Body() dto: CreateInventoryDto` y el service tipa el parámetro como `CreateInventoryDto`.

### Helper compartido o inline

**Decisión: patrón inline en cada service, sin helper compartido.**

Razones:
1. Cada modelo tiene un set distinto de campos. Un helper `buildTenantPayload(currentUser, dto, fields)` con array de strings es genérico pero pierde el tipado de TypeScript — exactamente lo que queremos ganar.
2. La explícitud paga: leer el service muestra de un vistazo qué campos terminan en la DB. Un helper oculta eso tras una indirección.
3. Solo son 3 services con ~6-8 campos cada uno. El costo de repetición es bajo.
4. El compilador de TypeScript valida que el objeto pasado a Prisma cumple `Prisma.InventoryRecordCreateInput`. Cualquier campo que falte o sobre lo detecta `tsc`, no necesita validación adicional.

## Cambio de binding en endpoint GPS

Hoy el controller usa:

```typescript
@Post('batch')
batch(@Body('points') points: any[]) { ... }
```

Pasa a:

```typescript
@Post('batch')
batch(@Body() dto: CreateGpsBatchDto) {
  return this.gpsService.batch(currentUser, dto.points);
}
```

**El contrato HTTP NO cambia**: el cliente sigue enviando `{ "points": [...] }`. Lo que cambia es solo el binding interno — en vez de extraer la clave `points` directo del body, instanciamos `CreateGpsBatchDto` (que tiene `points: GpsPointDto[]` validado) y leemos la propiedad. El cliente nota la diferencia solo si envía campos extra a nivel raíz del body (con `forbidNonWhitelisted: true` ahora reciben 400 — comportamiento deseado).

La validación de `points.length > 50` permanece en el service (es regla de negocio, no validación de schema).

## Verificación de la app móvil

**Procedimiento:**

1. Ejecutar `rg "api\.(post|patch|put|delete)" apps/mobile/src/` para listar todas las llamadas que envían body.
2. Por cada llamada, registrar: endpoint, método, campos del payload enviado.
3. Comparar 1-a-1 contra los DTOs nuevos. Para cada campo en el payload móvil:
   - ¿Está en el DTO?
   - ¿El tipo coincide (string/number/boolean/array)?
   - Si es número, ¿se envía como `number` o como `string`?
4. Detectar también `fetch(...)` directos por si hay llamadas que evitan el cliente HTTP del proyecto.

**Output esperado**: archivo `openspec/changes/dto-validation-backend/mobile-audit.md` con tabla:

| Endpoint | Método | Campos enviados | Campos en DTO | Discrepancias | Acción |
|----------|--------|-----------------|---------------|---------------|--------|
| /api/inventory | POST | depositCode, productCode, quantity, observation, latitude, longitude | (idem) | ninguna | OK |
| ... | | | | extraField `deviceId` | agregar `@IsOptional() @IsString() deviceId?` o limpiar cliente |

Este archivo es **bloqueante**: no se activa `forbidNonWhitelisted: true` (paso final) hasta que la tabla muestre cero discrepancias sin resolver.

## Orden de implementación

El orden propuesto en la proposal está bien excepto por dos ajustes:

1. **Mobile audit va PRIMERO**, antes de cualquier DTO. Es el insumo que define si algún DTO necesita campos opcionales adicionales que no surgen del schema.
2. **El flag estricto `forbidNonWhitelisted: true` va en una rama/commit aparte**, después de que TODOS los DTOs estén en su lugar Y de validar la mobile audit. Si falla en producción, el revert es atómico (solo `main.ts`, sin tocar DTOs).

Orden final:

| # | Tarea | Depende de | Razón |
|---|-------|------------|-------|
| 0 | Mobile audit → `mobile-audit.md` | — | Bloqueante para paso 11 |
| 1 | `inventory` DTO + controller + service refactor | 0 | P0 inyección tenant |
| 2 | `attendance` DTO + controller + service refactor | 0 | P0 inyección tenant |
| 3 | `guard` DTO + controller + service refactor | 0 | P0 inyección tenant |
| 4 | `sync` DTO + controller | 0 | Cierra bug 500→400 |
| 5 | `orders` DTO (anidado) + controller | 0 | Patrón anidado primero |
| 6 | `medical-visits` DTO (anidado) + controller | 5 | Reusa patrón de 5 |
| 7 | `courier` DTO (anidado) + controller | 5 | Reusa patrón de 5 |
| 8 | `gps` DTO + cambio de binding | 0 | Bajo riesgo |
| 9 | `visits` mover DTO inline a `dto/` | 0 | Mecánico |
| 10 | `metadata` DTOs | 0 | Mecánico |
| 11 | `main.ts` → `forbidNonWhitelisted: true` + `enableImplicitConversion: false` | 1-10 + audit limpia | Último paso, commit aparte |

No hay dependencias técnicas entre módulos (cada uno es self-contained). Las dependencias 6→5 y 7→5 son solo de **patrón de implementación** (hacer el anidado más simple primero para fijar el estilo).

## Diagrama de flujo de validación

```
Cliente HTTP
    |
    | POST /api/inventory { depositCode, productCode, quantity, companyId: "fake", extra: "x" }
    v
+--------------------+
| AuthGuard (JWT)    |  -> 401 si token inválido
+--------------------+
    |
    | currentUser = { companyId: "REAL", userId: "U1" }
    v
+----------------------------+
| ModuleGuard ('inventory')  |  -> 403 si módulo deshabilitado
+----------------------------+
    |
    v
+------------------------------------------+
| ValidationPipe (global, en main.ts)      |
|  - whitelist: true                       |  -> elimina 'extra'
|  - forbidNonWhitelisted: true            |  -> 400 si 'companyId' está y no es del DTO
|  - transform: true                       |  -> instancia CreateInventoryDto
|  Aplica decoradores:                     |
|   @IsString @IsNotEmpty depositCode      |  -> 400 si vacío
|   @Type(()=>Number) @IsNumber quantity   |  -> 400 si "abc"
|   @IsOptional @Min(-90) @Max(90) latitude|  -> 400 si fuera de rango
+------------------------------------------+
    |
    | dto: CreateInventoryDto (instancia validada, SIN companyId ni extra)
    v
+-------------------------------+
| Controller                    |
|  inventory.create(user, dto)  |
+-------------------------------+
    |
    v
+----------------------------------------+
| Service (campos EXPLÍCITOS, no spread) |
|  prisma.inventoryRecord.create({       |
|    data: {                             |
|      companyId: user.companyId, // del JWT, NUNCA del body
|      userId: user.userId,              |
|      depositCode: dto.depositCode,     |
|      ...                               |
|    }                                   |
|  })                                    |
+----------------------------------------+
    |
    v
DB
```

## Decisiones de arquitectura

| # | Decisión | Alternativas consideradas | Razón |
|---|----------|---------------------------|-------|
| 1 | Un archivo por entidad agrupando Create/Update/items anidados | Un archivo por DTO; carpeta `dto/items/` separada | Consistencia con `companies` (3 DTOs juntos) y `users` (2 DTOs juntos); items anidados solo existen en contexto del padre |
| 2 | `@Type(() => Number)` explícito en todos los números | Confiar en `transform: true` con `enableImplicitConversion: true` | App móvil React Native puede enviar números como string; explicit > implicit; fail-fast |
| 3 | Enums importados desde `@prisma/client` | Strings literales con `@IsIn([...])`; enums duplicados en el DTO | Single source of truth; drift entre schema y DTO es imposible |
| 4 | Sin helper `buildTenantPayload` — fields explícitos inline | Helper compartido con array de field names | TypeScript valida campos contra `Prisma.*CreateInput`; helper pierde tipado |
| 5 | Formato de error 400 por defecto del ValidationPipe | `exceptionFactory` con shape custom alineado a `ErrorResponse` | No existe `ErrorResponse` compartido todavía; se difiere a cambio dedicado |
| 6 | `forbidNonWhitelisted: true` + `enableImplicitConversion: false` | Solo `forbidNonWhitelisted: true` con coerción implícita | Predictibilidad: explicit type coercion en DTOs vence a magia global |
| 7 | Mobile audit como artefacto separado (`mobile-audit.md`) bloqueante | Audit inline en design.md; audit en tasks como subtarea | Es producto del análisis del cliente, no del diseño del servidor; bloquea solo el paso final |
| 8 | GPS cambia binding `@Body('points')` → `@Body() dto: CreateGpsBatchDto` | Mantener binding actual con DTO custom de un solo campo | Tipado completo del body, validación de `points` y rechazo de campos extra; HTTP contract intacto |
| 9 | Flag estricto en commit/paso aparte (paso 11) | Activar el flag desde el primer módulo | Rollback atómico ante regresión sin perder los DTOs |
| 10 | `metadata` entra en scope | Dejarlo fuera (no estaba en lista original) | Tiene el mismo problema (destructuring inline sin validators); costo bajo y cierra completamente la deuda |

## Compatibilidad y migración

**Durante la transición (pasos 1 a 10, antes del flag estricto):**

- Cada módulo se puede mergear independiente. Un módulo con DTO instalado y otros sin DTO conviven sin conflicto: el ValidationPipe es global pero solo activa decoradores cuando el `@Body()` está tipado a una clase con metadata. Los `@Body() dto: any` restantes pasan sin validación, como hoy.
- El comportamiento externo no cambia: los payloads aceptados siguen siendo los mismos, simplemente algunos endpoints empiezan a rechazar payloads mal formados con 400 (antes 500 o aceptados silenciosamente). Esto es una mejora, no un breaking change.
- Los services refactorizados (`inventory`/`attendance`/`guard`) siguen funcionando incluso si el ValidationPipe fallara, porque ya no hacen spread del body. Defensa en profundidad.

**Activación del flag estricto (paso 11):**

- Único punto con riesgo real de regresión. Mitigado por mobile-audit limpio antes de activarlo.
- Si una regresión aparece igual, revert atómico del commit de `main.ts` restaura el comportamiento permisivo en minutos sin tocar DTOs ni services.
- Los DTOs y refactors permanecen — el rollback no devuelve el sistema al estado original, sino al estado "DTOs aplicados pero permisivos", que sigue siendo mejor que el inicial.
