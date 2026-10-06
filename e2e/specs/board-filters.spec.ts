import { expect, test } from '../support/fixtures';
import { unique } from '../support/api-client';

/** Casos del tablero que no son de la tarjeta: alta, filtros y contadores. */
test.describe('Tablero · alta, filtros y contadores', () => {
  test('crear una tarea desde el formulario la agrega a TODO', async ({
    api,
    owner,
    signIn,
    boardPage,
  }) => {
    const project = await api.createProject(owner);
    const titulo = unique('Tarea desde la UI');

    await signIn(owner);
    await boardPage.open(project.id);
    await expect(boardPage.cards()).toHaveCount(0);

    await boardPage.createTask({ title: titulo, description: 'Alta por formulario' });

    await expect(boardPage.cards('TODO')).toHaveCount(1);
    expect(await boardPage.cardByTitle(titulo).status()).toBe('TODO');
  });

  test('un titulo de menos de 3 caracteres muestra el error de validacion', async ({
    api,
    owner,
    signIn,
    boardPage,
  }) => {
    const project = await api.createProject(owner);

    await signIn(owner);
    await boardPage.open(project.id);
    await boardPage.createTask({ title: 'ab' });

    await expect(boardPage.errorMessage).toHaveText(
      'title must be between 3 and 200 characters',
    );
    await expect(boardPage.cards()).toHaveCount(0);
  });

  test('buscar por texto deja solo las tareas que coinciden', async ({
    api,
    owner,
    signIn,
    boardPage,
  }) => {
    const project = await api.createProject(owner);
    const aguja = unique('Migrar base de datos');
    await api.createTask(owner, project.id, { title: aguja });
    await api.createTask(owner, project.id, { title: unique('Ajustar footer') });

    await signIn(owner);
    await boardPage.open(project.id);
    await expect(boardPage.cards()).toHaveCount(2);

    await boardPage.search('Migrar');

    await expect(boardPage.cards()).toHaveCount(1);
    expect(await boardPage.cardByTitle(aguja).title()).toBe(aguja);
  });

  test('limpiar los filtros vuelve a mostrar todas las tareas', async ({
    api,
    owner,
    signIn,
    boardPage,
  }) => {
    const project = await api.createProject(owner);
    await api.createTask(owner, project.id, { title: unique('Alta'), priority: 'HIGH' });
    await api.createTask(owner, project.id, { title: unique('Baja'), priority: 'LOW' });

    await signIn(owner);
    await boardPage.open(project.id);
    await boardPage.filterByPriority('HIGH');
    await expect(boardPage.cards()).toHaveCount(1);

    await boardPage.clearFilters();

    await expect(boardPage.cards()).toHaveCount(2);
  });

  test('un filtro sin resultados deja el tablero vacio y el total en cero', async ({
    api,
    owner,
    signIn,
    boardPage,
  }) => {
    const project = await api.createProject(owner);
    await api.createTask(owner, project.id, { title: unique('Unica'), priority: 'LOW' });

    await signIn(owner);
    await boardPage.open(project.id);
    await boardPage.filterByPriority('CRITICAL');

    await expect(boardPage.cards()).toHaveCount(0);
    await expect(boardPage.total).toHaveText('Total: 0');
  });

  test('los contadores por columna y el total siguen al estado real', async ({
    api,
    owner,
    signIn,
    boardPage,
  }) => {
    const project = await api.createProject(owner);
    const aMover = unique('Se mueve');
    await api.createTask(owner, project.id, { title: aMover });
    await api.createTask(owner, project.id, { title: unique('Se queda') });

    await signIn(owner);
    await boardPage.open(project.id);
    await expect(boardPage.total).toHaveText('Total: 2');
    await expect(boardPage.columnCount('TODO')).toHaveText('(2)');
    await expect(boardPage.columnCount('DONE')).toHaveText('(0)');

    await boardPage.cardByTitle(aMover).moveTo('IN_PROGRESS');

    await expect(boardPage.columnCount('TODO')).toHaveText('(1)');
    await expect(boardPage.columnCount('IN_PROGRESS')).toHaveText('(1)');
    await expect(boardPage.total).toHaveText('Total: 2');
  });

  test('el link de miembros lleva a la pantalla de miembros', async ({
    api,
    owner,
    signIn,
    boardPage,
    membersPage,
  }) => {
    const project = await api.createProject(owner);

    await signIn(owner);
    await boardPage.open(project.id);
    await boardPage.membersLink.click();

    await expect(membersPage.root).toBeVisible();
  });
});
