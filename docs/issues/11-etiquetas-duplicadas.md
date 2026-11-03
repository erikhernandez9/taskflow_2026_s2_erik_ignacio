# [Etiquetas] Repetir una etiqueta genera un duplicado en la tarea

**Criterio violado:** US-15 c3: "Una tarea no puede tener la misma etiqueta más de una vez; volver a agregarla devuelve HTTP 200 y no genera un duplicado"

**Entorno:** macOS 27.2 · Chromium (Playwright 1.63.0) · zona horaria del servidor UTC-3 · commit 206cefc

**Datos / precondiciones:** usuario con un proyecto y una tarea.

**Pasos:** 1. Abrir el detalle de la tarea. 2. Agregar una etiqueta. 3. Agregar otra vez la misma etiqueta.

**Esperado:** HTTP 200 y un solo chip.

**Obtenido:** HTTP 201 y dos chips con la misma etiqueta.

**Reproducibilidad:** 3 de 3 corridas (`--repeat-each=3`), en Chromium sobre macOS.

**Evidencia:** `GET /api/tasks/{id}` devuelve `tags: [{id: tag-27, name: BUG}, {id: tag-27, name: BUG}]`. Captura y video en `test-results/` al correr el test (adjuntarlos al issue).

**Test que lo reproduce:** `e2e/specs/task-edit.spec.ts` › US-15 c3

**Severidad:** media
