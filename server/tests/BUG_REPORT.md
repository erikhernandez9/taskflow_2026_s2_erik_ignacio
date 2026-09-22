# Reporte de hallazgos — Taller Clase 5 (Testing de APIs REST)

Módulo principal explorado: **Tareas — ciclo de vida** (`POST /api/projects/:projectId/tasks`,
`PATCH /api/tasks/:taskId`, `DELETE /api/tasks/:taskId`). El hallazgo #5 es un bonus
del módulo **Proyectos**, encontrado leyendo el mismo endpoint durante la exploración.

Metodología: exploración manual del código y del contrato (equivalencia, valores
límite, tabla de decisión de transiciones, 401 vs 403), y automatización de cada
hallazgo con Supertest + Jest en `server/tests/`. Cada test de hallazgo está
marcado `HALLAZGO #n` en el código y actualmente **falla a propósito**: el
`expect` codifica el comportamiento correcto según la especificación, no el
comportamiento actual del servidor.

Evidencia completa: `npx jest tests/tasks-lifecycle.test.ts tests/projects-name-validation.test.ts --runInBand`
(4 y 2 fallos respectivamente, con salida guardada en la corrida de esta sesión).

---

## HALLAZGO #1 — Falta autorización por membresía en PATCH y DELETE /api/tasks/:taskId

- **Severidad:** Alta (rotura de control de acceso)
- **Endpoints:** `PATCH /api/tasks/:taskId`, `DELETE /api/tasks/:taskId`
- **Evidencia:** `server/tests/tasks-lifecycle.test.ts` — tests "HALLAZGO #1" y "HALLAZGO #1 (bis)"

**Pasos para reproducir:**
1. Usuario A crea un proyecto y una tarea dentro de él.
2. Usuario B se registra pero nunca es agregado como miembro del proyecto.
3. Usuario B envía `PATCH /api/tasks/{id de la tarea de A}` con un token propio válido
   (por ejemplo `{ "title": "Editada por un intruso" }`), o `DELETE /api/tasks/{id}`.

**Resultado esperado (según la especificación):**
Un usuario autenticado pero sin membresía en el proyecto debe recibir `403 FORBIDDEN`
— es la regla de autorización que sí aplican `GET /api/tasks/:taskId`,
`GET /api/tasks/:taskId/history` y las rutas de tags, todas protegidas con el
middleware `requireTaskProjectMember` (`server/src/middleware/membership.ts`).

**Resultado obtenido:**
`PATCH` responde `200` y aplica el cambio; `DELETE` responde `204` y borra la tarea.
Causa raíz: en `server/src/modules/tasks/tasks.routes.ts` las rutas `PATCH /:taskId`
y `DELETE /:taskId` no tienen `requireTaskProjectMember('taskId')` en la cadena de
middlewares (a diferencia de las demás rutas del mismo router). El único chequeo de
autorización que queda es interno del `updateTask` (`assertCanChangeStatus`), y solo
se ejecuta si el body incluye `status` — el resto de los campos (`title`,
`description`, `priority`, `assigneeId`, `dueDate`) no tiene ningún control de
membresía, y `deleteTask` no tiene ninguno en absoluto.

**Impacto:** cualquier usuario autenticado del sistema puede editar o eliminar
tareas de cualquier proyecto ajeno, sin ser miembro.

**Fix sugerido:** agregar `requireTaskProjectMember('taskId')` a las rutas
`PATCH /:taskId` y `DELETE /:taskId` en `tasks.routes.ts`.

---

## HALLAZGO #2 — (referencia cruzada, ver #1)

Mismo bug que #1, cubre la variante DELETE (test "HALLAZGO #1 (bis)"). Se numeró
junto al #1 porque comparten causa raíz; se deja aparte en el reporte por si se
quiere trackear como ticket independiente.

---

## HALLAZGO #3 — Transición TODO → DONE no está bloqueada pese a la especificación documentada

- **Severidad:** Media (regla de negocio inconsistente con su propia documentación)
- **Endpoint:** `PATCH /api/tasks/:taskId` (cambio de `status`)
- **Evidencia:** `server/tests/tasks-lifecycle.test.ts` — test "HALLAZGO #3"

**Pasos para reproducir:**
1. Crear una tarea (queda en estado `TODO`).
2. Enviar `PATCH /api/tasks/{id}` con `{ "status": "DONE" }` directamente, sin pasar
   por `IN_PROGRESS`.

**Resultado esperado (según la especificación):**
El comentario en `server/src/modules/tasks/transitions.ts` dice explícitamente:
*"Válidas: TODO -> IN_PROGRESS, IN_PROGRESS -> DONE, IN_PROGRESS -> TODO."* Esa lista
no incluye `TODO -> DONE`, por lo que debería responder `422 INVALID_TRANSITION`
(igual que `DONE -> TODO` o `DONE -> IN_PROGRESS`, que sí están bloqueadas).

**Resultado obtenido:**
`200`, la tarea pasa a `DONE` sin pasar por `IN_PROGRESS`. Causa raíz:
`FORBIDDEN_TRANSITIONS` en `transitions.ts` solo lista `['DONE','TODO']` y
`['DONE','IN_PROGRESS']`; `assertTransition` solo bloquea esos dos pares, por lo que
cualquier otro par no explícitamente prohibido (incluido `TODO -> DONE`) se acepta.

**Fix sugerido:** o bien actualizar el comentario para reflejar que `TODO -> DONE`
es intencionalmente válido, o agregar `['TODO','DONE']` a `FORBIDDEN_TRANSITIONS`
si la regla de negocio real exige pasar por `IN_PROGRESS`.

---

## HALLAZGO #4 — dueDate se corre un día en servidores con timezone detrás de UTC

- **Severidad:** Media (corrupción silenciosa de datos, dependiente del entorno)
- **Endpoint:** `POST /api/projects/:projectId/tasks` (y por extensión `PATCH` con `dueDate`)
- **Evidencia:** `server/tests/tasks-lifecycle.test.ts` — test "HALLAZGO #4"

**Pasos para reproducir (en un servidor con timezone UTC-3, ej. Uruguay/Argentina):**
1. Crear una tarea con `{ "title": "Tarea con fecha", "dueDate": "2026-01-15" }`.
2. Observar el `dueDate` devuelto en la respuesta.

**Resultado esperado (según la especificación):**
El comentario de `parseDueDate` en `server/src/lib/ids.ts` dice: *"Fecha de
vencimiento: día calendario, sin hora."* Un día calendario no debería cambiar según
la zona horaria del servidor — se esperaba `"2026-01-15"`.

**Resultado obtenido:**
`"2026-01-14"` (confirmado en este entorno, timezone `America/Montevideo`, UTC-3).
Causa raíz: `parseDueDate` construye `new Date("2026-01-15")`, que el motor de JS
interpreta como medianoche **UTC**; `formatDueDate` arma el string de vuelta con
`getFullYear()/getMonth()/getDate()`, que son componentes en hora **local**. En
cualquier timezone detrás de UTC, medianoche UTC del día 15 cae en la noche del
día 14 en hora local, y el día se corre hacia atrás.

**Fix sugerido:** usar los componentes UTC (`getUTCFullYear`, `getUTCMonth`,
`getUTCDate`) en `formatDueDate`, ya que `parseDueDate` construye la fecha en UTC.

---

## HALLAZGO #5 — POST /api/projects no valida el mínimo de caracteres del name (bonus, módulo Proyectos)

- **Severidad:** Baja/Media (permite datos inconsistentes con la regla documentada)
- **Endpoint:** `POST /api/projects`
- **Evidencia:** `server/tests/projects-name-validation.test.ts` — tests "HALLAZGO #5" y "HALLAZGO #5 (bis)"

**Pasos para reproducir:**
1. `POST /api/projects` con `{ "name": "ab" }` (2 caracteres) o `{ "name": "" }` (vacío).

**Resultado esperado (según la especificación):**
El propio mensaje de error de `create` en `server/src/modules/projects/projects.controller.ts`
dice *"name must be between 3 and 100 characters"*, y esa es exactamente la regla
que aplica `update` (`if (name.length < 3 || name.length > 100) throw badRequest(...)`).
Se esperaba `400 VALIDATION_ERROR` para nombres de menos de 3 caracteres.

**Resultado obtenido:**
`201`, el proyecto se crea igual (incluso con `name: ""`). Causa raíz: `create` solo
valida `if (name.length > 100)`, sin chequear el mínimo — a diferencia de `update`,
que sí valida ambos extremos.

**Fix sugerido:** alinear la validación de `create` con la de `update`:
`if (name.length < 3 || name.length > 100) throw badRequest(...)`.

---

## Resumen

| # | Endpoint(s) | Tipo | Severidad | Código esperado | Código obtenido |
|---|---|---|---|---|---|
| 1 | PATCH /tasks/:id | Autorización (403 faltante) | Alta | 403 FORBIDDEN | 200 |
| 1 bis | DELETE /tasks/:id | Autorización (403 faltante) | Alta | 403 FORBIDDEN | 204 |
| 3 | PATCH /tasks/:id (status) | Tabla de decisión / transición | Media | 422 INVALID_TRANSITION | 200 |
| 4 | POST /projects/:id/tasks (dueDate) | Contrato de datos / timezone | Media | 201, dueDate sin corrimiento | 201, dueDate -1 día |
| 5 | POST /projects | Valores límite (min length) | Baja/Media | 400 VALIDATION_ERROR | 201 |
