# Especificación: Módulo de Visitas

## Propósito
Registro de visitas de campo a clientes con geolocalización. Soporta inicio, fin y visita rápida.

## Requisitos

### Requisito: Registrar Visita
El sistema DEBE permitir registrar visitas con tipo START, END o QUICK, incluyendo GPS.

#### Escenario: Inicio de visita
- DADO un FIELD_WORKER con módulo VISITS habilitado
- CUANDO envía POST /api/visits con eventType=START, clientCode="CLI001", observation="Primera visita"
- ENTONCES se crea la visita con lat/lng del dispositivo y companyId del usuario

#### Escenario: Visita rápida (entrada+salida)
- DADO un FIELD_WORKER autenticado
- CUANDO envía POST /api/visits con eventType=QUICK, clientCode="CLI001", motiveCode="MOT01"
- ENTONCES se crea la visita con todos los campos completos

#### Escenario: Módulo deshabilitado
- DADO una empresa sin módulo VISITS habilitado
- CUANDO un FIELD_WORKER intenta POST /api/visits
- ENTONCES recibe 403 "Módulo no habilitado para su empresa"

### Requisito: Consultar Visitas
El sistema DEBE listar visitas aisladas por tenant con filtros.

#### Escenario: Listado por empresa
- DADO 20 visitas de empresa "A" y 10 de empresa "B"
- CUANDO el COMPANY_ADMIN de "A" consulta GET /api/visits
- ENTONCES recibe solo las 20 visitas de "A"
