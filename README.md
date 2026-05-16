# SoluCorp

Monorepo de SoluCorp: backend NestJS + packages compartidos + apps frontend.

## Estructura

```
apps/
  api/          — Backend NestJS (REST API + Prisma + PostgreSQL)
packages/
  shared/       — Tipos, constantes y utils compartidos
  ui/           — Componentes React compartidos
```

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

## Tests

### Correr todo (unit)

```bash
npm test
```

Corre unit tests en api + shared + ui (cacheable vía Turborepo).

### E2e backend

```bash
npm run test:e2e
```

Requiere PostgreSQL local con DB `solucorp_test`. Ver `apps/api/README.md` para setup.

Detalles por paquete en cada `README.md` (`apps/api`, `packages/shared`, `packages/ui`).

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

```bash
git remote add origin git@github.com:<owner>/solucorp.git
git push -u origin main
```

Después del primer push exitoso, ir a Settings → Branches → Add rule para `main` y exigir status checks: `lint`, `typecheck`, `build`, `unit-tests`, `e2e`.

`apps/mobile` está fuera del pipeline (sin scripts útiles); su cobertura llegará con el cambio `mobile-testing-foundation`.
