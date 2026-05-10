# Propuesta: Fundación del Monorepo

## Intención

Establecer la estructura del monorepo Turborepo con las 4 aplicaciones (API, Móvil, Portal Admin, Portal Cliente) y los paquetes compartidos. Esta es la fundación sobre la que se construirán todos los cambios SDD posteriores.

## Alcance

### Incluido
- Monorepo Turborepo con `apps/` y `packages/`
- Backend NestJS (`apps/api`) con Prisma + PostgreSQL y schema multi-tenant
- Proyecto React Native Expo (`apps/mobile`) con esqueleto de navegación
- Portal admin Next.js (`apps/admin`) con layout base
- Portal cliente Next.js (`apps/client`) con layout base
- Paquetes compartidos: `packages/shared` (tipos, constantes, cliente API) + `packages/ui` (componentes) + `packages/config` (tailwind, tsconfig)
- Autenticación JWT con 3 roles: SUPER_ADMIN, COMPANY_ADMIN, FIELD_WORKER
- Middleware multi-tenant (aislamiento por companyId)
- Seed de BD: usuario SuperAdmin + empresa demo

### Excluido (cambios SDD separados)
- Módulos de servicio (Visitas, Pedidos, etc.)
- Motor de sincronización offline
- Mapa en vivo / WebSocket
- Sistema de facturación

## Capacidades

### Capacidades Nuevas
- `auth-multi-tenant`: Autenticación JWT con 3 roles y aislamiento de tenant por companyId
- `gestion-empresas`: CRUD de empresas con planes de suscripción y habilitación de módulos
- `gestion-usuarios`: CRUD de usuarios con alcance por tenant y asignación de roles

### Capacidades Modificadas
- Ninguna (proyecto desde cero)

## Enfoque

Monorepo Turborepo con npm workspaces. Backend usa Prisma con multi-tenancy de BD compartida (FK companyId + middleware de tenant). Expo bare workflow para soporte de GPS en background. Ambos portales comparten componentes de `packages/ui`.

## Áreas Afectadas

| Área | Impacto | Descripción |
|---|---|---|
| `apps/api/` | Nuevo | Backend NestJS + Prisma + PostgreSQL |
| `apps/mobile/` | Nuevo | Esqueleto app React Native Expo |
| `apps/admin/` | Nuevo | Shell del portal administrador |
| `apps/client/` | Nuevo | Shell del portal cliente |
| `packages/shared/` | Nuevo | Tipos, constantes, cliente API |
| `packages/ui/` | Nuevo | Componentes TailwindCSS compartidos |
| `packages/config/` | Nuevo | Configuraciones compartidas |

## Riesgos

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Resolución de Metro con Expo + monorepo | Media | Usar metro.config.js con watchFolders + nodeModulesPaths |
| Filtración de datos multi-tenant | Baja | Middleware de tenant + tests de integración |
| Compilación de paquetes compartidos para RN | Media | Usar tsup para paquetes, configurar paths de tsconfig |

## Plan de Rollback

Eliminar todo el directorio `SoluCorp/` y reinicializar. En esta etapa no hay estado externo afectado.

## Dependencias

- Node.js 20+, PostgreSQL 15+, Expo CLI
- `postgres:12345@localhost:5432` (PostgreSQL local del usuario)

## Criterios de Éxito

- [ ] `turbo build` completa para las 4 apps sin errores
- [ ] Backend arranca y conecta a PostgreSQL con schema multi-tenant
- [ ] App móvil arranca en Expo Go con pantalla de login
- [ ] Portal admin arranca con login + dashboard vacío
- [ ] Portal cliente arranca con login + dashboard vacío
- [ ] SuperAdmin puede hacer login y crear empresa demo vía API
