import path from 'path';
import { MatchersV3, PactV3 } from '@pact-foundation/pact';

const { like, eachLike } = MatchersV3;

// Lo que hace el frontend: client/src/lib/api.ts → api<Project[]>('/projects').
// Se copia acá porque api.ts usa localStorage y una URL relativa: no corre en Node.
async function getProjects(baseUrl: string, token: string) {
  const res = await fetch(`${baseUrl}/api/projects`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return {
    status: res.status,
    body: (await res.json()) as Array<{ name: string }>,
  };
}

const pact = new PactV3({
  consumer: 'TaskFlowWeb',
  provider: 'TaskFlowAPI',
  dir: path.resolve(process.cwd(), 'pacts'),
});

describe('Contrato: lista de proyectos', () => {
  it('devuelve los proyectos del usuario', async () => {
    pact
      .given('ana tiene un proyecto')
      .uponReceiving('un GET a /api/projects')
      .withRequest({
        method: 'GET',
        path: '/api/projects',
        headers: { Authorization: like('Bearer abc') },
      })
      .willRespondWith({
        status: 200,
        // Solo los campos que usa ProjectsPage.tsx
        body: eachLike({
          id: like('proj-1'),
          name: like('Rediseño del sitio'),
          description: like('Renovación completa del sitio'),
          archived: like(false),
        }),
      });

    await pact.executeTest(async (mockServer) => {
      const { status, body } = await getProjects(mockServer.url, 'token-de-prueba');
      expect(status).toBe(200);
      expect(body.length).toBeGreaterThan(0);
      expect(body[0]).toHaveProperty('name');
    });
  });

  it('rechaza la request si no hay token', async () => {
    pact
      .uponReceiving('un GET a /api/projects sin token')
      .withRequest({ method: 'GET', path: '/api/projects' })
      .willRespondWith({
        status: 401,
        body: { error: { code: 'UNAUTHORIZED', message: like('Authentication required') } },
      });

    await pact.executeTest(async (mockServer) => {
      const res = await fetch(`${mockServer.url}/api/projects`);
      expect(res.status).toBe(401);
    });
  });
});

describe('Contrato: login', () => {
  it('devuelve el token y el usuario', async () => {
    pact
      .given('ana está registrada')
      .uponReceiving('un POST a /api/auth/login con credenciales válidas')
      .withRequest({
        method: 'POST',
        path: '/api/auth/login',
        headers: { 'Content-Type': 'application/json' },
        body: { email: 'ana@test.com', password: 'Password1' },
      })
      .willRespondWith({
        status: 200,
        // Lo que guarda client/src/lib/auth.tsx
        body: {
          token: like('jwt-de-ejemplo'),
          user: {
            id: like('user-1'),
            email: like('ana@test.com'),
            name: like('Ana'),
          },
        },
      });

    await pact.executeTest(async (mockServer) => {
      const res = await fetch(`${mockServer.url}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'ana@test.com', password: 'Password1' }),
      });
      const body = (await res.json()) as { token: string; user: { email: string } };
      expect(res.status).toBe(200);
      expect(typeof body.token).toBe('string');
      expect(body.user).toHaveProperty('email');
    });
  });
});

describe('Contrato: comentarios de una tarea', () => {
  it('devuelve la lista de comentarios', async () => {
    pact
      .given('la tarea task-1 tiene comentarios')
      .uponReceiving('un GET a /api/tasks/task-1/comments')
      .withRequest({
        method: 'GET',
        path: '/api/tasks/task-1/comments',
        headers: { Authorization: like('Bearer abc') },
      })
      .willRespondWith({
        status: 200,
        // Lo que dibuja la lista de comentarios de TaskDetailPage.tsx
        body: eachLike({
          id: like('comment-1'),
          taskId: like('task-1'),
          body: like('Revisado y aprobado'),
          createdAt: like('2026-09-15T14:32:00.000Z'),
        }),
      });

    await pact.executeTest(async (mockServer) => {
      const res = await fetch(`${mockServer.url}/api/tasks/task-1/comments`, {
        headers: { Authorization: 'Bearer token-de-prueba' },
      });
      const body = (await res.json()) as Array<{ body: string }>;
      expect(res.status).toBe(200);
      expect(body[0]).toHaveProperty('body');
    });
  });
});
