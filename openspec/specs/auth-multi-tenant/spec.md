# Especificación: Autenticación Multi-Tenant

## Propósito

Sistema de autenticación JWT con 3 roles y aislamiento de datos por empresa (tenant). Cada request se ejecuta dentro del contexto de una empresa específica.

## Requisitos

### Requisito: Login con JWT

El sistema DEBE autenticar usuarios por email + contraseña y retornar un token JWT con el rol y el tenantId.

#### Escenario: Login exitoso

- DADO un usuario activo con email "admin@solucorp.com.py" y contraseña "123456"
- CUANDO envía POST /api/auth/login con esas credenciales
- ENTONCES recibe status 200 con access_token, refresh_token y datos del usuario (id, nombre, email, rol, tenantId)

#### Escenario: Credenciales inválidas

- DADO un email que no existe en el sistema
- CUANDO envía POST /api/auth/login
- ENTONCES recibe status 401 con mensaje "Credenciales inválidas"

#### Escenario: Usuario inactivo

- DADO un usuario con active=false
- CUANDO intenta hacer login
- ENTONCES recibe status 401 con mensaje "Cuenta desactivada"

### Requisito: Tres Roles de Usuario

El sistema DEBE soportar 3 roles con acceso a plataformas específicas.

#### Escenario: SUPER_ADMIN accede al Portal Admin

- DADO un usuario con rol SUPER_ADMIN (sin companyId)
- CUANDO hace login
- ENTONCES puede acceder a todas las rutas del Portal Admin
- Y NO tiene acceso al Portal Cliente como usuario normal

#### Escenario: COMPANY_ADMIN accede al Portal Cliente

- DADO un usuario con rol COMPANY_ADMIN y companyId="empresa-123"
- CUANDO hace login
- ENTONCES puede acceder a todas las rutas del Portal Cliente de su empresa
- Y solo ve datos de su propia empresa

#### Escenario: FIELD_WORKER accede a la App Móvil

- DADO un usuario con rol FIELD_WORKER y companyId="empresa-123"
- CUANDO hace login desde la app móvil
- ENTONCES puede acceder a los módulos habilitados para su empresa
- Y sus acciones se registran con GPS y se asocian a su empresa

### Requisito: Aislamiento Multi-Tenant

El sistema DEBE garantizar que los datos de una empresa NUNCA sean visibles para otra empresa.

#### Escenario: Consulta aislada por tenant

- DADO el usuario "vendedor@empresaA.com" con companyId="A"
- CUANDO consulta GET /api/visits
- ENTONCES solo recibe visitas donde companyId="A"
- Y NUNCA recibe datos de companyId="B"

#### Escenario: Creación de datos con tenant automático

- DADO el usuario "vendedor@empresaA.com" con companyId="A"
- CUANDO crea POST /api/visits con datos de una visita
- ENTONCES la visita se crea automáticamente con companyId="A"
- Y el campo companyId NO se puede modificar desde el request

#### Escenario: SUPER_ADMIN accede cross-tenant

- DADO un usuario SUPER_ADMIN (sin companyId)
- CUANDO consulta GET /api/companies/A/visits
- ENTONCES puede ver las visitas de la empresa A
- Y puede ver las de cualquier otra empresa

### Requisito: Refresh Token

El sistema DEBE soportar renovación de token sin re-login.

#### Escenario: Renovación exitosa

- DADO un refresh_token válido no expirado
- CUANDO envía POST /api/auth/refresh con el refresh_token
- ENTONCES recibe un nuevo access_token y un nuevo refresh_token

#### Escenario: Refresh token expirado

- DADO un refresh_token expirado
- CUANDO envía POST /api/auth/refresh
- ENTONCES recibe status 401
- Y el usuario debe hacer login nuevamente
