# [API tareas] PATCH /tasks/:id deja editar una tarea a un usuario ajeno al proyecto

**Criterio violado:** US-12 c5: "Solo los miembros del proyecto al que pertenece la tarea pueden editarla (HTTP 403)"

**Entorno:** macOS 27.2 · API Node 24 (Express + SQLite) · zona horaria del servidor UTC-3 · commit 206cefc

**Datos / precondiciones:** dos usuarios registrados con `POST /api/auth/register`: A (owner del proyecto y la tarea) y B (sin membresía).

**Pasos:** 1. B envía `PATCH /api/tasks/{id de la tarea de A}` con su token y `{ "title": "Editada por un intruso" }`.

**Esperado:** HTTP 403 `FORBIDDEN` y la tarea sin cambios.

**Obtenido:** HTTP 200 y el cambio se aplica.

**Reproducibilidad:** 3 de 3 corridas de `npm test`, en macOS.

**Evidencia:** Respuesta HTTP en la salida del test. `tasks.routes.ts` no monta `requireTaskProjectMember` en esta ruta.

**Test que lo reproduce:** `server/tests/tasks-lifecycle.test.ts` › HALLAZGO #1

**Severidad:** alta
