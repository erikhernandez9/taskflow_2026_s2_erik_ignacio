# [API proyectos] Eliminar un proyecto deja comentarios e historial huérfanos

**Criterio violado:** US-10 c5: "Después de la eliminación no queda en el sistema ningún registro asociado al proyecto ni a sus tareas"

**Entorno:** macOS 27.2 · API Node 24 (Express + SQLite) · zona horaria del servidor UTC-3 · commit 206cefc

**Datos / precondiciones:** proyecto con una tarea y un comentario.

**Pasos:** 1. Enviar `DELETE /api/projects/{id}`. 2. Contar en la base los comentarios y el historial de esa tarea.

**Esperado:** 0 comentarios y 0 entradas de historial.

**Obtenido:** El comentario sigue en la base (`count` = 1).

**Reproducibilidad:** 3 de 3 corridas de `npm test`, en macOS.

**Evidencia:** Salida del test: `Expected: 0, Received: 1`. En `schema.prisma`, `Comment` y `TaskHistory` no tienen relación con `Task`, así que no hay borrado en cascada.

**Test que lo reproduce:** `server/tests/projects-edit-delete.test.ts` › c4/c5

**Severidad:** media
