import { expect, test } from '../support/fixtures';
import { unique } from '../support/api-client';

/** Casos del detalle de tarea que no son de comentarios: edición, estado, tags e historial. */
test.describe('Detalle de tarea · edicion, estado y etiquetas', () => {
  test('editar titulo y prioridad persiste tras recargar', async ({
    api,
    owner,
    page,
    signIn,
    taskDetailPage,
  }) => {
    const project = await api.createProject(owner);
    const task = await api.createTask(owner, project.id, { priority: 'LOW' });
    const nuevoTitulo = unique('Titulo editado');

    await signIn(owner);
    await taskDetailPage.open(project.id, task.id);
    await taskDetailPage.edit({ title: nuevoTitulo, priority: 'CRITICAL' });

    await page.reload();
    await expect(taskDetailPage.titleInput).toHaveValue(nuevoTitulo);
    await expect(taskDetailPage.prioritySelect).toHaveValue('CRITICAL');
  });

  test('un titulo invalido muestra el error y no pisa el valor guardado', async ({
    api,
    owner,
    page,
    signIn,
    taskDetailPage,
  }) => {
    const project = await api.createProject(owner);
    const original = unique('Titulo original');
    const task = await api.createTask(owner, project.id, { title: original });

    await signIn(owner);
    await taskDetailPage.open(project.id, task.id);
    await taskDetailPage.edit({ title: 'ab' });

    await expect(taskDetailPage.errorMessage).toHaveText(
      'title must be between 3 and 200 characters',
    );
    await page.reload();
    await expect(taskDetailPage.titleInput).toHaveValue(original);
  });

  test('cambiar el estado actualiza el detalle y suma una entrada al historial', async ({
    api,
    owner,
    signIn,
    taskDetailPage,
  }) => {
    const project = await api.createProject(owner);
    const task = await api.createTask(owner, project.id);

    await signIn(owner);
    await taskDetailPage.open(project.id, task.id);
    // El alta ya deja una entrada (null -> TODO).
    await expect(taskDetailPage.historyItems).toHaveCount(1);
    await expect(taskDetailPage.currentStatus).toHaveText('TODO');

    await taskDetailPage.changeStatus('IN_PROGRESS');

    await expect(taskDetailPage.currentStatus).toHaveText('IN_PROGRESS');
    await expect(taskDetailPage.historyItems).toHaveCount(2);
    // El historial se lista del mas viejo al mas nuevo.
    await expect(taskDetailPage.historyItems.last()).toContainText('IN_PROGRESS');
  });

  test('volver atras desde DONE muestra el error de transicion invalida', async ({
    api,
    owner,
    signIn,
    taskDetailPage,
  }) => {
    const project = await api.createProject(owner);
    const task = await api.createTask(owner, project.id);
    // Camino legal hasta DONE, para no depender de que TODO->DONE este permitido.
    await api.updateTask(owner, task.id, { status: 'IN_PROGRESS' });
    await api.updateTask(owner, task.id, { status: 'DONE' });

    await signIn(owner);
    await taskDetailPage.open(project.id, task.id);
    await expect(taskDetailPage.currentStatus).toHaveText('DONE');

    await taskDetailPage.changeStatus('TODO');

    await expect(taskDetailPage.errorMessage).toHaveText('Cannot move a task from DONE to TODO');
    await expect(taskDetailPage.currentStatus).toHaveText('DONE');
  });

  test('agregar una etiqueta la muestra como chip', async ({
    api,
    owner,
    signIn,
    taskDetailPage,
  }) => {
    const project = await api.createProject(owner);
    const task = await api.createTask(owner, project.id);
    const etiqueta = unique('urgente');

    await signIn(owner);
    await taskDetailPage.open(project.id, task.id);
    await expect(taskDetailPage.tagChips).toHaveCount(0);

    await taskDetailPage.addTag(etiqueta);

    await expect(taskDetailPage.tagChips).toHaveCount(1);
    expect(await taskDetailPage.tagByName(etiqueta).text()).toBe(etiqueta);
  });

  test('quitar una etiqueta la saca de la lista sin tocar las demas', async ({
    api,
    owner,
    signIn,
    taskDetailPage,
  }) => {
    const project = await api.createProject(owner);
    const task = await api.createTask(owner, project.id);
    const aQuitar = unique('temporal');
    const queQueda = unique('permanente');

    await signIn(owner);
    await taskDetailPage.open(project.id, task.id);
    await taskDetailPage.addTag(aQuitar);
    await taskDetailPage.addTag(queQueda);
    await expect(taskDetailPage.tagChips).toHaveCount(2);

    await taskDetailPage.tagByName(aQuitar).remove();

    await expect(taskDetailPage.tagChips).toHaveCount(1);
    const [restante] = await taskDetailPage.tags();
    expect(await restante.text()).toBe(queQueda);
  });

  test('el link de volver lleva al tablero del proyecto', async ({
    api,
    owner,
    signIn,
    taskDetailPage,
    boardPage,
  }) => {
    const project = await api.createProject(owner);
    const task = await api.createTask(owner, project.id);

    await signIn(owner);
    await taskDetailPage.open(project.id, task.id);
    await taskDetailPage.backLink.click();

    await expect(boardPage.root).toBeVisible();
    await expect(boardPage.projectName).toHaveText(project.name);
  });
});
