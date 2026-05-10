# Propuesta: dto-validation-backend

## Intent

Normalizar la validación de entrada en los 10 módulos del backend que hoy aceptan payloads sin contrato de tipo (`@Body() dto: any` o tipos TypeScript inline sin decoradores), eliminando el riesgo de inyección de `companyId` vía spread y cerrando la deuda P0 detectada al archivar `backend-modules`.

## Contexto

El cambio anterior `backend-modules` entregó la funcionalidad operativa de 10 módulos (visits, orders, gps, inventory, attendance, guard, medical-visits, courier, sync, metadata), pero al archivarlo se detectó como **deuda crítica P0** que sólo 3 módulos (`auth`, `companies`, `users`) tienen DTOs con `class-validator`. Los 10 restantes aceptan cualquier payload, y tres de ellos (`inventory`, `attendance`, `guard`) hacen `{ companyId, userId, ...data }` en el service: un cliente malicioso puede enviar `companyId` en el body y romper el aislamiento multi-tenant escribiendo en otra empresa.

Adicionalmente, `sync` falla con HTTP 500 (constraint Prisma `P2002`) cuando `idempotencyKey` llega vacío, en lugar del 400 correcto. Hacerlo AHORA, antes de sumar más módulos o features, evita propagar el patrón inseguro y mantiene paridad con el patrón ya establecido en `companies`/`users`.

## Alcance

### Incluye

Normalización de los **10 módulos** sin DTO o con DTO mal ubicado, en este orden de prioridad:

1. `inventory` — refactor service + DTO (RIESGO ALTO)
2. `attendance` — refactor service + DTO (RIESGO ALTO)
3. `guard` — refactor service + DTO (RIESGO ALTO)
4. `sync` — DTO con `idempotencyKey` requerido (cierra bug 500 → 400)
5. `orders` — DTO con `@ValidateNested` para `items[]` + `@ArrayMinSize(1)`
6. `medical-visits` — DTO con `@ValidateNested` para `products[]`
7. `courier` — DTO con `@ValidateNested` para `items[]`
8. `gps` — DTO `CreateGpsBatchDto` con `points[]` validado
9. `visits` — mover `CreateVisitDto` inline del controller a `dto/`
10. `metadata` — crear `CreateMetadataItemDto` y `UpdateMetadataItemDto`

Adicionalmente:

- **`apps/api/src/main.ts`**: activar `forbidNonWhitelisted: true` en el `ValidationPipe` global.
- **Refactor de 3 services con spread**: `inventory.service.ts`, `attendance.service.ts`, `guard.service.ts` pasan a leer campos explícitos del DTO tipado (`dto.depositCode`, `dto.productCode`, etc.) en lugar de `...data`.
- **Verificación previa de payloads móviles** (BLOQUEANTE antes de activar el flag estricto): auditar la app móvil React Native del proyecto para confirmar que ningún cliente envía campos extra que hoy se descartan silenciosamente.

### No incluye (fuera de scope)

- **Tests unitarios y e2e de los DTOs** — va en el cambio `testing-foundation`.
- **Features incompletas vs spec** detectadas en exploration: `orders` sin items completos, `medical-visits` sin lógica de productos, `courier` sin lectura de barcode. Cada uno es un cambio aparte.
- **Otros portales/apps** (admin web, mobile React Native) — sólo se audita la móvil para el punto bloqueante, no se modifica.
- **Refactor de `auth`, `companies`, `users`** — ya cumplen el patrón.
- **Cambios al contrato HTTP**: los payloads aceptados siguen siendo los mismos, sólo se validan estrictamente.

## Aproximación propuesta

1. **Verificación previa (BLOQUEANTE)**: auditar el código de la app móvil React Native buscando todos los `fetch`/`axios` que peguen contra `/api/*`. Listar cualquier campo que envíen y no esté en el schema esperado. Si aparece alguno, decidir caso por caso: agregarlo al DTO como `@IsOptional()` o limpiarlo del cliente. Sin este paso, `forbidNonWhitelisted: true` rompe producción.

2. **Crear DTOs siguiendo el patrón `companies`/`users`**:
   - Carpeta `dto/` por módulo con un archivo por entidad (`create-{entity}.dto.ts`, `update-{entity}.dto.ts` cuando aplique).
   - Decoradores `class-validator` consistentes con los ya usados (`@IsString`, `@IsNotEmpty`, `@IsEnum`, `@IsOptional`, `@IsNumber`, `@IsArray`, `@IsBoolean`, `@MinLength`).
   - Para arrays anidados (`orders`, `medical-visits`, `courier`): `@ValidateNested({ each: true })` + `@Type(() => ItemDto)` de `class-transformer`.
   - Tipar el `@Body()` con el DTO concreto en lugar de `any`.

3. **Refactorizar los 3 services con spread** (`inventory`, `attendance`, `guard`):
   - Reemplazar `{ companyId, userId, ...data }` por campos explícitos: `{ companyId, userId, depositCode: dto.depositCode, productCode: dto.productCode, ... }`.
   - Cierra el riesgo de inyección de `companyId` incluso si el flag estricto fallara.

4. **Activar `forbidNonWhitelisted: true` en `main.ts`** como último paso, después de validar el punto 1 y de tener los DTOs en su lugar.

## Impacto

### Módulos/paquetes afectados

- `apps/api/src/modules/visits/` — mover DTO inline a `dto/`
- `apps/api/src/modules/orders/` — nuevo `dto/`, controller tipado
- `apps/api/src/modules/gps/` — nuevo `dto/`, controller tipado
- `apps/api/src/modules/inventory/` — nuevo `dto/`, controller tipado, service refactor
- `apps/api/src/modules/attendance/` — nuevo `dto/`, controller tipado, service refactor
- `apps/api/src/modules/guard/` — nuevo `dto/`, controller tipado, service refactor
- `apps/api/src/modules/medical-visits/` — nuevo `dto/`, controller tipado
- `apps/api/src/modules/courier/` — nuevo `dto/`, controller tipado
- `apps/api/src/modules/sync/` — nuevo `dto/`, controller tipado
- `apps/api/src/modules/metadata/` — nuevo `dto/`, controller tipado
- `apps/api/src/main.ts` — activar `forbidNonWhitelisted: true`

### Aislamiento multi-tenant

- **Mejora directa**: los services de `inventory`, `attendance` y `guard` dejan de spreadear el body. El `companyId` siempre proviene del token JWT autenticado, nunca del payload del cliente. Defensa en profundidad junto con `whitelist + forbidNonWhitelisted`.

### Compatibilidad

- **Breaking change potencial** con `forbidNonWhitelisted: true`: requests que hoy envían campos extra (silenciosamente descartados) pasan a recibir HTTP 400. Mitigado por la verificación previa de la app móvil.
- **Coerción de tipos** (`transform: true` ya activo): valores numéricos enviados como string (`"50"`) podrían fallar con `@IsNumber()` estricto. Si la app móvil lo hace, agregar `@Type(() => Number)` al campo en el DTO.

## Plan de rollback

Cada cambio es atómico por módulo. Si una validación rompe producción:

1. **Rollback del flag**: revertir el commit de `main.ts` (`forbidNonWhitelisted: false`) — restaura el comportamiento permisivo en minutos sin tocar DTOs.
2. **Rollback por módulo**: `git revert` del commit del módulo afectado. Los DTOs son aditivos (no modifican el contrato HTTP), así que revertir uno sólo elimina la validación estricta de ese módulo.
3. **Rollback total**: `git revert` de la serie completa. Se pierde la mejora de seguridad pero el sistema vuelve al estado pre-cambio.

No hay migraciones de base de datos involucradas. Sin pérdida de datos en ningún escenario.

## Riesgos

| # | Riesgo | Severidad | Mitigación |
|---|--------|-----------|------------|
| 1 | App móvil envía campos extra hoy descartados → HTTP 400 masivos al activar el flag | ALTA | Verificación previa BLOQUEANTE del código móvil antes del paso 4 |
| 2 | App móvil envía números como string (`"50"`) → falla `@IsNumber()` | MEDIA | Detectar en la auditoría móvil; agregar `@Type(() => Number)` cuando aplique |
| 3 | `@ValidateNested` mal configurado en `orders`/`medical-visits`/`courier` → arrays no se validan | MEDIA | Usar `@Type(() => ItemDto)` siempre junto con `@ValidateNested({ each: true })`; revisar en code review |
| 4 | Refactor de spread en 3 services omite algún campo del schema Prisma → INSERT falla | MEDIA | Comparar 1-a-1 contra el schema actual al refactorizar; cubrir en sdd-verify |
| 5 | `gps` cambia de `@Body('points')` a `@Body() dto` → rompe binding si el cliente no envía `{ "points": [...] }` | BAJA | Confirmar en exploration: el cliente ya envía objeto wrapeado; sólo cambia el binding del controller |
| 6 | `sync.payload` es JSON libre → no se puede validar estrictamente | BAJA | Mantener `payload: any` con `@IsObject()` en el DTO; sólo `entityType` y `idempotencyKey` se validan |

## Métricas de éxito

1. **Cero `@Body() dto: any`** en el directorio `apps/api/src/modules/`.
2. **Cero destructuring TypeScript inline** sin DTO en controllers (incluye `metadata`).
3. **`forbidNonWhitelisted: true`** activo en `main.ts` y la app móvil funciona sin regresiones.
4. **Cero spreads del body** en los services (`...data` o `...dto`) en `inventory`, `attendance`, `guard`.
5. **`sync` retorna HTTP 400** (no 500) cuando `idempotencyKey` falta o está vacío.
6. **`orders` rechaza** payloads con `items: []` con HTTP 400 (`@ArrayMinSize(1)`).
7. **Patrón consistente**: cada módulo tiene su `dto/create-*.dto.ts` (y `update-*.dto.ts` cuando aplica), mismo estilo que `companies`/`users`.
