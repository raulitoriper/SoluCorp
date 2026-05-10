# Propuesta: Páginas del Portal Admin

## Intención
Implementar todas las páginas funcionales del portal admin de SoluCorp: CRUD de empresas con suscripciones y módulos, gestión de admins, y mapa de monitoreo global.

## Alcance
### Incluido
- Página de Empresas: listado con filtros, crear empresa, detalle con tabs (info, suscripción, módulos, usuarios)
- Página de crear empresa con wizard (datos + admin + módulos)
- Página de monitoreo con mapa OpenStreetMap (últimas posiciones de workers)
- Dashboard con datos reales del backend
- Página de configuración básica

### Excluido
- Facturación/billing (cambio SDD separado)
- WebSocket en tiempo real para el mapa (por ahora polling)

## Criterios de Éxito
- [ ] CRUD empresas funciona completo (crear, ver, editar, cambiar plan, toggle módulos)
- [ ] Mapa de monitoreo muestra posiciones GPS
- [ ] Dashboard muestra stats reales
- [ ] next build compila sin errores
