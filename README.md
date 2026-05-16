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
