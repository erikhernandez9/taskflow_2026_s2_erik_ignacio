import { expect, test } from '../support/fixtures';

/**
 * Specs de la pantalla de miembros, centradas en member-item.
 *
 * Igual que comment-item, la pieza se renderiza distinto según quién mira:
 * el botón de quitar aparece solo para el owner, y nunca sobre su propia fila.
 */
test.describe('Miembros · member-item', () => {
  test('el owner aparece en la lista y no se puede quitar a si mismo', async ({
    api,
    owner,
    signIn,
    membersPage,
  }) => {
    const project = await api.createProject(owner);

    await signIn(owner);
    await membersPage.open(project.id);

    await expect(membersPage.memberItems).toHaveCount(1);
    const [fila] = await membersPage.members();
    expect(await fila.roleText()).toBe('OWNER');
    expect(await fila.canRemove()).toBe(false);
  });

  test('el owner agrega un miembro y la fila aparece con su email y rol', async ({
    api,
    owner,
    signIn,
    membersPage,
  }) => {
    const project = await api.createProject(owner);
    const teammate = await api.registerUser('teammate');

    await signIn(owner);
    await membersPage.open(project.id);
    await membersPage.addMember(teammate.email);

    const fila = membersPage.memberByEmail(teammate.email);
    await fila.waitFor();
    expect(await fila.snapshot()).toMatchObject({
      email: teammate.email,
      role: 'MEMBER',
      removable: true,
    });
    await expect(membersPage.memberItems).toHaveCount(2);
  });

  test('quitar un miembro saca la fila de la lista', async ({
    api,
    owner,
    signIn,
    membersPage,
  }) => {
    const project = await api.createProject(owner);
    const teammate = await api.registerUser('teammate');

    await signIn(owner);
    await membersPage.open(project.id);
    await membersPage.addMember(teammate.email);
    await expect(membersPage.memberItems).toHaveCount(2);

    await membersPage.memberByEmail(teammate.email).remove();

    await expect(membersPage.memberItems).toHaveCount(1);
  });

  test('un miembro que no es owner ve la lista en solo lectura', async ({
    api,
    owner,
    signIn,
    membersPage,
  }) => {
    const project = await api.createProject(owner);
    const teammate = await api.registerUser('teammate');
    await api.addMember(owner, project.id, teammate.email);

    await signIn(teammate);
    await membersPage.open(project.id);

    await expect(membersPage.readonlyNote).toBeVisible();
    await expect(membersPage.addForm).toHaveCount(0);
    const filas = await membersPage.members();
    for (const fila of filas) {
      expect(await fila.canRemove()).toBe(false);
    }
  });
});
