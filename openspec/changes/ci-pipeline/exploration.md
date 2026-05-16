# Exploration: ci-pipeline

## Problema

El proyecto SoluCorp terminó el cambio `testing-foundation` con **190 tests pasando** (52 unit API + 80 e2e API + 38 shared + 20 UI), pero ese suite solo corre cuando alguien ejecuta `npm test` o `npm run test:e2e` manualmente. Sin CI activo, ningún PR puede romperse silenciosamente — un push puede subir código que falla en `tsc`, en lint, o en cualquiera de los 190 tests sin que nadie lo sepa hasta que alguien recuerda correrlos.

El ROI de activar CI ahora es máximo: la infraestructura de testing ya existe y es sólida. Solo falta el trigger automático que la ejecute en cada PR/push. El costo de no tenerlo crece linealmente con cada desarrollador que se incorpore.

## Estado actual de CI/CD

Confirmado por exploración del filesystem:

| Herramienta | Archivo esperado | Estado |
|-------------|-----------------|--------|
| GitHub Actions | `.github/workflows/` | NO EXISTE |
| GitLab CI | `.gitlab-ci.yml` | NO EXISTE |
| Bitbucket Pipelines | `bitbucket-pipelines.yml` | NO EXISTE |
| Azure Pipelines | `azure-pipelines.yml` | NO EXISTE |
| CircleCI | `.circleci/` | NO EXISTE |
| Docker Compose | `docker-compose.yml` | NO EXISTE |
| Dockerfile | `Dockerfile` | NO EXISTE |
| Husky / pre-commit | `.husky/` | NO EXISTE |

El repo no tiene remote configurado. La decisión de plataforma está abierta, pero el contexto indica GitHub como destino natural.

## Scripts disponibles por workspace

| Workspace | lint | typecheck | build | test | test:e2e |
|-----------|------|-----------|-------|------|----------|
| `apps/api` | `eslint ... --fix` | NO script (`tsc --noEmit` manual) | `nest build` | `jest` | `jest --config ./test/jest-e2e.json` |
| `apps/admin` | `eslint` | NO script (`noEmit: true` en tsconfig) | `next build` | — | — |
| `apps/client` | `eslint` | NO script (`noEmit: true` en tsconfig) | `next build` | — | — |
| `apps/mobile` | — | — | — | — | — |
| `packages/shared` | `tsc --noEmit` (script `lint`) | via `lint` | `tsc` | `jest` | — |
| `packages/ui` | `tsc --noEmit` (script `lint`) | via `lint` | `tsc` | `jest` | — |
| **root** | `turbo lint` | — | `turbo build` | `turbo run test` | `turbo run test:e2e` |

**Gaps detectados:**
- `apps/api` no tiene script `typecheck` dedicado
- `apps/admin`/`apps/client` sin tests; `next build` valida tipos implícitamente
- `apps/mobile` sin scripts útiles para CI
- `turbo.json` no tiene task `typecheck`
- `apps/api` lint usa `--fix` (no apto para CI read-only)

## Approaches de CI

### A. GitHub Actions (recomendado)

YAML en `.github/workflows/`. Free tier 2000 min/mes para privados. Service containers nativos. Marketplace masivo.

**Pros:** ecosistema enorme, postgres nativo, integración PR perfecta, mayor adopción.
**Contras:** requiere GitHub como remote.
**Costo:** 2000 min/mes free.

### B. GitLab CI

`.gitlab-ci.yml`. 400 min/mes free.
**Pros:** todo integrado en una plataforma.
**Contras:** migración de plataforma; free tier más limitado.

### C. CircleCI

`.circleci/config.yml`. 6000 créditos/mes free.
**Pros:** parallelism avanzado.
**Contras:** 2 plataformas a mantener; menor adopción LATAM.

**Recomendación: GitHub Actions.** Menor fricción, postgres nativo, branch protection integrado.

## Service container PostgreSQL

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
      --health-retries 5
```

**Versión:** `postgres:16` (LTS).
**Migraciones:** `npx prisma migrate deploy` después del health check.
**DATABASE_URL:** hardcoded en env del job (`postgresql://postgres:postgres@localhost:5432/solucorp_test`). Compatible con el guardarraíl `includes('test')`.

## Estrategia de jobs

### A. Job único multi-pasos (serial)
checkout → install → lint → typecheck → build → unit → e2e. Simple pero lento.

### B. Jobs paralelos con dependencias (recomendado)

```
install ──► lint (parallel)
        ──► typecheck (parallel)
        ──► unit-tests (parallel)
        ──► e2e (needs install + build)
            └─► coverage-upload (needs unit + e2e)
```

**Tiempos estimados:**
- install + cache: ~60s (~10s con cache hit)
- lint: ~30s | typecheck: ~45s | unit: ~20s (paralelos)
- e2e: ~50s
- **Wall-clock total: ~2-3 min**
- **Minutos facturados: ~5 min/run**

15 PRs/semana × 5 min × 4 sem = **300 min/mes** (holgado en free tier).

## Caching

```yaml
- uses: actions/cache@v4
  with:
    path: |
      node_modules
      apps/*/node_modules
      packages/*/node_modules
    key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-npm-
```

Además: cache de `.turbo/` y opcional cache de Prisma client (key: hash del schema.prisma).

## Coverage upload

| Opción | Pros | Contras |
|--------|------|---------|
| **GitHub Artifact** | Cero setup, lcov descargable | Sin trending, sin PR comments |
| **Codecov** | PR comments, trends, badges | Requiere cuenta + token |
| **Coveralls** | Similar Codecov | Menor comunidad |
| **SonarCloud** | Análisis completo | Setup pesado |

**Recomendación:** empezar con **GitHub Artifact** (cero setup externo). Migrar a Codecov cuando el equipo lo pida.

## PR vs push

```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
```

Workflow único triggered en push + PR. Branch protection en GitHub UI exige status checks verdes.

## Secrets

| Variable | Valor en CI | ¿Secret real? |
|----------|-------------|--------------|
| `DATABASE_URL` | hardcoded URL del service container | NO |
| `JWT_SECRET` | `test-secret-ci-only` | NO |
| `JWT_EXPIRES_IN` | `8h` | NO |
| `CODECOV_TOKEN` | si se usa Codecov | SÍ (futuro) |

Fase 1: cero secrets reales.

## Multi-OS y matriz de Node

**Recomendación: solo `ubuntu-latest` + Node 20.x.**

- Linux es el target de deploy
- Service containers solo en Linux runners
- Windows/macOS son 2x/10x más caros
- Sin matriz de versiones (no es una librería pública)

## Costo y límites GitHub Actions

- Pipeline ~5 min/run
- 300 min/mes con 15 PRs/sem (15% del free tier)
- 800 min/mes con 5 devs y 40 PRs/sem (40% del free tier)
- Holgado para crecimiento orgánico

## Riesgos

1. **E2e flaky por timing de DB** — health check con retries mitiga; aumentar a 10 si flaky
2. **Cache stale** — siempre `npm ci` (no `npm install`)
3. **`prisma generate` ausente rompe build** — step explícito obligatorio
4. **Mobile sin scripts útiles** — excluir explícitamente del pipeline Fase 1
5. **`apps/api` lint con `--fix`** — invocar ESLint directamente en CI sin `--fix`
6. **`apps/admin`/`apps/client` sin tests** — solo build valida tipos
7. **Costo de minutos si el suite crece** — `maxWorkers: 1` por DB compartida; future improvement
8. **Repo sin remote** — YAML preparable pero no ejecutable hasta push a GitHub
9. **Sin script typecheck dedicado** — decisión pendiente

## Preguntas abiertas

1. **¿GitHub como plataforma?** El análisis asume GitHub Actions, pero el repo no tiene remote. ¿Es GitHub el destino?

2. **¿Typecheck dedicado en `apps/api`?** ¿Agregar `"typecheck": "tsc --noEmit"` + task en `turbo.json`, o invocar `tsc --noEmit` directamente en CI?

3. **¿Mobile en CI?** ¿Excluir completamente, agregar solo typecheck, o dejar fuera con comentario?

4. **¿Coverage a Codecov desde el inicio o artifact-only?**

5. **¿Branch protection rules en scope del cambio?** El workflow es código (va al repo). Branch protection es config en GitHub UI.

6. **¿Lint sin `--fix` en CI?** Modificar el script `lint` de `apps/api/package.json` (cambia comportamiento local) o invocar ESLint directamente en CI.

7. **¿Pre-commit hooks (Husky) complementarios?** Agregar como complemento de CI o queda fuera del scope.

## Archivos afectados

| Archivo | Acción | Razón |
|---------|--------|-------|
| `.github/workflows/ci.yml` | CREAR | Pipeline principal |
| `apps/api/package.json` | MODIFICAR (opcional) | Agregar script `typecheck` |
| `turbo.json` | MODIFICAR (opcional) | Agregar task `typecheck` cacheable |
| `.github/CODEOWNERS` | CREAR (opcional) | Branch protection con reviewers automáticos |
