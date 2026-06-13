# Spec: adopt-shared-packages

## Resultado de análisis de capacidades

**Sin deltas de spec.**

La propuesta declara explícitamente `New Capabilities: None` y `Modified Capabilities: None`.
Este cambio es un refactor puro de fuente de implementación: los módulos afectados (`auth-store`, formateo de reportes, cliente HTTP) mantienen su contrato de comportamiento observable sin cambios.

No se crean ni modifican requisitos funcionales en ningún spec existente.

---

## Invariantes de preservación

Aunque no hay deltas de spec, el refactor DEBE preservar los siguientes invariantes para ser considerado correcto. Estos son contratos que el cambio no puede romper.

### Invariante P-1: Locale de formateo es-PY

El formateo de fechas y montos en los portales web DEBE producir el mismo resultado observable que producía `toLocaleString('es-PY')` inline.

| Tipo | Función de reemplazo | Invariante |
|------|----------------------|-----------|
| Fecha | `formatDate` de `@solucorp/shared` | Salida idéntica al locale `es-PY` |
| Fecha y hora | `formatDateTime` de `@solucorp/shared` | Salida idéntica al locale `es-PY` |
| Monto Guaraní | `formatGuarani` de `@solucorp/shared` | Entero sin decimales, símbolo ₲ |

#### Escenario: Fecha formateada en columna de reporte

- DADO una columna de fecha en una página de reportes de `apps/client`
- CUANDO se renderiza un valor de fecha ISO
- ENTONCES el texto visible es idéntico al que producía `new Date(v).toLocaleString('es-PY')` antes del refactor

#### Escenario: Monto en Guaraníes en columna de reporte

- DADO un monto numérico entero en Guaraníes (PYG)
- CUANDO se renderiza en una columna de reporte
- ENTONCES el texto visible es un entero sin decimales con símbolo ₲ (sin separador de centavos)

---

### Invariante P-2: enabledModules no gatea comportamiento en web

`UserInfo.enabledModules` se mapea desde el login response en `auth-store.ts` como adición de datos. Los portales web NO DEBEN usar `enabledModules` para bloquear acceso a rutas, componentes o funciones como resultado de este cambio.

#### Escenario: Usuario con enabledModules vacío accede a rutas existentes

- DADO un usuario autenticado cuyo login response no incluye `enabledModules` o lo incluye vacío
- CUANDO navega a cualquier ruta disponible antes del refactor
- ENTONCES el acceso es idéntico al de antes del refactor (ninguna ruta bloqueada por ausencia del campo)

#### Escenario: Usuario con enabledModules populado accede a rutas existentes

- DADO un usuario autenticado cuyo login response incluye `enabledModules` con valores
- CUANDO navega a cualquier ruta disponible antes del refactor
- ENTONCES el acceso es idéntico al de antes del refactor (el campo NO se evalúa para control de acceso en este cambio)

---

### Invariante P-3: Aislamiento multi-tenant no alterado por remoción de X-Tenant-ID

Quitar el header `X-Tenant-ID` de `createApiClient` en `packages/shared` NO DEBE afectar el aislamiento de datos entre tenants. La tenancy sigue derivándose exclusivamente del `companyId` embebido en el JWT en el backend.

#### Escenario: Request sin header X-Tenant-ID mantiene aislamiento

- DADO un usuario de `companyId="A"` usando los portales web refactorizados
- CUANDO ejecuta cualquier request autenticado
- ENTONCES los datos retornados corresponden únicamente a `companyId="A"`
- Y los datos de otros tenants no son accesibles

---

## Cobertura

| Categoría | Estado |
|-----------|--------|
| Rutas felices | Cubierto (P-1, P-3) |
| Casos borde | Cubierto (P-2: campo ausente/vacío) |
| Estados de error | N/A — refactor puro sin nuevos flujos de error |

---

## Criterios de aceptación (DoD vinculante)

Estos criterios provienen de la propuesta y son condición necesaria para que el refactor se considere completo:

1. `tsc --noEmit` limpio en `apps/admin` y `apps/client`.
2. Build de ambos portales OK sin errores de compilación.
3. Suite e2e de API sigue verde (ningún test roto).
4. No quedan referencias a `lib/api.ts` inline en `apps/admin` o `apps/client`.
5. No quedan tipos `User` inline en `auth-store.ts` de ningún portal.
6. No quedan llamadas `toLocaleString('es-PY')` inline en páginas de reportes.
7. `X-Tenant-ID` removido de `createApiClient` en `packages/shared`.
