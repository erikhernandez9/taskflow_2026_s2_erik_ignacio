/**
 * Tests de caracterización (Clases 3 y 7).
 *
 * Un test de caracterización NO verifica que el sistema haga lo que dice la
 * especificación: fija lo que hace HOY, tal cual, para detectar cambios de
 * comportamiento no intencionales cuando se refactoriza. Por eso algunos
 * expects pueden codificar comportamientos discutibles; si cambian, hay que
 * decidir de forma explícita si fue un bug corregido o una regresión.
 *
 * Cubre las 5 zonas tocadas por el refactor b5233a5:
 *  (a) tasks.service updateTask   (b) validación de email
 *  (c) tasks.controller listByProject   (d) filtros/búsqueda del repository
 *  (e) autorización en projects.controller
 *
 * Es autocontenido (helpers inline) para poder correrlo contra commits viejos.
 */
import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

async function registerUser(email: string, password = 'Password1') {
  const res = await request(app).post('/api/auth/register').send({ email, password });
  return { token: res.body.token as string, id: res.body.user?.id as string, res };
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function createProject(token: string, name: string) {
  const res = await request(app).post('/api/projects').set(auth(token)).send({ name });
  return res.body;
}

async function createTask(token: string, projectId: string, body: Record<string, unknown>) {
  const res = await request(app).post(`/api/projects/${projectId}/tasks`).set(auth(token)).send(body);
  return res.body;
}

async function addMember(ownerToken: string, projectId: string, email: string) {
  return request(app).post(`/api/projects/${projectId}/members`).set(auth(ownerToken)).send({ email });
}

describe('Caracterización (a) · PATCH de tarea con varios campos a la vez', () => {
  it('actualiza título, prioridad, estado, assignee y dueDate en una sola llamada', async () => {
    const owner = await registerUser('car-a1-owner@test.com');
    const member = await registerUser('car-a1-member@test.com');
    const project = await createProject(owner.token, 'Proyecto car A1');
    await addMember(owner.token, project.id, 'car-a1-member@test.com');
    const task = await createTask(owner.token, project.id, { title: 'Titulo original' });

    const res = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set(auth(owner.token))
      .send({
        title: '  Titulo nuevo  ',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        assigneeId: member.id,
        dueDate: '2030-01-15',
      });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: task.id,
      projectId: project.id,
      title: 'Titulo nuevo',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      assigneeId: member.id,
    });
    // Bug conocido y fuera del alcance del refactor: dueDate puede volver corrido un día
    // según la zona horaria (se pidió 2030-01-15). Se fija solo el formato, no el día.
    expect(res.body.dueDate).toMatch(/^2030-01-1[45]$/);

    const history = await request(app).get(`/api/tasks/${task.id}/history`).set(auth(owner.token));
    expect(history.status).toBe(200);
    expect(history.body.map((h: any) => [h.fromStatus, h.toStatus])).toEqual([
      [null, 'TODO'],
      ['TODO', 'IN_PROGRESS'],
    ]);
    expect(history.body[1].changedBy).toBe(owner.id);
  });

  it('un PATCH sin cambio de estado no escribe historial', async () => {
    const owner = await registerUser('car-a2-owner@test.com');
    const project = await createProject(owner.token, 'Proyecto car A2');
    const task = await createTask(owner.token, project.id, { title: 'Tarea sin estado' });

    const res = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set(auth(owner.token))
      .send({ title: 'Titulo cambiado', priority: 'LOW', status: 'TODO' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ title: 'Titulo cambiado', priority: 'LOW', status: 'TODO' });
    const history = await request(app).get(`/api/tasks/${task.id}/history`).set(auth(owner.token));
    expect(history.body).toHaveLength(1);
  });

  it('un body vacío devuelve la tarea sin cambios', async () => {
    const owner = await registerUser('car-a3-owner@test.com');
    const project = await createProject(owner.token, 'Proyecto car A3');
    const task = await createTask(owner.token, project.id, { title: 'Tarea intacta' });

    const res = await request(app).patch(`/api/tasks/${task.id}`).set(auth(owner.token)).send({});

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ title: 'Tarea intacta', status: 'TODO', priority: 'MEDIUM' });
  });

  it('assigneeId null desasigna la tarea', async () => {
    const owner = await registerUser('car-a4-owner@test.com');
    const project = await createProject(owner.token, 'Proyecto car A4');
    const task = await createTask(owner.token, project.id, { title: 'Tarea asignada', assigneeId: owner.id });

    const res = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set(auth(owner.token))
      .send({ assigneeId: null });

    expect(res.status).toBe(200);
    expect(res.body.assigneeId).toBeNull();
  });

  it('rechaza un assignee que no es miembro del proyecto (400) y no aplica el resto de los campos', async () => {
    const owner = await registerUser('car-a5-owner@test.com');
    const outsider = await registerUser('car-a5-outsider@test.com');
    const project = await createProject(owner.token, 'Proyecto car A5');
    const task = await createTask(owner.token, project.id, { title: 'Titulo A5' });

    const res = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set(auth(owner.token))
      .send({ title: 'No debe aplicarse', assigneeId: outsider.id });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('The assignee must be a member of the project');
    const after = await request(app).get(`/api/tasks/${task.id}`).set(auth(owner.token));
    expect(after.body.title).toBe('Titulo A5');
  });

  it('rechaza valores inválidos de prioridad y título con 400', async () => {
    const owner = await registerUser('car-a6-owner@test.com');
    const project = await createProject(owner.token, 'Proyecto car A6');
    const task = await createTask(owner.token, project.id, { title: 'Titulo A6' });

    const badPriority = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set(auth(owner.token))
      .send({ priority: 'URGENTE' });
    const badTitle = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set(auth(owner.token))
      .send({ title: 'ab' });

    expect(badPriority.status).toBe(400);
    expect(badTitle.status).toBe(400);
  });

  it('un miembro común que no es assignee no puede cambiar el estado (403)', async () => {
    const owner = await registerUser('car-a7-owner@test.com');
    const member = await registerUser('car-a7-member@test.com');
    const project = await createProject(owner.token, 'Proyecto car A7');
    await addMember(owner.token, project.id, 'car-a7-member@test.com');
    const task = await createTask(owner.token, project.id, { title: 'Tarea A7' });

    const res = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set(auth(member.token))
      .send({ status: 'IN_PROGRESS' });

    expect(res.status).toBe(403);
  });

  it('el assignee puede cambiar el estado y una transición DONE -> TODO se rechaza (422)', async () => {
    const owner = await registerUser('car-a8-owner@test.com');
    const member = await registerUser('car-a8-member@test.com');
    const project = await createProject(owner.token, 'Proyecto car A8');
    await addMember(owner.token, project.id, 'car-a8-member@test.com');
    const task = await createTask(owner.token, project.id, { title: 'Tarea A8', assigneeId: member.id });

    const patch = (status: string) =>
      request(app).patch(`/api/tasks/${task.id}`).set(auth(member.token)).send({ status });
    const toProgress = await patch('IN_PROGRESS');
    const toDone = await patch('DONE');
    const back = await patch('TODO');

    expect(toProgress.status).toBe(200);
    expect(toDone.status).toBe(200);
    expect(back.status).toBe(422);
    const after = await request(app).get(`/api/tasks/${task.id}`).set(auth(owner.token));
    expect(after.body.status).toBe('DONE');
  });
});

describe('Caracterización (b) · validación de email en register y en agregar miembro', () => {
  // Solo emails sobre los que ambas validaciones (antes y después del refactor) coinciden.
  const validEmails = ['car-b-valido@test.com', 'Car.B.Mayus@Test.COM'];
  const invalidEmails = ['sin-arroba.com', 'dos@@test.com', 'espacio en@test.com', 'sin-punto@test', ''];

  it.each(validEmails)('register acepta el email válido %s', async (email) => {
    const { res } = await registerUser(email);
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(email.trim().toLowerCase());
  });

  it.each(invalidEmails)('register rechaza el email inválido "%s" con 400', async (email) => {
    const res = await request(app).post('/api/auth/register').send({ email, password: 'Password1' });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(/valid address/i);
  });

  it('register rechaza un email que no es string con 400', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 123, password: 'Password1' });
    expect(res.status).toBe(400);
  });

  it('agregar miembro acepta un email válido de un usuario existente (201)', async () => {
    const owner = await registerUser('car-b-owner1@test.com');
    await registerUser('car-b-miembro1@test.com');
    const project = await createProject(owner.token, 'Proyecto car B1');

    const res = await addMember(owner.token, project.id, '  Car-B-Miembro1@test.com ');

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ projectId: project.id, email: 'car-b-miembro1@test.com', role: 'MEMBER' });
  });

  it.each(['sin-arroba.com', 'dos@@test.com', 'sin-punto@test', ''])(
    'agregar miembro rechaza el email inválido "%s" con 400',
    async (email) => {
      const owner = await registerUser(`car-b-owner2-${invalidEmailSlug(email)}@test.com`);
      const project = await createProject(owner.token, 'Proyecto car B2');

      const res = await addMember(owner.token, project.id, email);

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toMatch(/valid address/i);
    },
  );

  it('agregar miembro con email válido pero inexistente da 404, y repetido da 409', async () => {
    const owner = await registerUser('car-b-owner3@test.com');
    await registerUser('car-b-miembro3@test.com');
    const project = await createProject(owner.token, 'Proyecto car B3');

    const missing = await addMember(owner.token, project.id, 'nadie-car-b@test.com');
    const first = await addMember(owner.token, project.id, 'car-b-miembro3@test.com');
    const again = await addMember(owner.token, project.id, 'car-b-miembro3@test.com');

    expect(missing.status).toBe(404);
    expect(first.status).toBe(201);
    expect(again.status).toBe(409);
  });
});

function invalidEmailSlug(email: string): string {
  return email === '' ? 'vacio' : email.replace(/[^a-z]/gi, '');
}

describe('Caracterización (c) · listado de tareas con assignee y commentCount', () => {
  it('cada tarea trae su assignee y su commentCount correctos', async () => {
    const owner = await registerUser('car-c-owner@test.com');
    const member = await registerUser('car-c-member@test.com');
    const project = await createProject(owner.token, 'Proyecto car C');
    await addMember(owner.token, project.id, 'car-c-member@test.com');

    const t1 = await createTask(owner.token, project.id, { title: 'Tarea uno', assigneeId: owner.id });
    const t2 = await createTask(owner.token, project.id, { title: 'Tarea dos', assigneeId: member.id });
    const t3 = await createTask(owner.token, project.id, { title: 'Tarea tres' });
    const t4 = await createTask(owner.token, project.id, { title: 'Tarea cuatro', assigneeId: member.id });

    const comment = (taskId: string, text: string) =>
      request(app).post(`/api/tasks/${taskId}/comments`).set(auth(owner.token)).send({ body: text });
    await comment(t1.id, 'c1');
    await comment(t1.id, 'c2');
    await comment(t1.id, 'c3');
    await comment(t4.id, 'c4');

    const res = await request(app).get(`/api/projects/${project.id}/tasks`).set(auth(owner.token));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 4, limit: 20, offset: 0 });
    const items = res.body.items;
    expect(items.map((i: any) => i.id)).toEqual([t1.id, t2.id, t3.id, t4.id]);
    expect(items.map((i: any) => i.commentCount)).toEqual([3, 0, 0, 1]);
    expect(items[0].assignee).toEqual({ id: owner.id, email: 'car-c-owner@test.com' });
    expect(items[1].assignee).toEqual({ id: member.id, email: 'car-c-member@test.com' });
    expect(items[2].assignee).toBeNull();
    expect(items[3].assignee).toEqual({ id: member.id, email: 'car-c-member@test.com' });
    expect(items[0].assigneeId).toBe(owner.id);
    expect(items[2].assigneeId).toBeNull();
  });

  it('un proyecto sin tareas devuelve lista vacía', async () => {
    const owner = await registerUser('car-c2-owner@test.com');
    const project = await createProject(owner.token, 'Proyecto car C2');

    const res = await request(app).get(`/api/projects/${project.id}/tasks`).set(auth(owner.token));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ items: [], total: 0 });
  });

  it('el filtro assignedTo devuelve solo las tareas de ese usuario', async () => {
    const owner = await registerUser('car-c3-owner@test.com');
    const project = await createProject(owner.token, 'Proyecto car C3');
    await createTask(owner.token, project.id, { title: 'Mia', assigneeId: owner.id });
    await createTask(owner.token, project.id, { title: 'Sin asignar' });

    const res = await request(app)
      .get(`/api/projects/${project.id}/tasks?assignedTo=${owner.id}`)
      .set(auth(owner.token));

    expect(res.body.items.map((i: any) => i.title)).toEqual(['Mia']);
  });
});

async function seed(prefix: string) {
  const owner = await registerUser(`${prefix}@test.com`);
  const project = await createProject(owner.token, `Proyecto ${prefix}`);
  const mk = (body: Record<string, unknown>) => createTask(owner.token, project.id, body);
  const a = await mk({ title: 'Deploy backend', priority: 'HIGH' });
  const b = await mk({ title: 'Deploy frontend', priority: 'LOW' });
  const c = await mk({ title: 'Escribir docs', priority: 'HIGH' });
  const d = await mk({ title: 'Deploy docs', priority: 'HIGH' });
  for (const t of [a, c]) {
    await request(app).patch(`/api/tasks/${t.id}`).set(auth(owner.token)).send({ status: 'IN_PROGRESS' });
  }
  const list = (qs: string) =>
    request(app).get(`/api/projects/${project.id}/tasks?${qs}`).set(auth(owner.token));
  return { owner, project, a, b, c, d, list };
}
const ids = (res: request.Response) => res.body.items.map((i: any) => i.id);

describe('Caracterización (d) · combinación de filtros y búsqueda de texto', () => {
  it('status solo filtra por estado', async () => {
    const { list, a, c } = await seed('car-d1');
    expect(ids(await list('status=IN_PROGRESS'))).toEqual([a.id, c.id]);
  });

  it('priority sola filtra por prioridad', async () => {
    const { list, a, c, d } = await seed('car-d2');
    expect(ids(await list('priority=HIGH'))).toEqual([a.id, c.id, d.id]);
  });

  it('search solo busca por texto', async () => {
    const { list, a, b, d } = await seed('car-d4');
    expect(ids(await list('search=Deploy'))).toEqual([a.id, b.id, d.id]);
  });

  it('un search sin coincidencias devuelve lista vacía', async () => {
    const { list } = await seed('car-d7');
    const res = await list('search=zzz-no-existe');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ items: [], total: 0 });
  });
});

describe('Caracterización (e) · autorización de proyecto: owner, miembro no-owner, no-miembro', () => {
  async function setup(prefix: string) {
    const owner = await registerUser(`${prefix}-owner@test.com`);
    const member = await registerUser(`${prefix}-member@test.com`);
    const stranger = await registerUser(`${prefix}-stranger@test.com`);
    const project = await createProject(owner.token, `Proyecto ${prefix}`);
    await addMember(owner.token, project.id, `${prefix}-member@test.com`);
    return { owner, member, stranger, project };
  }

  it('GET (listado de proyectos y de tareas): owner y miembro ven el proyecto, el no-miembro no', async () => {
    const { owner, member, stranger, project } = await setup('car-e1');

    for (const u of [owner, member]) {
      const list = await request(app).get('/api/projects').set(auth(u.token));
      expect(list.body.map((p: any) => p.id)).toContain(project.id);
      const tasks = await request(app).get(`/api/projects/${project.id}/tasks`).set(auth(u.token));
      expect(tasks.status).toBe(200);
    }
    const strangerList = await request(app).get('/api/projects').set(auth(stranger.token));
    expect(strangerList.body.map((p: any) => p.id)).not.toContain(project.id);
    const strangerTasks = await request(app).get(`/api/projects/${project.id}/tasks`).set(auth(stranger.token));
    expect(strangerTasks.status).toBe(403);
  });

  it('PATCH: owner 200, miembro 403, no-miembro 404, inexistente 404', async () => {
    const { owner, member, stranger, project } = await setup('car-e2');
    const patch = (token: string, id = project.id) =>
      request(app).patch(`/api/projects/${id}`).set(auth(token)).send({ description: 'Nueva desc' });

    const asOwner = await patch(owner.token);
    const asMember = await patch(member.token);
    const asStranger = await patch(stranger.token);
    const missing = await patch(owner.token, 'proj_999999');

    expect(asOwner.status).toBe(200);
    expect(asOwner.body.description).toBe('Nueva desc');
    expect(asMember.status).toBe(403);
    expect(JSON.stringify(asMember.body)).toContain('Only the project owner can edit it');
    expect(asStranger.status).toBe(404);
    expect(JSON.stringify(asStranger.body)).toContain('Project not found');
    expect(missing.status).toBe(404);
    expect(JSON.stringify(missing.body)).toContain('Project not found');
  });

  it('PATCH con id malformado devuelve 404', async () => {
    const { owner } = await setup('car-e3');
    const res = await request(app).patch('/api/projects/basura').set(auth(owner.token)).send({ name: 'Algo valido' });
    expect(res.status).toBe(404);
  });

  it('DELETE: miembro 403, no-miembro 404, owner 204 y luego 404', async () => {
    const { owner, member, stranger, project } = await setup('car-e4');
    const del = (token: string) => request(app).delete(`/api/projects/${project.id}`).set(auth(token));

    const asMember = await del(member.token);
    const asStranger = await del(stranger.token);
    const asOwner = await del(owner.token);
    const again = await del(owner.token);

    expect(asMember.status).toBe(403);
    expect(JSON.stringify(asMember.body)).toContain('Only the project owner can delete it');
    expect(asStranger.status).toBe(404);
    expect(asOwner.status).toBe(204);
    expect(again.status).toBe(404);
  });

  it('agregar miembro: solo el owner (miembro 403, no-miembro 403, proyecto inexistente 404)', async () => {
    const { member, stranger, project } = await setup('car-e5');
    await registerUser('car-e5-nuevo@test.com');

    const asMember = await addMember(member.token, project.id, 'car-e5-nuevo@test.com');
    const asStranger = await addMember(stranger.token, project.id, 'car-e5-nuevo@test.com');
    const missing = await addMember(member.token, 'proj_999999', 'car-e5-nuevo@test.com');

    expect(asMember.status).toBe(403);
    expect(asStranger.status).toBe(403);
    expect(missing.status).toBe(404);
  });
});

/**
 * CAMBIOS DE COMPORTAMIENTO DETECTADOS POR LA CARACTERIZACIÓN.
 * Estos tests pasan en b5233a5 y en HEAD pero FALLAN en f0d3453: el refactor no
 * fue puramente estructural en estas zonas (ver docs/refactor-smells.md).
 * Los de filtros/SQL son bugs corregidos a propósito; el de email y el de
 * mayúsculas son cambios colaterales no declarados en el mensaje del commit.
 */
describe('Cambios de comportamiento detectados por la caracterización (fallan en f0d3453)', () => {
  it('register acepta emails con "+" y TLD de 1 letra (la regex vieja de auth era más estricta)', async () => {
    const plus = await registerUser('car-x-con+plus@test.com');
    const shortTld = await registerUser('car-x@corto.c');
    expect(plus.res.status).toBe(201);
    expect(shortTld.res.status).toBe(201);
  });

  it('agregar miembro con email inválido responde "Email must be a valid address" (antes: "email ..." en minúscula)', async () => {
    const owner = await registerUser('car-x-owner@test.com');
    const project = await createProject(owner.token, 'Proyecto car X');
    const res = await addMember(owner.token, project.id, 'sin-arroba');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Email must be a valid address');
  });

  it('search no distingue mayúsculas de minúsculas y también mira la descripción', async () => {
    const owner = await registerUser('car-x-search@test.com');
    const project = await createProject(owner.token, 'Proyecto car X2');
    await createTask(owner.token, project.id, { title: 'Deploy Backend' });
    await createTask(owner.token, project.id, { title: 'Otra tarea', description: 'DEPLOY en la descripcion' });
    await createTask(owner.token, project.id, { title: 'Tercera tarea' });

    const res = await request(app)
      .get(`/api/projects/${project.id}/tasks?search=deploy`)
      .set(auth(owner.token));

    expect(res.body.items.map((i: any) => i.title)).toEqual(['Deploy Backend', 'Otra tarea']);
  });

  it('status + priority devuelven la intersección', async () => {
    const { list, a, c } = await seed('car-d3');
    expect(ids(await list('status=IN_PROGRESS&priority=HIGH'))).toEqual([a.id, c.id]);
    expect((await list('status=TODO&priority=LOW')).body.items).toHaveLength(1);
    expect((await list('status=DONE&priority=HIGH')).body.items).toEqual([]);
  });

  it('status + priority + search juntos devuelven la intersección', async () => {
    const { list, a } = await seed('car-d5');
    const res = await list('status=IN_PROGRESS&priority=HIGH&search=Deploy');
    expect(ids(res)).toEqual([a.id]);
    expect(res.body.total).toBe(1);
  });

  it("un search con ' OR '1'='1 se trata como texto literal (antes: SQL injection)", async () => {
    const { list, owner, project } = await seed('car-d6');
    await createTask(owner.token, project.id, { title: "Titulo con ' OR '1'='1 adentro" });

    const injection = await list(`search=${encodeURIComponent("' OR '1'='1")}`);
    const quote = await list(`search=${encodeURIComponent("'")}`);

    expect(injection.status).toBe(200);
    expect(injection.body.items.map((i: any) => i.title)).toEqual(["Titulo con ' OR '1'='1 adentro"]);
    expect(quote.status).toBe(200);
    expect(quote.body.items).toHaveLength(1);
  });

});
