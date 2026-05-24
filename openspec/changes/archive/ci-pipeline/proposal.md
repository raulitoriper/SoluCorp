# Propuesta: ci-pipeline

## Intent

Activar automáticamente los 190 tests existentes (52 unit API + 80 e2e API + 38 shared + 20 UI) en cada push a `main` y en cada PR, mediante un workflow de GitHub Actions con jobs paralelos. El pipeline también ejecutará lint, typecheck y build de todos los workspaces relevantes, publicando el reporte lcov de coverage como GitHub Artifact con retención de 30 días.

## Contexto

El cambio `testing-foundation` cerró el 2026-05-16 con 190 tests pasando y los contratos permanentes documentados en `openspec/specs/testing-infrastructure/spec.md`. Hoy ese suite solo corre cuando un desarrollador ejecuta `npm test` o `npm run test:e2e` manualmente. Sin CI activo cualquier commit puede romper `tsc`, lint, o cualquiera de los 190 tests sin que nadie lo note hasta que recuerden correrlos localmente.

El ROI de activar CI ahora es máximo:
- La infraestructura de testing ya existe, es sólida, y los guardarraíles (`includes('test')` en DATABASE_URL) son compatibles con un service container postgres.
- Los gaps son menores: agregar `typecheck` dedicado en `apps/api` + task cacheable en `turbo.json`, e invocar ESLint sin `--fix` desde el job de CI.
- El costo de no tenerlo crece linealmente con cada desarrollador que se incorpore al equipo.

**Estado del remote:** el repo aún no tiene `origin` configurado. El YAML se crea y queda inerte hasta que se haga `git remote add origin <url>` + `git push -u origin main`. Esto es deliberado: el archivo es código versionable y debe estar listo antes del primer push.

## Alcance

### Incluye

- **`.github/workflows/ci.yml`** con los siguientes jobs (paralelos donde corresponda):
  - `lint` — ESLint sobre `apps/api`, `apps/admin`, `apps/client`, `packages/shared`, `packages/ui`. Invocación directa con `--max-warnings 0` y sin `--fix` (read-only en CI).
  - `typecheck` — `turbo run typecheck` consumiendo la task nueva (cacheable por workspace).
  - `build` — `turbo run build` para validar que packages, api, admin y client compilan.
  - `unit-tests` — `turbo run test` (api unit + shared + ui).
  - `e2e` — service container `postgres:16` con health check, `npx prisma migrate deploy` desde `apps/api`, y `turbo run test:e2e`.
  - `coverage-upload` — depende de `unit-tests` y `e2e`; sube `apps/api/coverage/` como GitHub Artifact (retención 30 días).
- **Triggers:** `push` a `main` + `pull_request` apuntando a `main`.
- **Caching:** módulos npm cacheados por hash de `package-lock.json`; cache de `.turbo/` por workspace.
- **`apps/api/package.json`:** agregar script `"typecheck": "tsc --noEmit"` (disponible para devs locales vía `npm --workspace api run typecheck`).
- **`turbo.json`:** agregar task `typecheck` cacheable con `outputs: []` y dependencia `^build` (consistente con las demás tasks de validación).
- **Documentación:**
  - Root `README.md` con sección "CI" describiendo qué hace el pipeline y los pasos manuales para activarlo.
  - `apps/api/README.md` con nota explicando que `tsc --noEmit` corre en CI como typecheck dedicado.

### No incluye (fuera de scope)

- `apps/mobile` en cualquier job — sin scripts útiles (no tiene lint, typecheck, test ni build apto para CI). Expo build requiere EAS/cuenta paga. Se documenta en el YAML con un comentario explícito.
- Codecov / Coveralls / SonarCloud — coverage va a GitHub Artifact (cero setup). Migración a Codecov queda para un cambio futuro si el equipo lo pide.
- Husky / lint-staged / pre-commit hooks — cambio futuro independiente, no bloquea CI.
- Branch protection rules de GitHub — son configuración de UI, no archivo del repo. Se documenta como SUGGESTION en `archive-report` para aplicar manualmente post-merge.
- Multi-OS — solo `ubuntu-latest` (target de deploy, service containers solo en Linux, Windows/macOS son 2x-10x más caros).
- Matriz de versiones de Node — solo `20.x` (no es librería pública).
- Pipeline de deploy — cambio futuro `deploy-pipeline`.
- Notificaciones (Slack, Discord, email) — cambio futuro si interesa.
- Docker images — cambio futuro `docker-images`.
- Webhooks externos hacia servicios de terceros.

## Aproximación propuesta

### Paso 1: Shell del workflow

Crear `.github/workflows/ci.yml` con el esqueleto base:
- `name: CI`
- `on: { push: { branches: [main] }, pull_request: { branches: [main] } }`
- Variables de entorno globales para el job de e2e (`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`) — valores hardcoded de test, sin secrets reales en esta fase.
- Declaración de los 6 jobs (lint, typecheck, build, unit-tests, e2e, coverage-upload).

### Paso 2: Estrategia de install y cache

Cada job hace su propio checkout + setup-node + `npm ci` con cache de npm modules por hash de `package-lock.json`. Es más simple y robusto que compartir `node_modules` vía `upload-artifact` entre jobs (la decisión técnica fina queda para `sdd-design`). Se agrega `npx prisma generate` desde `apps/api` después de `npm ci` en todos los jobs que toquen código TS (el cliente Prisma se genera en `node_modules/@prisma/client` y es requerido para typecheck/build/test).

### Paso 3: Jobs de calidad (paralelos)

- **`lint`:** invoca ESLint directamente sin `--fix`. Para `apps/api` usa `npx eslint "{src,apps,libs,test}/**/*.ts" --max-warnings 0`. Para los demás workspaces invoca `npm run lint` (donde el script ya es read-only). Justificación: preservar DX local del `--fix` automático en `apps/api/package.json` mientras CI fuerza read-only.
- **`typecheck`:** `turbo run typecheck` después de agregar la task. La task ejecuta `tsc --noEmit` por workspace y es cacheable (input: `src/**`, `tsconfig*.json`).

### Paso 4: Build + unit tests

- **`build`:** `turbo run build`. Valida que packages, api, admin y client compilan. Para Next.js apps (`admin`, `client`) esto también valida tipos implícitamente.
- **`unit-tests`:** `turbo run test`. Ejecuta los 110 unit tests (52 api + 38 shared + 20 ui) con cache de turbo. Genera `apps/api/coverage/` que se reutiliza en el job de upload.

### Paso 5: E2e con service container

```yaml
services:
  postgres:
    image: postgres:16
    env:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: solucorp_test
    ports: ['5432:5432']
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 10
```

- Env vars: `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/solucorp_test`, `JWT_SECRET=test-secret-ci-only`, `JWT_EXPIRES_IN=8h`.
- Steps: checkout → setup-node → `npm ci` → `npx prisma generate` (desde `apps/api`) → `npx prisma migrate deploy` (desde `apps/api`) → `turbo run test:e2e`.
- El nombre `solucorp_test` cumple el guardarraíl `DATABASE_URL.includes('test')` en `apps/api/test/setup-env.ts` y `helpers/db.ts`.
- `maxWorkers: 1` ya está en `jest-e2e.json` (DB compartida); no requiere configuración adicional.

### Paso 6: Coverage upload

- Job `coverage-upload` con `needs: [unit-tests, e2e]`.
- `actions/upload-artifact@v4` con `path: apps/api/coverage/` y `retention-days: 30`.
- Nombre del artifact: `coverage-${{ github.run_id }}` para evitar colisiones.

### Paso 7: Documentación

- Root `README.md`: agregar sección "## CI" con descripción de jobs, link al workflow, badge placeholder (`![CI](https://github.com/<owner>/<repo>/actions/workflows/ci.yml/badge.svg)` — se completará post-push), y los 3 pasos manuales de activación.
- `apps/api/README.md`: agregar nota corta indicando que `tsc --noEmit` corre en CI como job dedicado y que el script local `typecheck` está disponible para devs.

## Impacto

### Archivos afectados

| Archivo | Acción | Razón |
|---------|--------|-------|
| `.github/workflows/ci.yml` | CREAR | Pipeline principal |
| `apps/api/package.json` | MODIFICAR | Agregar script `"typecheck": "tsc --noEmit"` |
| `turbo.json` | MODIFICAR | Agregar task `typecheck` cacheable (`outputs: []`, `dependsOn: ["^build"]`) |
| `README.md` | MODIFICAR | Sección "CI" + badge placeholder + pasos de activación |
| `apps/api/README.md` | MODIFICAR | Nota sobre typecheck en CI |

### Compatibilidad

Sin breaking changes:
- El workflow es código nuevo que no afecta runtime de producción.
- El script `typecheck` es aditivo (no reemplaza nada).
- La task `typecheck` en `turbo.json` es nueva (no modifica tasks existentes).
- El script `lint` de `apps/api` queda intacto (sigue con `--fix` para DX local; CI invoca ESLint directo).
- Cero modificación de tests existentes ni de código de producción.

### Multi-tenant

No aplica. Es infraestructura de CI; no afecta el comportamiento del API ni las queries con `companyId`.

## Plan de rollback

- El workflow es un único archivo YAML — `git revert` del commit lo elimina y vuelve al estado pre-CI.
- Los cambios al `package.json`, `turbo.json` y README son aditivos y reversibles individualmente (cada uno en su propio commit ideal, para granularidad de rollback).
- Si el primer run del workflow falla por algo no anticipado: deshabilitar el workflow desde GitHub UI (Actions → ci.yml → "Disable workflow") sin necesidad de revertir código.

## Riesgos

| # | Riesgo | Severidad | Mitigación |
|---|--------|-----------|------------|
| 1 | Primer run falla por timing del postgres service container, cache stale, o etapa no anticipada | MEDIA | Diseño conservador: `health-retries=10`, sin cache de turbo en el job de e2e, `npm ci` (no `npm install`) |
| 2 | `--max-warnings 0` rompe el job si hay warnings preexistentes en el código | MEDIA | Correr `npx eslint` localmente antes del push inicial; si hay warnings, fixearlos o ajustar el umbral inicial y bajarlo después |
| 3 | `prisma generate` agrega ~30s al pipeline en cada job que lo requiera | BAJA | Aceptable en esta fase; alternativa es cachear `node_modules/@prisma/client` si el problema crece |
| 4 | Repo sin remote: el YAML queda inerte hasta el push inicial a GitHub | BAJA | Documentado en `README.md` con los 3 pasos de activación |
| 5 | `apps/admin` y `apps/client` sin tests → solo `next build` valida tipos | BAJA | Aceptable en esta fase; cambios futuros (`admin-testing-foundation`, `client-testing-foundation`) lo cubren |
| 6 | Costo de minutos crece con el número de devs | BAJA | Free tier holgado (~2000 min/mes); con 5 devs y 40 PRs/sem ≈ 800 min/mes (40% del free tier) |
| 7 | Mobile sin verificación en CI puede romperse silenciosamente | MEDIA | Documentado explícitamente en el YAML; `mobile-testing-foundation` futuro lo cubre |
| 8 | Cache de `.turbo/` puede servir resultados stale si hay un bug en los inputs declarados | BAJA | Inputs ya están bien declarados en `turbo.json` (incluye `tsconfig*.json`); en caso de duda, invalidar cache desde GitHub UI |

## Métricas de éxito

1. **`.github/workflows/ci.yml` existe y es sintácticamente válido** — verificable con `actionlint` localmente antes del push.
2. **6 jobs declarados:** `lint`, `typecheck`, `build`, `unit-tests`, `e2e`, `coverage-upload` (más install implícito en cada job).
3. **Triggers funcionan en push a `main` + en PRs apuntando a `main`** — verificable solo post-push.
4. **`apps/api/package.json` tiene script `typecheck`** ejecutable vía `npm --workspace api run typecheck`.
5. **`turbo.json` tiene task `typecheck` cacheable** con `outputs: []` y `dependsOn: ["^build"]`.
6. **Tiempo total wall-clock ≤ 5 min** en un cold-cache run (verificable post-push). Con cache hit esperado ~2-3 min.
7. **`README.md` root tiene sección "CI"** con instrucciones de activación + badge placeholder.
8. **El artifact `coverage-${{ github.run_id }}`** es descargable desde la pestaña Actions de cada run, contiene `lcov.info` válido, y retiene 30 días.

## Activación post-merge (manual, fuera del scope automático)

Una vez merged el cambio, el equipo debe ejecutar manualmente:

1. **Configurar remote GitHub:**
   ```bash
   git remote add origin git@github.com:<owner>/solucorp.git
   git push -u origin main
   ```
2. **Verificar primera ejecución** del workflow desde la pestaña Actions del repo GitHub.
3. **Si pasa: configurar branch protection rules** en Settings → Branches → Add rule para `main`:
   - **Required status checks** (require branches to be up to date before merging): `lint`, `typecheck`, `build`, `unit-tests`, `e2e`.
   - **Require pull request before merging** con al menos 1 reviewer aprobando.
   - **Restrict who can push to matching branches** (opcional, según política del equipo).

Estos pasos se documentan también en `archive-report` como SUGGESTION para no olvidarlos.
