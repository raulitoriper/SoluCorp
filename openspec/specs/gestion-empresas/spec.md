# Especificación: Gestión de Empresas

## Propósito

CRUD de empresas cliente con suscripciones, planes y habilitación de módulos. Solo accesible por SUPER_ADMIN.

## Requisitos

### Requisito: Crear Empresa

El sistema DEBE permitir crear empresas cliente con datos fiscales paraguayos.

#### Escenario: Creación exitosa con demo

- DADO un SUPER_ADMIN autenticado
- CUANDO envía POST /api/companies con nombre="Ferretería ABC", ruc="80012345-6"
- ENTONCES se crea la empresa con status DEMO
- Y se crea una suscripción con trialEndsAt = fecha actual + 30 días
- Y se crean los CompanySettings con valores por defecto de Paraguay (timezone America/Asuncion, moneda PYG)
- Y se seedean los 14 MetadataTypes estándar (Cliente, Producto, Motivo, etc.)

#### Escenario: RUC duplicado

- DADO una empresa ya registrada con ruc="80012345-6"
- CUANDO se intenta crear otra empresa con el mismo RUC
- ENTONCES recibe status 409 con mensaje "RUC ya registrado"

### Requisito: Gestionar Suscripción

El sistema DEBE permitir cambiar el plan y estado de suscripción de una empresa.

#### Escenario: Activar empresa demo

- DADO una empresa con status DEMO
- CUANDO el SUPER_ADMIN envía PATCH /api/companies/{id}/subscription con status=ACTIVE, planType=PREMIUM
- ENTONCES la suscripción cambia a ACTIVE con activatedAt = ahora
- Y trialEndsAt se elimina

#### Escenario: Suspender empresa

- DADO una empresa con status ACTIVE
- CUANDO el SUPER_ADMIN envía PATCH con status=SUSPENDED
- ENTONCES los usuarios de esa empresa NO pueden hacer login
- Y reciben mensaje "Suscripción suspendida. Contacte a SoluCorp."

### Requisito: Habilitar/Deshabilitar Módulos

El sistema DEBE permitir controlar qué módulos tiene disponibles cada empresa.

#### Escenario: Habilitar módulo de Visitas

- DADO una empresa sin el módulo VISITS habilitado
- CUANDO el SUPER_ADMIN envía POST /api/companies/{id}/modules con module=VISITS, isEnabled=true
- ENTONCES el módulo aparece habilitado para esa empresa
- Y los FIELD_WORKER de esa empresa ven el módulo en la app móvil

#### Escenario: Trabajador intenta usar módulo deshabilitado

- DADO una empresa con módulo COURIER deshabilitado
- CUANDO un FIELD_WORKER envía POST /api/courier-deliveries
- ENTONCES recibe status 403 con mensaje "Módulo no habilitado para su empresa"

### Requisito: Listar y Buscar Empresas

El sistema DEBE permitir listar empresas con filtros.

#### Escenario: Listado con filtros

- DADO 50 empresas registradas (30 ACTIVE, 15 DEMO, 5 SUSPENDED)
- CUANDO el SUPER_ADMIN envía GET /api/companies?status=DEMO&search=ferreteria
- ENTONCES recibe solo las empresas DEMO que contengan "ferreteria" en el nombre
- Y cada empresa incluye conteo de usuarios y módulos habilitados
