import { randomUUID } from 'node:crypto';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import { DEFAULT_PASSWORD, type TaskPriority } from '../config';

export interface Session {
  id: string;
  email: string;
  token: string;
}

export interface ProjectRef {
  id: string;
  name: string;
}

export interface TaskRef {
  id: string;
  title: string;
}

/** Sufijo único por test, para que las corridas no se pisen entre sí. */
export function unique(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

async function ok(res: APIResponse, what: string): Promise<APIResponse> {
  if (!res.ok()) {
    throw new Error(`Arrange por API falló (${what}): ${res.status()} ${await res.text()}`);
  }
  return res;
}

/**
 * Cliente de la API usado SOLO para armar el estado previo de cada test.
 *
 * El arrange por API en vez de por UI es deliberado: un test del tablero no
 * debería romperse porque cambió el formulario de login o el de alta de
 * proyecto. La UI se ejercita únicamente en lo que el test afirma.
 */
export class ApiClient {
  constructor(private readonly request: APIRequestContext) {}

  private authFor(session: Session) {
    return { Authorization: `Bearer ${session.token}` };
  }

  /**
   * El baseURL del contexto es el host pelado, así que el prefijo /api va acá.
   * (Un path con "/" inicial descarta el path del baseURL en la resolución de
   * URLs de Playwright; de ahí que no se pueda meter /api en el baseURL.)
   */
  private url(path: string): string {
    return `/api${path}`;
  }

  async registerUser(prefix = 'e2e'): Promise<Session> {
    const email = `${unique(prefix)}@test.com`;
    const res = await ok(
      await this.request.post(this.url('/auth/register'), {
        data: { email, password: DEFAULT_PASSWORD, name: prefix },
      }),
      'register',
    );
    const body = await res.json();
    return { id: body.user.id, email, token: body.token };
  }

  async createProject(session: Session, name = unique('Proyecto')): Promise<ProjectRef> {
    const res = await ok(
      await this.request.post(this.url('/projects'), {
        headers: this.authFor(session),
        data: { name },
      }),
      'createProject',
    );
    const body = await res.json();
    return { id: body.id, name: body.name };
  }

  async createTask(
    session: Session,
    projectId: string,
    input: {
      title?: string;
      description?: string;
      priority?: TaskPriority;
      assigneeId?: string;
      dueDate?: string;
    } = {},
  ): Promise<TaskRef> {
    const title = input.title ?? unique('Tarea');
    const res = await ok(
      await this.request.post(this.url(`/projects/${projectId}/tasks`), {
        headers: this.authFor(session),
        data: { ...input, title },
      }),
      'createTask',
    );
    const body = await res.json();
    return { id: body.id, title: body.title };
  }

  async addMember(session: Session, projectId: string, email: string): Promise<void> {
    await ok(
      await this.request.post(this.url(`/projects/${projectId}/members`), {
        headers: this.authFor(session),
        data: { email },
      }),
      'addMember',
    );
  }

  async addComment(session: Session, taskId: string, body: string): Promise<string> {
    const res = await ok(
      await this.request.post(this.url(`/tasks/${taskId}/comments`), {
        headers: this.authFor(session),
        data: { body },
      }),
      'addComment',
    );
    return (await res.json()).id;
  }
}
