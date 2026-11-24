# [API tareas] Una fecha de vencimiento inexistente (30 de febrero) se acepta y se guarda como otro día

**Criterio violado:** US-16 c6: "Una fecha con formato inválido devuelve HTTP 400" (y c3: "La fecha que se devuelve es siempre la misma que se cargó")

**Entorno:** macOS · Node 22.21.1 · Jest 29 + Supertest 7 · `TZ=UTC` · rama `agregar-ci`

**Datos / precondiciones:** usuario con un proyecto y una tarea.

**Pasos:** 1. `POST /api/projects/:id/tasks` con `{ "title": "x", "dueDate": "2026-02-30" }`. 2. Repetir con `"2026-02-29"` (2026 no es bisiesto). 3. Repetir con `PATCH /api/tasks/:id`.

**Esperado:** HTTP 400 `VALIDATION_ERROR`: el 30 de febrero no es un día del calendario, igual que `2026-13-01`, que ya se rechaza con 400.

**Obtenido:** POST responde 201 y PATCH responde 200. La fecha se guarda corrida: `2026-02-30` queda como `2026-03-02` y `2026-02-29` como `2026-03-01`, sin aviso.

**Reproducibilidad:** siempre (4 de 4: POST y PATCH, con las dos fechas), en cualquier zona horaria.

**Evidencia:** lo encontró un test generado con IA en el Ejercicio 2 de la Clase 12 (`docs/ia/ejercicio-2-us16.md`). Causa probable: `parseDueDate` en `server/src/lib/ids.ts` valida solo el patrón `YYYY-MM-DD` y deja que `new Date()` "desborde" el día al mes siguiente.

**Test que lo reproduce:** `server/tests/us16-due-date-ia.test.ts` › `c6 · POST con dueDate inválido (30 de febrero) responde 400` (y sus variantes con PATCH y 29 de febrero)

**Severidad:** baja
