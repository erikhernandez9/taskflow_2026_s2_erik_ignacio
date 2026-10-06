# Framework de E2E — TaskFlow

Tests de punta a punta con Playwright. La decisión de arquitectura que sostiene
esta estructura está en
[`docs/adr/0001-component-objects-para-piezas-repetidas.md`](../docs/adr/0001-component-objects-para-piezas-repetidas.md).

## Correr la suite

```bash
npm install          # una vez
npx playwright install chromium   # una vez: descarga el navegador
npm run db:setup     # una vez: crea la base SQLite
npm run test:e2e
```

`test:e2e` levanta la API y el frontend por su cuenta (`npm run dev`) y los
reusa si ya están corriendo.

| Comando | Qué hace |
|---------|----------|
| `npm run test:e2e` | Corre la suite headless |
| `npm run test:e2e:ui` | Abre el modo UI de Playwright |
| `npm run test:e2e:report` | Abre el último reporte HTML |
| `npm run typecheck:e2e` | Chequea tipos del framework sin compilar |

Si el puerto 5173 está ocupado, Vite arranca en otro y hay que apuntar la suite:

```bash
E2E_WEB_URL=http://localhost:5174 npm run test:e2e
```

`E2E_API_URL` hace lo mismo para la API (default `http://localhost:3000`).

## Estructura

```
e2e/
├── config.ts              # URLs, constantes y tipos del dominio
├── components/            # Component Objects: UNA pieza repetida cada uno
│   ├── base.component.ts  # raíz anclada + toComponents()
│   ├── task-card.component.ts
│   ├── comment-item.component.ts
│   └── member-item.component.ts
├── pages/                 # Page Objects: UNA pantalla cada uno
│   ├── base.page.ts       # navegación + chrome común
│   ├── login.page.ts
│   ├── projects.page.ts
│   ├── board.page.ts
│   ├── task-detail.page.ts
│   └── members.page.ts
├── support/
│   ├── api-client.ts      # arrange por API (no por UI)
│   └── fixtures.ts        # fixtures de Playwright: api, owner, signIn, páginas
└── specs/                 # los tests
```

## Convenciones

**Los specs no escriben selectores.** Si un spec necesita un `data-testid`,
falta un método en el Page Object o en el Component Object.

**Los Component Objects consultan desde su `root`, nunca desde `page`.** Es lo
que permite que haya N instancias de la misma pieza sin que se pisen.

**El arrange va por API, el assert por UI.** `ApiClient` crea usuarios,
proyectos, tareas y comentarios; la UI se ejercita solo en lo que el test afirma.
Un test del tablero no debería romperse porque cambió el login.

**Cada test se crea sus propios datos.** `unique()` genera emails y títulos
irrepetibles, así que la suite corre en paralelo sobre una sola base y no
depende del seed.

**Login por `localStorage`.** El fixture `signIn` siembra el token antes de la
primera navegación (ver `client/src/lib/api.ts`). El login por pantalla se
prueba en su propio spec, no como peaje de entrada de los demás.

## Agregar un Component Object

1. Verificar contra los criterios del ADR que la pieza amerita extracción.
2. Crear `components/<pieza>.component.ts` extendiendo `BaseComponent`, con un
   `static readonly TEST_ID`.
3. Exponer los hijos como getters de Locator y las acciones como métodos.
4. En el Page Object correspondiente, agregar: el Locator de la lista, un
   `async <piezas>()` que use `toComponents()`, y un `<pieza>By<Campo>()` para
   ubicar una sola.
5. Exportarlo desde `components/index.ts`.
