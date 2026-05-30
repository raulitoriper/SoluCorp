# Design: admin-monitoring-endpoint

(Documento de diseño con código exacto de implementación)

Consulte el archivo original en openspec/changes/admin-monitoring-endpoint/design.md para:
- Estructura exacta del módulo `admin/`
- Código de controller, service, DTO
- Helpers de testing (`signTokenFor`, `createSuperAdmin`)
- Registro en app.module.ts
- Archivo e2e completo con 6 tests
- Cambios frontend con diff exacto
- 10 decisiones de arquitectura clave
- Orden de implementación

**Resumen:** Nuevo módulo admin/ con endpoint GET /api/admin/gps/last-positions, protegido con JwtAuthGuard + RolesGuard, service con $queryRaw + LEFT JOIN users, helper de test relajado para companyId: null.
