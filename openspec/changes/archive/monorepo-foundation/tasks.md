# Tareas: Fundación del Monorepo

## Fase 1: Infraestructura del Monorepo

- [x] 1.1 Crear `package.json` raíz con npm workspaces (apps/*, packages/*)
- [x] 1.2 Crear `turbo.json` con pipeline: build, dev, lint
- [x] 1.3 Crear `packages/config/` — tsconfig base + tailwind preset
- [x] 1.4 Crear `packages/shared/` — tipos (User, Company, Auth), constantes (service codes, MetaNames, roles), cliente API con interceptor JWT + X-Tenant-ID
- [x] 1.5 Crear `packages/ui/` — componentes base: Button, Input, Card, Modal, DataTable
- [x] 1.6 Crear `.gitignore` global

## Fase 2: Backend NestJS + Prisma

- [x] 2.1 Crear `apps/api/` con NestJS (`@nestjs/cli new`)
- [x] 2.2 Instalar Prisma + adapter-pg + bcrypt + passport-jwt + class-validator
- [x] 2.3 Crear `prisma/schema.prisma` con modelos multi-tenant: Company, Subscription, CompanyModule, CompanySettings, User, RefreshToken, MetadataType, MetadataItem + enums
- [x] 2.4 Ejecutar migración inicial y generar cliente Prisma
- [x] 2.5 Crear `src/common/prisma/prisma.service.ts` con PrismaPg adapter
- [x] 2.6 Crear guards: RolesGuard, ModuleGuard, CurrentUser decorator
- [x] 2.7 Crear `src/modules/auth/` — login (JWT + refresh token), guards, JWT strategy
- [x] 2.8 Crear `src/modules/companies/` — CRUD empresas + suscripciones + módulos
- [x] 2.9 Crear `src/modules/users/` — CRUD usuarios aislado por tenant
- [x] 2.10 Crear `src/modules/metadata/` — CRUD MetadataType + MetadataItem por tenant
- [x] 2.11 Seed ejecutado: SuperAdmin + empresa demo + 3 usuarios + 9 módulos + 14 MetadataTypes
- [x] 2.12 Configurar `main.ts` — CORS, ValidationPipe, prefix /api, puerto 3001

## Fase 3: Portales Web (shells)

- [x] 3.1-3.4 Portal Admin: Next.js (puerto 3002), layout, login, dashboard con tabla empresas
- [x] 3.5-3.8 Portal Cliente: Next.js (puerto 3003), layout con sidebar completo, login, dashboard

## Fase 4: App Móvil (esqueleto)

- [x] 4.1-4.3 Expo + TypeScript + dependencias (navigation, secure-store, zustand, axios, location)
- [x] 4.4-4.6 Navegación AuthGate, Login conectado al backend, Home con grid de 9 módulos

## Fase 5: Verificación

- [x] 5.1 Backend NestJS compila sin errores
- [x] 5.2 Login funciona para los 3 roles (SUPER_ADMIN, COMPANY_ADMIN, FIELD_WORKER)
- [x] 5.3 Login inválido retorna 401 correctamente
- [x] 5.4 Portal admin compila sin errores (Next.js build OK)
- [x] 5.5 Portal cliente compila sin errores (Next.js build OK)
- [x] 5.6 App móvil sin errores de tipos (tsc --noEmit OK)
