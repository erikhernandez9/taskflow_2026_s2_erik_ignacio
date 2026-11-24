# Smells detectados y refactor (Clases 3 y 7)

El refactor está en el commit `b5233a5` (`refactor(server): eliminar 5 code smells detectados en TaskFlow`). El estado previo es `f0d3453`. Todos los archivos están bajo `server/src/modules/`.

## Tabla de smells

| Smell | Dónde estaba (archivo y función, en `f0d3453`) | Refactor que lo resolvió | Principio | Commit |
|---|---|---|---|---|
| Función que hace de todo (validación, autorización, transición de estado, historial, persistencia) con `if/else` anidados | `tasks/tasks.service.ts` · `updateTask()` | Se partió en `validateTaskFields`, `resolveAssignee`, `assertCanChangeStatus`, `resolveStatusChange` y `recordStatusChange`; `updateTask` queda como orquestador | SRP | `b5233a5` |
| Validación de email duplicada con dos regex distintas y dos mensajes distintos | `auth/auth.service.ts` · `checkEmail()` (`EMAIL_PATTERN`, usada en `register` y `forgotPassword`) y `projects/projects.controller.ts` · `addMember()` (`EMAIL_CHECK`) | Ambos usan `assertEmail()` de `lib/validation.ts`; se borraron las dos regex locales | DRY | `b5233a5` |
| N+1 queries: por cada tarea listada, un `findUnique` de usuario y un `count` de comentarios | `tasks/tasks.controller.ts` · `listByProject()` | `loadTaskExtras()` trae assignees con un `findMany` (`id in`) y los conteos con un solo `groupBy`; se arma con `Map`. Además se extrajo `parseListFilters()` | DIP / separación de responsabilidades | `b5233a5` |
| Filtros que se pisaban entre sí (`status`, `priority` y `assigneeId` reasignaban `where` completo) y búsqueda por texto con SQL crudo concatenado (`$queryRawUnsafe`, inyección SQL) que ignoraba el resto de los filtros | `tasks/tasks.repository.ts` · `buildFilters()`, `findTasks()` y `countTasks()` | `buildFilters()` acumula todas las condiciones sobre un único `where` e incorpora `search` como `OR` de `contains` sobre título y descripción; se eliminó el SQL crudo y la rama especial de `findTasks`/`countTasks` | OCP (más seguridad) | `b5233a5` |
| Chequeo de autorización copiado y pegado (parse de id, `findUnique`, owner vs. miembro vs. oculto) | `projects/projects.controller.ts` · `update()` y `remove()` (y el prólogo de `addMember()` / `removeMember()`) | Helpers `loadProjectOrThrow()` y `requireOwnerOrHideProject()` | DRY | `b5233a5` |

## Tests de caracterización

Un test de caracterización fija lo que el sistema hace hoy, no lo que dice la especificación. Sirve para detectar cambios de comportamiento no intencionales cuando se refactoriza. Está en `server/tests/characterization.test.ts` (Jest + Supertest, 40 tests, autocontenido: no depende de `helpers.ts`, así que corre igual contra commits viejos).

**Aclaración de honestidad:** estos tests se escribieron después del refactor, no antes como indica la práctica. Se verificaron retroactivamente contra el commit anterior (`f0d3453`), copiando el mismo archivo a un worktree de ese commit. Por eso el resultado "antes" no es un respaldo del refactor en su momento, sino un análisis a posteriori de qué cambió.

### Qué fija cada bloque

| Bloque | Zona | Qué fija |
|---|---|---|
| (a) | `updateTask` | PATCH con título, prioridad, estado, assignee y `dueDate` a la vez; historial (`null -> TODO`, `TODO -> IN_PROGRESS`, `changedBy`); sin cambio de estado no se escribe historial; body vacío; `assigneeId: null`; assignee que no es miembro (400, sin aplicar el resto); prioridad/título inválidos (400); miembro no assignee cambiando estado (403); assignee cambiando estado y `DONE -> TODO` (422) |
| (b) | email | `register` y agregar miembro con emails válidos e inválidos (400, mensaje `valid address`); no-string; miembro inexistente (404) y repetido (409) |
| (c) | `listByProject` | 4 tareas con assignees distintos y 0/1/3 comentarios: `assignee`, `assigneeId` y `commentCount` correctos y orden por id; proyecto vacío; filtro `assignedTo` |
| (d) | filtros/búsqueda | `status` solo, `priority` sola, `search` solo (por texto), sin coincidencias |
| (e) | autorización | Listado de proyectos/tareas: owner y miembro sí, no-miembro no (403 en tareas). PATCH: owner 200, miembro 403, no-miembro 404, inexistente/malformado 404. DELETE: miembro 403, no-miembro 404, owner 204 y luego 404. Agregar miembro: miembro y no-miembro 403, inexistente 404 |
| Cambios detectados | email, filtros, search | Ver siguiente sección |

Nota: la API no tiene `GET /api/projects/:id`; el "GET" de la zona (e) se caracteriza con `GET /api/projects` y `GET /api/projects/:id/tasks`.

### Resultados (evidencia completa en `docs/evidencia/caracterizacion-antes-despues.txt`)

| Versión | Resultado |
|---|---|
| Antes: `f0d3453` | `Tests: 6 failed, 34 passed, 40 total` |
| Refactor: `b5233a5` | `Tests: 40 passed, 40 total` |
| Hoy: HEAD | `Tests: 40 passed, 40 total` |

Los 34 tests de los bloques (a) a (e) pasan en verde en las tres versiones: el refactor preservó el comportamiento observable de esas zonas. Los 6 que fallan en `f0d3453` son todos del bloque "Cambios de comportamiento detectados".

### Cambio de comportamiento detectado por la caracterización

El refactor no fue puramente estructural. Estos comportamientos cambiaron entre `f0d3453` y `b5233a5`:

| Qué cambió | Antes (`f0d3453`) | Después | Intencional |
|---|---|---|---|
| Filtros `status` + `priority` | `priority` pisaba a `status`: se devolvía solo el filtro de prioridad | Intersección de ambos | Sí (bug corregido, lo dice el commit) |
| `search` combinado con otros filtros | La búsqueda ignoraba `status`, `priority` y `assignedTo` | Intersección de todos | Sí |
| `search` con comillas, p. ej. `' OR '1'='1` | Se concatenaba al SQL: la comilla rompía la consulta y el texto literal nunca matcheaba (devolvía `[]`); inyección SQL | Se trata como texto literal y matchea | Sí (vulnerabilidad corregida) |
| `search` y mayúsculas | `instr`: distingue mayúsculas (`deploy` no encontraba `Deploy`) | `contains` de Prisma/SQLite: no distingue mayúsculas | No declarado |
| `search` y descripción | `instr(description, ...)` | `OR` título/descripción (se comprobó que también encuentra por descripción) | Equivalente |
| Email en `register` / `forgotPassword` | Regex estricta: rechazaba `+`, `_` en dominio, caracteres no ASCII, TLD de 1 letra | Regex de `assertEmail` (`^[^\s@]+@[^\s@]+\.[^\s@]+$`): acepta todos esos | No declarado |
| Email en agregar miembro | Mensaje `email must be a valid address` | `Email must be a valid address` (mayúscula inicial) | No declarado |
| Comodín `%` en `search` | Literal (`instr`) | Puede actuar como comodín del `LIKE` (observado: `search=%` devuelve todo) | No declarado, no cubierto por tests |

Solo los primeros tres ítems y el email/mayúsculas están fijados en el bloque "Cambios de comportamiento detectados"; el comodín `%` se observó con una sonda y no tiene test. Tampoco se fija el orden de validación en `updateTask`: antes se validaban los campos primero y después el estado; ahora se resuelve el estado primero, así que con un body que mezcla un permiso de estado inválido y un campo inválido puede cambiar cuál error se reporta (no probado).

### Limitación conocida (fuera del alcance del refactor)

`dueDate` puede volver corrido un día según la zona horaria (se envía `2030-01-15` y se observó `2030-01-14`). El test solo fija el formato (`2030-01-14` o `2030-01-15`) para no depender de la zona del que lo corre. Es un bug independiente del refactor.
