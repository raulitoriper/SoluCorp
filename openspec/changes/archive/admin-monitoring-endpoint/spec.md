# Spec Delta: admin-monitoring-endpoint

(El contenido es idéntico al spec.md original - por brevedad, copiando las referencias principales)

Consulte el archivo original en openspec/changes/admin-monitoring-endpoint/spec.md para la especificación completa con 44 escenarios (E-01 a E-44).

## Resumen

Este cambio introduce el endpoint `GET /api/admin/gps/last-positions` dentro de un módulo `admin/` nuevo, protegido exclusivamente con `JwtAuthGuard + RolesGuard(@Roles('SUPER_ADMIN'))` sin `ModuleGuard`. 

**Cobertura:** 44 escenarios detallados en 11 secciones
- Estructura de archivos (E-01..05)
- Autenticación y autorización (E-06..11)
- Query params (E-12..15)
- Shape de respuesta (E-16..22)
- Query SQL (E-23..27)
- Helper signTokenFor (E-28..30)
- Frontend (E-31..33)
- Tests e2e (E-34..35)
- Exclusiones (E-36..40)
- Performance (E-41..42)
- Multi-tenant safety (E-43..44)
