# Spec Delta: admin-monitoring-endpoint

## Resumen

Este cambio introduce el endpoint `GET /api/admin/gps/last-positions` dentro de un módulo `admin/` nuevo, protegido exclusivamente con `JwtAuthGuard + RolesGuard(@Roles('SUPER_ADMIN'))` sin `ModuleGuard`. El delta define contratos sobre la estructura de archivos, los guards de autenticación y autorización, el shape de respuesta con `userName` vía LEFT JOIN, el comportamiento del WHERE condicional con `Prisma.sql`, la infraestructura de testing para SUPER_ADMIN, y los cambios en el frontend de monitoreo. Resuelve la deuda P1/W2 del archive-report de `dto-validation-backend`.

---

## 1. Estructura de archivos

### E-01: Módulo admin existe [ESTÁTICO]

- DEBE existir `apps/api/src/modules/admin/admin.module.ts`
- DEBE exportar la clase `AdminModule` decorada con `@Module()`
- DEBE declarar `controllers: [AdminGpsController]`
- DEBE declarar `providers: [AdminGpsService]`
- NO DEBE declarar `imports: [...]` — `PrismaModule` es global y no necesita importarse
- NO DEBE declarar `exports: [...]` — el módulo es self-contained

### E-02: Controller admin-gps existe [ESTÁTICO]

- DEBE existir `apps/api/src/modules/admin/admin-gps.controller.ts`
- DEBE exportar la clase `AdminGpsController` decorada con `@Controller('admin/gps')`
- DEBE tener exactamente un método público: `getLastPositions(@Query() query: AdminGpsQueryDto)`
- El método DEBE estar decorado con `@Get('last-positions')`
- El método DEBE delegar a `this.svc.getLastPositions(query.companyId)`

### E-03: Service admin-gps existe [ESTÁTICO]

- DEBE existir `apps/api/src/modules/admin/admin-gps.service.ts`
- DEBE exportar la clase `AdminGpsService` decorada con `@Injectable()`
- DEBE declarar el método `getLastPositions(companyId?: string): Promise<AdminLastPositionRow[]>`
- DEBE exportar la interfaz `AdminLastPositionRow` con los campos: `userId`, `latitude`, `longitude`, `accuracy`, `speed`, `batteryLevel`, `recordedAt`, `userName`

### E-04: DTO de query params existe [ESTÁTICO]

- DEBE existir `apps/api/src/modules/admin/dto/admin-gps-query.dto.ts`
- DEBE exportar la clase `AdminGpsQueryDto`
- DEBE declarar el campo `companyId?: string` con los decoradores `@IsOptional()` y `@IsString()`
- NO DEBE usar `@IsUUID()` — el schema usa `cuid()`, no UUID v4
- NO DEBE tener más campos (YAGNI: sin `from`, `to`, `page`, `limit`)

### E-05: Registro en app.module.ts [ESTÁTICO]

- `apps/api/src/app.module.ts` DEBE importar `AdminModule` desde `'./modules/admin/admin.module'`
- `AdminModule` DEBE estar presente en el array `imports: [...]` del decorador `@Module()`
- El import DEBE estar en la sección de módulos transversales (posterior a módulos tenant)

---

## 2. Contratos de autenticación y autorización

### E-06: Guards a nivel de clase en el controller [ESTÁTICO]

- `AdminGpsController` DEBE tener `@UseGuards(JwtAuthGuard, RolesGuard)` aplicado a nivel de clase (no de método)
- DEBE tener `@Roles('SUPER_ADMIN')` aplicado a nivel de clase
- NO DEBE tener `@UseGuards(ModuleGuard)` en ningún punto del controller — admin es transversal y no depende de módulos contratados por tenant
- Verificable con grep: `grep -n "ModuleGuard" apps/api/src/modules/admin/admin-gps.controller.ts` → cero matches

### E-07: SUPER_ADMIN puede acceder al endpoint [RUNTIME]

- DADO un usuario con `role: 'SUPER_ADMIN'` y `companyId: null` en el JWT
- CUANDO realiza `GET /api/admin/gps/last-positions`
- ENTONCES la respuesta DEBE ser HTTP 200
- Y el body DEBE ser un array (puede estar vacío si no hay datos GPS)

### E-08: COMPANY_ADMIN recibe 403 [RUNTIME]

- DADO un usuario con `role: 'COMPANY_ADMIN'` y `companyId` válido en el JWT
- CUANDO realiza `GET /api/admin/gps/last-positions`
- ENTONCES la respuesta DEBE ser HTTP 403
- Y el body DEBE contener `statusCode: 403`

### E-09: FIELD_WORKER recibe 403 [RUNTIME]

- DADO un usuario con `role: 'FIELD_WORKER'` y `companyId` válido en el JWT
- CUANDO realiza `GET /api/admin/gps/last-positions`
- ENTONCES la respuesta DEBE ser HTTP 403

### E-10: Sin token recibe 401 [RUNTIME]

- DADO una request sin header `Authorization`
- CUANDO se realiza `GET /api/admin/gps/last-positions`
- ENTONCES la respuesta DEBE ser HTTP 401

### E-11: Token con firma inválida recibe 401 [RUNTIME]

- DADO una request con header `Authorization: Bearer <token-con-firma-incorrecta>`
- CUANDO se realiza `GET /api/admin/gps/last-positions`
- ENTONCES la respuesta DEBE ser HTTP 401

---

## 3. Contratos del endpoint — query params

### E-12: Sin companyId — respuesta cross-tenant [RUNTIME]

- DADO SUPER_ADMIN autenticado y datos GPS de dos empresas distintas (A y B) con un user cada una
- CUANDO realiza `GET /api/admin/gps/last-positions` sin query params
- ENTONCES la respuesta DEBE ser HTTP 200
- Y el body DEBE ser un array con exactamente 2 elementos (uno por user, uno por empresa)
- Y los `userId` del array DEBEN incluir el user de empresa A y el user de empresa B

### E-13: Con companyId válido — filtra por empresa [RUNTIME]

- DADO SUPER_ADMIN autenticado y datos GPS de empresa A y empresa B
- CUANDO realiza `GET /api/admin/gps/last-positions?companyId=<idEmpresaA>`
- ENTONCES la respuesta DEBE ser HTTP 200
- Y el body DEBE contener SOLO posiciones de empresa A
- Y el body NO DEBE contener posiciones de empresa B

### E-14: Con companyId inexistente — 200 array vacío [RUNTIME]

- DADO SUPER_ADMIN autenticado
- CUANDO realiza `GET /api/admin/gps/last-positions?companyId=companyid-inexistente`
- ENTONCES la respuesta DEBE ser HTTP 200
- Y el body DEBE ser un array vacío `[]`

### E-15: companyId no-string (array, número) → 400 [RUNTIME]

- DADO SUPER_ADMIN autenticado
- CUANDO realiza `GET /api/admin/gps/last-positions` con un query param `companyId` que no sea string (ej: `companyId[]=abc` o un valor numérico coercible)
- ENTONCES la respuesta DEBE ser HTTP 400
- Y el body DEBE tener la forma `{ "statusCode": 400, "message": [...], "error": "Bad Request" }`
- Y el mensaje DEBE indicar que `companyId` debe ser un string

---

## 4. Contratos del shape de respuesta

### E-16: Campo userId presente y string [RUNTIME]

- DADO SUPER_ADMIN con `?companyId=<idEmpresaA>` que devuelve al menos un resultado
- ENTONCES cada elemento del array DEBE tener `userId` de tipo `string` y no vacío

### E-17: Campo latitude presente y numérico [RUNTIME]

- ENTONCES cada elemento del array DEBE tener `latitude` de tipo `number`

### E-18: Campo longitude presente y numérico [RUNTIME]

- ENTONCES cada elemento del array DEBE tener `longitude` de tipo `number`

### E-19: Campos opcionales nullable [RUNTIME]

- ENTONCES cada elemento del array DEBE tener los campos `accuracy`, `speed` y `batteryLevel`
- Y cada uno PUEDE ser `number` o `null` (son opcionales en el schema)

### E-20: Campo recordedAt presente [RUNTIME]

- ENTONCES cada elemento del array DEBE tener `recordedAt` definido y no nulo
- Y DEBE ser una representación temporal serializable (string ISO o Date)

### E-21: Campo userName con formato "FirstName LastName" [RUNTIME]

- DADO un user con `firstName: 'Juan'` y `lastName: 'Perez'`
- CUANDO el endpoint devuelve su última posición GPS
- ENTONCES `userName` DEBE ser `'Juan Perez'` (concatenación con un espacio)
- Y el campo DEBE ser de tipo `string`

### E-22: userName es null si el user fue borrado [RUNTIME]

- DADO una fila en `gps_locations` cuyo `userId` no tiene correspondencia en `users` (user eliminado)
- CUANDO SUPER_ADMIN consulta el endpoint
- ENTONCES la fila DEBE aparecer en el array igualmente
- Y `userName` DEBE ser `null`
- Y el resto de campos GPS DEBEN conservar sus valores correctos

---

## 5. Contratos del query SQL

### E-23: DISTINCT ON garantiza una sola posición por user [RUNTIME]

- DADO un user con 5 registros en `gps_locations` con distintos `recorded_at`
- CUANDO SUPER_ADMIN consulta `GET /api/admin/gps/last-positions`
- ENTONCES el array DEBE contener exactamente UN elemento para ese user
- Y ese elemento DEBE corresponder al registro con el `recorded_at` más reciente

### E-24: Última posición es la más reciente por recorded_at [RUNTIME]

- DADO userIdA con 2 puntos: `lat=-25.0` en `10:00` y `lat=-25.3` en `11:00`
- CUANDO SUPER_ADMIN consulta con `?companyId=A`
- ENTONCES el elemento para userIdA DEBE tener `latitude: -25.3` (el de `11:00`)
- Y NO DEBE tener `latitude: -25.0` (el de `10:00`)

### E-25: LEFT JOIN no INNER JOIN — posiciones sin user se devuelven [RUNTIME]

- DADO un registro en `gps_locations` con `user_id` que no existe en la tabla `users`
- CUANDO SUPER_ADMIN consulta el endpoint
- ENTONCES ese registro DEBE aparecer en la respuesta
- Y `userName` DEBE ser `null` para ese registro
- Y el registro NO DEBE ser omitido

### E-26: Prisma.sql para WHERE condicional — sin string concatenation [ESTÁTICO]

- El cuerpo del método `getLastPositions` en `admin-gps.service.ts` DEBE usar `Prisma.sql` o `Prisma.empty` para el condicional de `companyId`
- NO DEBE construir el WHERE mediante concatenación de strings (ej: `"WHERE company_id = '" + companyId + "'"`))
- Verificable: `grep -n "WHERE" apps/api/src/modules/admin/admin-gps.service.ts` → el WHERE DEBE estar dentro de un template `Prisma.sql\`...\``
- Verificable: `grep -n "Prisma.empty" apps/api/src/modules/admin/admin-gps.service.ts` → DEBE existir al menos un match

### E-27: companyId es parámetro preparado, no interpolación literal [ESTÁTICO]

- La interpolación `${companyId}` en el template `Prisma.sql` DEBE ser tratada por Prisma como parámetro preparado (`$1`, `$2`, etc.)
- Esto es garantizado por el uso correcto del template literal de `Prisma.sql` — el spec lo documenta como contrato observable en los logs de query de Postgres

---

## 6. Contratos del helper signTokenFor

### E-28: signTokenFor acepta companyId null [ESTÁTICO]

- `apps/api/test/helpers/auth.ts` DEBE declarar el parámetro `user.companyId` con tipo `string | null`
- La firma DEBE ser: `user: { userId: string; email: string; role: UserRole; companyId: string | null }`
- NO DEBE tener el tipo anterior `companyId: string` (sin `| null`)
- Verificable: `grep -n "companyId" apps/api/test/helpers/auth.ts` → DEBE mostrar `string | null`

### E-29: Compatibilidad backward de signTokenFor [ESTÁTICO]

- Los specs existentes que llaman `signTokenFor` con `companyId: string` (no null) DEBEN seguir compilando sin modificación
- `tsc --noEmit` ejecutado sobre el workspace `apps/api` DEBE retornar exit code 0
- Ningún test existente DEBE requerir cambios de tipo para adaptarse al nuevo helper

### E-30: createSuperAdmin helper existe y funciona [ESTÁTICO + RUNTIME]

- `apps/api/test/helpers/auth.ts` DEBE exportar la función `createSuperAdmin(prisma: PrismaService, overrides?: Partial<{ email: string; password: string }>)`
- La función DEBE crear un user con `role: 'SUPER_ADMIN'` y `companyId: null` en la base de datos
- La función DEBE retornar `{ userId: string; email: string; password: string }`
- Si `overrides.email` no se provee, DEBE generar un email único para evitar colisiones entre tests
- Verificable: `grep -n "createSuperAdmin" apps/api/test/helpers/auth.ts` → DEBE existir la función exportada

---

## 7. Contratos del frontend

### E-31: monitoring/page.tsx llama al nuevo endpoint [ESTÁTICO]

- `apps/admin/src/app/monitoring/page.tsx` DEBE incluir la llamada `api.get('/admin/gps/last-positions'`
- El comentario `"Para monitoreo global necesitaríamos un endpoint admin específico"` NO DEBE existir en el archivo
- Verificable: `grep -n "endpoint admin específico" apps/admin/src/app/monitoring/page.tsx` → cero matches
- Verificable: `grep -n "admin/gps/last-positions" apps/admin/src/app/monitoring/page.tsx` → al menos un match

### E-32: Guard if (!companyId) en frontend [ESTÁTICO]

- La función `loadPositions` en `monitoring/page.tsx` DEBE retornar early cuando `companyId` sea falsy
- El early return DEBE llamar `setPositions([])` antes de retornar
- DEBE ejecutarse ANTES del bloque `try` con la llamada HTTP
- Esto previene full-scan cross-tenant accidental durante el estado inicial del componente (companyId vacío)

### E-33: Query param companyId pasa al backend [ESTÁTICO]

- La llamada `api.get(...)` en `loadPositions` DEBE incluir `{ params: { companyId } }` como segundo argumento
- NO DEBE hardcodear el companyId ni omitirlo

---

## 8. Contratos del archivo de tests e2e

### E-34: Archivo admin-monitoring.e2e-spec.ts existe [ESTÁTICO]

- DEBE existir `apps/api/test/admin-monitoring.e2e-spec.ts`
- DEBE importar `createSuperAdmin` y `signTokenFor` desde `'./helpers/auth'`
- DEBE declarar un `beforeEach` que crea al menos: 2 empresas, 1 FIELD_WORKER por empresa, 1 COMPANY_ADMIN en una empresa, 1 SUPER_ADMIN con `companyId: null`
- DEBE crear datos GPS para los workers (al menos 2 puntos por worker)
- DEBE limpiar la DB en cada `beforeEach` usando `truncateAll`

### E-35: Setup del ValidationPipe en el test [ESTÁTICO]

- El `beforeAll` del spec DEBE configurar `app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: false } }))` antes de `app.init()`
- DEBE incluir `app.setGlobalPrefix('api')`
- Esto alinea el entorno de test con la configuración de producción

---

## 9. Exclusiones explícitas

### E-36: NO hay filtros temporales [ESTÁTICO]

- El endpoint `GET /api/admin/gps/last-positions` NO DEBE aceptar parámetros `from` ni `to`
- `AdminGpsQueryDto` NO DEBE declarar campos de fecha o tiempo
- Si se envían `from` o `to` como query params, el `ValidationPipe` con `forbidNonWhitelisted` DEBE retornar HTTP 400

### E-37: NO hay paginación [ESTÁTICO]

- `AdminGpsQueryDto` NO DEBE declarar `page`, `limit`, `offset` ni ningún campo de paginación
- La respuesta DEBE ser siempre el array completo (sin metadata de paginación)

### E-38: NO se modifica el endpoint existente GET /api/gps/last-positions [ESTÁTICO]

- `apps/api/src/modules/gps/gps.controller.ts` NO DEBE ser modificado en este cambio
- `apps/api/src/modules/gps/gps.service.ts` NO DEBE ser modificado en este cambio
- El comportamiento del endpoint tenant `GET /api/gps/last-positions` DEBE permanecer idéntico al estado pre-cambio

### E-39: NO se aplica RolesGuard globalmente [ESTÁTICO]

- `apps/api/src/app.module.ts` NO DEBE registrar `RolesGuard` como provider global en `APP_GUARD`
- `RolesGuard` DEBE usarse exclusivamente como guard explícito en el controller donde se necesita
- Verificable: `grep -n "APP_GUARD" apps/api/src/app.module.ts` → cero matches con `RolesGuard`

### E-40: NO existe migration nueva [ESTÁTICO]

- NO DEBE crearse ningún archivo de migration de Prisma en este cambio
- `prisma/migrations/` NO DEBE tener archivos nuevos generados por este cambio
- `schema.prisma` NO DEBE ser modificado

---

## 10. Performance (documental)

### E-41: Query con companyId usa índice existente [DOCUMENTAL]

- CUANDO `GET /api/admin/gps/last-positions?companyId=X` se ejecuta
- ENTONCES PostgreSQL DEBE poder usar el índice compuesto `@@index([companyId, userId, recordedAt])` definido en el schema
- Este índice ya existe en el schema previo a este cambio — no se requiere migration nueva
- El `DISTINCT ON (gl.user_id)` con `WHERE gl.company_id = X` se beneficia de este índice

### E-42: Query sin companyId realiza full scan (aceptado para MVP) [DOCUMENTAL]

- CUANDO `GET /api/admin/gps/last-positions` se ejecuta sin filtro de empresa
- ENTONCES PostgreSQL realiza un full scan + sort sobre toda la tabla `gps_locations`
- ESTE COSTO ES ACEPTADO para MVP porque el SUPER_ADMIN es un usuario único con baja frecuencia de uso
- Si el volumen de datos crece o se agrega un botón "ver todo" en la UI, se evalúa `@@index([recordedAt])` + paginación en cambio separado

---

## 11. Multi-tenant safety

### E-43: COMPANY_ADMIN no puede leer posiciones de otra empresa [RUNTIME]

- DADO empresa A y empresa B con datos GPS
- CUANDO un COMPANY_ADMIN de empresa A intenta `GET /api/admin/gps/last-positions?companyId=<idEmpresaB>`
- ENTONCES la respuesta DEBE ser HTTP 403
- Y `RolesGuard` DEBE rechazar la request antes de que el service ejecute el query
- Y ninguna posición de empresa B DEBE ser devuelta

### E-44: El service usa companyId del query param, no del JWT [ESTÁTICO]

- `AdminGpsService.getLastPositions` DEBE recibir `companyId` como argumento explícito (del query param)
- El service NO DEBE acceder al JWT ni al `request.user` para obtener el `companyId` del WHERE
- Esto es correcto por diseño: el SUPER_ADMIN tiene `companyId: null` en su JWT, pero puede filtrar por cualquier empresa vía query param

---

## 12. Archivos que DEBEN existir al cierre del cambio

| Archivo | Estado | Contrato |
|---------|--------|----------|
| `apps/api/src/modules/admin/admin.module.ts` | CREAR | E-01 |
| `apps/api/src/modules/admin/admin-gps.controller.ts` | CREAR | E-02, E-06 |
| `apps/api/src/modules/admin/admin-gps.service.ts` | CREAR | E-03, E-26, E-27 |
| `apps/api/src/modules/admin/dto/admin-gps-query.dto.ts` | CREAR | E-04 |
| `apps/api/src/app.module.ts` | MODIFICAR | E-05 |
| `apps/api/test/helpers/auth.ts` | MODIFICAR | E-28, E-29, E-30 |
| `apps/api/test/admin-monitoring.e2e-spec.ts` | CREAR | E-34, E-35 |
| `apps/admin/src/app/monitoring/page.tsx` | MODIFICAR | E-31, E-32, E-33 |

---

## 13. Métricas de aceptación

1. `GET /api/admin/gps/last-positions` con JWT de SUPER_ADMIN retorna HTTP 200 y array con posiciones cross-tenant
2. El mismo endpoint retorna HTTP 403 con JWT de COMPANY_ADMIN o FIELD_WORKER
3. El mismo endpoint retorna HTTP 401 sin token
4. El campo `userName` tiene el formato `"FirstName LastName"` cuando el user existe, o `null` cuando fue eliminado
5. `GET /api/admin/gps/last-positions?companyId=X` devuelve SOLO posiciones de empresa X
6. El `DISTINCT ON` garantiza una sola posición por user (la más reciente)
7. `tsc --noEmit` en `apps/api` retorna exit code 0 — cero errores de tipos (backward compat del helper)
8. Los 190 tests existentes siguen pasando sin modificación (cero regresión)
9. La página `/monitoring` del admin muestra markers en el mapa cuando hay datos GPS y se selecciona una empresa
10. `grep -n "endpoint admin específico" apps/admin/src/app/monitoring/page.tsx` → cero matches
