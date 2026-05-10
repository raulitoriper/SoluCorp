# Especificación: Gestión de Usuarios

## Propósito

CRUD de usuarios con alcance por tenant y asignación de roles. Cada empresa gestiona sus propios usuarios.

## Requisitos

### Requisito: Crear Usuario en una Empresa

El sistema DEBE permitir crear usuarios asociados a una empresa con un rol específico.

#### Escenario: COMPANY_ADMIN crea un trabajador de campo

- DADO un COMPANY_ADMIN de la empresa "A" autenticado
- CUANDO envía POST /api/users con nombre="Juan", email="juan@empresaA.com", rol=FIELD_WORKER
- ENTONCES se crea el usuario con companyId="A" automáticamente
- Y se envía email con contraseña temporal
- Y el usuario aparece en el listado de la empresa "A"

#### Escenario: SUPER_ADMIN crea un COMPANY_ADMIN

- DADO un SUPER_ADMIN autenticado
- CUANDO envía POST /api/users con companyId="A", rol=COMPANY_ADMIN
- ENTONCES se crea el usuario administrador para esa empresa
- Y ese usuario puede acceder al Portal Cliente

#### Escenario: Email duplicado

- DADO un usuario ya registrado con email="juan@test.com"
- CUANDO se intenta crear otro usuario con el mismo email
- ENTONCES recibe status 409 con mensaje "Email ya registrado"

### Requisito: Aislamiento de Usuarios por Empresa

El sistema DEBE garantizar que cada empresa solo vea sus propios usuarios.

#### Escenario: Listado aislado

- DADO la empresa "A" con 10 usuarios y la empresa "B" con 5
- CUANDO el COMPANY_ADMIN de "A" consulta GET /api/users
- ENTONCES recibe solo los 10 usuarios de empresa "A"
- Y NUNCA ve los de empresa "B"

#### Escenario: No se puede editar usuario de otra empresa

- DADO el COMPANY_ADMIN de empresa "A"
- CUANDO intenta PATCH /api/users/{id-de-usuario-de-empresa-B}
- ENTONCES recibe status 404 (el middleware de tenant no encuentra el usuario)

### Requisito: Activar/Desactivar Usuarios

El sistema DEBE permitir desactivar usuarios sin eliminarlos (soft delete).

#### Escenario: Desactivar trabajador

- DADO un FIELD_WORKER activo
- CUANDO el COMPANY_ADMIN envía PATCH /api/users/{id} con active=false
- ENTONCES el usuario no puede hacer login
- Y sus datos históricos (visitas, pedidos) se mantienen
- Y aparece como "Inactivo" en el listado

#### Escenario: Reactivar usuario

- DADO un usuario con active=false
- CUANDO el COMPANY_ADMIN envía PATCH /api/users/{id} con active=true
- ENTONCES el usuario puede hacer login nuevamente

### Requisito: Datos del Usuario para App Móvil

El sistema DEBE retornar en el login los datos necesarios para la app móvil.

#### Escenario: Login de FIELD_WORKER retorna contexto completo

- DADO un FIELD_WORKER de empresa "A" que tiene habilitados los módulos VISITS, ORDERS, ATTENDANCE
- CUANDO hace login desde la app móvil
- ENTONCES recibe: access_token, refresh_token, datos personales, nombre de empresa, lista de módulos habilitados, configuración de GPS (intervalo de tracking), y lista de MetadataTypes disponibles
