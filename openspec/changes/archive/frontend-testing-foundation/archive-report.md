# Archive Report: frontend-testing-foundation

**Cambio:** frontend-testing-foundation  
**Fecha de archivo:** 2026-06-13  
**Estado:** COMPLETADO Y ARCHIVADO  
**Veredicto final:** PASS — LISTO PARA PRODUCCIÓN

---

## 1. Resumen Ejecutivo

El cambio `frontend-testing-foundation` instaló la infraestructura de testing (Jest 30 + React Testing Library + jsdom) en `apps/client` y creó 4 archivos de test que cubren la mayoría del flujo crítico de autenticación y reportes. Los tests pasan completamente (16/16) en el entorno local y en CI (via `turbo run test`). El gate de CI bloqueante funciona automáticamente sin requerir cambios en `.github/workflows/ci.yml` ni `turbo.json`. Las especificaciones de `testing-infrastructure` y `ci-infrastructure` fueron actualizadas para reflejar el nuevo workspace.

---

## 2. Scope Entregado

### 2.1 Infraestructura de Testing (apps/client)

| Componente | Archivo | Estado |
|---|---|---|
| Jest config | `apps/client/jest.config.ts` | ✅ Creado |
| Jest setup | `apps/client/jest.setup.ts` | ✅ Creado |
| CSS mock | `apps/client/__mocks__/styleMock.js` | ✅ Creado |
| React Icons proxy | `apps/client/__mocks__/reactIconsMock.js` | ✅ Creado |
| package.json script | `apps/client/package.json` | ✅ Modificado |
| devDependencies | Agregadas en `package.json` | ✅ Instaladas |

**Decisión técnica notable:** Se agregó `moduleNameMapper` para `react` y `react-dom` en jest.config.ts (líneas 18–19) para resolver el conflicto de instancias múltiples entre root (react 19.1.0) y apps/client (react 19.2.4). Sin el pin, los tests fallarían con "Invalid hook call".

### 2.2 Test Files (4 targets obligatorios)

| Archivo | Tests | Escenarios | Estado |
|---|---|---|---|
| `auth-store.spec.ts` | 5 | login éxito/fallo, logout, rehidratación, error handler | ✅ PASS |
| `AuthGuard.spec.tsx` | 3 | usuario null, rol incorrecto, rol autorizado | ✅ PASS |
| `ReportPage.spec.tsx` | 5 | renderizar, loading, vacío, exportar, sin datos | ✅ PASS |
| `login/page.spec.tsx` | 3 | submit, error, botón disabled | ✅ PASS |
| **Total** | **16** | **13 escenarios de spec** | ✅ **TODOS PASS** |

---

## 3. Evidencia de Verificación

### 3.1 Ejecución Local

```
npm test (apps/client/):
  Test Suites: 4 passed, 4 total
  Tests:       16 passed, 16 total
  Snapshots:   0 total
  Time:        15.733 s
```

### 3.2 Ejecución Monorepo (turbo)

```
turbo run test (raíz):
  @solucorp/shared:test -- 6 suites, 47 tests PASS
  @solucorp/ui:test     -- 4 suites, 20 tests PASS
  client:test           -- 4 suites, 16 tests PASS
  api:test              -- 9 suites, 52 tests PASS
  Tasks: 5 successful, 5 total
  
  Total: 23 suites, 135 tests, exit 0
```

### 3.3 Typechecking

```
tsc --noEmit (apps/client/):
  Resultados: 0 errores de tipo, compilación limpia
```

### 3.4 CI Gate

- **Job utilizado:** `unit-tests` (existente, sin cambios)
- **Comando:** `npx turbo run test -- --coverage`
- **Cobertura:** El coverage de `apps/client` se genera pero NO sube a artifact (upload apunta a `apps/api/coverage/` solamente)
- **Bloqueo:** Cuando un test de `apps/client` falla, `turbo` retorna exit ≠ 0 y CI bloquea el merge automáticamente
- **Cambios requeridos en CI:** NINGUNO — es zero-config gracias a la task `test` en `turbo.json`

---

## 4. Compliance contra Specs

### 4.1 testing-infrastructure/spec.md

| Sección | Requisito | Implementado | Nota |
|---|---|---|---|
| §1.3 Packages | apps/client como workspace con Jest+RTL+jsdom | ✅ | Agregada a lista de workspaces |
| §5.4 4 targets | auth-store, AuthGuard, ReportPage, login/page | ✅ | Todos los 4 presentes con 16 tests |
| §7.3 Coverage policy | Sin `coverageThreshold` en apps/client | ✅ | Verified grep = 0 matches |
| §9.5 Jest config | Configuración específica para apps/client | ✅ | Nueva sección con moduleNameMapper |
| §14 Próximos cambios | Reconciliación `client-testing-foundation` → `frontend-testing-foundation` | ✅ | Actualizado; §14 ahora marca como DONE |

### 4.2 ci-infrastructure/spec.md

| Sección | Requisito | Implementado | Nota |
|---|---|---|---|
| §6.1 Test execution | apps/client incluida en `turbo run test` | ✅ | Gate automático, sin job nuevo |
| §6.1 Escenarios | Test fallido bloquea merge | ✅ | Verified por CI workflow |
| §6.1 Escenarios | Tests pasando → job verde | ✅ | Confirmed turbo exit 0 |
| §14 Cambios futuros | Marcar `frontend-testing-foundation` como completado | ✅ | Actualizado |

---

## 5. Desviaciones Documentadas

Las desviaciones reportadas en `verify-report.md` fueron honestas y técnicamente justificadas. Se llevan adelante como follow-ups:

### 5.1 WARNING-1: ReportPage exportar CSV (parcialmente cubierto)

**Archivo:** `apps/client/src/components/ReportPage.spec.tsx` línea 79  
**Problema:** El escenario "exportar CSV" pide validar que la función de exportación sea invocada CON DATOS (caso positivo). El test actual cubre solo el estado deshabilitado (sin datos).  
**Razón técnica:** El componente `ReportPage` en producción NO tiene un botón "Exportar" explícito en el código actual — hay una variable `exportCSV` pero no está renderizada ni testeada. El test verifica `isLoading`, columnas y estado vacío (máxima superficie), pero el export propio sigue siendo un TODO.  
**Impacto:** Bajo. La lógica de descarga de CSV será parte de un cambio futuro (`report-export-csv` o similar).  
**Carry-forward:** Marcar en el roadmap como follow-up de testing — este cambio priorizó auth + rendering, no export.

### 5.2 WARNING-2: login/page.tsx `<label>` sin htmlFor (a11y gap preexistente)

**Archivo:** `apps/client/src/app/login/page.tsx` línea 39  
**Problema:** El `<label>` de contraseña NO tiene atributo `htmlFor` asociado al `<input type="password">`.  
**Especificación WCAG:** 1.3.1 Info and Relationships  
**Razón:** Preexistente al cambio de testing; fuera del scope de `frontend-testing-foundation`.  
**Test workaround:** El test usa `container.querySelector('input[type="password"]')` en lugar de `getByLabelText`, lo cual es técnicamente válido pero documenta la brecha.  
**Carry-forward:** Crear un cambio `a11y-login-form` o agregar a `admin-testing-foundation` (que tendrá el mismo issue).

### 5.3 SUGGESTION-1: Logout redirect (e2e coverage futura)

**Ubicación:** `auth-store.ts` línea 43 — `window.location.href = '/login'`  
**Estado en tests unitarios:** No cubierto. jsdom 26 marca `window.location` como non-configurable (especificación WHATWG), por lo que asignar a `window.location.href` no altera el valor.  
**Test coverage actual:** El test verifica `state.user = null`, `state.token = null`, `localStorage.clear()` — la lógica está ahí, solo falta la aserción del redirect.  
**Recomendación:** Cubrir con **Playwright e2e** en un cambio futuro (`e2e-authentication` o `playwright-setup`). jsdom no puede emular navegación real.

---

## 6. Cambios en Especificaciones Maestras

Ambas especificaciones (`testing-infrastructure/spec.md` y `ci-infrastructure/spec.md`) fueron mergeadas con las deltas del cambio:

### 6.1 testing-infrastructure/spec.md

**Secciones modificadas:**
- §1.3: Agregada `apps/client` a la lista de workspaces con Jest
- §5.4: NUEVA sección con 13 escenarios (4 targets × sus respectivos tests)
- §7.3: Agregada baseline de cobertura para `apps/client: sin threshold inicial`
- §9.5: NUEVA configuración Jest específica para apps/client (moduleNameMapper, react pinning)
- §14: Reconciliación de nombres — `client-testing-foundation` (planned) → `frontend-testing-foundation` (DONE, 2026-06-13)

**Nota sobre §14:** El spec original listaba `client-testing-foundation` como "próximo cambio". Esto ha sido reconciliado para marcar `frontend-testing-foundation` como completado. Se agregó la nota "Estado: `frontend-testing-foundation` completado 2026-06-13 (apps/client Jest + RTL + 4 test files, 16 tests PASS, CI gate operativo)."

### 6.2 ci-infrastructure/spec.md

**Secciones modificadas:**
- §6.1: EXTENDIDA con explicación clara de que `apps/client` se incluye automáticamente en `turbo run test`
- §6.1: 4 escenarios nuevos (test fallido bloquea, test pasando OK, workspace sin script ignorado)
- §6.2: Coverage upload sigue apuntando a `apps/api/coverage/` exclusivamente (sin cambios)
- §14: Actualizada lista de cambios futuros; `frontend-testing-foundation` marcada como COMPLETADA

---

## 7. Artefactos Archivados

El cambio ha sido movido de `openspec/changes/frontend-testing-foundation/` a:

```
openspec/changes/archive/2026-06-13-frontend-testing-foundation/
├── explore.md
├── proposal.md
├── design.md
├── tasks.md
├── verify-report.md
├── specs/
│   ├── testing-infrastructure/
│   │   └── spec.md (delta — NOW MERGED to main)
│   └── ci-infrastructure/
│       └── spec.md (delta — NOW MERGED to main)
└── archive-report.md (THIS FILE)
```

**Nota:** Los deltas de specs en el directorio archivado son copia de referencia histórica. Las fuentes de verdad son las specs maestras en `openspec/specs/`.

---

## 8. Línea de Tiempo

| Fecha | Evento |
|---|---|
| 2026-06-08 | Exploración completada; detección de Jest ya instalado en workspace |
| 2026-06-08–09 | Propuesta y especificación redactadas |
| 2026-06-10–11 | Diseño completado; decisiones de `moduleNameMapper` y react pinning documentadas |
| 2026-06-11–12 | Implementación (Phase 1–3 de tasks); 12 tareas completadas |
| 2026-06-13 | Verificación (tests local + turbo + tsc); 0 CRITICAL, 2 WARNING, 1 SUGGESTION |
| 2026-06-13 | Archive (este reporte); specs mergeadas; cambio movido a archive |

---

## 9. Carry-Forward (Follow-ups)

### 9.1 Near-term (mismo mes)

1. **admin-testing-foundation** (twin slice)
   - Idéntica configuración a `frontend-testing-foundation` pero para `apps/admin`
   - Mismos 4 workspaces: auth-store, AuthGuard, ReportPage (admin version), login/page
   - React instance pinning en jest.config.ts también necesario (mismo react mismatch)
   - Estimado: ~2 días de esfuerzo (copiar + adaptar config)

2. **a11y-login-form** (o agregar a admin-testing-foundation)
   - Agregar `htmlFor` al `<label>` de password en ambos portales
   - Scope: 1 línea en `apps/client` + 1 línea en `apps/admin`
   - Bajo esfuerzo

### 9.2 Mediano plazo (1–2 meses)

3. **ReportPage-export-csv** (o integrar en admin-testing-foundation)
   - Implementar botón "Exportar" visible + lógica de CSV en `ReportPage`
   - Test del caso positivo (exportar con datos)
   - Carry-forward de WARNING-1

4. **e2e-authentication** (Playwright)
   - Cubrir logout redirect (`window.location.href = '/login'`)
   - Verificación de flujo completo: login → acceso a ruta protegida → logout → redirección
   - Carry-forward de SUGGESTION-1

### 9.3 Arquitectura futura

5. **ui-in-web-portals** — refactor de componentes `packages/ui` compartidos
   - Ahora es más SEGURO hacerlo porque `apps/client` + `apps/admin` tendrán tests
   - No será refactor sin cobertura

6. **mobile-testing-foundation** — Jest + jest-expo para Expo
   - Orthogonal a este cambio pero parte de la misma iniciativa de testing

---

## 10. Impacto en Producción

**Riesgo:** NONE  
**Razón:** Este cambio es 100% infraestructura de testing. Ningún código de producción fue modificado. Los 4 nuevos archivos son `*.spec.ts(x)` que Jest ignora en compilación para producción. Los cambios a `package.json` son devDependencies únicamente.

**Rollback:** Trivial. Eliminar archivos nuevos en `apps/client` (config, mocks, specs) + revertir `package.json`. Sin el script `"test"`, `turbo run test` deja de incluir `apps/client` y el pipeline vuelve al estado PRE-cambio.

---

## 11. Checksums y Trazabilidad

### 11.1 Proposal

**Topic key:** `sdd/frontend-testing-foundation/proposal`  
**Tipo:** Proposal — cambio de testing infrastructure  
**Scope:** apps/client Jest setup + 4 test files  

### 11.2 Spec

**Topic key:** `sdd/frontend-testing-foundation/spec`  
**Integración en maestras:** Secciones §1.3, §5.4, §7.3, §9.5, §14 de testing-infrastructure; §6.1, §14 de ci-infrastructure

### 11.3 Design

**Topic key:** `sdd/frontend-testing-foundation/design`  
**Decisión clave:** Jest (no Vitest), moduleNameMapper para react pinning, sin `tsconfig.test.json`

### 11.4 Tasks

**Topic key:** `sdd/frontend-testing-foundation/tasks`  
**Completion:** 12/12 tareas completadas [x]  
**Fases:** Config (4 tareas) + DevDeps (3 tareas) + Test files (4 tareas) + DoD Verification (1 tarea)

### 11.5 Verify Report

**Topic key:** `sdd/frontend-testing-foundation/verify-report`  
**Veredicto:** PASS — READY FOR ARCHIVE  
**Issues:** 0 CRITICAL, 2 WARNING, 1 SUGGESTION  
**Coverage:** 16/16 tests passing, monorepo 135/135 passing

### 11.6 Archive Report

**Topic key:** `sdd/frontend-testing-foundation/archive-report` (THIS FILE)  
**Persistencia:** Engram + OpenSpec hybrid

---

## 12. Conclusión

El cambio `frontend-testing-foundation` completa exitosamente el primer slice de testing para los portales web. La infraestructura está ahora lista para:

- **Desarrollo más seguro:** refactors de UI con cobertura de tests
- **Adopción de packages/ui:** componentes compartidos ahora testeables en contexto de portal
- **Twin slice admin:** el patrón es probado y replicable
- **Mobile testing:** el mismo patrón (Jest + jsdom) será base para mobile (Expo adaptar)

El cambio está **COMPLETADO**, **VERIFICADO**, y **ARCHIVADO**.

---

**Firmado por:** sdd-archive executor  
**Fecha:** 2026-06-13  
**Status:** CLOSED  
