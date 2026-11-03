# [API tareas] DELETE /tasks/:id deja borrar una tarea a un usuario ajeno al proyecto

**Criterio violado:** US-13 c1: "Solo los miembros del proyecto al que pertenece la tarea pueden eliminarla (HTTP 403)"

**Entorno:** macOS 27.2 · API Node 24 (Express + SQLite) · zona horaria del servidor UTC-3 · commit 206cefc

**Datos / precondiciones:** dos usuarios registrados con `POST /api/auth/register`: A (owner del proyecto y la tarea) y B (sin membresía).

**Pasos:** 1. B envía `DELETE /api/tasks/{id de la tarea de A}` con su token.

**Esperado:** HTTP 403 `FORBIDDEN` y la tarea sigue existiendo.

**Obtenido:** HTTP 204 y la tarea se borra.

**Reproducibilidad:** 3 de 3 corridas de `npm test`, en macOS.

**Evidencia:** Respuesta HTTP en la salida del test. Misma causa probable que el bug de PATCH.

**Test que lo reproduce:** `server/tests/tasks-lifecycle.test.ts` › HALLAZGO #1 (bis)

**Severidad:** alta
