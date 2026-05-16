# Design: ci-pipeline

## Resumen ejecutivo

Workflow único `.github/workflows/ci.yml` con 5 jobs paralelos (lint, typecheck, build, unit-tests, e2e) corriendo en `ubuntu-latest` con Node 20 LTS. Cada job hace su propio checkout + `npm ci` + `prisma generate` (per-job install, cache hit ~10s vía `actions/setup-node@v4`). E2e usa service container `postgres:16` con DATABASE_URL `solucorp_test` (cumple guardarraíl `includes('test')`). Coverage se sube como step final de `unit-tests` con `if: always()`, retención 30d. Cambios aditivos: script `typecheck` en api/admin/client/shared/ui, task `typecheck` cacheable en `turbo.json`. Sin secrets reales, sin Codecov, sin matriz de OS/Node, sin mobile.

## Estructura del workflow

### Archivo: `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  FORCE_COLOR: "1"
  NODE_VERSION: "20"
  # Mobile (apps/mobile) queda fuera de CI: sin scripts útiles (no lint/typecheck/test/build).
  # Cubierto por cambio futuro `mobile-testing-foundation`.

jobs:
  # ---------- LINT ----------
  lint:
    name: Lint
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node ${{ env.NODE_VERSION }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma Client
        working-directory: apps/api
        run: npx prisma generate

      - name: Lint apps/api (ESLint, no --fix, max-warnings 0)
        working-directory: apps/api
        run: npx eslint "{src,apps,libs,test}/**/*.ts" --max-warnings 0

      - name: Lint other workspaces (turbo, read-only)
        run: npx turbo run lint --filter=!api

  # ---------- TYPECHECK ----------
  typecheck:
    name: Typecheck
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node ${{ env.NODE_VERSION }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma Client
        working-directory: apps/api
        run: npx prisma generate

      - name: Restore turbo cache
        uses: actions/cache@v4
        with:
          path: .turbo
          key: ${{ runner.os }}-turbo-typecheck-${{ github.sha }}
          restore-keys: |
            ${{ runner.os }}-turbo-typecheck-
            ${{ runner.os }}-turbo-

      - name: Typecheck (turbo)
        run: npx turbo run typecheck

  # ---------- BUILD ----------
  build:
    name: Build
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node ${{ env.NODE_VERSION }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma Client
        working-directory: apps/api
        run: npx prisma generate

      - name: Restore turbo cache
        uses: actions/cache@v4
        with:
          path: .turbo
          key: ${{ runner.os }}-turbo-build-${{ github.sha }}
          restore-keys: |
            ${{ runner.os }}-turbo-build-
            ${{ runner.os }}-turbo-

      - name: Build all workspaces (turbo)
        run: npx turbo run build

  # ---------- UNIT TESTS ----------
  unit-tests:
    name: Unit tests
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node ${{ env.NODE_VERSION }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma Client
        working-directory: apps/api
        run: npx prisma generate

      - name: Restore turbo cache
        uses: actions/cache@v4
        with:
          path: .turbo
          key: ${{ runner.os }}-turbo-test-${{ github.sha }}
          restore-keys: |
            ${{ runner.os }}-turbo-test-
            ${{ runner.os }}-turbo-

      - name: Unit tests (turbo) with coverage
        run: npx turbo run test -- --coverage

      - name: Upload coverage artifact (api)
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-api-${{ github.run_id }}
          path: apps/api/coverage/
          retention-days: 30
          if-no-files-found: warn

  # ---------- E2E ----------
  e2e:
    name: E2E (api)
    runs-on: ubuntu-latest
    timeout-minutes: 10

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: solucorp_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 10

    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/solucorp_test
      JWT_SECRET: test-secret-ci-only
      JWT_EXPIRES_IN: 8h

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node ${{ env.NODE_VERSION }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma Client
        working-directory: apps/api
        run: npx prisma generate

      - name: Apply Prisma migrations
        working-directory: apps/api
        run: npx prisma migrate deploy

      - name: E2E tests (turbo)
        run: npx turbo run test:e2e

      - name: Upload e2e logs on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: e2e-logs-${{ github.run_id }}
          path: |
            apps/api/test/**/*.log
          retention-days: 7
          if-no-files-found: ignore
```

> **Nota sobre el conteo de jobs:** El proposal mencionaba "6 jobs", el design consolida a **5 jobs reales**. `coverage-upload` se fusiona como step final de `unit-tests` con `if: always()` — elimina un job innecesario que solo descargaría+resubiría el artifact. El spec deberá ajustarse a "5 jobs declarados, coverage publicado como step final de unit-tests".

## Estrategia de install

**Decisión:** Per-job install (Opción A).

**Razón:**
1. `actions/setup-node@v4` con `cache: 'npm'` cachea el directorio `~/.npm` automáticamente por hash de `package-lock.json`. Cache hit baja `npm ci` a ~10s.
2. Subir `node_modules` como artifact entre jobs implica 200-500 MB por upload+download por job — más lento que reinstalar con cache.
3. Cero coordinación entre jobs (cada job es autocontenido). Más simple, más robusto, mejor concurrencia.

**Alternativa rechazada:** Shared install job. Añade complejidad sin ganar tiempo medible.

## Caching

| Qué se cachea | Acción | Key | Restore keys |
|--------------|--------|-----|--------------|
| `~/.npm` (npm cache global) | `actions/setup-node@v4` con `cache: 'npm'` | hash de `package-lock.json` (automático) | automático |
| `.turbo/` (turbo cache por job que lo use) | `actions/cache@v4` | `${{ runner.os }}-turbo-{task}-${{ github.sha }}` | `${{ runner.os }}-turbo-{task}-`, `${{ runner.os }}-turbo-` |
| Prisma Client (`node_modules/.prisma/client`) | NO cachear | — | — |

**Justificación Prisma:** `prisma generate` toma ~5-10s y depende del schema. Cachearlo por hash del schema agregaría 2 steps adicionales sin beneficio claro. Mejor regenerar siempre — garantiza consistencia.

**Justificación turbo restore-keys:** El primer fallback (`${{ runner.os }}-turbo-{task}-`) permite reutilizar cache del mismo task aunque sea de otro commit; el segundo (`${{ runner.os }}-turbo-`) permite warm-up cruzado entre tasks en el primer run.

## Postgres service container

```yaml
services:
  postgres:
    image: postgres:16
    env:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: solucorp_test
    ports:
      - 5432:5432
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 10
```

`postgres:16` matchea con la versión LTS estándar. El nombre `solucorp_test` cumple `includes('test')` (guardarraíles `setup-env.ts` y `helpers/db.ts`). Sin volume ni init script: las migraciones de Prisma crean todo el schema desde cero en cada run.

## Variables de entorno

| Variable | Valor | Scope | Justificación |
|---|---|---|---|
| `FORCE_COLOR` | `"1"` | workflow (todos los jobs) | Output de jest legible en logs de GitHub |
| `NODE_VERSION` | `"20"` | workflow | Centralizar versión (cambio fácil) |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/solucorp_test` | job `e2e` | Cumple `includes('test')` |
| `JWT_SECRET` | `test-secret-ci-only` | job `e2e` | Valor de test, sin secret real |
| `JWT_EXPIRES_IN` | `8h` | job `e2e` | Consistente con `.env.test.example` |
| `NODE_ENV` | NO se setea explícitamente | — | Jest setea `test` automáticamente |
| `CI` | (automático, GitHub lo setea a `true`) | — | Detectable por scripts si hace falta |

## Prisma generate

**Decisión:** Step explícito `npx prisma generate` desde `apps/api/` después de `npm ci` en TODOS los jobs (Opción A).

**Razón:**
- Sin `prisma generate` los tipos de `@prisma/client` están vacíos → `tsc --noEmit` y `nest build` fallan inmediatamente.
- `working-directory: apps/api` para que tome el `prisma.config.ts` correcto.
- `postinstall` hook (Opción C) sería más invasivo: modifica `apps/api/package.json` y afecta DX local.

**Open question para apply:** Prisma 7 con `prisma.config.ts` lee `dotenv/config`. Verificar si `prisma generate` falla sin DATABASE_URL setada en jobs no-e2e. Si falla, agregar `env: DATABASE_URL: postgresql://dummy@localhost/dummy` al step solo para satisfacer la validación de Prisma (es metadata-only, no conecta).

## Job dependencies

**Decisión:** Todos los jobs son INDEPENDIENTES (sin `needs`). Máxima paralelización.

```
                ┌── lint
                ├── typecheck
checkout (×5) ──┼── build
                ├── unit-tests ── (coverage artifact step)
                └── e2e
```

**Razón:**
1. `e2e` NO necesita `build` previo: e2e levanta `AppModule` vía `ts-jest`, no usa `dist/`. Hacerlo dependiente de `build` agrega ~30s sin valor.
2. `build` valida que Next.js admin/client compilan — útil saberlo aunque e2e falle.
3. `coverage-upload` se fusiona dentro de `unit-tests` (step `if: always()`) en lugar de ser job separado. Elimina un job que solo descargaba+resubía.

**Wall-clock estimado:** ~3-4 min cold cache, ~2 min con cache hit.

## Lint sin --fix

**Decisión:** Opción A (invocación directa). El job `lint` ejecuta dos comandos:

1. `npx eslint "{src,apps,libs,test}/**/*.ts" --max-warnings 0` desde `apps/api/` — equivale al script `lint` PERO sin `--fix` y con `--max-warnings 0`.
2. `npx turbo run lint --filter=!api` desde root — corre `lint` en `admin`, `client`, `shared`, `ui`.

**Razón:**
- Cero modificaciones a `apps/api/package.json` script `lint` (preserva DX local: `npm --workspace api run lint` sigue arreglando automáticamente).
- Cero scripts `lint:ci` redundantes (Opción C).
- Granularidad: el CI controla los flags estrictos, el script local sigue siendo permisivo.

**Trade-off:** El job `lint` tiene 2 comandos en vez de 1. Aceptable.

**Atención `packages/shared` y `packages/ui`:** sus scripts `lint` son `tsc --noEmit`, no ESLint. El `turbo run lint --filter=!api` los corre tal cual — no es lint real, es typecheck. Esto se solapa con el job `typecheck`. **Decisión consciente:** dejarlo así en esta fase. Es ruido aceptable. El cambio futuro `packages-lint-cleanup` puede separar lint real de typecheck en esos packages.

## Task `typecheck` en `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": [],
      "inputs": ["src/**", "test/**", "tsconfig*.json", "package.json"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "inputs": ["src/**", "test/helpers/**", "package.json", "jest.config.*", "tsconfig*.json"]
    },
    "test:e2e": {
      "dependsOn": ["^build"],
      "cache": false,
      "outputs": []
    }
  }
}
```

**Inputs incluyen `test/**`** porque `apps/api/test/` también se chequea con TS.
**`dependsOn: ["^build"]`** consistente con las demás tasks.
**`outputs: []`** marca explícito que typecheck no genera artefactos, pero sigue siendo cacheable por inputs.

## Scripts a agregar

| Workspace | Script | Comando |
|-----------|--------|---------|
| `apps/api` | `typecheck` | `tsc --noEmit` |
| `apps/admin` | `typecheck` | `tsc --noEmit` |
| `apps/client` | `typecheck` | `tsc --noEmit` |
| `packages/shared` | `typecheck` | `tsc --noEmit` |
| `packages/ui` | `typecheck` | `tsc --noEmit` |

**Razón apps/admin y apps/client:** ya tienen `noEmit: true` en `tsconfig.json` y `next build` los typechequea implícitamente, PERO un script `typecheck` dedicado permite que el job `typecheck` falle rápido (5s) sin esperar el `next build` completo (~30s).

**Razón packages/shared y packages/ui:** ya tienen `lint: "tsc --noEmit"`. Agregar `typecheck` con el mismo comando es redundante pero hace al monorepo uniforme — `turbo run typecheck` funciona en todos los workspaces.

**`apps/mobile`:** no se toca. Sigue sin scripts. Comentario explícito en el YAML.

## Job timeouts

| Job | Timeout | Razón |
|---|---|---|
| `lint` | 5 min | ESLint + turbo lint en 4 workspaces |
| `typecheck` | 5 min | tsc --noEmit en 5 workspaces, cacheable |
| `build` | 5 min | nest + tsc + 2× next build |
| `unit-tests` | 5 min | 110 unit tests + coverage |
| `e2e` | 10 min | Margen por postgres startup + 80 e2e tests |

## Concurrency

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

Cancela runs previos del mismo branch cuando llega un push nuevo. Ahorra minutos del free tier.

## Coverage upload

**Decisión:** Step final del job `unit-tests` con `if: always()` (no es job separado).

**Detalles:**
- Path: `apps/api/coverage/` (carpeta completa: lcov.info + lcov-report HTML + cobertura.json + clover.xml).
- Nombre artifact: `coverage-api-${{ github.run_id }}`.
- Retention: 30 días.
- `if: always()` — sube incluso si tests fallan.
- `if-no-files-found: warn` — no rompe el job si jest no generó coverage.

## CODEOWNERS

**Decisión:** NO crear `.github/CODEOWNERS`. Documentar como SUGGESTION en archive-report para cuando se sume el segundo dev.

## Updates de README

### `README.md` root — sección a agregar

```markdown
## CI

El proyecto usa GitHub Actions. El workflow vive en `.github/workflows/ci.yml` y se dispara en push a `main` y en cada PR contra `main`.

### Jobs

| Job | Qué hace |
|---|---|
| `lint` | ESLint sobre apps/api (sin `--fix`, `--max-warnings 0`) + lint de admin/client/packages |
| `typecheck` | `tsc --noEmit` en api, admin, client, shared, ui (via `turbo run typecheck`) |
| `build` | `turbo run build` (nest + next + tsc en packages) |
| `unit-tests` | `turbo run test` (110 tests: api unit + shared + ui) + sube coverage como artifact |
| `e2e` | `turbo run test:e2e` (80 tests api) con service container `postgres:16` |

Tiempo wall-clock esperado: ~3-4 min cold cache, ~2 min con cache hit.

### Coverage

El reporte de coverage (lcov + html) se publica como artifact `coverage-api-<run_id>` con 30 días de retención. Descargable desde la pestaña Actions de cada run.

### Activación del pipeline

El YAML está versionado pero queda inerte hasta que el repo tenga un remote en GitHub:

\`\`\`bash
git remote add origin git@github.com:<owner>/solucorp.git
git push -u origin main
\`\`\`

Después del primer push exitoso, ir a Settings → Branches → Add rule para `main` y exigir status checks: `lint`, `typecheck`, `build`, `unit-tests`, `e2e`.

`apps/mobile` está fuera del pipeline (sin scripts útiles); su cobertura llegará con el cambio `mobile-testing-foundation`.
```

### `apps/api/README.md` — nota a agregar

```markdown
## Typecheck en CI

El job `typecheck` del workflow CI ejecuta `tsc --noEmit` por workspace vía `turbo run typecheck`. Localmente:

\`\`\`bash
npm --workspace api run typecheck
\`\`\`

El script `lint` local sigue usando `--fix` para DX. El CI invoca ESLint directamente sin `--fix` para mantenerlo read-only.
```

## Decisiones de arquitectura

| # | Decisión | Alternativas rechazadas | Razón |
|---|---|---|---|
| 1 | Per-job install con `setup-node` cache | Shared install job + artifact | Más simple, cache hit ~10s, sin coordinación |
| 2 | `prisma generate` en cada job | postinstall hook; solo en jobs que lo necesitan | Explícito; todos los jobs lo necesitan |
| 3 | Jobs paralelos sin `needs` | `e2e needs: build` | Build no genera artefacto que e2e consuma (ts-jest) |
| 4 | Coverage como step de `unit-tests`, no job separado | Job dedicado `coverage-upload needs: [unit, e2e]` | Elimina un job que solo descarga+resubía |
| 5 | ESLint directo desde el job para api | Script `lint:ci`; modificar script `lint` | Cero churn en package.json local |
| 6 | `postgres:16` service container | Docker compose en step; SQLite en memoria | Native, mismo motor que prod |
| 7 | DATABASE_URL hardcoded con `solucorp_test` | Secret en GitHub | Cero secret real necesario; cumple guardarraíl |
| 8 | Solo `ubuntu-latest` + Node 20 | Matriz OS × Node | Target de deploy es Linux |
| 9 | GitHub Artifact para coverage | Codecov / Coveralls | Cero setup externo |
| 10 | Concurrency con `cancel-in-progress: true` | Sin cancel | Ahorra minutos del free tier |
| 11 | Cache de `.turbo/` con restore-keys cruzados | Sin cache turbo | Restore-keys permiten warm-up tras primer run |
| 12 | NO crear `.github/CODEOWNERS` | Crearlo con un único owner | Overhead vacío en proyecto solo-user |
| 13 | NO modificar script `lint` de `apps/api` | Cambiarlo a sin `--fix` | Preserva DX local del `--fix` |
| 14 | `typecheck` task con `inputs: [..., "test/**"]` | Solo `src/**` | Tests también participan del typecheck |
| 15 | Script `typecheck` aditivo en admin/client/shared/ui | Solo en api | `turbo run typecheck` debe funcionar en todos |
| 16 | Mobile fuera del pipeline con comentario en YAML | Job placeholder con `if: false` | Cero ruido |
| 17 | `if: always()` en upload de coverage | `if: success()` | Coverage parcial útil para debug |

## Compatibilidad y orden de implementación

### Cohabitación con código existente

- **Tests existentes:** sin cambios. Los 190 tests siguen pasando localmente.
- **Scripts `lint` actuales:** sin cambios. CI invoca ESLint directamente para api.
- **`turbo.json`:** se agrega `typecheck` (no modifica tasks existentes).
- **`apps/api/package.json`:** solo se AGREGA el script `typecheck`.
- **`apps/admin`, `apps/client`, `packages/shared`, `packages/ui`:** se agrega script `typecheck`.

### Orden recomendado de implementación

1. **Modificar `turbo.json`** — agregar task `typecheck`. Verificar localmente con `npx turbo run typecheck` (debe fallar porque los scripts no existen aún).
2. **Agregar scripts `typecheck`** a los 5 workspaces. Correr `npx turbo run typecheck` — debe pasar verde.
3. **Correr lint estricto localmente** antes de escribir el YAML: `cd apps/api && npx eslint "{src,apps,libs,test}/**/*.ts" --max-warnings 0`. Si hay warnings preexistentes, fixearlos o ajustar el umbral inicial.
4. **Crear `.github/workflows/ci.yml`** con el YAML completo de arriba.
5. **Actualizar `README.md` root** con la sección "CI".
6. **Actualizar/crear `apps/api/README.md`** con la nota de typecheck.
7. **Verificación local final:** correr `npm ci && npx turbo run lint && npx turbo run typecheck && npx turbo run build && npx turbo run test`.
8. **Post-merge (manual):** `git remote add origin ...`, `git push -u origin main`.

### Commits sugeridos

1. `chore(turbo): add typecheck task`
2. `chore: add typecheck script to all TS workspaces`
3. `ci: add github actions workflow for lint/typecheck/build/test/e2e`
4. `docs: add CI section to README and typecheck note to apps/api`

## Diagrama de jobs

```
                                    push main / PR -> main
                                            │
                                            ▼
                                ┌──── concurrency gate ────┐
                                │  group: workflow + ref   │
                                │  cancel-in-progress: yes │
                                └─────────────┬────────────┘
                                              │
              ┌──────────────┬─────────────┬──┴───────────┬──────────────┐
              ▼              ▼             ▼              ▼              ▼
         ┌─────────┐    ┌─────────┐   ┌────────┐    ┌────────────┐  ┌──────────┐
         │  lint   │    │typecheck│   │ build  │    │unit-tests  │  │   e2e    │
         │ (5 min) │    │ (5 min) │   │(5 min) │    │ (5 min)    │  │ (10 min) │
         └─────────┘    └─────────┘   └────────┘    └─────┬──────┘  └──────────┘
                                                          │           ▲
                                                          │           │
                                                          ▼           │
                                                  ┌───────────────┐   │
                                                  │ upload coverage│  │
                                                  │ artifact 30d  │   │
                                                  │ if: always()  │   │
                                                  └───────────────┘   │
                                                                      │
                                              postgres:16 service ────┘
                                              (healthcheck pg_isready)

  Cada job: checkout → setup-node (cache npm) → npm ci → prisma generate → (task-specific steps)
```

## Open Questions (para resolver en sdd-apply)

- [ ] Confirmar si `npx prisma generate` requiere DATABASE_URL para correr (Prisma 7 con `prisma.config.ts` lee `dotenv/config`). Si falla, agregar `env: DATABASE_URL: postgresql://dummy@localhost/dummy` al step en jobs no-e2e.
- [ ] Verificar que el comando `turbo run test -- --coverage` propaga `--coverage` a jest en todos los workspaces. Si no, ajustar a invocar `jest --coverage` por workspace o agregar script `test:cov` por workspace.
- [ ] Confirmar que correr lint estricto local NO descubre warnings preexistentes que rompan el primer run.
