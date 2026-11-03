import { expect, test } from '../support/fixtures';
import type { ApiClient, Session } from '../support/api-client';

/**
 * El select del detalle ofrece los miembros que el front conoce: el owner y los
 * responsables de alguna tarea (ver client/src/lib/members.ts). Asignarle otra
 * tarea en el arrange es lo que hace que el compañero aparezca como opción.
 */
async function projectWithTeammate(api: ApiClient, owner: Session) {
  const project = await api.createProject(owner);
  const teammate = await api.registerUser('teammate');
  await api.addMember(owner, project.id, teammate.email);
  await api.createTask(owner, project.id, { assigneeId: teammate.id });
  return { project, teammate };
}

/** US-14: asignar, reasignar y desasignar desde el detalle de la tarea. */
test.describe('US-14 · Asignar tarea a un miembro', { tag: ['@alta', '@US-14'] }, () => {
  test('c5 · asignar a un miembro se ve en el tablero y no cambia el estado', async ({
    api,
    owner,
    signIn,
    taskDetailPage,
    boardPage,
  }) => {
    const { project, teammate } = await projectWithTeammate(api, owner);
    const task = await api.createTask(owner, project.id);

    await signIn(owner);
    await taskDetailPage.open(project.id, task.id);
    const response = await taskDetailPage.assignTo(teammate.id);

    expect(response.status()).toBe(200);
    await expect(taskDetailPage.currentStatus).toHaveText('TODO');
    await boardPage.open(project.id);
    await expect(boardPage.cardByTitle(task.title).assignee).toHaveText(teammate.email);
  });

  test('c2 · una tarea asignada se puede reasignar a otro miembro', async ({
    api,
    owner,
    signIn,
    taskDetailPage,
    boardPage,
  }) => {
    const { project, teammate } = await projectWithTeammate(api, owner);
    const task = await api.createTask(owner, project.id, { assigneeId: teammate.id });

    await signIn(owner);
    await taskDetailPage.open(project.id, task.id);
    const response = await taskDetailPage.assignTo(owner.id);

    expect(response.status()).toBe(200);
    await boardPage.open(project.id);
    const assignee = boardPage.cardByTitle(task.title).assignee;
    await expect(assignee).toHaveText(owner.email);
    await expect(assignee).not.toHaveText(teammate.email);
  });

  test('c3 · elegir "Sin asignar" desasigna la tarea', async ({
    api,
    owner,
    signIn,
    taskDetailPage,
    boardPage,
  }) => {
    const { project, teammate } = await projectWithTeammate(api, owner);
    const task = await api.createTask(owner, project.id, { assigneeId: teammate.id });

    await signIn(owner);
    await taskDetailPage.open(project.id, task.id);
    const response = await taskDetailPage.assignTo('');

    expect(response.status()).toBe(200);
    await boardPage.open(project.id);
    await expect(boardPage.cardByTitle(task.title).assignee).toHaveText('Sin asignar');
  });

  test('c4 · un miembro que no es owner tambien puede asignar', async ({
    api,
    owner,
    signIn,
    taskDetailPage,
    boardPage,
  }) => {
    const { project, teammate } = await projectWithTeammate(api, owner);
    const task = await api.createTask(owner, project.id);

    await signIn(teammate);
    await taskDetailPage.open(project.id, task.id);
    const response = await taskDetailPage.assignTo(teammate.id);

    expect(response.status()).toBe(200);
    await boardPage.open(project.id);
    await expect(boardPage.cardByTitle(task.title).assignee).toHaveText(teammate.email);
  });

  test('c1 · asignar a quien dejo de ser miembro responde 400 y no se guarda', async ({
    api,
    owner,
    page,
    signIn,
    taskDetailPage,
  }) => {
    const { project, teammate } = await projectWithTeammate(api, owner);
    const task = await api.createTask(owner, project.id);

    await signIn(owner);
    await taskDetailPage.open(project.id, task.id);
    await api.removeMember(owner, project.id, teammate.id);
    const response = await taskDetailPage.assignTo(teammate.id);

    expect(response.status()).toBe(400);
    await expect(taskDetailPage.errorMessage).toHaveText(
      'The assignee must be a member of the project',
    );
    await page.reload();
    await expect(taskDetailPage.assigneeSelect).toHaveValue('');
  });

  test('borde · un usuario ajeno al proyecto no se ofrece como opcion', async ({
    api,
    owner,
    signIn,
    taskDetailPage,
  }) => {
    const { project, teammate } = await projectWithTeammate(api, owner);
    const outsider = await api.registerUser('outsider');
    const task = await api.createTask(owner, project.id);

    await signIn(owner);
    await taskDetailPage.open(project.id, task.id);

    const options = taskDetailPage.assigneeSelect.locator('option');
    await expect(options.filter({ hasText: teammate.email })).toHaveCount(1);
    await expect(options.filter({ hasText: outsider.email })).toHaveCount(0);
  });
});
