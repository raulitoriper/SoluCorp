# Propuesta: Módulos de la App Móvil

## Intención
Implementar las 9 pantallas de servicio en la app React Native conectadas a las APIs del backend. Cada pantalla replica la funcionalidad del APK original con UI moderna.

## Alcance
### Incluido
- 9 pantallas de servicio: Visitas, Pedidos, Inventario, Asistencia, Guardia, Visita Médica, Courier, Metadata, GPS Tracking
- Hook reutilizable `useServiceMark` (valida GPS → envía al API)
- Componentes de formulario compartidos
- Indicador de conectividad offline

### Excluido
- Sincronización offline completa (cambio SDD separado)
- Background GPS tracking persistente (cambio SDD separado)

## Criterios de Éxito
- [ ] Las 9 pantallas renderizan sin errores
- [ ] Cada módulo envía datos al backend y recibe respuesta
- [ ] El home grid navega correctamente a cada módulo
- [ ] tsc --noEmit pasa sin errores
