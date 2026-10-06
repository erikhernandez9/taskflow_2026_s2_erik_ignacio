import { expect, test } from '../support/fixtures';
import { unique } from '../support/api-client';

/**
 * Specs del tablero. Toda la interacción con la pieza repetida pasa por
 * TaskCardComponent: ningún test de este archivo escribe un data-testid de
 * adentro de la tarjeta.
 */
test.describe('Tablero · task-card', () => {
  test('la tarjeta muestra los datos de la tarea', async ({ api, owner, signIn, boardPage }) => {
    const project = await api.createProject(owner);
    const title = unique('Revisar contrato');
    await api.createTask(owner, project.id, { title, priority: 'HIGH' });

    await signIn(owner);
    await boardPage.open(project.id);

    const card = boardPage.cardByTitle(title);
    await card.waitFor();

    expect(await card.snapshot()).toMatchObject({
      title,
      priority: 'HIGH',
      assignee: 'Sin asignar',
      dueDate: '—',
      commentCount: 0,
      status: 'TODO',
    });
  });

  test('el contador de comentarios refleja los comentarios de la tarea', async ({
    api,
    owner,
    signIn,
    boardPage,
  }) => {
    const project = await api.createProject(owner);
    const title = unique('Tarea comentada');
    const task = await api.createTask(owner, project.id, { title });
    await api.addComment(owner, task.id, 'Primer comentario');
    await api.addComment(owner, task.id, 'Segundo comentario');

    await signIn(owner);
    await boardPage.open(project.id);

    await expect(boardPage.cardByTitle(title).commentCount).toHaveText('2 comentarios');
    expect(await boardPage.cardByTitle(title).comments()).toBe(2);
  });

  test('mover la tarjeta a IN_PROGRESS la cambia de columna', async ({
    api,
    owner,
    signIn,
    boardPage,
  }) => {
    const project = await api.createProject(owner);
    const title = unique('Mover de columna');
    await api.createTask(owner, project.id, { title });

    await signIn(owner);
    await boardPage.open(project.id);

    await expect(boardPage.cards('TODO')).toHaveCount(1);
    await expect(boardPage.cards('IN_PROGRESS')).toHaveCount(0);

    await boardPage.cardByTitle(title).moveTo('IN_PROGRESS');

    await expect(boardPage.cards('TODO')).toHaveCount(0);
    await expect(boardPage.cards('IN_PROGRESS')).toHaveCount(1);
    await expect(boardPage.columnCount('IN_PROGRESS')).toHaveText('(1)');
    expect(await boardPage.cardByTitle(title).status()).toBe('IN_PROGRESS');
  });

  test('filtrar por prioridad deja solo las tarjetas que corresponden', async ({
    api,
    owner,
    signIn,
    boardPage,
  }) => {
    const project = await api.createProject(owner);
    const critica = unique('Caida de produccion');
    const menor = unique('Ajustar copy');
    await api.createTask(owner, project.id, { title: critica, priority: 'CRITICAL' });
    await api.createTask(owner, project.id, { title: menor, priority: 'LOW' });

    await signIn(owner);
    await boardPage.open(project.id);
    await expect(boardPage.cards()).toHaveCount(2);

    await boardPage.filterByPriority('CRITICAL');

    await expect(boardPage.cards()).toHaveCount(1);
    const [card] = await boardPage.taskCards();
    expect(await card.title()).toBe(critica);
    await expect(card.priority).toHaveText('CRITICAL');
  });

  test('cada tarjeta expone su propio estado sin pisarse con las demas', async ({
    api,
    owner,
    signIn,
    boardPage,
  }) => {
    const project = await api.createProject(owner);
    const pendiente = unique('Sigue pendiente');
    const enCurso = unique('Ya arranco');
    await api.createTask(owner, project.id, { title: pendiente });
    await api.createTask(owner, project.id, { title: enCurso });

    await signIn(owner);
    await boardPage.open(project.id);
    await boardPage.cardByTitle(enCurso).moveTo('IN_PROGRESS');

    await expect(boardPage.cards('IN_PROGRESS')).toHaveCount(1);
    expect(await boardPage.cardByTitle(pendiente).status()).toBe('TODO');
    expect(await boardPage.cardByTitle(enCurso).status()).toBe('IN_PROGRESS');
  });
});
