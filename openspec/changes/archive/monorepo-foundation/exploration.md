## Exploración: monorepo-foundation

### Estado Actual
Directorio de proyecto vacío con git inicializado. Sin código, sin dependencias, sin archivos de configuración.
El proyecto es una reconstrucción completa de `csTigoAndroid.apk` — una app de soluciones corporativas de campo con 9 módulos de servicio, rastreo GPS y arquitectura multi-tenant.

### Contexto del Dominio (del análisis del APK)
- **App original**: Java Android nativo, SQLite local, comunicación por SMS encriptado
- **9 módulos de servicio**: Visitas (código 1), Pedidos (2), Rastreo GPS (4), Inventario (10), Asistencia (11), Guardia (15), Visita Médica (17), Courier (18), Metadata CRUD (99)
- **14 tipos de datos maestros**: Cliente, Producto, Motivo, Guardia, Repartidor, TipoFactura, Empleado, Vehículo, Banco, Depósito, Clínica, Médico, Contacto, UsuarioTicketCSI
- **Comunicación**: SMS encriptado (principal) + HTTP JSON (respaldo) — será reemplazado por API REST
- **Mercado objetivo**: Paraguay (Guaraníes, español, necesita funcionar offline en zonas rurales)

### Arquitectura Objetivo
3 plataformas compartiendo un solo backend:
1. **App Móvil** (React Native/Expo) — Trabajadores de campo: offline-first, GPS, escaneo de códigos de barra
2. **Portal Admin** (Next.js) — Personal de SoluCorp: gestionar clientes, demos, facturación, monitoreo
3. **Portal Cliente** (Next.js) — Empresas clientes: gestión de equipo, dashboards, reportes, mapa en vivo

### Áreas Afectadas
- `apps/api/` — Backend NestJS con Prisma + PostgreSQL
- `apps/mobile/` — App React Native con Expo
- `apps/admin/` — Portal administrador Next.js
- `apps/client/` — Portal cliente Next.js
- `packages/ui/` — Componentes UI compartidos (TailwindCSS, Recharts, Leaflet)
- `packages/shared/` — Tipos, constantes, cliente API, stores
- `packages/config/` — Preset de Tailwind, configuraciones TypeScript

### Enfoques

1. **Monorepo con Turborepo** — Paquetes compartidos, builds paralelos, caché
   - Ventajas: Maduro, builds rápidos, excelente soporte Next.js/TypeScript, npm workspaces
   - Desventajas: App móvil (Expo) requiere ajustes para Metro bundler
   - Esfuerzo: Medio

2. **Monorepo con Nx** — Sistema de build completo con generadores
   - Ventajas: Más funcionalidades (generadores, comandos affected), ideal para equipos grandes
   - Desventajas: Más pesado, curva de aprendizaje mayor, excesivo para este proyecto
   - Esfuerzo: Alto

3. **Solo npm workspaces** — Sin herramienta de monorepo
   - Ventajas: Lo más simple, sin herramientas extra
   - Desventajas: Sin caché de build, sin orquestación de tareas
   - Esfuerzo: Bajo

### Recomendación
**Monorepo con Turborepo** — Mejor balance entre simplicidad y potencia. Buen caché, builds paralelos y soporte nativo de npm workspaces. El workaround para Expo (metro.config.js con resolución de node_modules) está bien documentado.

### Riesgos
- Expo + monorepo: la resolución de Metro requiere configuración cuidadosa
- Los paquetes compartidos deben ser transpilados para React Native (no se pueden importar TS directo)
- La conexión a PostgreSQL debe funcionar para todos los devs

### ¿Listo para Propuesta?
Sí — La estructura del monorepo está bien definida, el stack está elegido, y el dominio fue analizado exhaustivamente desde la decompilación del APK.
