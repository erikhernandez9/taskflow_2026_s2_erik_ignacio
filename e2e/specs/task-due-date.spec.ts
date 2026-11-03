import { expect, test } from '../support/fixtures';
import { unique } from '../support/api-client';

const DUE_DATE = '2026-09-15';
const PAST_DATE = '2020-01-31';

/** US-16: la fecha es un dia calendario, igual a la cargada en cualquier zona horaria. */
test.describe('US-16 · Fecha de vencimiento', { tag: ['@media', '@US-16'] }, () => {
  test('c2 · cargar una fecha en el detalle la muestra igual y persiste', async ({
    api,
    owner,
    page,
    signIn,
    taskDetailPage,
    boardPage,
  }) => {
    const project = await api.createProject(owner);
    const task = await api.createTask(owner, project.id);

    await signIn(owner);
    await taskDetailPage.open(project.id, task.id);
    const response = await taskDetailPage.setDueDate(DUE_DATE);

    expect(response.status()).toBe(200);
    expect((await response.json()).dueDate).toBe(DUE_DATE);
    await expect(taskDetailPage.dueDateValue).toHaveText(DUE_DATE);

    await page.reload();
    await expect(taskDetailPage.dueDateInput).toHaveValue(DUE_DATE);
    await boardPage.open(project.id);
    await expect(boardPage.cardByTitle(task.title).dueDate).toHaveText(DUE_DATE);
  });

  test('c2 · crear una tarea con fecha desde el tablero la muestra en la tarjeta', async ({
    api,
    owner,
    signIn,
    boardPage,
  }) => {
    const project = await api.createProject(owner);
    const title = unique('Con vencimiento');

    await signIn(owner);
    await boardPage.open(project.id);
    await boardPage.createTask({ title, dueDate: DUE_DATE });

    await expect(boardPage.cardByTitle(title).dueDate).toHaveText(DUE_DATE);
  });

  test('c4 · una tarea sin fecha muestra el guion', async ({
    api,
    owner,
    signIn,
    taskDetailPage,
  }) => {
    const project = await api.createProject(owner);
    const task = await api.createTask(owner, project.id);

    await signIn(owner);
    await taskDetailPage.open(project.id, task.id);

    await expect(taskDetailPage.dueDateValue).toHaveText('—');
    await expect(taskDetailPage.dueDateInput).toHaveValue('');
  });

  test('c5 · vaciar el campo quita la fecha', async ({ api, owner, page, signIn, taskDetailPage }) => {
    const project = await api.createProject(owner);
    const task = await api.createTask(owner, project.id, { dueDate: DUE_DATE });

    await signIn(owner);
    await taskDetailPage.open(project.id, task.id);
    const response = await taskDetailPage.setDueDate('');

    expect(response.status()).toBe(200);
    expect((await response.json()).dueDate).toBeNull();
    await page.reload();
    await expect(taskDetailPage.dueDateValue).toHaveText('—');
  });

  test('c7 · se admite una fecha pasada', async ({ api, owner, signIn, taskDetailPage }) => {
    const project = await api.createProject(owner);
    const task = await api.createTask(owner, project.id);

    await signIn(owner);
    await taskDetailPage.open(project.id, task.id);
    const response = await taskDetailPage.setDueDate(PAST_DATE);

    expect(response.status()).toBe(200);
    await expect(taskDetailPage.dueDateValue).toHaveText(PAST_DATE);
  });

  for (const timezoneId of ['America/Montevideo', 'Asia/Tokyo']) {
    test.describe(`navegador en ${timezoneId}`, () => {
      test.use({ timezoneId });

      test('c3 · la fecha no cambia con la zona horaria del cliente', async ({
        api,
        owner,
        page,
        signIn,
        taskDetailPage,
      }) => {
        const project = await api.createProject(owner);
        const task = await api.createTask(owner, project.id);

        await signIn(owner);
        await taskDetailPage.open(project.id, task.id);
        await taskDetailPage.setDueDate(DUE_DATE);

        await page.reload();
        await expect(taskDetailPage.dueDateValue).toHaveText(DUE_DATE);
      });
    });
  }
});
