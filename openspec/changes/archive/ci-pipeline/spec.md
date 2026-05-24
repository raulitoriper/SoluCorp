# Spec Delta: ci-pipeline

**Versión:** 1.0  
**Fecha:** 2026-05-16  
**Cambio:** ci-pipeline  
**Depende de:** testing-infrastructure/spec.md (contratos permanentes), design.md (YAML completo + 17 decisiones)

---

## Resumen

Este spec define los contratos observables que DEBEN ser verdaderos tras aplicar el cambio `ci-pipeline`: existencia y contenido correcto del archivo `.github/workflows/ci.yml` con 5 jobs paralelos, scripts `typecheck` en 5 workspaces, task `typecheck` cacheable en `turbo.json`, y actualizaciones de documentación en `README.md` root y `apps/api/README.md`. Los guardarraíles de aislamiento de DB de test definidos en `testing-infrastructure/spec.md` son contratos preexistentes que el CI hereda y DEBE respetar; este spec los referencia pero no los redefine.

---

## Leyenda de verificabilidad

- **[ESTÁTICO]** Verificable sin servidor: inspección de archivo, grep, parse YAML, ejecución de comando local.
- **[POST-PUSH]** Verificable solo después del primer push a GitHub y ejecución del workflow.

---

## Sección 1: Contrato del archivo `.github/workflows/ci.yml`

### 1.1 Existencia y validez sintáctica

#### Escenario E-01: El archivo `ci.yml` existe [ESTÁTICO]

- DADO el repositorio SoluCorp
- CUANDO se inspecciona la ruta `.github/workflows/ci.yml`
- ENTONCES el archivo DEBE existir
- Y el directorio `.github/workflows/` DEBE existir

#### Escenario E-02: El archivo `ci.yml` es YAML sintácticamente válido [ESTÁTICO]

- DADO el archivo `.github/workflows/ci.yml`
- CUANDO se parsea con un validador YAML (ej. `actionlint`, `yq`, o `python -c "import yaml; yaml.safe_load(open('...'))"`)
- ENTONCES NO DEBE lanzar error de parseo
- Y `actionlint` DEBE retornar exit code 0 (sin errores estructurales de GitHub Actions)

#### Escenario E-03: El workflow tiene nombre `CI` [ESTÁTICO]

- DADO el archivo `.github/workflows/ci.yml`
- ENTONCES el campo `name` del workflow DEBE ser `CI`

---

### 1.2 Triggers

#### Escenario E-04: Trigger en push a `main` [ESTÁTICO]

- DADO el archivo `.github/workflows/ci.yml`
- ENTONCES `on.push.branches` DEBE contener el valor `main`

#### Escenario E-05: Trigger en pull_request apuntando a `main` [ESTÁTICO]

- DADO el archivo `.github/workflows/ci.yml`
- ENTONCES `on.pull_request.branches` DEBE contener el valor `main`

---

### 1.3 Concurrency (cancelación de runs redundantes)

#### Escenario E-06: `concurrency.group` con workflow + ref [ESTÁTICO]

- DADO el archivo `.github/workflows/ci.yml`
- ENTONCES `concurrency.group` DEBE ser exactamente `${{ github.workflow }}-${{ github.ref }}`

#### Escenario E-07: `cancel-in-progress` activo [ESTÁTICO]

- DADO el archivo `.github/workflows/ci.yml`
- ENTONCES `concurrency.cancel-in-progress` DEBE ser `true`

---

### 1.4 Variables de entorno globales del workflow

#### Escenario E-08: `FORCE_COLOR` declarada a nivel workflow [ESTÁTICO]

- DADO el archivo `.github/workflows/ci.yml`
- ENTONCES `env.FORCE_COLOR` DEBE estar declarada con valor `"1"` a nivel raíz del workflow

#### Escenario E-09: `NODE_VERSION` declarada como `"20"` [ESTÁTICO]

- DADO el archivo `.github/workflows/ci.yml`
- ENTONCES `env.NODE_VERSION` DEBE estar declarada con valor `"20"` a nivel raíz del workflow

---

### 1.5 Estructura de jobs

#### Escenario E-10: Exactamente 5 jobs declarados con los nombres correctos [ESTÁTICO]

- DADO el archivo `.github/workflows/ci.yml`
- ENTONCES `jobs` DEBE contener exactamente los siguientes 5 keys: `lint`, `typecheck`, `build`, `unit-tests`, `e2e`
- Y NO DEBE contener ningún job adicional (en particular NO DEBE existir un job `coverage-upload` separado)

#### Escenario E-11: Todos los jobs corren en `ubuntu-latest` [ESTÁTICO]

- DADO cada job declarado en `.github/workflows/ci.yml`
- ENTONCES cada job DEBE tener `runs-on: ubuntu-latest`

#### Escenario E-12: Ningún job tiene dependencias `needs` [ESTÁTICO]

- DADO cada job declarado en `.github/workflows/ci.yml`
- ENTONCES NINGÚN job DEBE declarar la clave `needs`
- (Todos los jobs son paralelos; la paralelización es la estrategia de diseño)

#### Escenario E-13: Timeouts declarados correctamente por job [ESTÁTICO]

- DADO el archivo `.github/workflows/ci.yml`
- ENTONCES el job `lint` DEBE tener `timeout-minutes: 5`
- Y el job `typecheck` DEBE tener `timeout-minutes: 5`
- Y el job `build` DEBE tener `timeout-minutes: 5`
- Y el job `unit-tests` DEBE tener `timeout-minutes: 5`
- Y el job `e2e` DEBE tener `timeout-minutes: 10`

---

### 1.6 Patrón común de steps (presente en todos los jobs)

#### Escenario E-14: Checkout en todos los jobs [ESTÁTICO]

- DADO cada uno de los 5 jobs
- ENTONCES DEBE existir un step con `uses: actions/checkout@v4`

#### Escenario E-15: Setup Node con cache npm en todos los jobs [ESTÁTICO]

- DADO cada uno de los 5 jobs
- ENTONCES DEBE existir un step con `uses: actions/setup-node@v4`
- Y ese step DEBE tener `with.node-version: ${{ env.NODE_VERSION }}`
- Y ese step DEBE tener `with.cache: 'npm'`

#### Escenario E-16: `npm ci` en todos los jobs [ESTÁTICO]

- DADO cada uno de los 5 jobs
- ENTONCES DEBE existir un step que ejecute `npm ci`

#### Escenario E-17: `prisma generate` en todos los jobs [ESTÁTICO]

- DADO cada uno de los 5 jobs
- ENTONCES DEBE existir un step que ejecute `npx prisma generate`
- Y ese step DEBE tener `working-directory: apps/api`

---

### 1.7 Job `lint`

#### Escenario E-18: Lint de `apps/api` invoca ESLint sin `--fix` con `--max-warnings 0` [ESTÁTICO]

- DADO el job `lint`
- ENTONCES DEBE existir un step con `working-directory: apps/api`
- Y ese step DEBE ejecutar un comando que contenga `npx eslint`
- Y el comando NO DEBE contener la flag `--fix`
- Y el comando DEBE contener `--max-warnings 0`
- Y el patrón de archivos DEBE incluir `{src,apps,libs,test}/**/*.ts`

#### Escenario E-19: Lint de otros workspaces via turbo excluyendo api [ESTÁTICO]

- DADO el job `lint`
- ENTONCES DEBE existir un step que ejecute `npx turbo run lint`
- Y ese comando DEBE excluir el workspace `api` (flag `--filter=!api` o equivalente)

#### Escenario E-20: El job `lint` NO invoca `apps/mobile` [ESTÁTICO]

- DADO el job `lint`
- CUANDO se busca la cadena `mobile` en los steps del job `lint`
- ENTONCES NO DEBE aparecer `mobile` en ningún step ejecutable del job
- (Solo se acepta en comentarios del YAML a nivel de `env` o `jobs`)

---

### 1.8 Job `typecheck`

#### Escenario E-21: Typecheck usa `turbo run typecheck` [ESTÁTICO]

- DADO el job `typecheck`
- ENTONCES DEBE existir un step que ejecute `npx turbo run typecheck`

#### Escenario E-22: Typecheck tiene cache de `.turbo/` [ESTÁTICO]

- DADO el job `typecheck`
- ENTONCES DEBE existir un step con `uses: actions/cache@v4`
- Y ese step DEBE tener `with.path` que incluya `.turbo`
- Y la `with.key` DEBE contener `turbo` y `${{ github.sha }}`
- Y DEBE existir al menos una `restore-keys` más general como fallback

---

### 1.9 Job `build`

#### Escenario E-23: Build usa `turbo run build` [ESTÁTICO]

- DADO el job `build`
- ENTONCES DEBE existir un step que ejecute `npx turbo run build`

#### Escenario E-24: Build tiene cache de `.turbo/` [ESTÁTICO]

- DADO el job `build`
- ENTONCES DEBE existir un step con `uses: actions/cache@v4`
- Y ese step DEBE tener `with.path` que incluya `.turbo`
- Y la `with.key` DEBE contener `turbo` y `${{ github.sha }}`

---

### 1.10 Job `unit-tests`

#### Escenario E-25: Unit tests ejecuta turbo run test con coverage [ESTÁTICO]

- DADO el job `unit-tests`
- ENTONCES DEBE existir un step que ejecute `npx turbo run test`
- Y el comando DEBE incluir la flag `--coverage`

#### Escenario E-26: Unit tests tiene cache de `.turbo/` [ESTÁTICO]

- DADO el job `unit-tests`
- ENTONCES DEBE existir un step con `uses: actions/cache@v4`
- Y ese step DEBE tener `with.path` que incluya `.turbo`

#### Escenario E-27: Coverage se sube como artifact con `if: always()` [ESTÁTICO]

- DADO el job `unit-tests`
- ENTONCES DEBE existir un step con `uses: actions/upload-artifact@v4`
- Y ese step DEBE tener `if: always()`
- Y ese step DEBE tener `with.path: apps/api/coverage/`
- Y ese step DEBE tener `with.retention-days: 30`
- Y ese step DEBE tener `with.if-no-files-found: warn`

#### Escenario E-28: Nombre del artifact de coverage incluye `run_id` [ESTÁTICO]

- DADO el step de upload-artifact en `unit-tests`
- ENTONCES `with.name` DEBE contener `coverage-api-` como prefijo
- Y DEBE contener `${{ github.run_id }}` para evitar colisiones entre runs

---

### 1.11 Job `e2e`

#### Escenario E-29: Service container `postgres:16` declarado [ESTÁTICO]

- DADO el job `e2e`
- ENTONCES DEBE declarar `services.postgres`
- Y `services.postgres.image` DEBE ser `postgres:16`
- Y `services.postgres.env.POSTGRES_USER` DEBE ser `postgres`
- Y `services.postgres.env.POSTGRES_PASSWORD` DEBE ser `postgres`
- Y `services.postgres.env.POSTGRES_DB` DEBE ser `solucorp_test`
- Y `services.postgres.ports` DEBE mapear `5432:5432`

#### Escenario E-30: Health check de postgres declarado con retries suficientes [ESTÁTICO]

- DADO el job `e2e`
- ENTONCES `services.postgres.options` DEBE contener `--health-cmd pg_isready`
- Y DEBE contener `--health-interval 10s`
- Y DEBE contener `--health-timeout 5s`
- Y DEBE contener `--health-retries` con valor igual o mayor a 5 (el design usa 10)

#### Escenario E-31: Variables de entorno de e2e declaradas en el job [ESTÁTICO]

- DADO el job `e2e`
- ENTONCES DEBE declarar `env.DATABASE_URL`
- Y DEBE declarar `env.JWT_SECRET`
- Y DEBE declarar `env.JWT_EXPIRES_IN`

#### Escenario E-32: `DATABASE_URL` contiene literal `"test"` (guardarraíl heredado) [ESTÁTICO]

- DADO el job `e2e` con `env.DATABASE_URL`
- ENTONCES el valor de `DATABASE_URL` DEBE contener el literal `test` (ej. `solucorp_test`)
- (Contrato heredado de `testing-infrastructure/spec.md` §2.1 y §2.2 — si no cumple, los guardarraíles `setup-env.ts` y `truncateAll` abortarán los tests)

#### Escenario E-33: `prisma migrate deploy` ejecutado antes de los tests e2e [ESTÁTICO]

- DADO el job `e2e`
- ENTONCES DEBE existir un step que ejecute `npx prisma migrate deploy`
- Y ese step DEBE tener `working-directory: apps/api`
- Y ese step DEBE aparecer ANTES del step que ejecuta los tests e2e

#### Escenario E-34: E2e tests ejecuta `turbo run test:e2e` [ESTÁTICO]

- DADO el job `e2e`
- ENTONCES DEBE existir un step que ejecute `npx turbo run test:e2e`

#### Escenario E-35: E2e logs se suben solo en `failure()` [ESTÁTICO]

- DADO el job `e2e`
- ENTONCES DEBE existir un step con `uses: actions/upload-artifact@v4`
- Y ese step DEBE tener `if: failure()`
- Y el nombre del artifact DEBE contener `e2e-logs-` como prefijo más `${{ github.run_id }}`
- Y `with.if-no-files-found: ignore`

#### Escenario E-36: El job `e2e` NO menciona `apps/mobile` en steps ejecutables [ESTÁTICO]

- DADO el job `e2e`
- CUANDO se busca la cadena `mobile` en los steps del job
- ENTONCES NO DEBE aparecer `mobile` en ningún step ejecutable
- (Solo se acepta en comentarios del YAML)

---

### 1.12 Ausencia de elementos prohibidos en el YAML

#### Escenario E-37: No existe step de Codecov [ESTÁTICO]

- DADO el archivo `.github/workflows/ci.yml`
- ENTONCES NO DEBE existir ningún step con `uses` que contenga `codecov`
- Y NO DEBE existir referencia a `CODECOV_TOKEN`

#### Escenario E-38: No existe referencia al runner `windows` ni `macos` [ESTÁTICO]

- DADO el archivo `.github/workflows/ci.yml`
- ENTONCES NINGÚN job DEBE tener `runs-on: windows-latest`
- Y NINGÚN job DEBE tener `runs-on: macos-latest`

---

## Sección 2: Contratos sobre `turbo.json`

#### Escenario E-39: Task `typecheck` declarada en `turbo.json` [ESTÁTICO]

- DADO el archivo `turbo.json` en la raíz del monorepo
- ENTONCES DEBE existir la clave `tasks.typecheck`

#### Escenario E-40: Task `typecheck` tiene `dependsOn: ["^build"]` [ESTÁTICO]

- DADO `tasks.typecheck` en `turbo.json`
- ENTONCES `dependsOn` DEBE ser `["^build"]`

#### Escenario E-41: Task `typecheck` tiene `outputs: []` [ESTÁTICO]

- DADO `tasks.typecheck` en `turbo.json`
- ENTONCES `outputs` DEBE ser un array vacío `[]`
- (Typecheck no genera artefactos; el array vacío es intencional para marcar que es cacheable pero sin outputs)

#### Escenario E-42: Task `typecheck` declara inputs adecuados [ESTÁTICO]

- DADO `tasks.typecheck` en `turbo.json`
- ENTONCES `inputs` DEBE incluir `src/**`
- Y DEBE incluir `test/**`
- Y DEBE incluir `tsconfig*.json`
- Y DEBE incluir `package.json`

#### Escenario E-43: Tasks preexistentes (`build`, `lint`, `test`, `test:e2e`) no se modifican [ESTÁTICO]

- DADO `turbo.json` antes y después del cambio
- ENTONCES las definiciones de `tasks.build`, `tasks.lint`, `tasks.test`, `tasks.test:e2e` DEBEN ser idénticas a las que existían antes del cambio `ci-pipeline`
- (El cambio solo AGREGA `typecheck`; no modifica las demás)

---

## Sección 3: Contratos sobre scripts `typecheck` en workspaces

#### Escenario E-44: `apps/api/package.json` tiene script `typecheck` [ESTÁTICO]

- DADO `apps/api/package.json`
- ENTONCES `scripts.typecheck` DEBE existir
- Y su valor DEBE ser `tsc --noEmit`

#### Escenario E-45: `apps/admin/package.json` tiene script `typecheck` [ESTÁTICO]

- DADO `apps/admin/package.json`
- ENTONCES `scripts.typecheck` DEBE existir
- Y su valor DEBE ser `tsc --noEmit`

#### Escenario E-46: `apps/client/package.json` tiene script `typecheck` [ESTÁTICO]

- DADO `apps/client/package.json`
- ENTONCES `scripts.typecheck` DEBE existir
- Y su valor DEBE ser `tsc --noEmit`

#### Escenario E-47: `packages/shared/package.json` tiene script `typecheck` [ESTÁTICO]

- DADO `packages/shared/package.json`
- ENTONCES `scripts.typecheck` DEBE existir
- Y su valor DEBE ser `tsc --noEmit`

#### Escenario E-48: `packages/ui/package.json` tiene script `typecheck` [ESTÁTICO]

- DADO `packages/ui/package.json`
- ENTONCES `scripts.typecheck` DEBE existir
- Y su valor DEBE ser `tsc --noEmit`

#### Escenario E-49: `apps/mobile/package.json` NO tiene script `typecheck` [ESTÁTICO]

- DADO `apps/mobile/package.json`
- ENTONCES `scripts.typecheck` NO DEBE existir
- (Exclusión consciente: apps/mobile queda fuera del pipeline hasta `mobile-testing-foundation`)

#### Escenario E-50: `turbo run typecheck` pasa verde localmente [ESTÁTICO]

- DADO los 5 scripts `typecheck` agregados y la task en `turbo.json`
- CUANDO se ejecuta `npx turbo run typecheck` desde la raíz del monorepo
- ENTONCES DEBE retornar exit code 0
- Y NO DEBE reportar errores de TypeScript en ninguno de los 5 workspaces

---

## Sección 4: Contratos sobre scripts `lint` existentes

#### Escenario E-51: Script `lint` de `apps/api` queda intacto [ESTÁTICO]

- DADO `apps/api/package.json`
- ENTONCES `scripts.lint` DEBE seguir siendo el mismo valor que tenía ANTES del cambio `ci-pipeline`
- Y NO DEBE haberse eliminado la flag `--fix` del script local
- (El CI invoca ESLint directamente sin pasar por este script; el script local preserva DX con `--fix`)

---

## Sección 5: Contratos sobre documentación

### 5.1 `README.md` root

#### Escenario E-52: Sección `## CI` presente en `README.md` root [ESTÁTICO]

- DADO el archivo `README.md` en la raíz del monorepo
- ENTONCES DEBE existir una sección titulada `## CI`

#### Escenario E-53: La sección CI documenta los 5 jobs [ESTÁTICO]

- DADO la sección `## CI` del `README.md` root
- ENTONCES DEBE contener los 5 nombres de jobs: `lint`, `typecheck`, `build`, `unit-tests`, `e2e`
- Y DEBE describir qué hace cada job (formato tabla o lista aceptado)

#### Escenario E-54: La sección CI incluye instrucciones de activación [ESTÁTICO]

- DADO la sección `## CI` del `README.md` root
- ENTONCES DEBE incluir instrucciones para configurar el remote de GitHub (`git remote add origin`)
- Y DEBE mencionar el paso `git push -u origin main`

#### Escenario E-55: La sección CI menciona branch protection rules [ESTÁTICO]

- DADO la sección `## CI` del `README.md` root
- ENTONCES DEBE mencionar las branch protection rules como paso post-merge
- Y DEBE referenciar los 5 status checks requeridos: `lint`, `typecheck`, `build`, `unit-tests`, `e2e`

#### Escenario E-56: La sección CI menciona coverage artifact [ESTÁTICO]

- DADO la sección `## CI` del `README.md` root
- ENTONCES DEBE mencionar que el coverage se publica como artifact descargable
- Y DEBE mencionar la retención de 30 días

### 5.2 `apps/api/README.md`

#### Escenario E-57: Nota sobre typecheck en CI presente en `apps/api/README.md` [ESTÁTICO]

- DADO el archivo `apps/api/README.md`
- ENTONCES DEBE incluir mención al script `typecheck` y cómo ejecutarlo localmente
- Y DEBE mencionar que el script `lint` local usa `--fix` mientras el CI invoca ESLint directamente sin esa flag

---

## Sección 6: Exclusiones explícitas (NO DEBEN existir tras el cambio)

#### Escenario E-58: No existe `codecov.yml` ni referencia a Codecov en el repo [ESTÁTICO]

- DADO el repositorio SoluCorp tras aplicar el cambio
- ENTONCES el archivo `codecov.yml` NO DEBE existir en la raíz ni en `.github/`
- Y NO DEBE existir step con `codecov/codecov-action` en ningún workflow

#### Escenario E-59: No existe directorio `.husky/` ni dependencia `husky` [ESTÁTICO]

- DADO el repositorio SoluCorp tras aplicar el cambio
- ENTONCES el directorio `.husky/` NO DEBE existir
- Y `package.json` raíz NO DEBE tener `husky` en `dependencies` ni en `devDependencies`

#### Escenario E-60: `apps/mobile` NO está referenciado en steps ejecutables del YAML [ESTÁTICO]

- DADO el archivo `.github/workflows/ci.yml`
- CUANDO se busca la cadena `apps/mobile` en steps de jobs
- ENTONCES NO DEBE aparecer en ningún step con `run:` o `uses:`
- Y PUEDE aparecer únicamente en comentarios YAML

#### Escenario E-61: Branch protection rules NO están en archivos del repo [ESTÁTICO]

- DADO el repositorio SoluCorp tras aplicar el cambio
- ENTONCES NO DEBE existir archivo de configuración de branch protection rules
- (La branch protection es configuración manual en GitHub UI; no es artefacto versionable)

#### Escenario E-62: No existe `.github/CODEOWNERS` [ESTÁTICO]

- DADO el repositorio SoluCorp tras aplicar el cambio
- ENTONCES el archivo `.github/CODEOWNERS` NO DEBE existir

---

## Sección 7: Comportamiento esperado en CI (verificable solo post-push)

> Estos escenarios documentan el comportamiento esperado del workflow cuando corra en GitHub Actions. Son verificables únicamente después del primer push al remote.

#### Escenario E-63: Primer push exitoso dispara el workflow [POST-PUSH]

- DADO el repo configurado con `git remote add origin <url>` y `git push -u origin main`
- CUANDO el push llega a GitHub
- ENTONCES DEBE aparecer un workflow run en la pestaña Actions del repositorio
- Y el workflow DEBE ejecutar los 5 jobs en paralelo

#### Escenario E-64: Los 5 jobs pasan en el primer run exitoso [POST-PUSH]

- DADO un estado del código donde todos los 190 tests pasan localmente
- CUANDO el workflow corre por primera vez
- ENTONCES todos los jobs (`lint`, `typecheck`, `build`, `unit-tests`, `e2e`) DEBEN retornar status `success`

#### Escenario E-65: El artifact `coverage-api-<run_id>` es descargable [POST-PUSH]

- DADO un run exitoso (o fallido, por el `if: always()`)
- CUANDO el run finaliza
- ENTONCES el artifact `coverage-api-<run_id>` DEBE estar disponible en la pestaña Actions
- Y DEBE contener `lcov.info`
- Y DEBE tener retención de 30 días

#### Escenario E-66: PR con error de TypeScript es bloqueado por `typecheck` [POST-PUSH]

- DADO una PR que introduce un error de TypeScript en cualquiera de los 5 workspaces
- CUANDO el workflow corre en esa PR
- ENTONCES el job `typecheck` DEBE retornar status `failure`
- Y GitHub DEBE mostrar el check `typecheck` como fallido en la PR

#### Escenario E-67: PR con lint warning en `apps/api` es bloqueado [POST-PUSH]

- DADO una PR que introduce un ESLint warning en `apps/api`
- CUANDO el workflow corre en esa PR
- ENTONCES el job `lint` DEBE retornar status `failure` (por `--max-warnings 0`)

#### Escenario E-68: PR que rompe cualquier test e2e es bloqueada [POST-PUSH]

- DADO una PR que introduce un cambio que falla alguno de los 80 tests e2e
- CUANDO el workflow corre en esa PR
- ENTONCES el job `e2e` DEBE retornar status `failure`

#### Escenario E-69: Tiempo wall-clock del pipeline es menor o igual a 5 minutos (cold cache) [POST-PUSH]

- DADO un run sin cache previo
- CUANDO los 5 jobs corren en paralelo
- ENTONCES el tiempo total wall-clock (desde inicio hasta que el job más largo finaliza) DEBE ser ≤ 5 minutos
- (El job más largo estimado es `e2e` con ~2-3 min; el `build` con Next.js puede llegar a 3-4 min)

#### Escenario E-70: Push nuevo al mismo branch cancela el run anterior [POST-PUSH]

- DADO un run en progreso para un branch X
- CUANDO se hace un nuevo push al mismo branch X
- ENTONCES el run anterior DEBE cancelarse automáticamente (por `cancel-in-progress: true`)
- Y solo el run del push más reciente DEBE completarse

---

## Sección 8: Compatibilidad con contratos de `testing-infrastructure`

Los siguientes contratos son preexistentes y permanecen sin cambios. El CI los hereda; si el pipeline los viola, los guardarraíles del código lanzarán errores explícitos.

#### Escenario E-71: `DATABASE_URL` en job `e2e` cumple guardarraíl de `setup-env.ts` [ESTÁTICO]

- REFERENCIA: `testing-infrastructure/spec.md` §2.2
- DADO que `setup-env.ts` verifica `process.env.DATABASE_URL?.includes('test')`
- Y que el job `e2e` setea `DATABASE_URL: postgresql://postgres:postgres@localhost:5432/solucorp_test`
- ENTONCES la URL contiene `solucorp_test` que contiene el literal `test`
- Y los tests e2e DEBEN arrancar sin que `setup-env.ts` lance error

#### Escenario E-72: `DATABASE_URL` en job `e2e` cumple guardarraíl de `truncateAll` [ESTÁTICO]

- REFERENCIA: `testing-infrastructure/spec.md` §2.1
- DADO que `truncateAll` verifica `!dbUrl.includes('test')`
- Y la `DATABASE_URL` del job `e2e` contiene `solucorp_test`
- ENTONCES `truncateAll` DEBE proceder sin lanzar error de guardarraíl

#### Escenario E-73: `maxWorkers: 1` en jest-e2e.json permanece intacto [ESTÁTICO]

- REFERENCIA: `testing-infrastructure/spec.md` §9.2
- DADO el archivo `apps/api/test/jest-e2e.json`
- ENTONCES `maxWorkers` DEBE seguir siendo `1`
- Y NO DEBE modificarse por el cambio `ci-pipeline`

---

## Resumen de escenarios

| Rango | Sección | Cantidad | Verificabilidad |
|-------|---------|----------|----------------|
| E-01 a E-38 | Workflow `.github/workflows/ci.yml` | 38 | ESTÁTICO |
| E-39 a E-43 | `turbo.json` | 5 | ESTÁTICO |
| E-44 a E-51 | Scripts `typecheck` en workspaces | 8 | ESTÁTICO |
| E-52 a E-57 | Documentación (README raíz + api) | 6 | ESTÁTICO |
| E-58 a E-62 | Exclusiones explícitas | 5 | ESTÁTICO |
| E-63 a E-70 | Comportamiento en CI | 8 | POST-PUSH |
| E-71 a E-73 | Compatibilidad con testing-infrastructure | 3 | ESTÁTICO |
| **Total** | | **73** | |

**Verificables estáticamente:** 65  
**Verificables solo post-push:** 8

---

## Archivos afectados por este cambio

| Archivo | Acción | Escenarios clave |
|---------|--------|-----------------|
| `.github/workflows/ci.yml` | CREAR | E-01 a E-38, E-58, E-60, E-61, E-62 |
| `turbo.json` | MODIFICAR (solo agregar `typecheck`) | E-39 a E-43 |
| `apps/api/package.json` | MODIFICAR (agregar `typecheck`) | E-44 |
| `apps/admin/package.json` | MODIFICAR (agregar `typecheck`) | E-45 |
| `apps/client/package.json` | MODIFICAR (agregar `typecheck`) | E-46 |
| `packages/shared/package.json` | MODIFICAR (agregar `typecheck`) | E-47 |
| `packages/ui/package.json` | MODIFICAR (agregar `typecheck`) | E-48 |
| `apps/mobile/package.json` | NO SE TOCA | E-49 |
| `README.md` | MODIFICAR (agregar sección CI) | E-52 a E-56 |
| `apps/api/README.md` | MODIFICAR (agregar nota typecheck) | E-57 |

---

## Riesgos y supuestos del spec

1. **El design consolidó a 5 jobs** (el proposal hablaba de 6): el job `coverage-upload` fue fusionado como step final de `unit-tests`. Este spec refleja el design (5 jobs). Si sdd-apply revierte a 6 jobs, el escenario E-10 fallaría y deberá actualizarse.

2. **`prisma generate` sin DATABASE_URL**: el design documenta como open question si Prisma 7 con `prisma.config.ts` requiere DATABASE_URL para ejecutar `generate` en jobs no-e2e. Este spec requiere el step en todos los jobs (E-17); si falla, el step DEBERÁ agregar una `env: DATABASE_URL: postgresql://dummy@localhost/dummy` — eso no viola ningún escenario de este spec.

3. **`turbo run test -- --coverage`**: el design documenta como open question si la flag `--coverage` se propaga correctamente a jest. Este spec requiere la flag en el comando (E-25); la implementación exacta (paso directo vs script `test:cov`) queda abierta para sdd-apply, siempre que el resultado sea que coverage se genere en `apps/api/coverage/`.

4. **Warnings ESLint preexistentes**: si `apps/api` tiene warnings preexistentes, el job `lint` con `--max-warnings 0` fallará en el primer run. Este spec no relaja el umbral; la remediación es fixear los warnings antes del push inicial (documentado en proposal).
