# [API proyectos] POST /projects crea proyectos con nombre vacío o de menos de 3 caracteres

**Criterio violado:** US-03 c1: "El nombre del proyecto es obligatorio y tiene entre 3 y 100 caracteres"

**Entorno:** macOS 27.2 · API Node 24 (Express + SQLite) · zona horaria del servidor UTC-3 · commit 206cefc

**Datos / precondiciones:** usuario autenticado.

**Pasos:** 1. Enviar `POST /api/projects` con `{ "name": "ab" }`. 2. Repetir con `{ "name": "" }`.

**Esperado:** HTTP 400 `VALIDATION_ERROR` en los dos casos.

**Obtenido:** HTTP 201 y el proyecto se crea.

**Reproducibilidad:** 3 de 3 corridas de `npm test`, en macOS.

**Evidencia:** Respuesta HTTP en la salida del test. `create` solo valida el máximo; `update` valida los dos extremos.

**Test que lo reproduce:** `server/tests/projects-name-validation.test.ts` › HALLAZGO #5 y #5 (bis)

**Severidad:** media
