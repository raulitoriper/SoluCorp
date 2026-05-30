# Tareas: admin-monitoring-endpoint

> Activar endpoint admin GPS para SUPER_ADMIN: nuevo módulo `admin/` con controller protegido por `JwtAuthGuard + RolesGuard`, service con `$queryRaw` + LEFT JOIN users, helper de test relajado para `companyId: null`, y 3 líneas de cambio en el frontend de monitoreo.
> Orden: helpers de test → backend (DTO/service/controller/module) → registro → verificación de tipos → tests e2e → frontend → verificación final.

**Spec de referencia:** `openspec/changes/admin-monitoring-endpoint/spec.md` (44 escenarios, E-01 a E-44)
**Design de referencia:** `openspec/changes/admin-monitoring-endpoint/design.md` (código exacto + 10 decisiones)
**Total de tasks:** 14 (5 fases, secuenciales salvo F que es verificación)

---

## Fase A: Infraestructura de testing (sin breaking changes)

> Prerequisito de todo lo demás — los tests e2e de Fase D necesitan `createSuperAdmin` y el tipo relajado de `signTokenFor`. Esta fase NO toca código de producción.

- [ ] **A.1** Modificar `apps/api/test/helpers/auth.ts`: relajar el tipo del parámetro `user.companyId` en `signTokenFor` de `string` a `string | null`. Solo cambiar la firma — el body no necesita modificación porque `jwt.sign` acepta `null` en el payload sin problemas.
  Diff exacto en design.md sección "Helper signTokenFor".
  _Satisface: E-28, E-29_

- [ ] **A.2** En el mismo archivo `apps/api/test/helpers/auth.ts`, agregar al final la función exportada `createSuperAdmin(prisma: PrismaService, overrides?)` que crea un user con `role: 'SUPER_ADMIN'` y `companyId: null`. Sigue el patrón de `createTestUser` pero sin company. Código exacto en design.md sección "Helper signTokenFor".
  _Satisface: E-30_

- [ ] **A.3** Verificación: `cd apps/api && npx tsc --noEmit` DEBE retornar exit code 0. Confirma backward compat — los 8+ specs existentes que usan `signTokenFor` con `companyId: string` siguen compilando sin modificación.
  _Satisface: E-29_

---

## Fase B: Backend — archivos del módulo admin

> Crear los 4 archivos de producción en orden bottom-up (DTO → service → controller → module). Ninguno de los archivos del módulo `gps/` existente se modifica.

- [ ] **B.1** Crear `apps/api/src/modules/admin/dto/admin-gps-query.dto.ts` con la clase `AdminGpsQueryDto` y el campo `@IsOptional() @IsString() companyId?: string`. NO usar `@IsUUID()` — el schema usa `cuid()`, no UUID v4.
  _Satisface: E-04, E-36, E-37_

- [ ] **B.2** Crear `apps/api/src/modules/admin/admin-gps.service.ts` con la interfaz exportada `AdminLastPositionRow` y el método `getLastPositions(companyId?: string)` usando `$queryRaw` con `Prisma.sql` para el WHERE condicional y `Prisma.empty` para el caso sin filtro. El query usa `DISTINCT ON (gl.user_id)` + `LEFT JOIN users` + `CASE WHEN u.id IS NOT NULL THEN CONCAT(...)`. Código exacto en design.md sección "Service".
  _Satisface: E-03, E-22, E-23, E-24, E-25, E-26, E-27, E-44_

- [ ] **B.3** Crear `apps/api/src/modules/admin/admin-gps.controller.ts` con `@Controller('admin/gps')`, `@UseGuards(JwtAuthGuard, RolesGuard)` y `@Roles('SUPER_ADMIN')` aplicados a nivel de clase (no de método), y el método `@Get('last-positions') getLastPositions(@Query() query: AdminGpsQueryDto)` que delega a `this.svc.getLastPositions(query.companyId)`. SIN `@UseGuards(ModuleGuard)`.
  _Satisface: E-02, E-06, E-38, E-39_

- [ ] **B.4** Crear `apps/api/src/modules/admin/admin.module.ts` con `controllers: [AdminGpsController]` y `providers: [AdminGpsService]`. SIN imports (PrismaModule es global). SIN exports (módulo self-contained).
  _Satisface: E-01_

---

## Fase C: Registro y verificación de tipos

> Conectar el nuevo módulo al grafo de dependencias de NestJS y confirmar que no hay errores de tipos antes de escribir los tests.

- [ ] **C.1** Modificar `apps/api/src/app.module.ts`: agregar `import { AdminModule } from './modules/admin/admin.module'` y agregar `AdminModule` al final del array `imports` del decorador `@Module()`, en la sección de módulos transversales posterior a `SyncModule`. NO agregar `RolesGuard` como `APP_GUARD` global.
  _Satisface: E-05, E-39_

- [ ] **C.2** Verificación: `cd apps/api && npx tsc --noEmit` DEBE retornar exit code 0. Si falla, corregir antes de continuar — los tests e2e no arrancarán con errores de tipos.
  _Satisface: E-38, E-40 (implícito — cero regresiones)_

---

## Fase D: Tests e2e

> Crear el archivo de tests e2e con los 6 escenarios del design y verificar que pasan. El setup crea 2 empresas, 2 field workers, 1 company admin y 1 super admin, con 4 puntos GPS (2 por worker).

- [ ] **D.1** Crear `apps/api/test/admin-monitoring.e2e-spec.ts` con el código EXACTO del design (sección "Test e2e"). El `beforeAll` configura `ValidationPipe` con `{ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: false } }` y `app.setGlobalPrefix('api')`. El `beforeEach` usa `truncateAll`, crea el fixture completo y los 4 puntos GPS. Los 6 tests cubren: cross-tenant, filtrado por empresa (con DISTINCT ON verificado via lat `-25.3`), 403 COMPANY_ADMIN, 403 FIELD_WORKER, 401 sin token, y shape con `userName: 'Juan Perez'`.
  _Satisface: E-07, E-08, E-09, E-10, E-12, E-13, E-16, E-17, E-18, E-19, E-20, E-21, E-23, E-24, E-34, E-35_

- [ ] **D.2** Verificación: `cd apps/api && npm run test:e2e -- admin-monitoring` DEBE pasar los 6 tests. Si alguno falla, corregir antes de continuar a Fase E. Tiempo esperado < 5s.
  _Satisface: E-07, E-08, E-09, E-10, E-12, E-13, E-21_

---

## Fase E: Frontend

> Cambio mínimo en monitoring/page.tsx — 5 líneas efectivas. Sin tocar otros archivos del admin.

- [ ] **E.1** Modificar `apps/admin/src/app/monitoring/page.tsx` función `loadPositions`: agregar guard `if (!companyId) { setPositions([]); return; }` al inicio del cuerpo (antes del `setLoading(true)`), reemplazar el comentario `"Para monitoreo global necesitaríamos un endpoint admin específico"` + `setPositions([])` por `const r = await api.get('/admin/gps/last-positions', { params: { companyId } }); setPositions(r.data)`. Diff exacto en design.md sección "Frontend".
  _Satisface: E-31, E-32, E-33_

- [ ] **E.2** Verificación: `cd apps/admin && npx tsc --noEmit` DEBE retornar exit code 0. Confirma que el cambio de tipo del response de `api.get` es compatible con el type de `setPositions`.
  _Satisface: E-31 (verificación estática)_

---

## Fase F: Verificación final del cambio

> Todas las tasks de esta fase son verificaciones ejecutables. No producen cambios en archivos.

- [ ] **F.1** Suite completa de e2e backend: `cd apps/api && npm run test:e2e` — TODOS los archivos e2e deben pasar. Cero regresiones respecto al estado pre-cambio (80 e2e previos + 6 nuevos = 86 esperados).
  _Satisface: E-07 al E-15 (runtime), E-23, E-24, E-25_

- [ ] **F.2** Unit tests siguen pasando: `cd apps/api && npm test` — 52 tests existentes sin modificación requerida.
  _Satisface: Métrica de aceptación #8 (190 tests existentes sin regresión)_

- [ ] **F.3** Verificar exclusiones del spec:
  - `grep -n "ModuleGuard" apps/api/src/modules/admin/admin-gps.controller.ts` → cero matches (E-06)
  - `grep -n "APP_GUARD" apps/api/src/app.module.ts` → cero matches con RolesGuard (E-39)
  - `grep -n "Prisma.empty" apps/api/src/modules/admin/admin-gps.service.ts` → al menos 1 match (E-26)
  - `grep -n "endpoint admin específico" apps/admin/src/app/monitoring/page.tsx` → cero matches (E-31)
  - `grep -n "companyId" apps/api/test/helpers/auth.ts` → muestra `string | null` (E-28)
  _Satisface: E-06, E-26, E-28, E-31, E-38, E-39_

---

## Notas para sdd-apply

**Orden de ejecución recomendado:**
A.1 → A.2 → A.3 → B.1 → B.2 → B.3 → B.4 → C.1 → C.2 → D.1 → D.2 → E.1 → E.2 → F.1 → F.2 → F.3

**Sin paralelismo real** — cada fase depende de la anterior. Las verificaciones A.3, C.2, D.2 y E.2 son checkpoints de salida obligatorios antes de continuar.

**Commits sugeridos (conventional commits):**
1. `test(auth): relax signTokenFor companyId type to string | null, add createSuperAdmin helper` — cubre A.1 + A.2
2. `feat(admin): add admin-gps module with DTO, service, controller and app.module registration` — cubre B.1 + B.2 + B.3 + B.4 + C.1
3. `test(e2e): add admin-monitoring e2e spec with 6 scenarios` — cubre D.1
4. `feat(monitoring): call admin gps endpoint and add companyId guard` — cubre E.1

**Archivo que NO debe modificarse:**
- `apps/api/src/modules/gps/gps.controller.ts` (E-38)
- `apps/api/src/modules/gps/gps.service.ts` (E-38)
- `prisma/schema.prisma` (E-40)
- Ningún archivo de migrations (E-40)
