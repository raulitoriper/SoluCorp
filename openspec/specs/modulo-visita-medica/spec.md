# Especificación: Módulo de Visita Médica

## Propósito
Gestión de visitas a clínicas y médicos con registro de productos y programación de próxima visita.

## Requisitos

### Requisito: Registrar Eventos de Visita Médica
El sistema DEBE soportar 6 tipos de evento: CLINIC_START, CLINIC_END, MEDIC_START, MEDIC_END, CLINIC_QUICK, PRODUCT_REGISTER.

#### Escenario: Inicio de visita a clínica
- CUANDO envía POST /api/medical-visits con eventType=CLINIC_START, clinicCode="CLIN01", initialKm=45230
- ENTONCES se registra con GPS

#### Escenario: Visita rápida con productos y notificación
- CUANDO envía con eventType=CLINIC_QUICK, clinicCode, medicCode, motiveCode, products=[{code,qty}], nextVisitDate, shouldNotify=true, notificationDesc
- ENTONCES se crea la visita con productos y se programa notificación

### Requisito: Consultar Visitas Médicas
#### Escenario: Por clínica
- CUANDO consulta GET /api/medical-visits?clinicCode=CLIN01
- ENTONCES recibe las visitas a esa clínica con detalle de productos
