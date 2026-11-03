import request from 'supertest';
import { app, auth, createProject, createTask, registerUser } from './helpers';

/**
 * Requerimiento no funcional de rendimiento: "todo endpoint de listado devuelve
 * resultados paginados; ningún endpoint devuelve una colección completa sin límite".
 */
describe('Paginación de los listados', () => {
  it('GET /projects/:id/tasks respeta limit y offset', async () => {
    const { token } = await registerUser('page-limit@test.com');
    const project = await createProject(token, 'Paginado');
    for (const title of ['Primera', 'Segunda', 'Tercera']) {
      await createTask(token, project.id, { title });
    }

    const res = await request(app)
      .get(`/api/projects/${project.id}/tasks?limit=2&offset=1`)
      .set(auth(token));

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.limit).toBe(2);
    expect(res.body.offset).toBe(1);
    expect(res.body.items.map((t: { title: string }) => t.title)).toEqual(['Segunda', 'Tercera']);
  });

  it('GET /projects/:id/tasks aplica un límite por defecto', async () => {
    const { token } = await registerUser('page-default@test.com');
    const project = await createProject(token, 'Sin límite explícito');
    for (let i = 0; i < 21; i += 1) {
      await createTask(token, project.id, { title: `Tarea ${i}` });
    }

    const res = await request(app).get(`/api/projects/${project.id}/tasks`).set(auth(token));

    expect(res.body.total).toBe(21);
    expect(res.body.items).toHaveLength(res.body.limit);
  });
});
