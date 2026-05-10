# Diseño: Fundación del Monorepo

## Enfoque Técnico

Monorepo Turborepo con npm workspaces. Backend NestJS con Prisma multi-tenant (companyId en cada tabla + middleware global). Expo para móvil con Metro configurado para resolver paquetes compartidos. Portales Next.js con componentes de `packages/ui`.

## Decisiones de Arquitectura

### Decisión: Multi-tenancy con BD compartida

**Elección**: Una sola BD PostgreSQL con columna `companyId` en cada tabla tenant-scoped
**Alternativas**: BD separada por tenant, schema por tenant
**Razón**: Escala esperada de decenas de empresas (mercado PY). BD compartida simplifica migraciones, backups y queries cross-tenant para el SUPER_ADMIN. El middleware de Prisma garantiza el aislamiento.

### Decisión: IDs con CUID

**Elección**: `@default(cuid())` en todos los primary keys
**Alternativas**: UUID v4, auto-increment
**Razón**: La app móvil necesita generar IDs offline antes de sincronizar. CUID es ordenable por tiempo, resistente a colisiones y más corto que UUID.

### Decisión: Expo con bare workflow

**Elección**: Expo Development Build (custom dev client) via EAS
**Alternativas**: Expo managed, React Native CLI puro
**Razón**: Se necesita `expo-location` con background tracking persistente. Managed workflow tiene limitaciones. EAS Build mantiene beneficios de Expo (OTA updates) con acceso a módulos nativos.

### Decisión: Paquetes compartidos con tsup

**Elección**: Compilar `packages/shared` y `packages/ui` con tsup
**Alternativas**: Imports directos de TS, tsc puro
**Razón**: Metro (React Native) no transpila node_modules. tsup genera JS limpio que Metro puede consumir.

## Flujo de Datos

```
App Móvil ──→ POST /api/auth/login ──→ NestJS Backend ──→ PostgreSQL
                                            │
Portal Admin ──→ GET /api/companies ────────┤
                                            │
Portal Cliente ──→ GET /api/users ──────────┘
                                            │
                                    TenantMiddleware
                                    (inyecta companyId
                                     desde JWT en cada query)
```

```
Request con JWT
    │
    ▼
TenantMiddleware → extrae companyId del token
    │
    ▼
Prisma $use middleware → inyecta WHERE companyId en findMany/findFirst
                       → inyecta companyId en create
    │
    ▼
PostgreSQL (datos aislados por empresa)
```

## Cambios de Archivos

| Archivo | Acción | Descripción |
|---|---|---|
| `package.json` (raíz) | Crear | Workspace config + scripts turbo |
| `turbo.json` | Crear | Pipeline: build, dev, lint |
| `apps/api/` | Crear | NestJS completo con Prisma schema multi-tenant |
| `apps/api/prisma/schema.prisma` | Crear | Company, Subscription, CompanyModule, CompanySettings, User, RefreshToken, MetadataType, MetadataItem |
| `apps/api/src/common/middleware/tenant.middleware.ts` | Crear | Extrae companyId del JWT, inyecta en Prisma |
| `apps/api/src/modules/auth/` | Crear | Login, refresh, JWT strategy, guards |
| `apps/api/src/modules/companies/` | Crear | CRUD empresas + suscripciones + módulos |
| `apps/api/src/modules/users/` | Crear | CRUD usuarios con aislamiento tenant |
| `apps/mobile/` | Crear | Expo proyecto con login + home grid |
| `apps/admin/` | Crear | Next.js con layout + login + dashboard vacío |
| `apps/client/` | Crear | Next.js con layout + login + dashboard vacío |
| `packages/shared/src/types/` | Crear | Interfaces: User, Company, Auth responses |
| `packages/shared/src/constants/` | Crear | Códigos de servicio, MetaNames, roles |
| `packages/shared/src/api/client.ts` | Crear | Axios con interceptor JWT + X-Tenant-ID |
| `packages/ui/src/` | Crear | Button, Input, Card, DataTable, Modal base |
| `packages/config/` | Crear | tailwind preset + tsconfig base |

## Interfaces / Contratos

```typescript
// POST /api/auth/login → respuesta
interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'FIELD_WORKER';
    companyId: string | null;
    companyName: string | null;
  };
  enabledModules: string[];  // ['VISITS', 'ORDERS', ...]
  config: {
    gpsTrackingIntervalMs: number;
    timezone: string;
    currency: string;
  };
}

// Roles y acceso a plataformas
// SUPER_ADMIN  → Portal Admin (companyId = null)
// COMPANY_ADMIN → Portal Cliente (companyId = string)
// FIELD_WORKER  → App Móvil (companyId = string)
```

## Estrategia de Testing

| Capa | Qué probar | Enfoque |
|---|---|---|
| Unitarias | Middleware tenant, cálculo de trial | Jest (se instala en Fase 1) |
| Integración | Auth login/refresh, CRUD empresas | Supertest + BD de test |
| E2E | Flujo completo: crear empresa → crear usuario → login | Pendiente fase posterior |

## Migración / Despliegue

No requiere migración (proyecto nuevo). Seed inicial crea:
1. Usuario SUPER_ADMIN: `admin@solucorp.com.py` / `admin123`
2. Empresa demo: "Empresa Demo PY" con todos los módulos habilitados
3. Usuario COMPANY_ADMIN demo: `admin@demo.solucorp.com.py` / `demo123`
4. Usuario FIELD_WORKER demo: `campo@demo.solucorp.com.py` / `campo123`
5. 14 MetadataTypes estándar seedeados para la empresa demo

## Preguntas Abiertas

- Ninguna. Todo definido para implementar.
