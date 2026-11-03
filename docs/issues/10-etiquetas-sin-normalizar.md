# [Etiquetas] Las etiquetas no se guardan en minúsculas

**Criterio violado:** US-15 c1: "Las etiquetas se guardan normalizadas a minúsculas y sin espacios al inicio ni al final"

**Entorno:** macOS 27.2 · Chromium (Playwright 1.63.0) · zona horaria del servidor UTC-3 · commit 206cefc

**Datos / precondiciones:** usuario con un proyecto y una tarea.

**Pasos:** 1. Abrir el detalle de la tarea. 2. Escribir `  BUG  ` en Etiquetas y tocar Agregar etiqueta.

**Esperado:** Se guarda y se muestra `bug`.

**Obtenido:** Se guarda y se muestra `BUG`: quita los espacios, pero no pasa a minúsculas.

**Reproducibilidad:** 3 de 3 corridas (`--repeat-each=3`), en Chromium sobre macOS.

**Evidencia:** `{"id":"tag-27","name":"BUG"}`, con HTTP 201. Captura y video en `test-results/` al correr el test (adjuntarlos al issue).

**Test que lo reproduce:** `e2e/specs/task-edit.spec.ts` › US-15 c1

**Severidad:** baja
