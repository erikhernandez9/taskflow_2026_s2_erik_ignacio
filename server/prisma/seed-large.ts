import { PrismaClient } from '@prisma/client';

/**
 * Seed grande para el práctico de performance: el volumen del requerimiento no
 * funcional de rendimiento (5.000 tareas y 20.000 comentarios).
 *
 * Se suma a la seed chica, que tiene que estar cargada antes. Se puede correr
 * más de una vez: borra sus propios datos y los vuelve a crear.
 */
const db = new PrismaClient();

const LOAD_PREFIX = 'Carga ';
const PROJECTS = 200;
const TASKS = 5000;
const COMMENTS = 20000;
const BATCH_SIZE = 500;
const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function projectName(index: number): string {
  return `${LOAD_PREFIX}${String(index + 1).padStart(3, '0')}`;
}

async function inBatches<T>(rows: T[], insert: (batch: T[]) => Promise<unknown>): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    await insert(rows.slice(i, i + BATCH_SIZE));
  }
}

async function removePreviousRun(): Promise<void> {
  const projects = await db.project.findMany({
    where: { name: { startsWith: LOAD_PREFIX } },
    select: { id: true },
  });
  const projectIds = projects.map((p) => p.id);
  const tasks = await db.task.findMany({
    where: { projectId: { in: projectIds } },
    select: { id: true },
  });
  const taskIds = tasks.map((t) => t.id);

  await inBatches(taskIds, (ids) => db.comment.deleteMany({ where: { taskId: { in: ids } } }));
  await inBatches(taskIds, (ids) => db.taskHistory.deleteMany({ where: { taskId: { in: ids } } }));
  await db.project.deleteMany({ where: { id: { in: projectIds } } });
}

async function main() {
  const ana = await db.user.findUnique({ where: { email: 'ana@test.com' } });
  const bob = await db.user.findUnique({ where: { email: 'bob@test.com' } });
  if (!ana || !bob) {
    throw new Error('Faltan usuarios: corré primero npm run db:reset, que carga la seed chica.');
  }

  await removePreviousRun();

  const projectIds: number[] = [];
  for (let i = 0; i < PROJECTS; i += 1) {
    const project = await db.project.create({
      data: { name: projectName(i), description: 'Proyecto de carga', ownerId: ana.id },
    });
    projectIds.push(project.id);
  }
  await inBatches(projectIds, (ids) =>
    db.projectMember.createMany({
      data: ids.flatMap((projectId) => [
        { projectId, userId: ana.id, role: 'OWNER' },
        { projectId, userId: bob.id, role: 'MEMBER' },
      ]),
    }),
  );

  // El SLO es sobre "el listado de tareas": todas van al primer proyecto.
  const mainProjectId = projectIds[0];
  const taskRows = Array.from({ length: TASKS }, (_unused, i) => ({
    projectId: mainProjectId,
    title: `Tarea de carga ${i + 1}`,
    description: `Descripción de la tarea de carga ${i + 1}`,
    status: STATUSES[i % STATUSES.length],
    priority: PRIORITIES[i % PRIORITIES.length],
    assigneeId: i % 2 === 0 ? ana.id : bob.id,
  }));
  await inBatches(taskRows, (batch) => db.task.createMany({ data: batch }));

  const tasks = await db.task.findMany({
    where: { projectId: mainProjectId },
    select: { id: true },
    orderBy: { id: 'asc' },
  });
  const commentRows = Array.from({ length: COMMENTS }, (_unused, i) => ({
    taskId: tasks[i % tasks.length].id,
    authorId: i % 2 === 0 ? ana.id : bob.id,
    body: `Comentario de carga ${i + 1}`,
  }));
  await inBatches(commentRows, (batch) => db.comment.createMany({ data: batch }));

  // eslint-disable-next-line no-console
  console.log(
    `Seed grande lista: ${PROJECTS} proyectos de carga, ${TASKS} tareas y ${COMMENTS} comentarios.`,
  );
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
