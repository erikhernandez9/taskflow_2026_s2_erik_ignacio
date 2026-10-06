# ADR 0001 — Component Objects para las piezas de UI que se repiten

- **Estado:** Aceptada
- **Fecha:** 2026-10-06
- **Contexto de cursada:** Clase 6 · Arquitectura de Testing con Playwright
- **Autores:** Erik Hernández, Ignacio Tachini

## Contexto

El framework de E2E de TaskFlow arranca de cero: antes de esta clase no había
nada de Playwright en el repo, así que no hay código de testing que corregir.
Lo que sí hay es una duplicación real y sin resolver en la aplicación: tres
pantallas renderizan una pieza repetida que no está extraída como componente
reutilizable, y las tres ya tienen `data-testid` puesto.

| Pantalla | Pieza que se repite | Estado en el cliente |
|----------|--------------------|----------------------|
| Tablero de tareas | `task-card`, en las 3 columnas | Inline, no extraída |
| Detalle de tarea | `comment-item`, en la lista de comentarios | Inline, no extraída |
| Miembros | `member-item`, en la lista de miembros | Inline, no extraída |

El Page Object clásico modela **una pantalla**. Eso alcanza mientras los
elementos son únicos (un formulario, un botón de guardar), pero se rompe cuando
la pantalla contiene N instancias del mismo elemento. Con Page Objects puros,
un test que quiere actuar sobre "la tarjeta de la tarea X" termina escribiendo
índices (`nth(2)`) o selectores compuestos dentro del test, y esa lógica se
repite en cada spec que toque una tarjeta.

El problema se agrava porque las instancias **no son intercambiables**:

- `comment-item` solo muestra el botón de borrar si el comentario es del usuario
  logueado (`comment.authorId === user?.id`).
- `member-item` solo muestra el botón de quitar si quien mira es el owner y la
  fila no es la suya (`isOwner && member.userId !== project.ownerId`).

Un test que quiera afirmar sobre esa condicionalidad necesita poder preguntarle
a **una** instancia en particular, no a la pantalla.

## Decisión

Adoptamos el patrón **Component Object** como complemento del Page Object, con
una división de responsabilidades explícita:

- **Page Object** (`e2e/pages/`): dueño de la navegación, del chrome de la
  pantalla (header, errores, estado vacío) y de los elementos que existen una
  sola vez (formularios de alta, filtros, contadores de columna). Expone las
  piezas repetidas **devolviendo Component Objects**, no Locators crudos.
- **Component Object** (`e2e/components/`): dueño de UNA pieza repetida. Se
  ancla a un `root: Locator` recibido por constructor y **todas** sus consultas
  salen de ese root (`this.root.getByTestId(...)`), nunca de `page`. Eso es lo
  que permite tener N instancias vivas sin que los selectores se pisen.

Extraemos tres: `TaskCardComponent`, `CommentItemComponent` y
`MemberItemComponent`.

### Criterios para extraer un Component Object

Una pieza se extrae cuando cumple **al menos tres** de estos cinco criterios:

1. **Se repite** N veces dentro de la misma pantalla.
2. **Tiene una raíz estable** en el DOM, identificable por un `data-testid`
   propio.
3. **Tiene comportamiento**, no solo texto: el test *actúa* sobre ella.
4. **Sus instancias difieren entre sí** según el contexto (permisos, estado,
   autoría), así que el test necesita interrogar a una en particular.
5. **El test necesita nombrarla**: existe la pregunta "la tarjeta/el comentario
   /la fila *de X*", que sin el componente se resuelve con índices frágiles.

Aplicación de los criterios:

| Pieza | 1 Repite | 2 Raíz | 3 Comportamiento | 4 Instancias distintas | 5 Nombrable | Decisión |
|-------|:--------:|:------:|:----------------:|:----------------------:|:-----------:|----------|
| `task-card` | sí | `task-card` | sí — select de estado, link al detalle | según estado | por título | **Extraer** |
| `comment-item` | sí | `comment-item` | sí — borrar | botón solo en los propios | por cuerpo | **Extraer** |
| `member-item` | sí | `member-item` | sí — quitar | botón solo para el owner | por email | **Extraer** |
| `project-card` | sí | `project-card` | no — dos links | no | por nombre | Posponer |
| Pantalla entera | no | sí | sí | no | no | Queda como Page Object |

### Por qué la pieza y no la pantalla entera

El tablero completo **no** cumple los criterios 1 y 4: hay un solo tablero por
vista y no hay dos tableros que se comporten distinto. Encapsular la pantalla
entera en un Page Object ya resuelve lo suyo (navegar, crear, filtrar). Lo que
el Page Object no puede resolver sin ayuda es la multiplicidad interna: la
tarjeta es lo que aparece tres veces en tres columnas, y es ahí —no un nivel más
arriba— donde se necesita una abstracción que se pueda instanciar N veces.

Dicho al revés: el Page Object responde "¿qué puedo hacer en esta pantalla?",
el Component Object responde "¿qué puedo hacer con *esta* tarjeta?".

### Por qué `project-card` queda afuera por ahora

Cumple los criterios 1, 2 y 5, pero no el 3 ni el 4: es un bloque de lectura con
dos links, y todas sus instancias se renderizan igual. `ProjectsPage` lo resuelve
con Locators filtrados, sin clase propia. Si más adelante la tarjeta gana acciones
(archivar, renombrar inline) pasa a cumplir el criterio 3 y se extrae. Esa
revisión es deuda registrada, no un olvido.

## Consecuencias

### Positivas

- Los specs no contienen ni un solo `data-testid` interno de las piezas: si
  cambia el markup de la tarjeta, se toca un archivo y no N specs.
- La condicionalidad queda expresada como pregunta de dominio —`canDelete()`,
  `canRemove()`— en vez de como conteo de elementos repetido en cada test.
- `toComponents()` convierte una lista del DOM en una lista tipada de objetos,
  así que recorrer "todas las filas" es un `for` normal.
- Cada componente expone un `snapshot()` que permite afirmar sobre varios campos
  en una sola assertion, en vez de encadenar cinco `expect` por tarjeta.

### Negativas / costos asumidos

- Una capa más de indirección: para saber qué selector se usa hay que abrir el
  componente. Lo aceptamos porque el costo es constante y el beneficio crece con
  la cantidad de specs.
- Riesgo de sobre-abstracción si se extrae todo lo que se repite. Por eso los
  criterios son explícitos y `project-card` queda documentado como *posponer*:
  la regla tiene que poder decir que no.
- Los componentes dependen de que los `data-testid` del cliente sigan existiendo.
  Si alguien los borra, rompe el framework. Es una dependencia que asumimos y
  conviene dejar anotada en el cliente.

### Decisiones derivadas (fuera del alcance de este ADR)

- **Arrange por API, assert por UI**: el estado previo de cada test se arma con
  `ApiClient` (`e2e/support/api-client.ts`) y no navegando la UI, para que un
  test del tablero no se rompa cuando cambia el formulario de login. La sesión
  se inyecta en `localStorage` en vez de loguear por pantalla.
- **Aislamiento por datos**: cada test registra su propio usuario con email
  único (`unique()`), así que la suite corre en paralelo sobre una única base sin
  pisarse. No se depende del seed.

Si alguna de estas dos se discute o se revierte, merece su propio ADR.

## Alternativas consideradas

1. **Solo Page Objects, con índices en los specs.** Descartada: traslada al test
   la responsabilidad de ubicar la instancia, y los índices se rompen apenas
   cambia el orden o se filtra la lista.
2. **Solo Page Objects, con métodos parametrizados** (`boardPage.moveTask(titulo,
   estado)`). Descartada: el Page Object crece sin techo —un método por acción
   por campo de la pieza— y la pantalla termina conociendo el markup interno de
   algo que se repite.
3. **Helpers sueltos de locators** (funciones que devuelven Locators). Descartada:
   resuelve la ubicación pero no el comportamiento ni la condicionalidad; el
   `canDelete()` volvería a escribirse en cada spec.
4. **Screenplay pattern** (actores, tareas, preguntas). Descartada por costo:
   es más potente, pero para una app de cinco pantallas y un equipo de dos
   personas agrega vocabulario que no estamos usando todavía.

## Referencias

- Implementación: `e2e/components/`, `e2e/pages/`, `e2e/support/`
- Specs que ejercitan la decisión: `e2e/specs/board.spec.ts`,
  `e2e/specs/task-detail.spec.ts`, `e2e/specs/members.spec.ts`
- Piezas en el cliente: `client/src/pages/BoardPage.tsx`,
  `client/src/pages/TaskDetailPage.tsx`, `client/src/pages/MembersPage.tsx`
