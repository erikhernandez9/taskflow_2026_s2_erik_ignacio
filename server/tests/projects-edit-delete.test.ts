import request from 'supertest';
import { db } from '../src/lib/db';
import { parsePublicId } from '../src/lib/ids';
import { app, auth, createProject, createTask, registerUser } from './helpers';

/**
 * US-09 y US-10: el cliente no tiene pantalla para editar ni eliminar proyectos,
 * así que estos criterios se verifican en la capa de integración.
 */
async function addMember(ownerToken: string, projectId: string, email: string) {
  await request(app).post(`/api/projects/${projectId}/members`).set(auth(ownerToken)).send({ email });
}

describe('PATCH /api/projects/:projectId — US-09 editar proyecto', () => {
  it('c6 · el owner edita nombre y descripción y recibe el proyecto completo', async () => {
    const { token, id } = await registerUser('edit-owner@test.com');
    const project = await createProject(token, 'Proyecto Viejo');

    const res = await request(app)
      .patch(`/api/projects/${project.id}`)
      .set(auth(token))
      .send({ name: 'Proyecto Nuevo', description: 'Otra descripción' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: project.id,
      name: 'Proyecto Nuevo',
      description: 'Otra descripción',
      ownerId: id,
      archived: false,
    });
  });

  it('c5 · enviar un solo campo conserva el valor del otro', async () => {
    const { token } = await registerUser('edit-partial@test.com');
    const created = await request(app)
      .post('/api/projects')
      .set(auth(token))
      .send({ name: 'Con descripción', description: 'Se conserva' });

    const res = await request(app)
      .patch(`/api/projects/${created.body.id}`)
      .set(auth(token))
      .send({ name: 'Nombre cambiado' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Nombre cambiado');
    expect(res.body.description).toBe('Se conserva');
  });

  it('c1 · un miembro no owner recibe 403 y el proyecto no cambia', async () => {
    const owner = await registerUser('edit-owner2@test.com');
    const member = await registerUser('edit-member@test.com');
    const project = await createProject(owner.token, 'Solo del owner');
    await addMember(owner.token, project.id, 'edit-member@test.com');

    const res = await request(app)
      .patch(`/api/projects/${project.id}`)
      .set(auth(member.token))
      .send({ name: 'Intento ajeno' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    const stored = await db.project.findUnique({
      where: { id: parsePublicId(project.id, 'proj') as number },
    });
    expect(stored?.name).toBe('Solo del owner');
  });

  it.each([
    ['2 caracteres (último inválido)', 'ab', 400],
    ['3 caracteres (primer válido)', 'abc', 200],
    ['100 caracteres (último válido)', 'a'.repeat(100), 200],
    ['101 caracteres (primer inválido)', 'a'.repeat(101), 400],
  ])('c2 · nombre con %s', async (_caso, name, status) => {
    const { token } = await registerUser(`edit-limit-${String(name).length}@test.com`);
    const project = await createProject(token, 'Límites');

    const res = await request(app)
      .patch(`/api/projects/${project.id}`)
      .set(auth(token))
      .send({ name });

    expect(res.status).toBe(status);
    if (status === 400) expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it.each([
    ['500 caracteres', 500, 200],
    ['501 caracteres', 501, 400],
  ])('c3 · descripción con %s', async (_caso, length, status) => {
    const { token } = await registerUser(`edit-desc-${length}@test.com`);
    const project = await createProject(token, 'Descripción al límite');

    const res = await request(app)
      .patch(`/api/projects/${project.id}`)
      .set(auth(token))
      .send({ description: 'd'.repeat(length) });

    expect(res.status).toBe(status);
  });

  it('c4 · renombrar a un nombre propio ya usado devuelve 409', async () => {
    const { token } = await registerUser('edit-dup@test.com');
    await createProject(token, 'Alfa');
    const beta = await createProject(token, 'Beta');

    const res = await request(app)
      .patch(`/api/projects/${beta.id}`)
      .set(auth(token))
      .send({ name: 'Alfa' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('c7 · un proyecto inexistente o ajeno devuelve 404', async () => {
    const owner = await registerUser('edit-ajeno-owner@test.com');
    const outsider = await registerUser('edit-ajeno@test.com');
    const project = await createProject(owner.token, 'Ajeno');

    const missing = await request(app)
      .patch('/api/projects/proj-999999')
      .set(auth(owner.token))
      .send({ name: 'No existe' });
    const foreign = await request(app)
      .patch(`/api/projects/${project.id}`)
      .set(auth(outsider.token))
      .send({ name: 'No es mío' });

    expect(missing.status).toBe(404);
    expect(foreign.status).toBe(404);
  });
});

describe('DELETE /api/projects/:projectId — US-10 eliminar proyecto', () => {
  it('c6 · el owner elimina el proyecto: 204 sin cuerpo y ya no aparece', async () => {
    const { token } = await registerUser('del-owner@test.com');
    const project = await createProject(token, 'A eliminar');

    const res = await request(app).delete(`/api/projects/${project.id}`).set(auth(token));

    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    const list = await request(app).get('/api/projects').set(auth(token));
    expect(list.body.map((p: { id: string }) => p.id)).not.toContain(project.id);
  });

  it('c1 · un miembro no owner recibe 403 y el proyecto sigue existiendo', async () => {
    const owner = await registerUser('del-owner2@test.com');
    const member = await registerUser('del-member@test.com');
    const project = await createProject(owner.token, 'Protegido');
    await addMember(owner.token, project.id, 'del-member@test.com');

    const res = await request(app).delete(`/api/projects/${project.id}`).set(auth(member.token));

    expect(res.status).toBe(403);
    const stored = await db.project.findUnique({
      where: { id: parsePublicId(project.id, 'proj') as number },
    });
    expect(stored).not.toBeNull();
  });

  it('c7 · eliminar un proyecto inexistente devuelve 404', async () => {
    const { token } = await registerUser('del-missing@test.com');

    const res = await request(app).delete('/api/projects/proj-999999').set(auth(token));

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('c3 · eliminar el proyecto elimina sus tareas', async () => {
    const { token } = await registerUser('del-tasks@test.com');
    const project = await createProject(token, 'Con tareas');
    const task = await createTask(token, project.id, { title: 'Tarea en cascada' });

    await request(app).delete(`/api/projects/${project.id}`).set(auth(token));

    const stored = await db.task.findUnique({
      where: { id: parsePublicId(task.id, 'task') as number },
    });
    expect(stored).toBeNull();
  });

  it('c4/c5 · no quedan comentarios ni historial de las tareas del proyecto', async () => {
    const { token } = await registerUser('del-orphans@test.com');
    const project = await createProject(token, 'Sin huérfanos');
    const task = await createTask(token, project.id, { title: 'Tarea con datos' });
    const taskId = parsePublicId(task.id, 'task') as number;
    await request(app)
      .post(`/api/tasks/${task.id}/comments`)
      .set(auth(token))
      .send({ body: 'Comentario que no debe sobrevivir' });

    await request(app).delete(`/api/projects/${project.id}`).set(auth(token));

    expect(await db.comment.count({ where: { taskId } })).toBe(0);
    expect(await db.taskHistory.count({ where: { taskId } })).toBe(0);
  });
});
