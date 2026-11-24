# Prompt 1 (Ejercicio 2a) — casos de prueba de US-16 con IA

Prompt estructurado con los seis componentes de la clase (rol, contexto,
instrucción, datos de entrada, restricciones y formato de salida). Se pegó tal
cual, en una conversación nueva y sin acceso al repo.

---

**Rol.** Sos un ingeniero de QA que diseña tests de API.

**Contexto.** TaskFlow es una API REST en Express + Prisma (SQLite) con tests en
Jest + Supertest. Los tests viven en `server/tests/` y usan estos helpers
(archivo `server/tests/helpers.ts`, no hace falta reescribirlo):

```ts
import request from 'supertest';
import { createApp } from '../src/app';

export const app = createApp();

export async function registerUser(email: string, password = 'Password1') {
  const res = await request(app).post('/api/auth/register').send({ email, password });
  return { token: res.body.token as string, id: res.body.user.id as string, res };
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function createProject(token: string, name: string) {
  const res = await request(app).post('/api/projects').set(auth(token)).send({ name });
  return res.body;
}

export async function createTask(token: string, projectId: string, body: Record<string, unknown>) {
  const res = await request(app)
    .post(`/api/projects/${projectId}/tasks`)
    .set(auth(token))
    .send(body);
  return res.body;
}
```

Endpoints que existen para tareas (todos con prefijo `/api` y JWT en
`Authorization: Bearer`):

- `POST /projects/:projectId/tasks` crea una tarea (body: `title`, `priority`,
  `assigneeId`, `dueDate`...). Responde 201 con la tarea.
- `GET /projects/:projectId/tasks` lista las tareas del proyecto (`{ items: [...] }`).
- `GET /tasks/:taskId` devuelve una tarea.
- `PATCH /tasks/:taskId` modifica campos de una tarea (incluido `dueDate`).
- Los errores tienen la forma `{ error: { code, message, details } }`.

Cada archivo de test corre contra su propia base vacía: hay que registrar los
usuarios y crear los proyectos dentro del test, con emails distintos en cada uno.

**Instrucción.** Proponé casos de prueba de API para la historia US-16 y escribilos
como tests de Jest.

**Datos de entrada.** La historia, tal como está en la especificación:

> **US-16 │ Fecha de vencimiento de tarea**
> Como miembro del proyecto, quiero asignar una fecha de vencimiento a una tarea
> para poder priorizar el trabajo según urgencia.
>
> Criterios de aceptación:
> 1. La fecha de vencimiento es un día calendario, sin hora.
> 2. Se envía y se devuelve en formato ISO 8601 de fecha, por ejemplo '2026-09-15'.
> 3. La fecha que se devuelve es siempre la misma que se cargó, sin importar la
>    zona horaria del cliente ni la del servidor.
> 4. La fecha de vencimiento es opcional: una tarea puede no tener vencimiento.
> 5. Se puede quitar la fecha de vencimiento enviando el campo en nulo.
> 6. Una fecha con formato inválido devuelve HTTP 400.
> 7. Se admite cargar una fecha pasada; el sistema no la rechaza y la tarea se
>    considera vencida.
> 8. Solo los miembros del proyecto pueden modificar la fecha de vencimiento (HTTP 403).
>
> Convención de la spec: la fecha de vencimiento es un día calendario sin hora, en
> formato '2026-09-15', y no se convierte entre zonas horarias.

**Restricciones.** Usá solo los endpoints y helpers listados arriba. No inventes
criterios ni endpoints. Cada test tiene que chequear el status HTTP y, cuando
corresponda, el valor de `dueDate` en el cuerpo. Los tests no se adaptan a la
implementación: si la API no cumple un criterio, el test tiene que fallar.

**Formato de salida.** Un único archivo `server/tests/us16-due-date-ia.test.ts`,
con un `describe` para US-16 y al menos un `it()` por criterio, cuyo nombre
empiece con el número de criterio (por ejemplo `c6 · ...`). Solo el código, sin
explicaciones.
