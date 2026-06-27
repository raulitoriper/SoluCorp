# Delta para ci-infrastructure

**Cambio:** frontend-testing-foundation  
**Modifica:** openspec/specs/ci-infrastructure/spec.md  
**Secciones afectadas:** §6.1 (Test execution — aclaración de cobertura de workspaces), §14 (Cambios futuros)

---

## ADDED Requirements

### Requisito: Gate bloqueante de CI para apps/client sin job nuevo

El job `unit-tests` existente (`npx turbo run test -- --coverage`) DEBE cubrir automáticamente `apps/client` una vez que ese workspace declare el script `"test"`. NO SE DEBE crear ningún job adicional en `.github/workflows/ci.yml` para client testing. El gate bloqueante se obtiene por el mecanismo estándar de Turborepo: si el script `"test"` existe en un workspace, `turbo run test` lo incluye.

#### Escenario: Test fallido en apps/client bloquea merge

- DADO que `apps/client` tiene el script `"test"` declarado en su `package.json`
- Y que al menos un test de `apps/client` falla
- CUANDO el job `unit-tests` ejecuta `npx turbo run test -- --coverage`
- ENTONCES `turbo run test` DEBE retornar exit distinto de 0
- Y el job `unit-tests` DEBE fallar
- Y el merge DEBE quedar bloqueado por el status check requerido

#### Escenario: Todos los tests de apps/client pasan — job verde

- DADO que `apps/client` tiene el script `"test"` declarado
- Y que los 4 tests obligatorios pasan
- CUANDO el job `unit-tests` ejecuta `npx turbo run test -- --coverage`
- ENTONCES el comando DEBE incluir y ejecutar los tests de `apps/client`
- Y el job DEBE terminar verde (exit 0)
- Y el merge NO DEBE quedar bloqueado por unit-tests

#### Escenario: Sin script "test" en apps/client — workspace ignorado por turbo

- DADO que `apps/client` NO tiene el script `"test"` declarado
- CUANDO `turbo run test` se ejecuta
- ENTONCES `turbo` DEBE omitir `apps/client` silenciosamente
- Y los demás workspaces DEBEN ejecutarse con normalidad
- (Este escenario documenta el estado PRE-cambio; el cambio lo resuelve declarando el script)

---

## MODIFIED Requirements

### Requisito: Test execution — cobertura de workspaces (§6.1)

El job `unit-tests` DEBE ejecutar `npx turbo run test -- --coverage`. El alcance de ejecución DEBE incluir todos los workspaces que declaren script `"test"`: `apps/api`, `packages/shared`, `packages/ui`, y — tras este cambio — `apps/client`. NO DEBEN existir steps adicionales ni jobs separados para aislar la ejecución de client.  
(Previously: §6.1 solo especificaba la ejecución de `npx turbo run test -- --coverage` sin enumerar explícitamente los workspaces cubiertos; `apps/client` no tenía script `"test"` y era silenciosamente omitido)

#### Escenario: Ejecución de turbo run test incluye los 4 workspaces

- DADO el workflow con el job `unit-tests`
- Y que `apps/api`, `packages/shared`, `packages/ui` y `apps/client` declaran script `"test"`
- CUANDO se ejecuta `npx turbo run test -- --coverage`
- ENTONCES los 4 workspaces DEBEN ejecutarse
- Y el resultado DEBE ser exit 0 si todos los tests pasan

#### Escenario: Coverage upload sigue siendo solo apps/api

- DADO el step de upload en job `unit-tests`
- CUANDO la ejecución completa
- ENTONCES el artifact subido DEBE apuntar a `apps/api/coverage/`
- Y NO DEBE incluir coverage de `apps/client` en el artifact (sin cambio al step de upload)

---

## REMOVED Requirements

_(ninguno — este cambio es puramente aditivo/aclaración)_
