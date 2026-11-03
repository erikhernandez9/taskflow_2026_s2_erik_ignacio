import { expect, test } from '../support/fixtures';
import { unique } from '../support/api-client';

/** US-13: eliminar una tarea desde el detalle. */
test.describe('US-13 · Eliminar tarea', { tag: ['@media', '@US-13'] }, () => {
  test('c3 · borrar una tarea responde 204, vuelve al tablero y ya no aparece', async ({
    api,
    owner,
    page,
    signIn,
    taskDetailPage,
    boardPage,
  }) => {
    const project = await api.createProject(owner);
    const aBorrar = await api.createTask(owner, project.id);
    const queQueda = await api.createTask(owner, project.id);

    await signIn(owner);
    await taskDetailPage.open(project.id, aBorrar.id);
    const response = await taskDetailPage.deleteTask();

    expect(response.status()).toBe(204);
    await expect(page).toHaveURL(new RegExp(`/projects/${project.id}$`));
    await expect(boardPage.cards()).toHaveCount(1);
    await expect(boardPage.cardByTitle(queQueda.title).titleLink).toBeVisible();

    await page.reload();
    await expect(boardPage.cards()).toHaveCount(1);
  });

  test('c5 · una tarea en DONE tambien se puede borrar', async ({
    api,
    owner,
    signIn,
    taskDetailPage,
    boardPage,
  }) => {
    const project = await api.createProject(owner);
    const task = await api.createTask(owner, project.id);
    await api.updateTask(owner, task.id, { status: 'IN_PROGRESS' });
    await api.updateTask(owner, task.id, { status: 'DONE' });

    await signIn(owner);
    await taskDetailPage.open(project.id, task.id);
    const response = await taskDetailPage.deleteTask();

    expect(response.status()).toBe(204);
    await expect(boardPage.cards('DONE')).toHaveCount(0);
  });

  test('c4 · abrir una tarea ya borrada muestra que no existe', async ({
    api,
    owner,
    page,
    signIn,
    taskDetailPage,
  }) => {
    const project = await api.createProject(owner);
    const task = await api.createTask(owner, project.id);
    await api.addComment(owner, task.id, unique('Comentario'));

    await signIn(owner);
    await taskDetailPage.open(project.id, task.id);
    await taskDetailPage.deleteTask();

    await page.goto(`/projects/${project.id}/tasks/${task.id}`);
    await expect(taskDetailPage.errorMessage).toHaveText('Task not found');
    await expect(taskDetailPage.root).toHaveCount(0);
  });

  test('error · si la API falla la tarea sigue en pantalla y se informa el error', async ({
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
    // Mock del borde: una caída del servidor no se puede provocar de otra forma.
    await page.route(`**/api/tasks/${task.id}`, (route) =>
      route.request().method() === 'DELETE'
        ? route.fulfill({
            status: 500,
            json: { error: { code: 'INTERNAL', message: 'Error simulado' } },
          })
        : route.continue(),
    );
    const response = await taskDetailPage.deleteTask();

    expect(response.status()).toBe(500);
    await expect(taskDetailPage.errorMessage).toHaveText('Error simulado');
    await expect(page).toHaveURL(new RegExp(`/tasks/${task.id}$`));

    await page.unroute(`**/api/tasks/${task.id}`);
    await boardPage.open(project.id);
    await expect(boardPage.cardByTitle(task.title).titleLink).toBeVisible();
  });
});
