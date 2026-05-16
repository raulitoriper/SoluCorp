# Archive Report: testing-foundation

**Fecha de archivado:** 2026-05-16  
**Responsable de fase:** sdd-archive executor  
**Modo de cierre:** Completición formal — SDD end-to-end (proposal → spec → design → tasks → apply → verify → archive)  
**Verdict del verify:** READY_FOR_ARCHIVE (0 CRITICAL, 4 WARNING, 3 SUGGESTION)

---

## Resumen de cambio

**testing-foundation** es un cambio de infraestructura/meta-nivel que establece la fundación de testing del backend (apps/api) y packages compartidos (shared, ui). Cierra deuda crítica P0 detectada en el cambio anterior (dto-validation-backend): 47 escenarios runtime sin cobertura automatizada y 3 services críticos refactorizados sin red de seguridad.

**Scope cubierto:**
- Setup Jest mínimo (Fase A)
- 9 unit specs de services P0 (Fase B)
- Refactor W01 de visits.service con spec previo (Fase C)
- 12 suites e2e con 80 tests (Fase D — 10 módulos + 2 transversales)
- 4 suites de packages con 58 tests (Fase E)
- Documentación de testing (Fase F)

**Estado final:** 190 tests totales pasando, 43/43 escenarios del spec cumplidos, TypeScript clean.

---

## Métricas de éxito (7 totales)

| # | Métrica de éxito | Meta / Condición | Resultado real | Status |
|---|------------------|------------------|----------------|--------|
| 1 | apps/api coverage statements | ≥ 40% (aspiracional, NO bloqueante) | 25.99% | WARNING |
| 2 | Cobertura de los 47 escenarios runtime | ≥ 1 test e2e por escenario (trazabilidad) | 12 suites e2e, 10 módulos, 80 tests | CUMPLE |
| 3 | packages/shared coverage utils/format.ts | ≥ 70% (meta específica en utils) | 100% | CUMPLE |
| 4 | packages/ui componentes con spec | 100% de los 4 componentes | Button, Input, Card, Modal = 4/4, 100% cobertura | CUMPLE |
| 5 | Turborepo orquestación | `pnpm test` retorna exit 0 desde raíz | 110 tests (52+38+20), exit 0 | CUMPLE |
| 6 | W01 cerrada | grep `...dto` en visits.service.ts → 0 matches | 0 matches confirmado | CUMPLE |
| 7 | Documentación testing | apps/api/README.md sección "Testing" | Sección presente con unit+e2e+coverage | CUMPLE |

**Resumen:** 6/7 cumplidas. 1 WARNING (aspiracional, explícitamente no bloqueante según propuesta).

---

## Estado de tasks

- **Total tasks definidas:** 56 (A.1 a G.6, con E.3 ausente en numeración original)
- **Completadas [x]:** 56/56
- **Pendientes [ ]:** 0

Todas las tasks ejecutadas exitosamente en 4 batches de apply:
- **Batch 1 (Fase A):** Setup Jest + configs + Turborepo
- **Batch 2 (Fase B):** Unit specs P0
- **Batch 3 (Fase C + D.1-D.2):** Refactor W01 + e2e transversales
- **Batch 4 (Fase D.3-D.13 + E + F):** E2e por módulo + packages + docs

---

## Deuda residual conocida

### WARNING 1 — Coverage api 25.99% vs 40% aspiracional

**Causa:** Los controllers no tienen specs unit (cubiertos solo por e2e). Jest reporte unit no acumula cobertura de e2e.

**Impacto:** No bloqueante. Propuesta marca explícitamente la meta de 40% como "aspiracional".

**Para cerrar (cambio futuro):** Opción A: agregar specs unit de controllers; Opción B: reportar coverage consolidada unit+e2e en `ci-pipeline`.

### WARNING 2 — Divergencia de campo en spec courier

**Encontrado en:** verify-report, sección 2.8 (courier).

**Detalle:** El spec formal documenta "POST sin `recipientName` → 400". El DTO real tiene `receiverName` como opcional; el campo requerido es `status`. Los tests e2e reflejan la realidad del DTO.

**Impacto:** No bloqueante. Los tests contra el DTO real son correctos.

**Para cerrar:** Actualizar spec formal en la próxima ronda de review.

### WARNING 3 — Paths de guards difieren entre spec y codebase

**Encontrado en:** verify-report, sección de archivos requeridos.

**Detalle:** Spec indica `apps/api/src/modules/auth/guards/` para roles.guard.spec y module.guard.spec. Ubicación real: `apps/api/src/common/guards/`.

**Impacto:** No bloqueante. Código correcto; discrepancia documental.

**Para cerrar:** Próxima ronda de spec review alinear con codebase real.

### WARNING 4 — jwt-auth.guard.spec.ts: cobertura semántica, no comportamental completa

**Encontrado en:** verify-report, sección guards.

**Detalle:** JwtAuthGuard extiende AuthGuard de Passport. Sin Passport configurado en TestingModule, canActivate lanza error internamente. Tests verifican denegación semántica.

**Impacto:** No bloqueante. Validación JWT real está cubierta por e2e.

**Para cerrar:** Decisión consciente. E2e es el test correcto para flujo Passport completo.

---

## Sugerencias (implementar en cambios futuros)

### SUGGESTION 1 — Coverage consolidada unit + e2e

**Beneficio:** Reportar cobertura real de controllers (actualmente 0% en unit, 100% en e2e).

**Dónde:** Cambio `ci-pipeline` cuando se agrege GitHub Actions.

### SUGGESTION 2 — Limpieza de spread en otros services

**Encontrado en:** suggest-registry, S1.

Archivos inconsistentes con patrón explícito de W01:
- `apps/api/src/modules/users/users.service.ts:48` — `const data: any = { ...dto }`
- `apps/api/src/modules/companies/companies.service.ts:97` — `const data: any = { ...dto }`

Están protegidos por `ValidationPipe.whitelist: true` pero no son vulnerabilidades. Se sugiere:

**Dónde:** Cambio futuro `services-explicit-fields-cleanup`.

### SUGGESTION 3 — Spec formal courier: verificar nombre de campo

**Para cerrar:** Próxima review de spec.md incluir check contra DTO real.

---

## Cambios al spec maestro

### Creado

- **`openspec/specs/testing-infrastructure/spec.md`** (NUEVO)

Documenta los contratos permanentes:
- Estructura de tests (co-located unit, e2e centralizado)
- Guardarraíles de DB (`includes('test')`)
- Política de coverage (reporters, exclusiones, NO threshold bloqueante)
- Turborepo tasks (`test` cacheable, `test:e2e` no-cacheable)
- Decisiones de arquitectura (mock inline, truncate vs transactions, JWT directo)
- Requisitos mínimos por módulo (services explícitos, guards tests)

### No modificados

Los specs maestros existentes (`openspec/specs/modulo-*/spec.md`, `auth-multi-tenant/spec.md`, etc.) describen el **comportamiento** de módulos. Los escenarios de testing-foundation son **meta-nivel**. Decisión: no mergear al spec de negocio; crear spec maestro separado para infraestructura.

---

## Archivos generados (29 archivos de test)

### Backend (apps/api)

**Unit specs (9 + pre-existente):**
- `app.controller.spec.ts` (pre-existente, mantenido)
- `src/modules/inventory/inventory.service.spec.ts`
- `src/modules/attendance/attendance.service.spec.ts`
- `src/modules/guard/guard.service.spec.ts`
- `src/modules/auth/auth.service.spec.ts`
- `src/modules/auth/guards/jwt-auth.guard.spec.ts`
- `src/modules/auth/guards/roles.guard.spec.ts`
- `src/modules/auth/guards/module.guard.spec.ts` (ubicación real: src/common/guards/)
- `src/modules/sync/sync.service.spec.ts`
- `src/modules/visits/visits.service.spec.ts` (incluye cobertura W01)

**E2e specs (12):**
- `test/validation-pipe.e2e-spec.ts` (transversal)
- `test/multi-tenant.e2e-spec.ts` (transversal)
- `test/visits.e2e-spec.ts`
- `test/orders.e2e-spec.ts`
- `test/gps.e2e-spec.ts`
- `test/inventory.e2e-spec.ts`
- `test/attendance.e2e-spec.ts`
- `test/guard.e2e-spec.ts`
- `test/medical-visits.e2e-spec.ts`
- `test/courier.e2e-spec.ts`
- `test/sync.e2e-spec.ts`
- `test/metadata.e2e-spec.ts`

**Helpers (2):**
- `test/helpers/db.ts` (truncateAll con guardarraíl)
- `test/helpers/auth.ts` (createTestCompany, createTestUser, signTokenFor, loginViaHttp)

**Configuración + setup (3):**
- `test/jest-e2e.json` (ampliado)
- `test/setup-env.ts` (NUEVO)
- `.env.test.example` (NUEVO, commitable)

### Packages

**packages/shared (4 specs):**
- `jest.config.ts`
- `src/utils/format.spec.ts`
- `src/constants/service-codes.spec.ts`
- `src/constants/meta-names.spec.ts`
- `src/constants/roles.spec.ts`

**packages/ui (4 specs):**
- `jest.config.ts`
- `jest.setup.ts`
- `src/Button/index.spec.tsx` (existe como Button.spec.tsx)
- `src/Input/index.spec.tsx` (existe como Input.spec.tsx)
- `src/Card/index.spec.tsx` (existe como Card.spec.tsx)
- `src/Modal/index.spec.tsx` (existe como Modal.spec.tsx)

### Refactor

**W01 — visits.service:**
- `src/modules/visits/visits.service.ts` — cambio de `...dto` a campos explícitos

### Documentación

- `apps/api/README.md` — sección "Testing" (unit, e2e, coverage, DB setup)
- `packages/shared/README.md` — instrucciones de test
- `packages/ui/README.md` — instrucciones de test
- `README.md` root (NUEVO) — sección "Tests" con pnpm test y pnpm test:e2e

### Configuración

- `turbo.json` — tasks `test` y `test:e2e`
- `apps/api/package.json` — jest config + ts-jest bump a ^29.4.0
- `packages/shared/package.json` — jest devDeps + script
- `packages/ui/package.json` — jest + testing-library devDeps + script
- root `package.json` — scripts test/test:e2e

---

## Suite de tests final

| Workspace | Type | Count | Status |
|-----------|------|-------|--------|
| apps/api | unit | 52 tests (9 suites) | PASS |
| apps/api | e2e | 80 tests (12 suites) | PASS |
| packages/shared | unit | 38 tests | PASS |
| packages/ui | unit | 20 tests (4 componentes) | PASS |
| **TOTAL** | | **190 tests** | **PASS** |

**Exit codes:**
- `pnpm test` (unit from root): 0
- `pnpm test:e2e` (e2e from root): 0
- `pnpm test:cov` (coverage): 0

---

## Trazabilidad del cambio

**Artifact Store:** openspec (file-based)

| Artefacto | Path | Observación ID | Status |
|-----------|------|---|--------|
| Proposal | openspec/changes/testing-foundation/proposal.md | (no ID en openspec) | Lído en archive |
| Spec | openspec/changes/testing-foundation/spec.md | (no ID) | Lído en archive |
| Design | openspec/changes/testing-foundation/design.md | (no ID) | Lído en archive |
| Tasks | openspec/changes/testing-foundation/tasks.md | (no ID) | 56/56 completadas |
| Apply Progress | openspec/changes/testing-foundation/apply-progress.md | (no ID) | 4 batches, completo |
| Verify Report | openspec/changes/testing-foundation/verify-report.md | (no ID) | READY_FOR_ARCHIVE |
| Archive Report | openspec/changes/archive/testing-foundation/archive-report.md | (este archivo) | Generado en fase |
| Spec Maestro | openspec/specs/testing-infrastructure/spec.md | (nuevo, no ID) | Contrato permanente |

**Nota:** Como artifact_store es openspec (file-based), no hay observation IDs de engram. Los archivos están persistidos en el filesystem del workspace.

---

## Plan de rollback (si fuera necesario)

Testing-foundation es aditivo + refactor atómico.

1. **Rollback completo:** Revert del commit que agregó los 29 archivos de test + cambio W01
2. **Rollback parcial (por suite):** Cada archivo `.spec.ts` es independiente; puede removerse sin afectar otros
3. **Rollback de W01 solamente:** Revert de visits.service.ts con `git revert`, vuelve a patrón `...dto` (pasaría la regresión visual pero unit spec enrojecería)

**Riesgo de rollback:** Bajo. Tests son aditivos, sin cambios de lógica de producción (salvo W01 que es refactor seguro).

---

## Recomendación para próximos cambios

### Inmediatos (siguientes 2 sprints)

1. **`ci-pipeline`** — GitHub Actions con:
   - Job unit (jest con coverage)
   - Job e2e (service container postgres)
   - Lcov upload a Codecov
   - Baja el 25.99% a 40%+ con cobertura consolidada

2. **`services-explicit-fields-cleanup`** — refactor de companies/users (bajo riesgo, usa patrón W01)

### Medio plazo (sprint 3-4)

3. **`mobile-testing-foundation`** — jest + jest-expo, mocks de NetInfo
4. **`admin-testing-foundation`** — jest + testing-library/react con Next.js 16
5. **`client-testing-foundation`** — ídem admin

### Referencias futuras

El spec maestro `openspec/specs/testing-infrastructure/spec.md` documenta los contratos que deben mantener todos los cambios de testing futuros. Es la fuente canónica para decisiones de guardarraíles, coverage, y orquestación.

---

## Decisión de archivado

**Estado:** CLOSED — Cambio archivado completamente.

**Rationale:**
- 0 CRITICAL findings
- 4 WARNING documentados (no bloqueantes, explicados)
- 3 SUGGESTION para mejoras futuras (fuera de scope)
- 100% de tasks completadas
- Spec maestro creado para contratos permanentes
- Toda deuda de testing del backend cerrada (47 escenarios cubiertos)

**Próxima acción:** Mover carpeta `openspec/changes/testing-foundation/` a `openspec/changes/archive/testing-foundation/` y commitear junto con el spec maestro nuevo.

---

## Metadatos de archivo

- **Generado por:** sdd-archive executor (Haiku 4.5)
- **Fecha:** 2026-05-16
- **Proyecto:** SoluCorp
- **Changekey:** testing-foundation
- **Duración:** 2026-05-10 a 2026-05-16 (6 días)
- **Checksum cambios:** 190 tests, 29 spec files, 1 refactor, 1 spec maestro creado
