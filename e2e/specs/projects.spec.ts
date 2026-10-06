import { expect, test } from '../support/fixtures';
import { unique } from '../support/api-client';

/** Casos de la lista de proyectos: alta, validaciones, vacío y navegación. */
test.describe('Proyectos · project-card', () => {
  test('un usuario nuevo ve el estado vacio', async ({ owner, signIn, projectsPage }) => {
    await signIn(owner);
    await projectsPage.open();

    await expect(projectsPage.cards).toHaveCount(0);
    await expect(projectsPage.emptyState).toBeVisible();
  });

  test('crear un proyecto lo agrega a la lista con su descripcion', async ({
    owner,
    signIn,
    projectsPage,
  }) => {
    const nombre = unique('Rediseno');

    await signIn(owner);
    await projectsPage.open();
    await projectsPage.createProject(nombre, 'Sitio institucional');

    const card = projectsPage.cardByName(nombre);
    await card.waitFor();
    expect(await card.snapshot()).toMatchObject({
      name: nombre,
      description: 'Sitio institucional',
      archived: false,
    });
  });

  test('un proyecto sin descripcion muestra el texto por defecto', async ({
    owner,
    signIn,
    projectsPage,
  }) => {
    const nombre = unique('Sin descripcion');

    await signIn(owner);
    await projectsPage.open();
    await projectsPage.createProject(nombre);

    await expect(projectsPage.cardByName(nombre).description).toHaveText('Sin descripción');
  });

  test('repetir el nombre de un proyecto propio muestra el conflicto', async ({
    api,
    owner,
    signIn,
    projectsPage,
  }) => {
    const nombre = unique('Duplicado');
    await api.createProject(owner, nombre);

    await signIn(owner);
    await projectsPage.open();
    await expect(projectsPage.cards).toHaveCount(1);

    await projectsPage.createProject(nombre);

    await expect(projectsPage.errorMessage).toHaveText(
      'You already have a project with that name',
    );
    await expect(projectsPage.cards).toHaveCount(1);
  });

  test('un nombre de mas de 100 caracteres muestra el error de validacion', async ({
    owner,
    signIn,
    projectsPage,
  }) => {
    await signIn(owner);
    await projectsPage.open();

    await projectsPage.createProject('N'.repeat(101));

    await expect(projectsPage.errorMessage).toHaveText(
      'name must be between 3 and 100 characters',
    );
    await expect(projectsPage.cards).toHaveCount(0);
  });

  test('la tarjeta navega al tablero del proyecto', async ({
    api,
    owner,
    signIn,
    projectsPage,
    boardPage,
  }) => {
    const nombre = unique('Ir al tablero');
    await api.createProject(owner, nombre);

    await signIn(owner);
    await projectsPage.open();
    await projectsPage.cardByName(nombre).open();

    await expect(boardPage.root).toBeVisible();
    await expect(boardPage.projectName).toHaveText(nombre);
  });

  test('la tarjeta navega a la pantalla de miembros', async ({
    api,
    owner,
    signIn,
    projectsPage,
    membersPage,
  }) => {
    const nombre = unique('Ir a miembros');
    await api.createProject(owner, nombre);

    await signIn(owner);
    await projectsPage.open();
    await projectsPage.cardByName(nombre).openMembers();

    await expect(membersPage.root).toBeVisible();
    await expect(membersPage.memberItems).toHaveCount(1);
  });

  test('la lista muestra solo los proyectos del usuario', async ({
    api,
    owner,
    signIn,
    projectsPage,
  }) => {
    const ajeno = await api.registerUser('ajeno');
    await api.createProject(ajeno, unique('Proyecto ajeno'));
    const propio = unique('Proyecto propio');
    await api.createProject(owner, propio);

    await signIn(owner);
    await projectsPage.open();

    await expect(projectsPage.cards).toHaveCount(1);
    await expect(projectsPage.cardByName(propio).nameLink).toBeVisible();
  });
});
