## Exploración: frontend-testing-foundation

### Estado Actual

Los portales web `apps/admin` y `apps/client` no tienen ninguna infraestructura de pruebas automatizadas. La verificación actual se limita a `tsc --noEmit` + `next build` + pruebas e2e de API. No existe `jest.config.*`, `jest.setup.*`, ni ningún archivo `*.spec.ts(x)` en ninguno de los dos portales.

---

### Versiones confirmadas

| Paquete | Versión |
|---|---|
| `next` | 16.2.6 |
| `react` / `react-dom` | 19.2.4 (apps) — override raíz fuerza 19.1.0 |
| `tailwindcss` | ^4 (CSS-first, sin preset v3) |
| `typescript` | ^5 |
| `zustand` | ^5.0.13 |
| `axios` | ^1.16.0 |

Turbopack: activo en dev (`next dev`). No afecta al runner de tests (Jest/ts-jest corren fuera de Turbopack).

---

### Separación server vs. client components

**Hallazgo clave**: El 100% del código testeable en ambos portales usa `'use client'`. No existe ningún React Server Component (RSC) ni componente async en las apps. La división es:

| Archivo | Directiva | Implicación para tests |
|---|---|---|
| `apps/*/src/app/layout.tsx` | Server Component (sin directiva) | Wrapper HTML/font — sin lógica de negocio, no prioridad de test |
| `apps/*/src/app/**/page.tsx` | `'use client'` | Testeable con RTL+jsdom |
| `apps/*/src/components/layout/AuthGuard.tsx` | `'use client'` | Testeable con RTL+jsdom |
| `apps/*/src/components/layout/AppLayout.tsx` | `'use client'` | Testeable con RTL+jsdom |
| `apps/*/src/components/layout/Sidebar.tsx` | `'use client'` | Testeable con RTL+jsdom |
| `apps/client/src/components/ReportPage.tsx` | `'use client'` | Testeable con RTL+jsdom |
| `apps/*/src/stores/auth-store.ts` | `'use client'` (directiva en archivo, Zustand store) | Testeable con Jest puro (no requiere DOM) |

Conclusión: la ausencia de RSC simplifica drásticamente la estrategia de testing — no hay necesidad de resolver el problema de RSC+jsdom hoy.

---

### Infraestructura Jest/RTL reutilizable en el monorepo

`packages/ui` ya tiene un patrón completo y funcional:

- **Runner**: Jest 30 + ts-jest (preset `ts-jest`)
- **Entorno**: `jest-environment-jsdom` ^30
- **RTL**: `@testing-library/react` ^16.1 + `@testing-library/jest-dom` ^6.6
- **Setup**: `jest.setup.ts` que importa `@testing-library/jest-dom`
- **Mocks**: `__mocks__/styleMock.js` para CSS (`'\\.(css|less|scss)$': '<rootDir>/../__mocks__/styleMock.js'`)
- **Config**: `jest.config.ts` con `preset: 'ts-jest'`, `testEnvironment: 'jsdom'`, `setupFilesAfterEnv`, `moduleNameMapper`
- **Alias de paths**: NO mapeado en `packages/ui` (no lo necesita); los portales necesitan mapear `@/*` → `./src/*`

El `jest.config.ts` de cada portal deberá agregar:
```ts
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1',
  '\\.(css|less|scss)$': '<rootDir>/__mocks__/styleMock.js',
}
```

`packages/shared` también usa Jest 30 + ts-jest (sin jsdom — solo Node). Confirma que el toolchain ya está instalado en el workspace y es compatible con React 19.

---

### Mocks críticos necesarios

1. **`next/navigation`**: `useRouter` — usado en `AuthGuard`, `LoginPage`, `ClientsPage`. Necesita mock manual: `jest.mock('next/navigation', () => ({ useRouter: jest.fn(() => ({ push: jest.fn() })) }))`.
2. **`@solucorp/shared` (`api` axios instance)**: Usado en `ReportPage`, `DashboardPage`, y todas las páginas de reportes. Mockeable con `jest.mock('@solucorp/shared', () => ({ api: { get: jest.fn(), post: jest.fn() }, formatDateTime: jest.fn() }))`.
3. **`localStorage`**: jsdom provee una implementación en memoria — no necesita mock especial, pero los tests de `auth-store` deben limpiar entre tests (`localStorage.clear()` en `beforeEach`).
4. **`window.location.href`**: Zustand `logout` y el 401-handler lo sobreescriben. La técnica del `client.spec.ts` existente (`Object.defineProperty(globalThis, 'window', ...)`) es el patrón a replicar.

---

### Opciones de runner

#### Opción A — Jest 30 + @testing-library/react + jsdom (recomendada)

Configuración idéntica a `packages/ui`. Reutiliza dependencias ya instaladas en el workspace npm.

| Criterio | Evaluación |
|---|---|
| Consistencia con el monorepo | ✅ Idéntico a `packages/ui` y `packages/shared` |
| React 19 support | ✅ RTL 16.x soporta React 19 |
| Turbopack | ✅ Jest corre independientemente de Turbopack |
| ESM / módulos | ⚠️ Next.js usa `"moduleResolution": "bundler"` — Jest necesita `moduleNameMapper` para alias `@/*` y mocks de CSS; posibles problemas con módulos ESM puros (como `react-icons` si es ESM-only) |
| Esfuerzo de setup | Bajo — hay un template exacto en `packages/ui` |
| Velocidad de CI | Media (jsdom es más lento que Happy DOM pero suficiente para unit tests) |

#### Opción B — Vitest + @testing-library/react

Runner ESM-native, más rápido, mejor soporte para módulos modernos.

| Criterio | Evaluación |
|---|---|
| Consistencia con el monorepo | ❌ Introduce segunda toolchain (el resto del monorepo usa Jest 30) |
| React 19 support | ✅ Vitest 3.x + RTL 16.x soportan React 19 |
| Turbopack | ✅ Independiente |
| ESM / módulos | ✅ Nativo — menos fricción con `react-icons` y otras librerías ESM |
| Esfuerzo de setup | Medio — nuevo `vite.config.ts` por app, diferente API de mocks |
| Velocidad de CI | Alta |

#### Opción C — Playwright (e2e browser)

Capa diferente — integration/e2e, no unit. Requiere servidor corriendo.

| Criterio | Evaluación |
|---|---|
| Cubre lógica de negocio | ⚠️ Solo como caja negra |
| Costo de setup y mantenimiento | Alto — necesita instancia de API real o mock server |
| Turbopack | Usa next build/start — no interferencia |
| Complemento a unit tests | Sí, pero no reemplaza la capa unitaria |

---

### Recomendación

**Opción A: Jest 30 + RTL + jsdom**, replicando exactamente el patrón de `packages/ui`.

Justificación:
1. **Cero nueva toolchain**: las dependencias (`jest`, `ts-jest`, `jest-environment-jsdom`, `@testing-library/react`, `@testing-library/jest-dom`) ya están en el workspace npm — solo se agregan al `devDependencies` de cada app.
2. **Patrón probado en este repo**: `packages/ui` tiene 4 spec files funcionando con Jest 30 + RTL + React 19. No es especulación.
3. **Turbo task `test` ya existe**: `turbo.json` ya tiene la tarea `test` configurada con inputs/outputs/dependsOn. Solo falta el `"test": "jest"` script en el `package.json` de cada portal.
4. **Consistencia de CI**: un solo runner, un solo reporte de cobertura, un solo comando raíz `npm test`.
5. El riesgo de módulos ESM (Opción A) es manejable con `moduleNameMapper` y `transformIgnorePatterns` — el mismo problema ya fue resuelto en `packages/ui`.

Vitest (Opción B) es la mejor opción técnica a largo plazo si el monorepo eventualmente migra a Vite, pero introducir dos toolchains de testing en este momento solo agrega fricción operativa sin beneficio tangible para la escala actual.

---

### Alcance del primer slice

**App inicial**: `apps/client` (portal COMPANY_ADMIN — mayor superficie de UI, más páginas de reporte, `ReportPage` es el componente más reutilizado).

**Runner**: Jest 30 + ts-jest + RTL + jsdom (mismo patrón que `packages/ui`).

**Primeros 4 targets de test** (mayor valor, menor fricción):

1. **`apps/client/src/stores/auth-store.ts`** — Zustand store puro. Testear: `login` (éxito y fallo), `logout` (limpia localStorage + redirige), `loadFromStorage` (con y sin token). Sin DOM, solo Jest + jsdom para `localStorage`. Máximo valor para la capa de autenticación.

2. **`apps/client/src/components/layout/AuthGuard.tsx`** — Componente client-side con lógica de guard de roles crítica. Testear: usuario null → redirige a `/login`; usuario con rol incorrecto → alert + redirect; usuario COMPANY_ADMIN → renderiza children. Requiere mock de `next/navigation` y `useAuthStore`.

3. **`apps/client/src/components/ReportPage.tsx`** — Componente genérico usado por 6 páginas de reportes. Testear: renderizado de columnas, estado de loading, tabla vacía "Sin datos", exportCSV (mock de `api.get`). Mayor ROI por componente: un test cubre 6 rutas de reporte.

4. **`apps/client/src/app/login/page.tsx`** — Formulario de login. Testear: submit llama `login`, error de credenciales muestra mensaje, botón disabled durante `isLoading`. Requiere mock de `useAuthStore` y `next/navigation`.

---

### Riesgos

1. **React 19 + jsdom**: React 19 introdujo cambios en el modelo de concurrencia (`act()` async). RTL 16.x los maneja, pero los tests de efectos asíncronos (`useEffect` + `useState`) requieren `waitFor` — no `act()` directo. Riesgo bajo si se sigue el patrón de `packages/ui`.

2. **Módulos ESM puros**: `react-icons` y posiblemente `recharts` son ESM. Jest (CommonJS por defecto en ts-jest) puede fallar con `SyntaxError: Cannot use import statement`. Mitigación: agregar `transformIgnorePatterns` para excluirlos del ignore de transform, o usar `moduleNameMapper` para mockearlos con `jest.fn()`.

3. **`next/navigation` y `next/font/google`**: El `layout.tsx` importa fuentes de Google (`Geist`, `Geist_Mono`) — jsdom no puede resolver fuentes remotas. Mitigación: los `layout.tsx` son server components y no deberían estar en el scope de unit tests; los page components bajo test importarán `AppLayout` que a su vez importa `AuthGuard` y `Sidebar` — es necesario mockear `AppLayout` o testear componentes individualmente sin wrapping.

4. **`turbo run test` en apps sin script `test`**: Si `apps/admin` o `apps/client` no tienen el script `test` declarado, `turbo run test` falla silenciosamente o con error. Se debe agregar el script simultáneamente con la config de Jest.

5. **`moduleResolution: "bundler"` en tsconfig vs. ts-jest**: ts-jest puede requerir un `tsconfig` dedicado para tests con `"moduleResolution": "node16"` o `"nodenext"` ya que `"bundler"` no es soportado por ts-jest. Mitigación: crear `tsconfig.test.json` que extienda el base pero sobreescriba `moduleResolution` a `"node16"` — mismo patrón que `packages/ui` si lo usa.

---

### ¿Listo para Propuesta?

Sí — el estado actual está mapeado, el patrón de reuso de `packages/ui` es directo y probado, los mocks críticos están identificados, y el primer slice tiene scope claro (4 targets concretos en `apps/client`).
