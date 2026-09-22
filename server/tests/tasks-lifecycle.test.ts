import request from 'supertest';
import { app, auth, createProject, createTask, registerUser } from './helpers';

/**
 * Taller Clase 5 — Testing de APIs REST
 * Módulo: Tareas — ciclo de vida
 * Endpoints bajo prueba:
 *   POST   /api/projects/:projectId/tasks   (crear tarea)
 *   PATCH  /api/tasks/:taskId               (editar tarea / cambiar estado)
 *   DELETE /api/tasks/:taskId               (eliminar tarea)
 *
 * Técnicas aplicadas: partición de equivalencia, valores límite,
 * tabla de decisión (transiciones de estado) y distinción 401 vs 403.
 *
 * Los tests marcados "HALLAZGO" describen el comportamiento correcto
 * según la especificación/documentación del código y FALLAN contra la
 * implementación actual — son la evidencia automatizada de cada bug.
 * Ver BUG_REPORT.md para el detalle de cada hallazgo.
 */

async function setupProjectWithTwoMembers(suffix: string) {
  const owner = await registerUser(`owner-lifecycle-${suffix}@test.com`);
  const outsider = await registerUser(`outsider-lifecycle-${suffix}@test.com`);
  const project = await createProject(owner.token, `Proyecto ciclo de vida ${suffix}`);
  return { owner, outsider, project };
}

describe('POST /api/projects/:projectId/tasks — crear tarea', () => {
  describe('partición de equivalencia y valores límite — título (3 a 200 caracteres)', () => {
    it('rechaza título de 2 caracteres (bajo el límite)', async () => {
      const { token } = await registerUser('title-2@test.com');
      const project = await createProject(token, 'Proyecto título corto');

      const res = await request(app)
        .post(`/api/projects/${project.id}/tasks`)
        .set(auth(token))
        .send({ title: 'ab' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('acepta título de 3 caracteres (límite inferior válido)', async () => {
      const { token } = await registerUser('title-3@test.com');
      const project = await createProject(token, 'Proyecto título límite');

      const res = await request(app)
        .post(`/api/projects/${project.id}/tasks`)
        .set(auth(token))
        .send({ title: 'abc' });

      expect(res.status).toBe(201);
    });

    it('acepta título de 200 caracteres (límite superior válido)', async () => {
      const { token } = await registerUser('title-200@test.com');
      const project = await createProject(token, 'Proyecto título largo');

      const res = await request(app)
        .post(`/api/projects/${project.id}/tasks`)
        .set(auth(token))
        .send({ title: 'a'.repeat(200) });

      expect(res.status).toBe(201);
    });

    it('rechaza título de 201 caracteres (sobre el límite)', async () => {
      const { token } = await registerUser('title-201@test.com');
      const project = await createProject(token, 'Proyecto título excedido');

      const res = await request(app)
        .post(`/api/projects/${project.id}/tasks`)
        .set(auth(token))
        .send({ title: 'a'.repeat(201) });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rechaza la creación sin el campo title (obligatorio)', async () => {
      const { token } = await registerUser('title-missing@test.com');
      const project = await createProject(token, 'Proyecto sin título');

      const res = await request(app)
        .post(`/api/projects/${project.id}/tasks`)
        .set(auth(token))
        .send({ description: 'Sin título' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toMatch(/title/i);
    });
  });

  describe('partición de equivalencia — priority', () => {
    it.each(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])('acepta priority = %s (clase válida)', async (priority) => {
      const { token } = await registerUser(`prio-${priority}@test.com`);
      const project = await createProject(token, `Proyecto prioridad ${priority}`);

      const res = await request(app)
        .post(`/api/projects/${project.id}/tasks`)
        .set(auth(token))
        .send({ title: 'Tarea con prioridad', priority });

      expect(res.status).toBe(201);
      expect(res.body.priority).toBe(priority);
    });

    it('usa MEDIUM por defecto cuando no se envía priority', async () => {
      const { token } = await registerUser('prio-default@test.com');
      const project = await createProject(token, 'Proyecto prioridad default');

      const res = await request(app)
        .post(`/api/projects/${project.id}/tasks`)
        .set(auth(token))
        .send({ title: 'Tarea sin prioridad' });

      expect(res.status).toBe(201);
      expect(res.body.priority).toBe('MEDIUM');
    });

    it('rechaza priority fuera del enum (clase inválida)', async () => {
      const { token } = await registerUser('prio-invalid@test.com');
      const project = await createProject(token, 'Proyecto prioridad inválida');

      const res = await request(app)
        .post(`/api/projects/${project.id}/tasks`)
        .set(auth(token))
        .send({ title: 'Tarea con prioridad rota', priority: 'URGENT' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('assigneeId', () => {
    it('rechaza asignar la tarea a alguien que no es miembro del proyecto', async () => {
      const { token } = await registerUser('assignee-owner@test.com');
      const stranger = await registerUser('assignee-stranger@test.com');
      const project = await createProject(token, 'Proyecto asignación inválida');

      const res = await request(app)
        .post(`/api/projects/${project.id}/tasks`)
        .set(auth(token))
        .send({ title: 'Tarea mal asignada', assigneeId: stranger.id });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rechaza un assigneeId con formato inválido', async () => {
      const { token } = await registerUser('assignee-malformed@test.com');
      const project = await createProject(token, 'Proyecto assigneeId roto');

      const res = await request(app)
        .post(`/api/projects/${project.id}/tasks`)
        .set(auth(token))
        .send({ title: 'Tarea con id roto', assigneeId: 'no-es-un-id' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('dueDate', () => {
    it(
      'HALLAZGO #4 — round-trip de dueDate: la fecha enviada debería devolverse igual ' +
        '("día calendario, sin hora" según el comentario de lib/ids.ts), pero parseDueDate ' +
        'interpreta el string como medianoche UTC y formatDueDate lo formatea con los ' +
        'componentes de fecha LOCALES — en un servidor con timezone detrás de UTC ' +
        '(ej. UTC-3) la fecha vuelve corrida un día hacia atrás',
      async () => {
        const { token } = await registerUser('duedate-valid@test.com');
        const project = await createProject(token, 'Proyecto fecha válida');

        const res = await request(app)
          .post(`/api/projects/${project.id}/tasks`)
          .set(auth(token))
          .send({ title: 'Tarea con fecha', dueDate: '2026-01-15' });

        expect(res.status).toBe(201);
        // Comportamiento esperado según la especificación (día calendario estable):
        expect(res.body.dueDate).toBe('2026-01-15');
      },
    );

    it('rechaza una fecha con formato inválido', async () => {
      const { token } = await registerUser('duedate-invalid@test.com');
      const project = await createProject(token, 'Proyecto fecha inválida');

      const res = await request(app)
        .post(`/api/projects/${project.id}/tasks`)
        .set(auth(token))
        .send({ title: 'Tarea con fecha rota', dueDate: '15-01-2026' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('autenticación vs. autorización', () => {
    it('401 — rechaza crear tarea sin token', async () => {
      const { token } = await registerUser('create-noauth-owner@test.com');
      const project = await createProject(token, 'Proyecto sin token');

      const res = await request(app)
        .post(`/api/projects/${project.id}/tasks`)
        .send({ title: 'Tarea sin token' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('401 — rechaza crear tarea con token inválido', async () => {
      const { token } = await registerUser('create-badtoken-owner@test.com');
      const project = await createProject(token, 'Proyecto token roto');

      const res = await request(app)
        .post(`/api/projects/${project.id}/tasks`)
        .set(auth('esto-no-es-un-jwt'))
        .send({ title: 'Tarea con token roto' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('403 — rechaza crear tarea en un proyecto donde no soy miembro', async () => {
      const { token } = await registerUser('create-403-owner@test.com');
      const outsider = await registerUser('create-403-outsider@test.com');
      const project = await createProject(token, 'Proyecto ajeno');

      const res = await request(app)
        .post(`/api/projects/${project.id}/tasks`)
        .set(auth(outsider.token))
        .send({ title: 'Tarea de un intruso' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('404 — proyecto inexistente no filtra si el usuario es miembro o no', async () => {
      const { token } = await registerUser('create-404@test.com');

      const res = await request(app)
        .post('/api/projects/proj-999999/tasks')
        .set(auth(token))
        .send({ title: 'Tarea en proyecto fantasma' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});

describe('PATCH /api/tasks/:taskId — editar tarea y cambiar estado', () => {
  describe('tabla de decisión — transiciones de estado válidas/inválidas', () => {
    // Según el comentario de transitions.ts, las únicas transiciones válidas son:
    // TODO -> IN_PROGRESS, IN_PROGRESS -> DONE, IN_PROGRESS -> TODO.
    // DONE -> TODO y DONE -> IN_PROGRESS están explícitamente bloqueadas.
    const cases: Array<{ from: 'TODO' | 'IN_PROGRESS'; to: string; expectValid: boolean }> = [
      { from: 'TODO', to: 'IN_PROGRESS', expectValid: true },
      { from: 'IN_PROGRESS', to: 'DONE', expectValid: true },
      { from: 'IN_PROGRESS', to: 'TODO', expectValid: true },
    ];

    it.each(cases)('$from -> $to es una transición válida (200)', async ({ from, to }) => {
      const { token, id } = await registerUser(`transition-ok-${from}-${to}@test.com`);
      const project = await createProject(token, `Proyecto transición ${from}-${to}`);
      const task = await createTask(token, project.id, { title: 'Tarea con transición', assigneeId: id });

      if (from === 'IN_PROGRESS') {
        await request(app).patch(`/api/tasks/${task.id}`).set(auth(token)).send({ status: 'IN_PROGRESS' });
      }

      const res = await request(app)
        .patch(`/api/tasks/${task.id}`)
        .set(auth(token))
        .send({ status: to });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(to);
    });

    it('DONE -> TODO es una transición inválida (422 INVALID_TRANSITION)', async () => {
      const { token, id } = await registerUser('transition-done-todo@test.com');
      const project = await createProject(token, 'Proyecto DONE a TODO');
      const task = await createTask(token, project.id, { title: 'Tarea terminada', assigneeId: id });
      await request(app).patch(`/api/tasks/${task.id}`).set(auth(token)).send({ status: 'IN_PROGRESS' });
      await request(app).patch(`/api/tasks/${task.id}`).set(auth(token)).send({ status: 'DONE' });

      const res = await request(app)
        .patch(`/api/tasks/${task.id}`)
        .set(auth(token))
        .send({ status: 'TODO' });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('INVALID_TRANSITION');
    });

    it('DONE -> IN_PROGRESS es una transición inválida (422 INVALID_TRANSITION)', async () => {
      const { token, id } = await registerUser('transition-done-inprogress@test.com');
      const project = await createProject(token, 'Proyecto DONE a IN_PROGRESS');
      const task = await createTask(token, project.id, { title: 'Tarea terminada 2', assigneeId: id });
      await request(app).patch(`/api/tasks/${task.id}`).set(auth(token)).send({ status: 'IN_PROGRESS' });
      await request(app).patch(`/api/tasks/${task.id}`).set(auth(token)).send({ status: 'DONE' });

      const res = await request(app)
        .patch(`/api/tasks/${task.id}`)
        .set(auth(token))
        .send({ status: 'IN_PROGRESS' });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('INVALID_TRANSITION');
    });

    it('un mismo estado a sí mismo (TODO -> TODO) no cambia nada y responde 200', async () => {
      const { token, id } = await registerUser('transition-noop@test.com');
      const project = await createProject(token, 'Proyecto transición noop');
      const task = await createTask(token, project.id, { title: 'Tarea sin cambios', assigneeId: id });

      const res = await request(app)
        .patch(`/api/tasks/${task.id}`)
        .set(auth(token))
        .send({ status: 'TODO' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('TODO');
    });

    it(
      'HALLAZGO #3 — TODO -> DONE debería ser inválida según la especificación documentada ' +
        '(transitions.ts solo declara válidas TODO->IN_PROGRESS, IN_PROGRESS->DONE, IN_PROGRESS->TODO), ' +
        'pero la implementación no la bloquea y responde 200 en vez de 422',
      async () => {
        const { token, id } = await registerUser('transition-todo-done@test.com');
        const project = await createProject(token, 'Proyecto TODO a DONE');
        const task = await createTask(token, project.id, { title: 'Tarea salteada', assigneeId: id });

        const res = await request(app)
          .patch(`/api/tasks/${task.id}`)
          .set(auth(token))
          .send({ status: 'DONE' });

        // Comportamiento esperado según la especificación:
        expect(res.status).toBe(422);
        expect(res.body.error.code).toBe('INVALID_TRANSITION');
      },
    );
  });

  describe('partición de equivalencia — status inexistente vs. transición inválida', () => {
    it('rechaza un status que no pertenece al enum con 400 VALIDATION_ERROR (no 422)', async () => {
      const { token, id } = await registerUser('status-unknown@test.com');
      const project = await createProject(token, 'Proyecto status inexistente');
      const task = await createTask(token, project.id, { title: 'Tarea con status inventado', assigneeId: id });

      const res = await request(app)
        .patch(`/api/tasks/${task.id}`)
        .set(auth(token))
        .send({ status: 'EN_REVISION' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('autenticación vs. autorización', () => {
    it('401 — rechaza editar sin token', async () => {
      const { token, id } = await registerUser('edit-noauth@test.com');
      const project = await createProject(token, 'Proyecto edición sin token');
      const task = await createTask(token, project.id, { title: 'Tarea protegida', assigneeId: id });

      const res = await request(app).patch(`/api/tasks/${task.id}`).send({ title: 'Nuevo título' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it(
      'HALLAZGO #1 — 403 esperado: un usuario autenticado que no es miembro del proyecto ' +
        'no debería poder editar la tarea (la ruta PATCH /tasks/:taskId no aplica ' +
        'requireTaskProjectMember, a diferencia de GET /tasks/:taskId)',
      async () => {
        const { owner, outsider, project } = await setupProjectWithTwoMembers('patch');
        const task = await createTask(owner.token, project.id, { title: 'Tarea del owner' });

        const res = await request(app)
          .patch(`/api/tasks/${task.id}`)
          .set(auth(outsider.token))
          .send({ title: 'Editada por un intruso' });

        // Comportamiento esperado según la especificación:
        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('FORBIDDEN');
      },
    );

    it('403 — un miembro del proyecto que no es el assignee ni admin no puede cambiar el estado', async () => {
      const owner = await registerUser('status-owner@test.com');
      const member = await registerUser('status-member@test.com');
      const project = await createProject(owner.token, 'Proyecto cambio de estado ajeno');
      await request(app)
        .post(`/api/projects/${project.id}/members`)
        .set(auth(owner.token))
        .send({ email: 'status-member@test.com' });
      const task = await createTask(owner.token, project.id, { title: 'Tarea de otro asignado', assigneeId: owner.id });

      const res = await request(app)
        .patch(`/api/tasks/${task.id}`)
        .set(auth(member.token))
        .send({ status: 'IN_PROGRESS' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('200 — el assignee sí puede cambiar el estado aunque no sea owner/admin', async () => {
      const owner = await registerUser('status-owner-2@test.com');
      const member = await registerUser('status-assignee-2@test.com');
      const project = await createProject(owner.token, 'Proyecto cambio de estado propio');
      await request(app)
        .post(`/api/projects/${project.id}/members`)
        .set(auth(owner.token))
        .send({ email: 'status-assignee-2@test.com' });
      const task = await createTask(owner.token, project.id, {
        title: 'Tarea asignada al miembro',
        assigneeId: member.id,
      });

      const res = await request(app)
        .patch(`/api/tasks/${task.id}`)
        .set(auth(member.token))
        .send({ status: 'IN_PROGRESS' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('IN_PROGRESS');
    });
  });

  describe('404 — tarea inexistente', () => {
    it('rechaza editar una tarea que no existe', async () => {
      const { token } = await registerUser('edit-404@test.com');

      const res = await request(app)
        .patch('/api/tasks/task-999999')
        .set(auth(token))
        .send({ title: 'No existe' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});

describe('DELETE /api/tasks/:taskId — eliminar tarea', () => {
  it('204 — el owner puede eliminar una tarea de su proyecto', async () => {
    const { token, id } = await registerUser('delete-owner@test.com');
    const project = await createProject(token, 'Proyecto para borrar');
    const task = await createTask(token, project.id, { title: 'Tarea a borrar', assigneeId: id });

    const res = await request(app).delete(`/api/tasks/${task.id}`).set(auth(token));

    expect(res.status).toBe(204);
  });

  it('401 — rechaza eliminar sin token', async () => {
    const { token, id } = await registerUser('delete-noauth@test.com');
    const project = await createProject(token, 'Proyecto borrado sin token');
    const task = await createTask(token, project.id, { title: 'Tarea protegida', assigneeId: id });

    const res = await request(app).delete(`/api/tasks/${task.id}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it(
    'HALLAZGO #1 (bis) — 403 esperado: un usuario autenticado que no es miembro del proyecto ' +
      'no debería poder eliminar la tarea (misma causa raíz que en PATCH: falta ' +
      'requireTaskProjectMember en la ruta DELETE /tasks/:taskId)',
    async () => {
      const { owner, outsider, project } = await setupProjectWithTwoMembers('delete');
      const task = await createTask(owner.token, project.id, { title: 'Tarea del owner' });

      const res = await request(app).delete(`/api/tasks/${task.id}`).set(auth(outsider.token));

      // Comportamiento esperado según la especificación:
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    },
  );

  it('404 — eliminar una tarea inexistente responde 404, no 200 vacío', async () => {
    const { token } = await registerUser('delete-404@test.com');

    const res = await request(app).delete('/api/tasks/task-999999').set(auth(token));

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
