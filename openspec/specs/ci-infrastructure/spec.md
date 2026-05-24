# Spec: ci-infrastructure

**Versión:** 1.0  
**Originado en:** Cambio `ci-pipeline` (archivado 2026-05-24)  
**Scope:** Infraestructura de CI/CD del monorepo SoluCorp vía GitHub Actions

## Resumen

Define los contratos permanentes sobre la infraestructura de integración continua del monorepo SoluCorp: declaración de jobs paralelos, triggers, caching, service containers de testing, política de coverage, y exclusiones explícitas.

---

## 1. Workflow file (`.github/workflows/ci.yml`)

### 1.1 Existencia y validez

**Contrato obligatorio:**

- DADO el repositorio SoluCorp
- ENTONCES DEBE existir el archivo `.github/workflows/ci.yml`
- Y DEBE ser sintácticamente válido en YAML (verificable con `actionlint` o parser YAML estándar)
- Y DEBE tener campo `name: CI`

### 1.2 Triggers

**Contrato obligatorio:**

- ENTONCES `on.push.branches` DEBE contener `main`
- Y `on.pull_request.branches` DEBE contener `main`
- Y NO DEBE haber triggers adicionales (cron, workflow_dispatch, etc.)

### 1.3 Concurrency

**Contrato obligatorio:**

- ENTONCES `concurrency.group` DEBE ser exactamente `${{ github.workflow }}-${{ github.ref }}`
- Y `concurrency.cancel-in-progress` DEBE ser `true`
- (Rationale: cancela runs previos del mismo branch cuando llega un nuevo push, ahorra minutos del free tier)

### 1.4 Variables de entorno globales

**Contrato obligatorio:**

- ENTONCES `env.FORCE_COLOR` DEBE estar presente con valor `"1"` (output de jest coloreado en logs de GitHub)
- Y `env.NODE_VERSION` DEBE estar presente con valor `"20"` (LTS, centralizado para cambios fáciles)

---

## 2. Job structure

### 2.1 Jobs declarados

**Contrato obligatorio:**

- DADO el workflow
- ENTONCES `jobs` DEBE contener EXACTAMENTE 5 keys: `lint`, `typecheck`, `build`, `unit-tests`, `e2e`
- Y NO DEBE contener ningún job separado de `coverage-upload` (coverage es step final de `unit-tests`)
- Y TODOS los jobs DEBEN tener `runs-on: ubuntu-latest` (no matriz de OS)
- Y NINGÚN job DEBE declarar clave `needs` (todos son independientes, máxima paralelización)

### 2.2 Timeouts

**Contrato obligatorio:**

- ENTONCES `lint`, `typecheck`, `build`, `unit-tests` DEBEN tener `timeout-minutes: 5`
- Y `e2e` DEBE tener `timeout-minutes: 10`

### 2.3 Steps comunes a todos los jobs

**Contrato obligatorio:**

Cada uno de los 5 jobs DEBE incluir, en orden:

1. `actions/checkout@v4`
2. `actions/setup-node@v4` con:
   - `with.node-version: ${{ env.NODE_VERSION }}`
   - `with.cache: 'npm'`
3. `npm ci`
4. `npx prisma generate` desde `working-directory: apps/api`
5. Steps específicos del job

---

## 3. Job `lint`

### 3.1 ESLint directo sin --fix

**Contrato obligatorio:**

- DADO el job `lint`
- ENTONCES DEBE existir step con `working-directory: apps/api`
- Y ese step DEBE ejecutar comando que contenga `npx eslint`
- Y el comando NO DEBE contener flag `--fix`
- Y el comando DEBE contener `--max-warnings 0`
- Y el patrón de archivos DEBE incluir `{src,apps,libs,test}/**/*.ts`
- (Rationale: CI es read-only; DX local preserva `--fix` en script)

### 3.2 Lint de otros workspaces

**Contrato obligatorio:**

- ENTONCES DEBE existir step que ejecute `npx turbo run lint --filter=!api`
- (Lint en admin, client, shared, ui excluyendo api que ya se corrió)

### 3.3 Mobile excluido

**Contrato obligatorio:**

- CUANDO se busca `mobile` en steps ejecutables del job `lint`
- ENTONCES NO DEBE aparecer en ningún `run:` ni `uses:`
- (Solo aceptado en comentarios YAML)

---

## 4. Job `typecheck`

### 4.1 Turbo task

**Contrato obligatorio:**

- DADO el job `typecheck`
- ENTONCES DEBE existir step que ejecute `npx turbo run typecheck`

### 4.2 Cache de `.turbo/`

**Contrato obligatorio:**

- ENTONCES DEBE existir step con `uses: actions/cache@v4`
- Y `with.path` DEBE incluir `.turbo`
- Y `with.key` DEBE contener `turbo` y `${{ github.sha }}`
- Y DEBE existir al menos una `restore-keys` como fallback

---

## 5. Job `build`

### 5.1 Turbo build

**Contrato obligatorio:**

- DADO el job `build`
- ENTONCES DEBE existir step que ejecute `npx turbo run build`

### 5.2 Cache

**Contrato obligatorio:**

- ENTONCES DEBE existir step con `uses: actions/cache@v4` para `.turbo/`

---

## 6. Job `unit-tests`

### 6.1 Test execution

**Contrato obligatorio:**

- DADO el job `unit-tests`
- ENTONCES DEBE existir step que ejecute `npx turbo run test -- --coverage`

### 6.2 Coverage upload

**Contrato obligatorio:**

- ENTONCES DEBE existir step final con `uses: actions/upload-artifact@v4`
- Y `with.if: always()` (sube incluso si tests fallan)
- Y `with.path: apps/api/coverage/`
- Y `with.retention-days: 30`
- Y `with.name` DEBE contener `coverage-api-` + `${{ github.run_id }}`
- Y `with.if-no-files-found: warn`

---

## 7. Job `e2e`

### 7.1 PostgreSQL service container

**Contrato obligatorio:**

- DADO el job `e2e`
- ENTONCES DEBE declarar `services.postgres` con:
  - `image: postgres:16`
  - `env.POSTGRES_USER: postgres`
  - `env.POSTGRES_PASSWORD: postgres`
  - `env.POSTGRES_DB: solucorp_test`
  - `ports: [5432:5432]`
  - Health check: `--health-cmd pg_isready` + `--health-interval 10s` + `--health-timeout 5s` + `--health-retries >= 5`

### 7.2 Environment variables

**Contrato obligatorio:**

- ENTONCES `env.DATABASE_URL` DEBE ser `postgresql://postgres:postgres@localhost:5432/solucorp_test`
  - (NOTA: literal `test` en `solucorp_test` cumple guardarraíl de `testing-infrastructure/spec.md`)
- Y `env.JWT_SECRET` DEBE estar presente (valor de test, no secret real)
- Y `env.JWT_EXPIRES_IN` DEBE estar presente (ej. `8h`)

### 7.3 Migration y tests

**Contrato obligatorio:**

- ENTONCES DEBE existir step que ejecute `npx prisma migrate deploy` desde `apps/api/`
- Y ese step DEBE aparecer ANTES del step que ejecuta los tests e2e
- Y DEBE existir step que ejecute `npx turbo run test:e2e`

### 7.4 Artifact de logs en failure

**Contrato obligatorio:**

- ENTONCES DEBE existir step con `uses: actions/upload-artifact@v4`
- Y `if: failure()` (solo en fallo)
- Y `with.path: apps/api/test/**/*.log` (o equivalente)
- Y `with.retention-days: 7`
- Y `with.if-no-files-found: ignore`

### 7.5 Mobile excluido

**Contrato obligatorio:**

- CUANDO se busca `mobile` en steps ejecutables
- ENTONCES NO DEBE aparecer en `run:` ni `uses:`

---

## 8. Turborepo configuration (`turbo.json`)

### 8.1 Task `typecheck`

**Contrato obligatorio:**

- DADO `turbo.json` en raíz
- ENTONCES `tasks.typecheck` DEBE estar declarado
- Y `dependsOn` DEBE ser `["^build"]`
- Y `outputs` DEBE ser `[]` (no genera artefactos)
- Y `inputs` DEBE incluir: `src/**`, `test/**`, `tsconfig*.json`, `package.json`

### 8.2 Tasks preexistentes intactas

**Contrato obligatorio:**

- ENTONCES `tasks.build`, `tasks.lint`, `tasks.test`, `tasks.test:e2e` NO DEBEN modificarse desde su estado preexistente

---

## 9. Workspace scripts

### 9.1 Scripts `typecheck` en 5 workspaces

**Contrato obligatorio:**

- DADO `apps/api/package.json`, `apps/admin/package.json`, `apps/client/package.json`, `packages/shared/package.json`, `packages/ui/package.json`
- ENTONCES CADA uno DEBE tener `scripts.typecheck: "tsc --noEmit"`

### 9.2 Mobile excluido de scripts

**Contrato obligatorio:**

- DADO `apps/mobile/package.json`
- ENTONCES `scripts.typecheck` NO DEBE existir
- (Exclusión consciente hasta `mobile-testing-foundation`)

### 9.3 Script `lint` intacto en api

**Contrato obligatorio:**

- DADO `apps/api/package.json` antes y después
- ENTONCES `scripts.lint` NO DEBE modificarse
- (CI invoca ESLint directamente; script local preserva DX con `--fix`)

---

## 10. Exclusiones explícitas

**Contrato obligatorio:**

- DADO el repositorio tras la implementación
- ENTONCES NO DEBE existir `codecov.yml`
- Y NO DEBE existir referencia a `codecov/codecov-action` en el workflow
- Y NO DEBE existir `.husky/` ni `husky` en `package.json`
- Y NO DEBE existir `.github/CODEOWNERS`
- Y NO DEBE existir `windows-latest` ni `macos-latest` en jobs
- (Rationale: cero overhead externo; coverage como GitHub Artifact; husky como cambio futuro)

---

## 11. Documentation

### 11.1 `README.md` root

**Contrato obligatorio:**

- DADO `README.md` en raíz
- ENTONCES DEBE contener sección `## CI`
- Y la sección DEBE describir los 5 jobs
- Y DEBE incluir instrucciones: `git remote add origin`, `git push -u origin main`
- Y DEBE mencionar branch protection rules con los 5 status checks requeridos: `lint`, `typecheck`, `build`, `unit-tests`, `e2e`
- Y DEBE mencionar coverage artifact con retención 30 días

### 11.2 `apps/api/README.md`

**Contrato obligatorio:**

- DADO `apps/api/README.md`
- ENTONCES DEBE incluir sección o nota sobre cómo ejecutar `typecheck` localmente
- Y DEBE mencionar que el script `lint` local usa `--fix` mientras CI invoca ESLint directamente

---

## 12. Compatibilidad heredada

Los siguientes contratos son preexistentes (de `testing-infrastructure/spec.md`) y DEBEN seguir siendo respetados:

### 12.1 Guardarraíl de DATABASE_URL

**Contrato heredado:**

- DADO `setup-env.ts` que valida `process.env.DATABASE_URL?.includes('test')`
- Y que `truncateAll` valida lo mismo
- ENTONCES el job `e2e` CON `DATABASE_URL: postgresql://postgres:postgres@localhost:5432/solucorp_test`
- DEBE cumplir ambos guardarraíles (literal `test` en `solucorp_test`)

### 12.2 maxWorkers en e2e

**Contrato heredado:**

- DADO `apps/api/test/jest-e2e.json`
- ENTONCES `maxWorkers` DEBE ser `1` (DB compartida entre tests e2e)
- Y NO DEBE modificarse por cambios de CI

---

## 13. Resumen de verificabilidad

| Aspecto | Tipo | Verificable |
|---------|------|-------------|
| `.github/workflows/ci.yml` exists + YAML valid | Estático | Local, `actionlint` |
| 5 jobs paralelos (lint, typecheck, build, unit-tests, e2e) | Estático | Inspección YAML |
| Turbo task + workspace scripts | Estático | `turbo.json` + `package.json` |
| Service container postgres:16 configurado | Estático | Inspección YAML |
| Coverage upload 30d | Estático | Inspección YAML step |
| Documentación README | Estático | Lectura archivos |
| Primer run exitoso en GitHub Actions | POST-PUSH | Requiere remote y push |
| Tests e2e pasan en CI | POST-PUSH | Requiere remote y push |
| Wall-clock <= 5 min | POST-PUSH | Requiere remote y push |
| Concurrency cancel-in-progress funciona | POST-PUSH | Requiere remote y múltiples pushes |

**Estáticos:** 9+  
**POST-PUSH:** 4

---

## 14. Cambios futuros relacionados

Estos cambios son independientes y no afectan este spec:

- `mobile-testing-foundation` — Agregar mobile al pipeline (Jest + jest-expo)
- `typescript-strict-mode` — Revertir ESLint softening (W1 de ci-pipeline)
- `codecov-integration` — Migrar coverage de Artifact a Codecov
- `husky-precommit` — Pre-commit hooks como complemento
- `admin-testing-foundation`, `client-testing-foundation` — Jest + RTL para Next.js apps
