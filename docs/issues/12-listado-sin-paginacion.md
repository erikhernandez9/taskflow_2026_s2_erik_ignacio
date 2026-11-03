# [API tareas] El listado de tareas ignora limit y offset y devuelve las 5.000 tareas

**Criterio violado:** Requerimientos no funcionales, Rendimiento 1: "Todo endpoint de listado devuelve resultados paginados; ningún endpoint devuelve una colección completa sin límite"

**Entorno:** macOS 27.2 · API Node 24 (Express + SQLite) · zona horaria del servidor UTC-3 · commit 206cefc

**Datos / precondiciones:** `npm run db:reset` y `npm --prefix server run db:seed:large` (proyecto `Carga 001` con 5.000 tareas).

**Pasos:** 1. Enviar `GET /api/projects/{id}/tasks?limit=20`. 2. Comparar el tamaño de la respuesta con el de la misma request sin `limit`.

**Esperado:** 20 tareas como máximo, y 20 por defecto si no se envía `limit`.

**Obtenido:** Las 5.000 tareas en los dos casos: 1.744.856 bytes por respuesta.

**Reproducibilidad:** 3 de 3 corridas de `npm test`, en macOS.

**Evidencia:** Tabla y salida de k6 en `performance/REPORTE.md`. El p95 del listado cumple el SLO (415,3 ms, límite 500 ms), pero pasa de 5,21 ms con la seed chica. Hipótesis: `findTasks` no aplica `skip` ni `take`, y `GET /projects` tampoco pagina.

**Test que lo reproduce:** `server/tests/listing-pagination.test.ts`

**Severidad:** media
