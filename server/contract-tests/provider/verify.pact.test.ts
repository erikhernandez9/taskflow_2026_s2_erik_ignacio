import { Server } from 'http';
import { AddressInfo } from 'net';
import path from 'path';
import bcrypt from 'bcryptjs';
import { Verifier } from '@pact-foundation/pact';
import { createApp } from '../../src/app';
import { db } from '../../src/lib/db';
import { signToken } from '../../src/middleware/auth';

let server: Server;
let baseUrl: string;
let token = '';

/** Vacía las tablas: cada estado parte de la misma base y no depende del anterior. */
async function resetDb() {
  await db.comment.deleteMany();
  await db.taskHistory.deleteMany();
  await db.task.deleteMany();
  await db.projectMember.deleteMany();
  await db.project.deleteMany();
  await db.user.deleteMany();
}

async function createAna(passwordHash = 'x') {
  const ana = await db.user.create({
    data: { email: 'ana@test.com', name: 'Ana', passwordHash },
  });
  token = signToken({ userId: ana.id, email: ana.email });
  return ana;
}

async function createAnaProject(ownerId: number) {
  const project = await db.project.create({
    data: {
      name: 'Rediseño del sitio',
      description: 'Renovación completa del sitio',
      ownerId,
    },
  });
  await db.projectMember.create({
    data: { projectId: project.id, userId: ownerId, role: 'OWNER' },
  });
  return project;
}

beforeAll(async () => {
  // La API real, en un puerto libre y con la base temporal de tests/setup.ts
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

describe('Verificación del provider: TaskFlowAPI', () => {
  it('cumple el contrato con TaskFlowWeb', async () => {
    await new Verifier({
      provider: 'TaskFlowAPI',
      providerBaseUrl: baseUrl,
      pactUrls: [path.resolve(process.cwd(), 'pacts/TaskFlowWeb-TaskFlowAPI.json')],

      // Cambia el token falso del contrato por uno real (solo si la request trae token)
      requestFilter: (req, _res, next) => {
        if (req.headers['authorization']) {
          req.headers['authorization'] = `Bearer ${token}`;
        }
        next();
      },

      // Prepara los datos de cada "given" del consumer
      stateHandlers: {
        'ana tiene un proyecto': async () => {
          await resetDb();
          const ana = await createAna();
          await createAnaProject(ana.id);
        },
        'ana está registrada': async () => {
          await resetDb();
          await createAna(await bcrypt.hash('Password1', 10));
        },
        'la tarea task-1 tiene comentarios': async () => {
          await resetDb();
          const ana = await createAna();
          const project = await createAnaProject(ana.id);
          // El contrato pide task-1: el id interno tiene que ser 1.
          const task = await db.task.create({
            data: { id: 1, projectId: project.id, title: 'Implementar login' },
          });
          await db.comment.create({
            data: { taskId: task.id, authorId: ana.id, body: 'Revisado y aprobado' },
          });
        },
      },
    }).verifyProvider();
  });
});
