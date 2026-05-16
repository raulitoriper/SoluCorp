# Tareas: ci-pipeline

> Activar GitHub Actions con 5 jobs paralelos (lint, typecheck, build, unit-tests, e2e + coverage upload integrado) sobre el suite de 190 tests ya implementado.
> Orden: task typecheck en turbo + scripts en workspaces → pre-flight lint check → YAML workflow → docs → verificación local.

**Spec de referencia:** `openspec/changes/ci-pipeline/spec.md` (73 escenarios, E-01 a E-73)
**Design de referencia:** `openspec/changes/ci-pipeline/design.md` (YAML completo + 17 decisiones)
**Total de tasks:** 15 (5 fases, 3 paralelas entre sí en Fase C y D)

---

## Fase A: Preparación — turbo.json y scripts typecheck

> Prerequisito de todo lo demás. Sin esta fase, `turbo run typecheck` no existe como comando.

- [ ] **A.1** Modificar `turbo.json` (raíz) agregando la task `typecheck` con el bloque exacto del design:
  ```json
  "typecheck": {
    "dependsOn": ["^build"],
    "outputs": [],
    "inputs": ["src/**", "test/**", "tsconfig*.json", "package.json"]
  }
  ```
  Las tasks preexistentes (`build`, `lint`, `test`, `test:e2e`, `dev`) NO se modifican.
  _Satisface: E-39, E-40, E-41, E-42, E-43_

- [ ] **A.2** Agregar script `"typecheck": "tsc --noEmit"` a los 5 workspaces:
  `apps/api/package.json`, `apps/admin/package.json`, `apps/client/package.json`, `packages/shared/package.json`, `packages/ui/package.json`.
  `apps/mobile/package.json` NO recibe el script.
  _Satisface: E-44, E-45, E-46, E-47, E-48, E-49_

- [ ] **A.3** Verificación: ejecutar `npx turbo run typecheck` desde raíz. DEBE retornar exit code 0 y sin errores TypeScript en los 5 workspaces.
  _Satisface: E-50_

---

## Fase B: Pre-flight lint check

> Mitigación del riesgo de que el primer run de CI falle por warnings preexistentes (Riesgo #2 del proposal).
> Esta fase se ejecuta ANTES de crear el YAML para no descubrirlo en CI.

- [ ] **B.1** Ejecutar lint estricto local exactamente como lo hará el job `lint` de CI:
  ```bash
  cd apps/api && npx eslint "{src,apps,libs,test}/**/*.ts" --max-warnings 0
  ```
  Si retorna exit code 0: continuar a Fase C.
  Si retorna warnings: **decidir** entre (a) fixear warnings o (b) documentar como deuda preexistente que el primer run de CI marcará como fallo — anotar la decisión en apply-progress.
  _Satisface: E-18 (validación previa), E-51 (script lint de apps/api no se toca)_

---

## Fase C: Workflow YAML

> Fase principal. C.1 puede hacerse en paralelo con B.1 en términos de edición, pero C.3 y C.4 deben resolverse con el YAML ya creado.

- [ ] **C.1** Crear `.github/workflows/ci.yml` con el contenido EXACTO del design (sección "Estructura del workflow"). Copiar el YAML 1:1 — incluye los 5 jobs, concurrency, env globales, service container postgres, y el step de upload-artifact en unit-tests.
  _Satisface: E-01, E-03, E-04, E-05, E-06, E-07, E-08, E-09, E-10, E-11, E-12, E-13, E-14, E-15, E-16, E-17, E-18, E-19, E-21, E-22, E-23, E-24, E-25, E-26, E-27, E-28, E-29, E-30, E-31, E-32, E-33, E-34, E-35, E-37, E-38_

- [ ] **C.2** Validar sintaxis del YAML creado. Si `actionlint` está disponible localmente, correrlo: `actionlint .github/workflows/ci.yml`. Si no está disponible, usar un parser YAML estándar (ej. `python -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"`) para confirmar que no hay errores de parseo.
  _Satisface: E-02_

- [ ] **C.3** Resolver open question del design — `prisma generate` sin DATABASE_URL: probar localmente `cd apps/api && npx prisma generate` SIN DATABASE_URL seteada en el entorno. Si el comando falla con error de conexión o variable requerida, agregar `env: DATABASE_URL: postgresql://dummy@localhost/dummy` al step `Generate Prisma Client` de los jobs `lint`, `typecheck`, `build` y `unit-tests` en el YAML (el job `e2e` ya tiene DATABASE_URL real). Si el comando pasa, no modificar el YAML.
  Anotar la resolución en apply-progress.
  _Satisface: E-17 (todos los jobs tienen prisma generate)_

- [ ] **C.4** Resolver open question del design — propagación de `--coverage` en turbo: verificar localmente que `npx turbo run test -- --coverage` genera el directorio `apps/api/coverage/` con `lcov.info`. Si la flag no se propaga, ajustar el step `Unit tests (turbo) with coverage` del job `unit-tests` a `npm --workspace api run test:cov` (script existente en `apps/api/package.json`). Los workspaces sin coverage (`shared`, `ui`) siguen con `turbo run test` o equivalente.
  Anotar la resolución en apply-progress.
  _Satisface: E-25, E-27, E-65 (coverage debe generarse en apps/api/coverage/)_

---

## Fase D: Documentación

> Paralela a Fase C (pueden hacerse en cualquier orden una vez que las decisiones de diseño están tomadas).

- [ ] **D.1** Agregar sección `## CI` al `README.md` raíz con el texto EXACTO del design (sección "Updates de README → README.md root"). La sección incluye tabla de jobs, instrucciones de activación con `git remote add origin` + `git push -u origin main`, mención a branch protection rules con los 5 status checks, y nota sobre coverage artifact con retención 30 días.
  _Satisface: E-52, E-53, E-54, E-55, E-56_

- [ ] **D.2** Agregar sección `## Typecheck en CI` a `apps/api/README.md` con el texto EXACTO del design (sección "Updates de README → apps/api/README.md"). La nota incluye cómo ejecutar typecheck localmente y la diferencia entre el script `lint` local (con `--fix`) y la invocación directa de CI (sin `--fix`).
  _Satisface: E-57_

---

## Fase E: Verificación final

> Todas las tasks de esta fase son verificaciones ejecutables que mapean a escenarios del spec. No producen cambios en archivos.

- [ ] **E.1** Verificar que `.github/workflows/ci.yml` existe y que `actionlint` (o parser YAML) retorna exit code 0.
  _Satisface: E-01, E-02_

- [ ] **E.2** Verificar estructura del YAML con inspección rápida:
  - `name: CI` presente
  - `on.push.branches` contiene `main`
  - `on.pull_request.branches` contiene `main`
  - `concurrency.group` es `${{ github.workflow }}-${{ github.ref }}`
  - `concurrency.cancel-in-progress: true`
  - `env.FORCE_COLOR: "1"` y `env.NODE_VERSION: "20"` a nivel raíz
  _Satisface: E-03, E-04, E-05, E-06, E-07, E-08, E-09_

- [ ] **E.3** Verificar que existen exactamente 5 jobs (`lint`, `typecheck`, `build`, `unit-tests`, `e2e`) y que ninguno tiene clave `needs`. Verificar que no existe referencia a `codecov`, no existe `.github/CODEOWNERS`, y `apps/mobile` no aparece en steps ejecutables del YAML.
  _Satisface: E-10, E-12, E-37, E-58, E-60, E-62_

- [ ] **E.4** Verificar exclusiones explícitas del repo:
  - `codecov.yml` NO existe en raíz ni en `.github/`
  - Directorio `.husky/` NO existe
  - `package.json` raíz NO tiene `husky` en `dependencies` o `devDependencies`
  - `.github/CODEOWNERS` NO existe
  _Satisface: E-58, E-59, E-61, E-62_

- [ ] **E.5** Verificar que `apps/mobile/package.json` NO tiene el script `typecheck` y que `apps/api/package.json` mantiene el script `lint` con `--fix` intacto (no modificado por este cambio). Verificar también que `apps/api/test/jest-e2e.json` sigue con `maxWorkers: 1`.
  _Satisface: E-49, E-51, E-73_

- [ ] **E.6** Verificación local completa de la secuencia de CI: ejecutar desde raíz del monorepo:
  ```bash
  npm ci
  npx turbo run lint
  npx turbo run typecheck
  npx turbo run build
  npx turbo run test
  ```
  Reportar exit code de cada comando. Si alguno falla, no continuar hasta resolverlo.
  _Satisface: E-50, E-64 (verificación previa al push)_

---

## Notas para sdd-apply

**Open questions a documentar en apply-progress:**
- Resultado de C.3: si `prisma generate` requiere o no DATABASE_URL en jobs sin DB
- Resultado de C.4: si `turbo run test -- --coverage` propaga la flag o si se necesita `test:cov`
- Resultado de B.1: estado del lint estricto (0 warnings vs warnings preexistentes y qué se hizo)

**Orden de ejecución recomendado:**
A.1 → A.2 → A.3 → B.1 → [C.1 + C.2 + C.3 + C.4] → [D.1 + D.2] → [E.1 a E.6 en secuencia]

**Commits sugeridos (del design):**
1. `chore(turbo): add typecheck task` — cubre A.1
2. `chore: add typecheck script to all TS workspaces` — cubre A.2
3. `ci: add github actions workflow for lint/typecheck/build/test/e2e` — cubre C.1 + resoluciones C.3/C.4
4. `docs: add CI section to README and typecheck note to apps/api` — cubre D.1 + D.2

**Post-merge (manual, fuera del scope automático):**
- `git remote add origin git@github.com:<owner>/solucorp.git && git push -u origin main`
- Configurar branch protection rules en GitHub UI con los 5 status checks requeridos
