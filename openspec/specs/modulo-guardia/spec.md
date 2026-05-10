# Especificación: Módulo de Guardia

## Propósito
Marcación de guardias de seguridad: turnos y rondas de patrulla.

## Requisitos

### Requisito: Registrar Turno/Marca de Guardia
El sistema DEBE registrar marcas de guardia con código, observación y GPS.

#### Escenario: Marca de ronda
- DADO un FIELD_WORKER con módulo GUARD_SECURITY
- CUANDO envía POST /api/guard-shifts con guardCode="G001", eventType=MARK, observation="Todo en orden"
- ENTONCES se crea el registro con lat/lng

### Requisito: Consultar Rondas
#### Escenario: Rondas del día por guardia
- CUANDO consulta GET /api/guard-shifts?guardCode=G001&date=2026-05-09
- ENTONCES recibe todas las marcas de ese guardia en el día
