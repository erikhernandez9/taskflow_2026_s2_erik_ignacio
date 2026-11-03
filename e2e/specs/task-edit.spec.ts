import { expect, test } from '../support/fixtures';
import { unique } from '../support/api-client';

/** Casos del detalle de tarea que no son de comentarios: edición, estado, tags e historial. */
test.describe('Detalle de tarea · edicion, estado y etiquetas', () => {
  test('editar titulo y prioridad persiste tras recargar', { tag: ['@media', '@US-12'] }, async ({
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

  test('un titulo invalido muestra el error y no pisa el valor guardado', { tag: ['@media', '@US-12'] }, async ({
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

  test('cambiar el estado actualiza el detalle y suma una entrada al historial', { tag: ['@alta', '@US-06'] }, async ({
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

  test('volver atras desde DONE muestra el error de transicion invalida', { tag: ['@media', '@US-12'] }, async ({
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

  test('agregar una etiqueta la muestra como chip', { tag: ['@media', '@US-15'] }, async ({
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

  test('quitar una etiqueta la saca de la lista sin tocar las demas', { tag: ['@media', '@US-15'] }, async ({
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

  test('US-12 c2 · el titulo acepta 200 caracteres y rechaza 201', { tag: ['@media', '@US-12'] }, async ({
    api,
    owner,
    signIn,
    taskDetailPage,
  }) => {
    const project = await api.createProject(owner);
    const task = await api.createTask(owner, project.id);
    const limite = 'x'.repeat(200);

    await signIn(owner);
    await taskDetailPage.open(project.id, task.id);

    const valido = await taskDetailPage.edit({ title: limite });
    expect(valido.status()).toBe(200);
    await expect(taskDetailPage.errorMessage).toHaveCount(0);

    const invalido = await taskDetailPage.edit({ title: `${limite}x` });
    expect(invalido.status()).toBe(400);
    await expect(taskDetailPage.errorMessage).toHaveText(
      'title must be between 3 and 200 characters',
    );
  });

  test('US-15 c1 · la etiqueta se guarda en minusculas y sin espacios', { tag: ['@media', '@US-15'] }, async ({
    api,
    owner,
    signIn,
    taskDetailPage,
  }) => {
    const project = await api.createProject(owner);
    const task = await api.createTask(owner, project.id);
    const base = unique('etiqueta');

    await signIn(owner);
    await taskDetailPage.open(project.id, task.id);
    await taskDetailPage.tagAddInput.fill(`  ${base.toUpperCase()}  `);
    await taskDetailPage.tagAddButton.click();

    await expect(taskDetailPage.tagChips).toHaveCount(1);
    expect(await taskDetailPage.tagChips.first().innerText()).toContain(base);
  });

  test('US-15 c3 · repetir una etiqueta no genera un duplicado', { tag: ['@media', '@US-15'] }, async ({
    api,
    owner,
    page,
    signIn,
    taskDetailPage,
  }) => {
    const project = await api.createProject(owner);
    const task = await api.createTask(owner, project.id);
    const etiqueta = unique('repetida');

    await signIn(owner);
    await taskDetailPage.open(project.id, task.id);
    await taskDetailPage.addTag(etiqueta);
    await taskDetailPage.tagAddInput.fill(etiqueta);
    const response = page.waitForResponse(
      (r) => r.request().method() === 'POST' && r.url().includes('/tags'),
    );
    await taskDetailPage.tagAddButton.click();

    expect((await response).status()).toBe(200);
    await page.reload();
    await expect(taskDetailPage.tagChips).toHaveCount(1);
  });

  test('US-15 c4 · una etiqueta vacia muestra el error de validacion', { tag: ['@media', '@US-15'] }, async ({
    api,
    owner,
    signIn,
    taskDetailPage,
  }) => {
    const project = await api.createProject(owner);
    const task = await api.createTask(owner, project.id);

    await signIn(owner);
    await taskDetailPage.open(project.id, task.id);
    await taskDetailPage.tagAddButton.click();

    await expect(taskDetailPage.errorMessage).toHaveText(
      'Tag name must be between 1 and 30 characters',
    );
    await expect(taskDetailPage.tagChips).toHaveCount(0);
  });

  test('el link de volver lleva al tablero del proyecto', { tag: ['@media', '@US-12'] }, async ({
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
