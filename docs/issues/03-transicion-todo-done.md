# [API tareas] PATCH permite pasar una tarea de TODO a DONE sin pasar por IN_PROGRESS

**Criterio violado:** US-06 c2: "NO está permitido ir de TODO directamente a DONE"

**Entorno:** macOS 27.2 · API Node 24 (Express + SQLite) · zona horaria del servidor UTC-3 · commit 206cefc

**Datos / precondiciones:** tarea recién creada, en `TODO`.

**Pasos:** 1. Enviar `PATCH /api/tasks/{id}` con `{ "status": "DONE" }`.

**Esperado:** HTTP 422 `INVALID_TRANSITION`.

**Obtenido:** HTTP 200 y la tarea queda en `DONE`.

**Reproducibilidad:** 3 de 3 corridas de `npm test`, en macOS.

**Evidencia:** Respuesta HTTP en la salida del test. `FORBIDDEN_TRANSITIONS` en `transitions.ts` no incluye ese par.

**Test que lo reproduce:** `server/tests/tasks-lifecycle.test.ts` › HALLAZGO #3

**Severidad:** media
