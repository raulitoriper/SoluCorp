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

## Refactor de services con spread

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

## Verificación de la app móvil

**Procedimiento:**

1. Ejecutar `rg "api\.(post|patch|put|delete)" apps/mobile/src/` para listar todas las llamadas que envían body.
2. Por cada llamada, registrar: endpoint, método, campos del payload enviado.
3. Comparar 1-a-1 contra los DTOs nuevos.
4. Detectar también `fetch(...)` directos.

**Output esperado**: archivo `openspec/changes/dto-validation-backend/mobile-audit.md` con tabla de auditoría.

Este archivo es **bloqueante**: no se activa `forbidNonWhitelisted: true` (paso final) hasta que la tabla muestre cero discrepancias sin resolver.

## Orden de implementación

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

No hay dependencias técnicas entre módulos (cada uno es self-contained). Las dependencias 6→5 y 7→5 son solo de **patrón de implementación**.
