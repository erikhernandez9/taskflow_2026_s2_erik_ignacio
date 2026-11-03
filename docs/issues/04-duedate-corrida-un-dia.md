# [API tareas] La fecha de vencimiento se guarda un día antes con el servidor en UTC-3

**Criterio violado:** US-16 c3: "La fecha que se devuelve es siempre la misma que se cargó, sin importar la zona horaria del cliente ni la del servidor"

**Entorno:** macOS 27.2 · Chromium (Playwright 1.63.0) · zona horaria del servidor UTC-3 · commit 206cefc

**Datos / precondiciones:** usuario con un proyecto y una tarea.

**Pasos:** 1. Abrir el detalle de la tarea. 2. Cargar `2026-09-15` en Vencimiento y tocar Guardar. 3. Mirar "Vencimiento actual" y la tarjeta del tablero.

**Esperado:** `2026-09-15` en la respuesta, el detalle y la tarjeta.

**Obtenido:** `2026-09-14`. Por API: `POST` con `dueDate: "2026-09-15"` responde `"dueDate":"2026-09-14"`.

**Reproducibilidad:** 3 de 3 en E2E y por API con el servidor en UTC-3. 0 de 1 con `TZ=UTC` en el servidor. La zona del navegador no cambia el resultado: falla igual en America/Montevideo y Asia/Tokyo.

**Evidencia:** Captura y video en `test-results/` al correr el test (adjuntarlos al issue). Causa probable: `parseDueDate` crea la fecha en UTC y `formatDueDate` la lee en hora local.

**Test que lo reproduce:** `e2e/specs/task-due-date.spec.ts` › US-16 (c2, c3 y c7) · `server/tests/tasks-lifecycle.test.ts` › HALLAZGO #4

**Severidad:** media
