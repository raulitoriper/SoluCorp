# Exploration: admin-monitoring-endpoint

## Problema

La página de monitoreo global del admin (`apps/admin/src/app/monitoring/page.tsx`) ya tiene UI funcional con selector de empresa, mapa Leaflet y stats, pero el `loadPositions()` hace `setPositions([])` con un comentario que dice explícitamente: _"Para monitoreo global necesitaríamos un endpoint admin específico"_. El endpoint existente `GET /api/gps/last-positions` siempre filtra por `companyId` del JWT — un `SUPER_ADMIN` no tiene `companyId` en el token (campo es `null`), por lo que la query devolvería resultados incorrectos o vacíos. Esta es la deuda W2 del archive-report de `dto-validation-backend`.

## Estado actual

### apps/admin/src/app/monitoring/page.tsx

La UI ya está completa y tiene estructura cross-tenant:

- **Selector de empresa**: carga `GET /api/companies` y popula un `<select>`. El `selectedCompany` es el `companyId` elegido.
- **`loadPositions(companyId)`**: recibe el `companyId` seleccionado pero actualmente hace `setPositions([])` — body vacío con comentario.
- **`MapView`**: espera `Position[]` con shape `{ userId, latitude, longitude, accuracy?, speed?, batteryLevel?, recordedAt, userName? }`. El campo `userName` es opcional.
- **No hay filtros temporales** en la UI. Solo selector de empresa.

El único cambio requerido en la UI es reemplazar el bloque `try` del `loadPositions` (líneas 34-38) con la llamada real al endpoint.

### apps/api/src/modules/gps/

**Endpoints existentes en `GpsController`:**

| Método | Path | Auth |
|--------|------|------|
| `POST /api/gps/batch` | Guarda puntos GPS | `JwtAuthGuard + ModuleGuard(GPS_TRACKING)` |
| `GET /api/gps` | Historial por usuario | `JwtAuthGuard + ModuleGuard(GPS_TRACKING)` |
| `GET /api/gps/last-positions` | Última posición por user | `JwtAuthGuard + ModuleGuard(GPS_TRACKING)` |

El controlador tiene `@UseGuards(JwtAuthGuard, ModuleGuard)` y `@RequireModule('GPS_TRACKING')` a nivel de clase. **No usa `RolesGuard`** en ningún endpoint actual.

**`GpsService.getLastPositions(companyId)`** ejecuta:
```sql
SELECT DISTINCT ON (user_id) user_id as "userId", latitude, longitude,
  accuracy, speed, battery_level as "batteryLevel", recorded_at as "recordedAt"
FROM gps_locations
WHERE company_id = ${companyId}
ORDER BY user_id, recorded_at DESC
```

El `SUPER_ADMIN` tiene `companyId = null` en el JWT. Llamar a este método con `null` haría `WHERE company_id = NULL` — en SQL devuelve 0 rows. **El endpoint existente es inutilizable para admin.**

### Shape de datos

**Devuelve `getLastPositions`:** `{ userId, latitude, longitude, accuracy, speed, batteryLevel, recordedAt }`

**Espera `MapView` admin** (`apps/admin/src/components/MapView.tsx`):
```typescript
interface Position {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  batteryLevel?: number | null;
  recordedAt: string;
  userName?: string;   // opcional — popup
}
```

**Gap:** el endpoint NO devuelve `userName`. Sin JOIN con `users`, el mapa muestra `userId` (UUID) en el popup. Degradado pero funcional.

### Multi-tenant guards

`RolesGuard` (`apps/api/src/common/guards/roles.guard.ts`):
- Sin `@Roles(...)` → pasa todo (`true`).
- Con `@Roles('SUPER_ADMIN')` → verifica `user.role`.
- **No está registrado globalmente** — debe usarse explícitamente con `@UseGuards(RolesGuard)`.

`ModuleGuard`: tiene lógica para SUPER_ADMIN en línea 30: `if (!user?.companyId) return true` — el admin siempre pasa el check de módulos. **Confirma que ModuleGuard no es suficiente para restringir; necesitamos RolesGuard explícito.**

## Approaches

| # | Approach | Pros | Contras | Esfuerzo |
|---|----------|------|---------|----------|
| **A** | `GET /api/admin/gps/last-positions` — Nuevo controller `AdminGpsController` dentro de módulo `admin/` | Separación clara admin vs tenant; `admin/` puede crecer (stats, audit logs). | Nuevo módulo, controller, service method. Más boilerplate. | Medio |
| **B** | `GET /api/gps/admin/last-positions` — Nuevo endpoint en `GpsController` | Reutiliza módulo existente. | Mezcla concerns admin con tenant. El `@UseGuards` de clase aplica `ModuleGuard(GPS_TRACKING)` que pasa silenciosamente para admin — correcto pero confuso. | Bajo-Medio |
| **C** | `GET /api/gps/last-positions?companyId=xxx` — Extiende con param opcional | Cambio mínimo. | Lógica condicional fea, complica testing del tenant existente. Riesgo de romper aislamiento. Pésima separación. | Bajo |
| **D** | `GET /api/admin/monitoring/positions` — Módulo `admin` genérico cross-feature | Diseño escalable si hay más features admin. | Over-engineering para el caso actual. | Alto |

**Recomendación: Approach A — `GET /api/admin/gps/last-positions`**

Justificación: el módulo `admin/` es la convención natural para endpoints `SUPER_ADMIN`. Separa concerns, no toca el controller de tenant (zero riesgo de regresión), boilerplate mínimo. Si se agregan más endpoints admin (stats, audit), el módulo ya existe.

## Parámetros del endpoint

`GET /api/admin/gps/last-positions`

| Param | Tipo | Default | Justificación |
|-------|------|---------|---------------|
| `companyId` | `string?` | (ninguno — devuelve todas) | La UI ya tiene selector. Si viene, filtra; si no, cross-tenant. |
| — | — | — | NO agregar `from`/`to` en esta iteración. La UI no tiene date picker. YAGNI. |

## Performance / Escala

**Schema `GpsLocation`** índices:
```
@@index([companyId, userId, recordedAt])
@@index([companyId, recordedAt])
```

**No hay índice sobre `recordedAt` solo.** El `DISTINCT ON (user_id)` con `WHERE company_id = X` usa el índice compuesto — eficiente para un tenant.

**Cross-tenant sin filtro:** full scan + sort. Mitigaciones:
1. MVP: aceptar el costo — admin es usuario único.
2. Si escala: índice `@@index([recordedAt])` y paginación.

Para MVP, la UI siempre manda `companyId` → índice existente suficiente.

## Tests

**Existente `gps.e2e-spec.ts`:** validaciones del batch + test básico de `last-positions`. No hay aislamiento cross-tenant.

**Helper `signTokenFor`:** acepta `role: UserRole` y `companyId`. **Gap**: el helper requiere `companyId: string` (no acepta `null`). El `JwtPayload` permite `string | null`, pero el helper usa tipo más estricto. Necesita ajuste o `companyId: ''` workaround.

**Tests requeridos para `admin-monitoring.e2e-spec.ts`:**
1. SUPER_ADMIN sin `companyId` → 200 (cross-tenant)
2. SUPER_ADMIN con `?companyId=X` → 200, solo posiciones de X
3. COMPANY_ADMIN → 403
4. FIELD_WORKER → 403
5. Sin token → 401
6. Shape de respuesta incluye campos correctos (con `userName` si JOIN)

## Frontend integration

Cambios exactos en `apps/admin/src/app/monitoring/page.tsx`:

**Líneas 34-37** (bloque `try` actual):
```typescript
// ANTES
try {
  setPositions([]);
}

// DESPUÉS
try {
  const r = await api.get('/admin/gps/last-positions', { params: { companyId } });
  setPositions(r.data);
}
```

Cero cambios adicionales en la UI. El shape devuelto es compatible con `MapView`. Si el endpoint incluye `userName`, aparece automáticamente en el popup.

## Riesgos

1. **Seguridad crítico**: si `@UseGuards(RolesGuard)` no se aplica, cualquier usuario autenticado accede a datos cross-tenant. **El riesgo más alto del cambio.**
2. **Helper `signTokenFor` no acepta `null` companyId** para SUPER_ADMIN. Necesita ajuste o workaround.
3. **`ModuleGuard` silencioso para SUPER_ADMIN**: pasa automáticamente. Si se olvida `RolesGuard`, un COMPANY_ADMIN podría intentar acceder al endpoint admin.
4. **Gap `userName`**: sin JOIN, mapa muestra UUIDs. Degradado pero no roto.
5. **Performance cross-tenant sin índice dedicado**: full scan. Aceptable para MVP.

## Preguntas abiertas

1. **¿`companyId` requerido u opcional?** La UI siempre manda uno. ¿Soportar el caso sin? Si sí, ¿con qué límite?
2. **¿JOIN con `users` para `userName`?** Mejor UX vs cambio en `$queryRaw`. ¿MVP o iteración posterior?
3. **¿`signTokenFor` se actualiza para `companyId: null`?** ¿O wrappear con helper específico `signSuperAdminToken()`?
4. **¿Controller en `apps/api/src/modules/admin/gps/` o en `apps/api/src/modules/gps/admin.controller.ts`?**
5. **¿DTO de query params?** ValidationPipe con `@IsOptional() @IsString()` o raw string?
6. **¿`/api/admin/...` o `/api/gps/admin/...`?** Afecta controller prefix.
7. **¿Test en archivo dedicado `admin-monitoring.e2e-spec.ts` o agregar al `multi-tenant.e2e-spec.ts`?** Concerns distintos sugiere archivo nuevo.
