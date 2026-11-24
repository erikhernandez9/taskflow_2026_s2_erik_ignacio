// Tests de US-16 generados con IA (Clase 12, Ejercicio 2). Ver docs/ia/ejercicio-2-us16.md:
// prompt 1 (2a) y prompt 2 encadenado (2b). Se quitaron los 6 tests de c3 que cambiaban
// process.env.TZ dentro de Jest (no prueban nada); los rojos son bugs reales.
import request from 'supertest';
import { app, registerUser, auth, createProject, createTask } from './helpers';

/**
 * US-16 · Fecha de vencimiento de tarea
 * Convención: dueDate es un día calendario sin hora, formato 'YYYY-MM-DD',
 * y nunca se convierte entre zonas horarias.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

let seq = 0;
function uniqueEmail(tag: string) {
  seq += 1;
  return `us16-${tag}-${seq}-${Date.now()}@example.com`;
}

/** Registra un dueño, crea un proyecto y devuelve lo necesario para los tests. */
async function setup(tag: string) {
  const owner = await registerUser(uniqueEmail(`${tag}-owner`));
  const project = await createProject(owner.token, `US16 ${tag}`);
  return { owner, projectId: project.id as string };
}

function patchTask(token: string, taskId: string, body: Record<string, unknown>) {
  return request(app).patch(`/api/tasks/${taskId}`).set(auth(token)).send(body);
}

function getTask(token: string, taskId: string) {
  return request(app).get(`/api/tasks/${taskId}`).set(auth(token));
}

function createTaskRaw(token: string, projectId: string, body: Record<string, unknown>) {
  return request(app)
    .post(`/api/projects/${projectId}/tasks`)
    .set(auth(token))
    .send(body);
}

describe('US-16 · Fecha de vencimiento de tarea', () => {
  // ───────────────────────── Criterio 1 ─────────────────────────
  describe('c1 · día calendario, sin hora', () => {
    it('c1 · al crear con dueDate "2026-09-15" responde 201 y devuelve solo la fecha, sin componente horario', async () => {
      const { owner, projectId } = await setup('c1-create');

      const res = await createTaskRaw(owner.token, projectId, {
        title: 'Tarea c1',
        dueDate: '2026-09-15',
      });

      expect(res.status).toBe(201);
      expect(res.body.dueDate).toMatch(DATE_ONLY);
      expect(res.body.dueDate).not.toMatch(/T|:|Z/);
      expect(res.body.dueDate).toBe('2026-09-15');
    });

    it('c1 · el GET de la tarea devuelve la fecha sin hora', async () => {
      const { owner, projectId } = await setup('c1-get');
      const task = await createTask(owner.token, projectId, {
        title: 'Tarea c1 get',
        dueDate: '2026-09-15',
      });

      const res = await getTask(owner.token, task.id);

      expect(res.status).toBe(200);
      expect(res.body.dueDate).toMatch(DATE_ONLY);
      expect(res.body.dueDate).toBe('2026-09-15');
    });
  });

  // ───────────────────────── Criterio 2 ─────────────────────────
  describe('c2 · formato ISO 8601 de fecha', () => {
    it('c2 · POST devuelve dueDate en formato YYYY-MM-DD igual al enviado', async () => {
      const { owner, projectId } = await setup('c2-post');

      const res = await createTaskRaw(owner.token, projectId, {
        title: 'Tarea c2 post',
        dueDate: '2026-09-15',
      });

      expect(res.status).toBe(201);
      expect(res.body.dueDate).toBe('2026-09-15');
    });

    it('c2 · PATCH acepta "2026-10-01" y devuelve 200 con dueDate "2026-10-01"', async () => {
      const { owner, projectId } = await setup('c2-patch');
      const task = await createTask(owner.token, projectId, { title: 'Tarea c2 patch' });

      const res = await patchTask(owner.token, task.id, { dueDate: '2026-10-01' });

      expect(res.status).toBe(200);
      expect(res.body.dueDate).toBe('2026-10-01');
    });

    it('c2 · el listado del proyecto devuelve dueDate en formato YYYY-MM-DD', async () => {
      const { owner, projectId } = await setup('c2-list');
      const task = await createTask(owner.token, projectId, {
        title: 'Tarea c2 list',
        dueDate: '2026-09-15',
      });

      const res = await request(app)
        .get(`/api/projects/${projectId}/tasks`)
        .set(auth(owner.token));

      expect(res.status).toBe(200);
      const found = res.body.items.find((t: { id: string }) => t.id === task.id);
      expect(found).toBeDefined();
      expect(found.dueDate).toBe('2026-09-15');
    });
  });

  // ───────────────────────── Criterio 3 ─────────────────────────
  describe('c3 · la fecha devuelta es siempre la cargada, sin importar zona horaria', () => {
    const edgeDates = [
      '2026-09-15',
      '2026-01-01', // inicio de año
      '2026-12-31', // fin de año
      '2028-02-29', // año bisiesto
      '2026-03-01', // día posterior a fin de febrero
    ];

    it.each(edgeDates)('c3 · create + GET de %s devuelven exactamente la misma fecha', async (date) => {
      const { owner, projectId } = await setup(`c3-roundtrip-${date}`);

      const created = await createTaskRaw(owner.token, projectId, {
        title: `Tarea c3 ${date}`,
        dueDate: date,
      });
      expect(created.status).toBe(201);
      expect(created.body.dueDate).toBe(date);

      const fetched = await getTask(owner.token, created.body.id);
      expect(fetched.status).toBe(200);
      expect(fetched.body.dueDate).toBe(date);
    });

    it.each(edgeDates)('c3 · PATCH con %s devuelve y persiste exactamente la misma fecha', async (date) => {
      const { owner, projectId } = await setup(`c3-patch-${date}`);
      const task = await createTask(owner.token, projectId, { title: 'Tarea c3 patch' });

      const patched = await patchTask(owner.token, task.id, { dueDate: date });
      expect(patched.status).toBe(200);
      expect(patched.body.dueDate).toBe(date);

      const fetched = await getTask(owner.token, task.id);
      expect(fetched.body.dueDate).toBe(date);
    });
  });

  // ───────────────────────── Criterio 4 ─────────────────────────
  describe('c4 · la fecha de vencimiento es opcional', () => {
    it('c4 · crear una tarea sin dueDate responde 201 y la tarea no tiene vencimiento', async () => {
      const { owner, projectId } = await setup('c4-create');

      const res = await createTaskRaw(owner.token, projectId, { title: 'Sin vencimiento' });

      expect(res.status).toBe(201);
      expect(res.body.dueDate ?? null).toBeNull();
    });

    it('c4 · el GET de una tarea sin vencimiento responde 200 y dueDate es nulo', async () => {
      const { owner, projectId } = await setup('c4-get');
      const task = await createTask(owner.token, projectId, { title: 'Sin vencimiento get' });

      const res = await getTask(owner.token, task.id);

      expect(res.status).toBe(200);
      expect(res.body.dueDate ?? null).toBeNull();
    });

    it('c4 · crear con dueDate null explícito responde 201 y no tiene vencimiento', async () => {
      const { owner, projectId } = await setup('c4-null');

      const res = await createTaskRaw(owner.token, projectId, {
        title: 'Null explícito',
        dueDate: null,
      });

      expect(res.status).toBe(201);
      expect(res.body.dueDate ?? null).toBeNull();
    });

    it('c4 · en el listado, una tarea con vencimiento y otra sin vencimiento conviven', async () => {
      const { owner, projectId } = await setup('c4-list');
      const withDate = await createTask(owner.token, projectId, {
        title: 'Con vencimiento',
        dueDate: '2026-09-15',
      });
      const withoutDate = await createTask(owner.token, projectId, { title: 'Sin vencimiento' });

      const res = await request(app)
        .get(`/api/projects/${projectId}/tasks`)
        .set(auth(owner.token));

      expect(res.status).toBe(200);
      const a = res.body.items.find((t: { id: string }) => t.id === withDate.id);
      const b = res.body.items.find((t: { id: string }) => t.id === withoutDate.id);
      expect(a.dueDate).toBe('2026-09-15');
      expect(b.dueDate ?? null).toBeNull();
    });
  });

  // ───────────────────────── Criterio 5 ─────────────────────────
  describe('c5 · se puede quitar la fecha enviando el campo en nulo', () => {
    it('c5 · PATCH con dueDate null responde 200 y dueDate queda nulo', async () => {
      const { owner, projectId } = await setup('c5-patch');
      const task = await createTask(owner.token, projectId, {
        title: 'Quitar vencimiento',
        dueDate: '2026-09-15',
      });
      expect(task.dueDate).toBe('2026-09-15');

      const res = await patchTask(owner.token, task.id, { dueDate: null });

      expect(res.status).toBe(200);
      expect(res.body.dueDate ?? null).toBeNull();
    });

    it('c5 · tras quitar la fecha, el GET confirma que la tarea no tiene vencimiento', async () => {
      const { owner, projectId } = await setup('c5-persist');
      const task = await createTask(owner.token, projectId, {
        title: 'Quitar y verificar',
        dueDate: '2026-09-15',
      });

      const patched = await patchTask(owner.token, task.id, { dueDate: null });
      expect(patched.status).toBe(200);

      const fetched = await getTask(owner.token, task.id);
      expect(fetched.status).toBe(200);
      expect(fetched.body.dueDate ?? null).toBeNull();
    });

    it('c5 · se puede volver a asignar una fecha después de haberla quitado', async () => {
      const { owner, projectId } = await setup('c5-reassign');
      const task = await createTask(owner.token, projectId, {
        title: 'Quitar y reasignar',
        dueDate: '2026-09-15',
      });
      await patchTask(owner.token, task.id, { dueDate: null });

      const res = await patchTask(owner.token, task.id, { dueDate: '2026-11-20' });

      expect(res.status).toBe(200);
      expect(res.body.dueDate).toBe('2026-11-20');
    });
  });

  // ───────────────────────── Criterio 6 ─────────────────────────
  describe('c6 · formato inválido devuelve HTTP 400', () => {
    const invalidValues: Array<[string, unknown]> = [
      ['formato dd/mm/yyyy', '15/09/2026'],
      ['formato compacto sin guiones', '20260915'],
      ['mes y día sin cero a la izquierda', '2026-9-15'],
      ['mes inexistente (13)', '2026-13-01'],
      ['día inexistente (32)', '2026-01-32'],
      ['30 de febrero', '2026-02-30'],
      ['29 de febrero en año no bisiesto', '2026-02-29'],
      ['texto libre', 'mañana'],
      ['cadena vacía', ''],
      ['número en lugar de cadena', 20260915],
    ];

    it.each(invalidValues)('c6 · POST con dueDate inválido (%s) responde 400', async (_label, value) => {
      const { owner, projectId } = await setup('c6-post');

      const res = await createTaskRaw(owner.token, projectId, {
        title: 'Fecha inválida',
        dueDate: value,
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBeDefined();
      expect(res.body.error.message).toBeDefined();
    });

    it.each(invalidValues)('c6 · PATCH con dueDate inválido (%s) responde 400', async (_label, value) => {
      const { owner, projectId } = await setup('c6-patch');
      const task = await createTask(owner.token, projectId, { title: 'Fecha inválida patch' });

      const res = await patchTask(owner.token, task.id, { dueDate: value });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBeDefined();
    });

    it('c6 · un PATCH rechazado no modifica el vencimiento existente', async () => {
      const { owner, projectId } = await setup('c6-unchanged');
      const task = await createTask(owner.token, projectId, {
        title: 'Conserva fecha',
        dueDate: '2026-09-15',
      });

      const res = await patchTask(owner.token, task.id, { dueDate: '15/09/2026' });
      expect(res.status).toBe(400);

      const fetched = await getTask(owner.token, task.id);
      expect(fetched.body.dueDate).toBe('2026-09-15');
    });

    it('c6 · un POST rechazado por fecha inválida no crea la tarea', async () => {
      const { owner, projectId } = await setup('c6-nocreate');

      const res = await createTaskRaw(owner.token, projectId, {
        title: 'No debe crearse',
        dueDate: 'no-es-fecha',
      });
      expect(res.status).toBe(400);

      const list = await request(app)
        .get(`/api/projects/${projectId}/tasks`)
        .set(auth(owner.token));
      expect(list.status).toBe(200);
      expect(list.body.items).toHaveLength(0);
    });
  });

  // ───────────────────────── Criterio 7 ─────────────────────────
  describe('c7 · se admite una fecha pasada', () => {
    it('c7 · POST con una fecha pasada responde 201 y devuelve la misma fecha', async () => {
      const { owner, projectId } = await setup('c7-post');

      const res = await createTaskRaw(owner.token, projectId, {
        title: 'Vencida al crear',
        dueDate: '2020-01-15',
      });

      expect(res.status).toBe(201);
      expect(res.body.dueDate).toBe('2020-01-15');
    });

    it('c7 · PATCH con una fecha pasada responde 200 y devuelve la misma fecha', async () => {
      const { owner, projectId } = await setup('c7-patch');
      const task = await createTask(owner.token, projectId, {
        title: 'Vencida por patch',
        dueDate: '2099-12-31',
      });

      const res = await patchTask(owner.token, task.id, { dueDate: '2000-02-29' });

      expect(res.status).toBe(200);
      expect(res.body.dueDate).toBe('2000-02-29');
    });

    it('c7 · la fecha pasada queda persistida y se devuelve igual en el GET', async () => {
      const { owner, projectId } = await setup('c7-get');
      const task = await createTask(owner.token, projectId, {
        title: 'Vencida persistida',
        dueDate: '1999-12-31',
      });

      const res = await getTask(owner.token, task.id);

      expect(res.status).toBe(200);
      expect(res.body.dueDate).toBe('1999-12-31');
    });
  });

  // ───────────────────────── Criterio 8 ─────────────────────────
  describe('c8 · solo los miembros del proyecto pueden modificar la fecha', () => {
    it('c8 · un usuario que no es miembro recibe 403 al intentar cambiar el dueDate', async () => {
      const { owner, projectId } = await setup('c8-forbidden');
      const outsider = await registerUser(uniqueEmail('c8-outsider'));
      const task = await createTask(owner.token, projectId, {
        title: 'Protegida',
        dueDate: '2026-09-15',
      });

      const res = await patchTask(outsider.token, task.id, { dueDate: '2026-12-01' });

      expect(res.status).toBe(403);
    });

    it('c8 · el intento de un no miembro no modifica la fecha guardada', async () => {
      const { owner, projectId } = await setup('c8-unchanged');
      const outsider = await registerUser(uniqueEmail('c8-outsider2'));
      const task = await createTask(owner.token, projectId, {
        title: 'Protegida 2',
        dueDate: '2026-09-15',
      });

      await patchTask(outsider.token, task.id, { dueDate: '2026-12-01' });

      const fetched = await getTask(owner.token, task.id);
      expect(fetched.status).toBe(200);
      expect(fetched.body.dueDate).toBe('2026-09-15');
    });

    it('c8 · un no miembro tampoco puede quitar la fecha enviando null (403) y la fecha se conserva', async () => {
      const { owner, projectId } = await setup('c8-null');
      const outsider = await registerUser(uniqueEmail('c8-outsider3'));
      const task = await createTask(owner.token, projectId, {
        title: 'Protegida 3',
        dueDate: '2026-09-15',
      });

      const res = await patchTask(outsider.token, task.id, { dueDate: null });
      expect(res.status).toBe(403);

      const fetched = await getTask(owner.token, task.id);
      expect(fetched.body.dueDate).toBe('2026-09-15');
    });

    it('c8 · un miembro del proyecto (el dueño) sí puede modificar el dueDate (200)', async () => {
      const { owner, projectId } = await setup('c8-member');
      const task = await createTask(owner.token, projectId, {
        title: 'Editable por miembro',
        dueDate: '2026-09-15',
      });

      const res = await patchTask(owner.token, task.id, { dueDate: '2026-12-01' });

      expect(res.status).toBe(200);
      expect(res.body.dueDate).toBe('2026-12-01');
    });
  });

  // ───────────────────────── Tests nuevos ─────────────────────────

  // c3 · Fechas de cambio de horario (EE.UU. y UE). Solo detectan un desplazamiento
  // si la suite se ejecuta con TZ distinta de UTC a nivel de proceso (ver hallazgos).
  it.each(['2026-03-08', '2026-03-29', '2026-10-25', '2026-11-01'])(
    'c3 · create, PATCH y GET de la fecha de cambio de horario %s no la desplazan',
    async (date) => {
      const { owner, projectId } = await setup(`c3-dst-${date}`);

      const created = await createTaskRaw(owner.token, projectId, {
        title: `Tarea c3 dst ${date}`,
        dueDate: date,
      });
      expect(created.status).toBe(201);
      expect(created.body.dueDate).toBe(date);

      const fetched = await getTask(owner.token, created.body.id);
      expect(fetched.body.dueDate).toBe(date);

      const patched = await patchTask(owner.token, created.body.id, { dueDate: '2026-06-30' });
      expect(patched.status).toBe(200);
      const patchedBack = await patchTask(owner.token, created.body.id, { dueDate: date });
      expect(patchedBack.status).toBe(200);
      expect(patchedBack.body.dueDate).toBe(date);
    },
  );

  // c6 · Más formatos y tipos inválidos. POST y PATCH, y el PATCH no altera el valor previo.
  it.each<[string, unknown]>([
    ['mes 00', '2026-00-10'],
    ['día 00', '2026-01-00'],
    ['31 de abril', '2026-04-31'],
    ['1900 no es bisiesto', '1900-02-29'],
    ['2100 no es bisiesto', '2100-02-29'],
    ['espacios alrededor', ' 2026-09-15 '],
    ['separador con barras', '2026/09/15'],
    ['año de 5 dígitos', '12026-09-15'],
    ['booleano', true],
    ['objeto', {}],
    ['arreglo', ['2026-09-15']],
  ])('c6 · dueDate inválido (%s) responde 400 en POST y en PATCH, y no altera la fecha previa', async (_label, value) => {
    const { owner, projectId } = await setup('c6-extra');

    const post = await createTaskRaw(owner.token, projectId, { title: 'Inválida', dueDate: value });
    expect(post.status).toBe(400);

    const task = await createTask(owner.token, projectId, { title: 'Con fecha', dueDate: '2026-09-15' });
    const patch = await patchTask(owner.token, task.id, { dueDate: value });
    expect(patch.status).toBe(400);

    const fetched = await getTask(owner.token, task.id);
    expect(fetched.body.dueDate).toBe('2026-09-15');
  });

  // c1/c2/c3 · Fecha-hora en lugar de fecha. Interpretación de la spec (día sin hora, sin
  // conversión de zonas): se rechaza en vez de truncar o convertir. Confirmar con el PO.
  it.each<[string, string]>([
    ['UTC', '2026-09-15T00:00:00Z'],
    ['offset -03:00', '2026-09-15T23:30:00-03:00'],
    ['sin zona', '2026-09-15T10:00:00'],
  ])('c1 · dueDate con hora (%s) responde 400 y no se convierte entre zonas', async (_label, value) => {
    const { owner, projectId } = await setup('c1-datetime');

    const post = await createTaskRaw(owner.token, projectId, { title: 'Con hora', dueDate: value });
    expect(post.status).toBe(400);

    const task = await createTask(owner.token, projectId, { title: 'Con fecha', dueDate: '2026-09-15' });
    const patch = await patchTask(owner.token, task.id, { dueDate: value });
    expect(patch.status).toBe(400);

    const fetched = await getTask(owner.token, task.id);
    expect(fetched.body.dueDate).toBe('2026-09-15');
  });

  // c5 · Omitir el campo no es lo mismo que enviarlo en nulo (asume que PATCH acepta title).
  it('c5 · un PATCH que no incluye dueDate conserva el vencimiento existente', async () => {
    const { owner, projectId } = await setup('c5-omit');
    const task = await createTask(owner.token, projectId, {
      title: 'Título original',
      dueDate: '2026-09-15',
    });

    const res = await patchTask(owner.token, task.id, { title: 'Título nuevo' });
    expect(res.status).toBe(200);
    expect(res.body.dueDate).toBe('2026-09-15');

    const fetched = await getTask(owner.token, task.id);
    expect(fetched.body.dueDate).toBe('2026-09-15');
  });

  // c5 · Quitar la fecha en una tarea que no la tiene no es un error.
  it('c5 · PATCH con dueDate null sobre una tarea sin vencimiento responde 200 y sigue sin vencimiento', async () => {
    const { owner, projectId } = await setup('c5-null-empty');
    const task = await createTask(owner.token, projectId, { title: 'Sin fecha' });

    const res = await patchTask(owner.token, task.id, { dueDate: null });

    expect(res.status).toBe(200);
    expect(res.body.dueDate ?? null).toBeNull();
  });

  // c7 · Bordes relativos a la fecha actual: ayer y hoy no se rechazan.
  it.each<[string, number]>([
    ['ayer', -1],
    ['hoy', 0],
  ])('c7 · POST y PATCH con la fecha de %s no se rechazan y devuelven la misma fecha', async (_label, offsetDays) => {
    const { owner, projectId } = await setup('c7-relative');
    const date = new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

    const created = await createTaskRaw(owner.token, projectId, { title: 'Relativa', dueDate: date });
    expect(created.status).toBe(201);
    expect(created.body.dueDate).toBe(date);

    const other = await createTask(owner.token, projectId, { title: 'Relativa patch', dueDate: '2099-12-31' });
    const patched = await patchTask(owner.token, other.id, { dueDate: date });
    expect(patched.status).toBe(200);
    expect(patched.body.dueDate).toBe(date);
  });

  // c8 · Ser dueño de OTRO proyecto no convierte al usuario en miembro de este.
  it('c8 · un usuario que es miembro de otro proyecto recibe 403 al cambiar o quitar el dueDate', async () => {
    const { owner, projectId } = await setup('c8-other-project');
    const stranger = await registerUser(uniqueEmail('c8-stranger'));
    await createProject(stranger.token, 'US16 c8 proyecto ajeno');
    const task = await createTask(owner.token, projectId, {
      title: 'Protegida 4',
      dueDate: '2026-09-15',
    });

    const change = await patchTask(stranger.token, task.id, { dueDate: '2026-12-01' });
    expect(change.status).toBe(403);

    const remove = await patchTask(stranger.token, task.id, { dueDate: null });
    expect(remove.status).toBe(403);

    const fetched = await getTask(owner.token, task.id);
    expect(fetched.body.dueDate).toBe('2026-09-15');
  });

  // c8 · Un no miembro tampoco puede fijar una fecha al crear una tarea en el proyecto ajeno.
  it('c8 · un no miembro recibe 403 al crear una tarea con dueDate y no se crea nada', async () => {
    const { owner, projectId } = await setup('c8-post');
    const outsider = await registerUser(uniqueEmail('c8-outsider-post'));

    const res = await createTaskRaw(outsider.token, projectId, {
      title: 'Intrusa',
      dueDate: '2026-09-15',
    });
    expect(res.status).toBe(403);

    const list = await request(app)
      .get(`/api/projects/${projectId}/tasks`)
      .set(auth(owner.token));
    expect(list.status).toBe(200);
    expect(list.body.items).toHaveLength(0);
  });
});
