# Delta para testing-infrastructure

**Cambio:** frontend-testing-foundation  
**Modifica:** openspec/specs/testing-infrastructure/spec.md  
**Secciones afectadas:** §1.3 (Packages), §7.3 (Policy de cobertura), §8.1 (Tasks Turborepo), §14 (Próximos cambios)

---

## ADDED Requirements

### Requisito: apps/client como workspace de testing

`apps/client` DEBE estar configurado como workspace con test runner propio (Jest 30 + ts-jest + jsdom + React Testing Library 16). DEBE declarar el script `"test": "jest"` en su `package.json`. La configuración DEBE replicar el patrón establecido de `packages/ui`, adaptada para resolver alias `@/` de Next.js y silenciar imports de CSS/assets.

#### Escenario: Ejecución de tests unitarios en apps/client

- DADO que `apps/client` tiene `jest.config.ts`, `jest.setup.ts` y el script `"test"` declarados
- CUANDO se ejecuta `jest` desde `apps/client/`
- ENTONCES los tests pasan con exit 0
- Y el entorno de ejecución es jsdom

#### Escenario: Resolución de alias @/ en tests

- DADO que los archivos fuente usan imports `@/stores/auth-store`
- CUANDO Jest resuelve el módulo durante un test
- ENTONCES DEBE resolver al path `<rootDir>/src/stores/auth-store`
- Y NO DEBE lanzar error `Cannot find module`

#### Escenario: Imports de CSS no rompen el runner

- DADO que un componente importa un archivo `.css` o `.module.css`
- CUANDO Jest carga ese módulo
- ENTONCES DEBE sustituirlo por el mock `__mocks__/styleMock.js`
- Y el test DEBE continuar sin error de parsing

---

### Requisito: 4 targets de test obligatorios para apps/client

`apps/client` DEBE tener exactamente los siguientes 4 archivos de test pasando como parte de este cambio. Cada archivo DEBE cubrir los comportamientos especificados a continuación. El código de producción NO DEBE modificarse para hacerlo testeable.

#### Escenario: auth-store — login exitoso

- DADO que `useAuthStore` está en estado inicial (sin usuario)
- CUANDO se llama `login` con credenciales válidas (mock del cliente API retorna token + user)
- ENTONCES `state.user` DEBE contener el usuario retornado
- Y `state.token` DEBE contener el access token
- Y el store DEBE persistir el token vía localStorage (o el mecanismo de persistencia del store)

#### Escenario: auth-store — login fallido

- DADO que `useAuthStore` está en estado inicial
- CUANDO se llama `login` y el cliente API lanza un error (ej. 401)
- ENTONCES `state.user` DEBE permanecer `null`
- Y `state.token` DEBE permanecer `null`

#### Escenario: auth-store — logout

- DADO que el store tiene un usuario y token activos
- CUANDO se llama `logout`
- ENTONCES `state.user` DEBE ser `null`
- Y `state.token` DEBE ser `null`
- Y los datos de auth DEBEN eliminarse del storage persistente

#### Escenario: auth-store — rehidratación desde storage

- DADO que localStorage contiene un token persistido de una sesión anterior
- CUANDO el store se inicializa (loadFromStorage o equivalente)
- ENTONCES `state.token` DEBE recuperar el valor almacenado

#### Escenario: AuthGuard — usuario con rol autorizado accede

- DADO que el usuario autenticado tiene el rol requerido por la ruta
- CUANDO `AuthGuard` renderiza la ruta protegida
- ENTONCES los children DEBEN renderizarse
- Y NO DEBE producirse redirección

#### Escenario: AuthGuard — usuario con rol incorrecto es redirigido

- DADO que el usuario autenticado NO tiene el rol requerido por la ruta
- CUANDO `AuthGuard` evalúa el acceso
- ENTONCES DEBE redirigir a una ruta de acceso denegado (o login)
- Y los children NO DEBEN renderizarse

#### Escenario: AuthGuard — usuario no autenticado es redirigido

- DADO que no hay usuario en el auth store
- CUANDO `AuthGuard` renderiza
- ENTONCES DEBE redirigir a `/login`

#### Escenario: ReportPage — renderiza columnas de la tabla

- DADO que el componente `ReportPage` recibe datos de reporte válidos (mock)
- CUANDO se renderiza
- ENTONCES las columnas definidas DEBEN estar presentes en el DOM
- Y los datos DEBEN aparecer en las filas correspondientes

#### Escenario: ReportPage — estado de carga

- DADO que la carga de datos aún no completó (mock en estado pending)
- CUANDO se renderiza `ReportPage`
- ENTONCES DEBE mostrar un indicador de carga
- Y la tabla de datos NO DEBE estar visible

#### Escenario: ReportPage — estado vacío

- DADO que la carga completó pero retornó cero registros
- CUANDO se renderiza `ReportPage`
- ENTONCES DEBE mostrar un mensaje de estado vacío
- Y la tabla NO DEBE renderizar filas de datos

#### Escenario: ReportPage — exportar CSV

- DADO que `ReportPage` tiene datos cargados y un botón/acción de exportar CSV
- CUANDO el usuario activa la exportación
- ENTONCES la función de exportación DEBE ser invocada con los datos del reporte

#### Escenario: login page — submit con credenciales válidas

- DADO que el formulario de login tiene email y contraseña completos
- CUANDO el usuario envía el formulario
- ENTONCES la acción de login del store DEBE ser llamada con los valores ingresados

#### Escenario: login page — muestra error de autenticación

- DADO que el store retorna un error tras un intento de login fallido
- CUANDO la respuesta de error se refleja en el estado
- ENTONCES el mensaje de error DEBE ser visible en el formulario

#### Escenario: login page — botón deshabilitado mientras carga

- DADO que el login está en progreso (estado `isLoading: true`)
- CUANDO el formulario está en pantalla
- ENTONCES el botón de submit DEBE estar deshabilitado
- Y NO DEBE ser posible enviar el formulario nuevamente

---

### Requisito: Policy de cobertura — apps/client sin threshold inicial

`apps/client` NO DEBE tener `coverageThreshold` configurado en su `jest.config.ts`. Los tests DEBEN pasar para que el pipeline continúe, pero ningún porcentaje de cobertura DEBE causar fallo del build. La cobertura de referencia inicial es 0% para lines/branches/functions; se establecerán thresholds en un cambio futuro dedicado.

#### Escenario: Build no falla por cobertura baja en apps/client

- DADO que `apps/client` tiene 4 tests pasando pero baja cobertura global
- CUANDO se ejecuta `turbo run test -- --coverage`
- ENTONCES el comando DEBE terminar con exit 0
- Y NO DEBE aparecer mensaje de error por `coverageThreshold`

---

## MODIFIED Requirements

### Requisito: Packages con runner de tests (§1.3)

Los workspaces con runner de tests declarado DEBEN incluir: `packages/shared`, `packages/ui`, y `apps/client`.  
(Previously: Solo `packages/shared` y `packages/ui` estaban listados como workspaces con jest.config.ts)

#### Escenario: packages/shared ejecuta tests

- DADO `packages/shared` con `jest.config.ts`
- CUANDO se ejecuta `turbo run test`
- ENTONCES los tests de `packages/shared` se incluyen y pasan

#### Escenario: packages/ui ejecuta tests

- DADO `packages/ui` con `jest.config.ts` y entorno jsdom
- CUANDO se ejecuta `turbo run test`
- ENTONCES los tests de `packages/ui` se incluyen y pasan

#### Escenario: apps/client ejecuta tests (nuevo)

- DADO `apps/client` con `jest.config.ts` y script `"test"` declarado
- CUANDO se ejecuta `turbo run test`
- ENTONCES los tests de `apps/client` se incluyen en la orquestación
- Y DEBEN pasar junto con los demás workspaces

---

## REMOVED Requirements

_(ninguno — este cambio es puramente aditivo)_
