# @solucorp/shared

Tipos compartidos, constantes y cliente API para SoluCorp.

## Estructura

- `types/` — User, Company, Auth, Metadata
- `constants/` — service codes, meta names, roles
- `api/` — cliente HTTP con interceptor JWT + X-Tenant-ID
- `utils/` — formatters (Guaraníes, fechas, etc.)

## Tests

```bash
npm test
```

O desde la raíz del monorepo:

```bash
npm run test --workspace packages/shared
```
