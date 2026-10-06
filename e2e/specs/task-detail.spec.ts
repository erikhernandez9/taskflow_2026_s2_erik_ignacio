import { expect, test } from '../support/fixtures';
import { unique } from '../support/api-client';

/**
 * Specs del detalle de tarea, centradas en comment-item.
 *
 * El caso que justifica el Component Object es el botón de borrar: existe solo
 * sobre los comentarios propios, así que las N instancias de la pieza NO son
 * intercambiables y el test necesita preguntarle a cada una por separado.
 */
test.describe('Detalle de tarea · comment-item', () => {
  test('cada comentario muestra su cuerpo y su autor', async ({
    api,
    owner,
    signIn,
    taskDetailPage,
  }) => {
    const project = await api.createProject(owner);
    const teammate = await api.registerUser('teammate');
    await api.addMember(owner, project.id, teammate.email);
    // Asignar la tarea al compañero hace que el front pueda resolver su email
    // en la lista de miembros (ver client/src/lib/members.ts).
    const task = await api.createTask(owner, project.id, { assigneeId: teammate.id });

    const texto = unique('Comentario del companero');
    await api.addComment(teammate, task.id, texto);

    await signIn(owner);
    await taskDetailPage.open(project.id, task.id);

    const comment = taskDetailPage.commentByBody(texto);
    await comment.waitFor();
    await expect(comment.body).toHaveText(texto);
    await expect(comment.author).toHaveText(teammate.email);
    await expect(comment.date).not.toBeEmpty();
  });

  test('solo los comentarios propios ofrecen borrar', async ({
    api,
    owner,
    signIn,
    taskDetailPage,
  }) => {
    const project = await api.createProject(owner);
    const teammate = await api.registerUser('teammate');
    await api.addMember(owner, project.id, teammate.email);
    const task = await api.createTask(owner, project.id);

    const propio = unique('Lo escribi yo');
    const ajeno = unique('Lo escribio otro');
    await api.addComment(owner, task.id, propio);
    await api.addComment(teammate, task.id, ajeno);

    await signIn(owner);
    await taskDetailPage.open(project.id, task.id);
    await expect(taskDetailPage.commentItems).toHaveCount(2);

    expect(await taskDetailPage.commentByBody(propio).canDelete()).toBe(true);
    expect(await taskDetailPage.commentByBody(ajeno).canDelete()).toBe(false);
  });

  test('borrar un comentario propio lo saca de la lista', async ({
    api,
    owner,
    signIn,
    taskDetailPage,
  }) => {
    const project = await api.createProject(owner);
    const task = await api.createTask(owner, project.id);
    const aBorrar = unique('Este se va');
    const queQueda = unique('Este se queda');
    await api.addComment(owner, task.id, aBorrar);
    await api.addComment(owner, task.id, queQueda);

    await signIn(owner);
    await taskDetailPage.open(project.id, task.id);
    await expect(taskDetailPage.commentItems).toHaveCount(2);

    await taskDetailPage.commentByBody(aBorrar).delete();

    await expect(taskDetailPage.commentItems).toHaveCount(1);
    const [restante] = await taskDetailPage.comments();
    expect(await restante.text()).toBe(queQueda);
  });

  test('comentar desde la UI agrega la pieza a la lista', async ({
    api,
    owner,
    signIn,
    taskDetailPage,
  }) => {
    const project = await api.createProject(owner);
    const task = await api.createTask(owner, project.id);

    await signIn(owner);
    await taskDetailPage.open(project.id, task.id);
    await expect(taskDetailPage.commentItems).toHaveCount(0);

    const texto = unique('Comentario nuevo');
    await taskDetailPage.addComment(texto);

    await expect(taskDetailPage.commentItems).toHaveCount(1);
    expect(await taskDetailPage.commentByBody(texto).canDelete()).toBe(true);
  });
});
