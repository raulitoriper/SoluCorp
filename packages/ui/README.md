# @solucorp/ui

Componentes UI compartidos entre apps/admin y apps/client.

## Componentes

- `Button` — variantes primary/secondary/danger/ghost, soporte de loading y disabled
- `Input` — controlled input con label y mensaje de error
- `Card`, `StatCard` — layouts de tarjeta para dashboards
- `Modal` — modal con backdrop y close

## Tests

```bash
npm test
```

O desde la raíz del monorepo:

```bash
npm run test --workspace packages/ui
```

Usa Jest + @testing-library/react + jsdom.
