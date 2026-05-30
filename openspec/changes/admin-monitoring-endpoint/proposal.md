# Propuesta: admin-monitoring-endpoint

## Intent

Habilitar el monitoreo GPS cross-tenant para el rol `SUPER_ADMIN` exponiendo un endpoint dedicado `GET /api/admin/gps/last-positions` que la página `apps/admin/src/app/monitoring/page.tsx` ya está esperando consumir. Resolver la deuda P1/W2 documentada en el archive-report de `dto-validation-backend`.

## Contexto

La UI de monitoreo global del admin está terminada hace varios sprints: tiene selector de empresa, mapa Leaflet, stats y un `MapView` que renderiza markers a partir de `Position[]`. Sin embargo, el handler `loadPositions(companyId)` hace `setPositions([])` con un comentario explícito que dice: _"Para monitoreo global necesitaríamos un endpoint admin específico"_. El endpoint actual `GET /api/gps/last-positions` filtra por el `companyId` extraído del JWT, y un `SUPER_ADMIN` tiene `companyId = null`, lo que hace que la query `WHERE company_id = ${companyId}` con `null` devuelva 0 filas.

Esto se vuelve urgente AHORA porque:
1. El archive-report de `dto-validation-backend` etiquetó esta brecha como deuda P1.
2. El usuario reportó explícitamente que necesita rastreo en vivo desde el portal admin para validar despliegues de campo.
3. La UI ya está en producción mostrando vacío permanente — degrada confianza.
4. Es un cambio acotado (un módulo nuevo + 3 líneas de frontend) que desbloquea valor inmediato.

Adicionalmente, el helper de tests `signTokenFor` declara `companyId: string` (no acepta `null`), lo que impide escribir specs e2e correctos para escenarios de `SUPER_ADMIN`. Aprovechamos este cambio para mejorar la infraestructura de testing.

## Alcance

### Incluye

- Nuevo módulo `apps/api/src/modules/admin/`:
  - `admin.module.ts` con `AdminGpsController`, `AdminGpsService` e imports necesarios (`PrismaModule` vía `PrismaService` global o local según convención del repo).
  - `admin-gps.controller.ts` con endpoint `GET /api/admin/gps/last-positions`.
  - `admin-gps.service.ts` con `$queryRaw` que hace `LEFT JOIN gps_locations` con `users` para incluir el nombre.
- Guards a nivel de clase: `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('SUPER_ADMIN')`. **NO** se aplica `ModuleGuard` porque admin es transversal a módulos contratados.
- Query param `companyId?: string` opcional (vía `@Query('companyId')` con `@IsOptional() @IsUUID()` o `@IsString()` en un DTO ligero).
  - Si viene: filtra `WHERE gl.company_id = ${companyId}`.
  - Si no viene: cross-tenant (sin WHERE de empresa).
- Shape de response:
  ```typescript
  {
    userId: string;
    latitude: number;
    longitude: number;
    accuracy: number | null;
    speed: number | null;
    batteryLevel: number | null;
    recordedAt: string;
    userName: string | null;  // "FirstName LastName" o null si LEFT JOIN no matchea
  }
  ```
- Registrar `AdminModule` en `apps/api/src/app.module.ts`.
- Actualizar `apps/api/test/helpers/auth.ts`: relajar el tipo del parámetro `user.companyId` de `string` a `string | null` en `signTokenFor`. Mantener compatibilidad backward (los specs que pasan `string` siguen funcionando).
- Frontend: reemplazar el bloque `try` del `loadPositions` en `apps/admin/src/app/monitoring/page.tsx` (líneas 34-37) por la llamada real al endpoint.
- Tests e2e nuevos en `apps/api/test/admin-monitoring.e2e-spec.ts`:
  1. SUPER_ADMIN sin `companyId` → 200, devuelve posiciones cross-tenant (al menos 2 empresas distintas).
  2. SUPER_ADMIN con `?companyId=X` → 200, devuelve solo posiciones de X.
  3. COMPANY_ADMIN autenticado → 403.
  4. FIELD_WORKER autenticado → 403.
  5. Sin token → 401.
  6. Shape de respuesta incluye `userName` con formato `"FirstName LastName"`.

### No incluye (fuera de scope)

- Filtros temporales (`from`/`to`) — la UI del admin no los tiene. YAGNI.
- Paginación — admin es un usuario único con volumen acotado; se evalúa cuando escale.
- Otros endpoints admin (companies stats, audit logs, dashboards agregados) — futuros cambios independientes.
- Cambiar el endpoint existente `GET /api/gps/last-positions` — sigue funcionando idéntico para tenants.
- Refactor del `$queryRaw` de `GpsService.getLastPositions` — se mantiene tal cual.
- Mobile / Expo — no aplica, es feature exclusiva del portal admin web.
- Branch protection rules / CI policies — no aplica.
- Crear un índice nuevo en `gps_locations` para soportar full scan cross-tenant — se acepta el costo en MVP; se reevaluará si hay degradación medible.

## Aproximación propuesta

### Paso 1: Helper de tests (infraestructura)

Actualizar `apps/api/test/helpers/auth.ts`:
- Cambiar la firma de `signTokenFor` para que el parámetro `user.companyId` sea `string | null`.
- El `JwtPayload` ya permite `null` (confirmado en exploration); solo se está alineando el tipo del helper con la realidad del payload.
- No requiere cambios en specs existentes — TypeScript acepta `string` donde se pide `string | null`.

### Paso 2: Backend module

- Crear `apps/api/src/modules/admin/admin.module.ts` con `controllers: [AdminGpsController]` y `providers: [AdminGpsService]`.
- Crear `apps/api/src/modules/admin/admin-gps.controller.ts`:
  ```typescript
  @Controller('admin/gps')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  export class AdminGpsController {
    constructor(private service: AdminGpsService) {}

    @Get('last-positions')
    getLastPositions(@Query('companyId') companyId?: string) {
      return this.service.getLastPositions(companyId);
    }
  }
  ```
- Crear `apps/api/src/modules/admin/admin-gps.service.ts` con un `$queryRaw` que hace `LEFT JOIN` con `users` y aplica `WHERE` condicional vía `Prisma.sql` para mantener seguridad contra SQL injection:
  ```sql
  SELECT DISTINCT ON (gl.user_id)
    gl.user_id AS "userId",
    gl.latitude, gl.longitude, gl.accuracy, gl.speed,
    gl.battery_level AS "batteryLevel",
    gl.recorded_at AS "recordedAt",
    CASE
      WHEN u.id IS NOT NULL THEN CONCAT(u.first_name, ' ', u.last_name)
      ELSE NULL
    END AS "userName"
  FROM gps_locations gl
  LEFT JOIN users u ON u.id = gl.user_id
  [WHERE gl.company_id = ${companyId}]
  ORDER BY gl.user_id, gl.recorded_at DESC
  ```
- Registrar `AdminModule` en `apps/api/src/app.module.ts`.

### Paso 3: Tests e2e

Crear `apps/api/test/admin-monitoring.e2e-spec.ts` con los 6 escenarios listados. Setup:
- 2 empresas (`companyA`, `companyB`) con módulo GPS habilitado.
- 1 usuario `FIELD_WORKER` por empresa con 2 puntos GPS cada uno.
- 1 `COMPANY_ADMIN` en `companyA`.
- 1 `SUPER_ADMIN` con `companyId: null`.

### Paso 4: Frontend

Modificar `apps/admin/src/app/monitoring/page.tsx` líneas 34-37:
```typescript
try {
  const r = await api.get('/admin/gps/last-positions', { params: { companyId } });
  setPositions(r.data);
}
```

### Paso 5: Verificación

- `npm test` desde raíz.
- `npm run test:e2e` en `apps/api`.
- Smoke manual: levantar admin, ir a `/monitoring`, seleccionar una empresa con datos GPS, verificar que el mapa muestra markers con popup `"FirstName LastName"`.

## Impacto

### Archivos afectados

| Archivo | Acción |
|---------|--------|
| `apps/api/src/modules/admin/admin.module.ts` | CREAR |
| `apps/api/src/modules/admin/admin-gps.controller.ts` | CREAR |
| `apps/api/src/modules/admin/admin-gps.service.ts` | CREAR |
| `apps/api/src/app.module.ts` | MOD (importar `AdminModule`) |
| `apps/api/test/helpers/auth.ts` | MOD (relajar tipo `companyId` a `string \| null`) |
| `apps/api/test/admin-monitoring.e2e-spec.ts` | CREAR |
| `apps/admin/src/app/monitoring/page.tsx` | MOD (líneas 34-37) |

### Multi-tenant safety

El endpoint está protegido con `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('SUPER_ADMIN')` a nivel de clase. `RolesGuard` no está registrado globalmente (confirmado en exploration), por lo que debe declararse explícitamente — lo hacemos. `SUPER_ADMIN` es el único rol que puede acceder. El service usa el `companyId` del query string (opcional), nunca del JWT, lo que es seguro porque el JWT de `SUPER_ADMIN` tiene `companyId: null`.

### Compatibilidad

Sin breaking changes:
- Endpoint nuevo, no modifica los existentes.
- El helper `signTokenFor` con tipo relajado mantiene compatibilidad backward total (TypeScript covariance).
- El `GpsService.getLastPositions` original sigue intacto.

## Plan de rollback

- Revertir el commit de creación del módulo `admin` elimina todo el backend (el `AdminModule` queda sin referencia y el import en `app.module.ts` también se revierte).
- El cambio en `monitoring/page.tsx` son 3 líneas — revert atómico.
- Si el endpoint tiene un bug en producción: deshabilitar la página `/monitoring` en el frontend (cambio de 1 línea en routing/menú) hasta resolver.

## Riesgos

| # | Riesgo | Severidad | Mitigación |
|---|--------|-----------|------------|
| 1 | `RolesGuard` no aplicado correctamente → bypass del aislamiento de roles | ALTA | Test e2e explícito que verifica que `COMPANY_ADMIN` y `FIELD_WORKER` reciben 403, y que sin token recibe 401 |
| 2 | Helper `signTokenFor` relajado rompe otros tests | MEDIA | TypeScript covariance preserva compatibilidad; correr suite completa antes del merge |
| 3 | `LEFT JOIN` con `users` degrada performance del query | BAJA | Es 1 join sobre tabla con índice por `id`; con `companyId` filtrado es eficiente |
| 4 | `userName` null si el usuario fue borrado pero `gps_locations` sigue ahí | BAJA | `LEFT JOIN` garantiza que devuelve `null` en lugar de omitir el row; mapa muestra `userId` como fallback |
| 5 | Frontend rompe si endpoint devuelve 500 | BAJA | El try/catch existente en `loadPositions` captura y deja `positions` vacío sin crashear el render |
| 6 | `$queryRaw` cross-tenant es lento si hay millones de rows | BAJA | La UI siempre manda `companyId` actualmente; cross-tenant solo se usaría si se agrega un botón "ver todo" futuro |

## Métricas de éxito

1. **`GET /api/admin/gps/last-positions` responde 200** cuando se invoca con un JWT de `SUPER_ADMIN`.
2. **Mismo endpoint responde 403** con `COMPANY_ADMIN` o `FIELD_WORKER`.
3. **Mismo endpoint responde 401** sin token o con token inválido.
4. **Response shape incluye `userName`** con formato `"FirstName LastName"` (o `null` si el usuario fue eliminado).
5. **Query param `companyId` opcional**: si está presente filtra correctamente; si está ausente devuelve cross-tenant.
6. **Página `/monitoring` del admin muestra markers** en el mapa cuando hay datos GPS y se selecciona una empresa.
7. **Cero regresión**: los 190 tests existentes siguen pasando sin modificación.
