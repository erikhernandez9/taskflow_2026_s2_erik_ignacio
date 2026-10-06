import { test as base, expect } from '@playwright/test';
import { API_BASE } from '../config';
import { ApiClient, type Session } from './api-client';
import {
  BoardPage,
  LoginPage,
  MembersPage,
  ProjectsPage,
  TaskDetailPage,
} from '../pages';

interface TaskFlowFixtures {
  /** Cliente de la API para el arrange de cada test. */
  api: ApiClient;
  /** Usuario recién registrado, owner de lo que cree el test. */
  owner: Session;
  /** Inyecta la sesión en localStorage para saltear el login por UI. */
  signIn: (session: Session) => Promise<void>;
  loginPage: LoginPage;
  projectsPage: ProjectsPage;
  boardPage: BoardPage;
  taskDetailPage: TaskDetailPage;
  membersPage: MembersPage;
}

export const test = base.extend<TaskFlowFixtures>({
  api: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({ baseURL: API_BASE });
    await use(new ApiClient(context));
    await context.dispose();
  },

  owner: async ({ api }, use) => {
    await use(await api.registerUser('owner'));
  },

  // El front guarda la sesión en localStorage (ver client/src/lib/api.ts).
  // Sembrarla antes de la primera navegación evita repetir el login por UI en
  // cada test: el login se prueba en su propio spec, no como peaje de entrada.
  signIn: async ({ page }, use) => {
    await use(async (session: Session) => {
      await page.addInitScript(
        ({ token, user }) => {
          window.localStorage.setItem('taskflow_token', token);
          window.localStorage.setItem('taskflow_user', JSON.stringify(user));
        },
        { token: session.token, user: { id: session.id, email: session.email, name: null } },
      );
    });
  },

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  projectsPage: async ({ page }, use) => {
    await use(new ProjectsPage(page));
  },
  boardPage: async ({ page }, use) => {
    await use(new BoardPage(page));
  },
  taskDetailPage: async ({ page }, use) => {
    await use(new TaskDetailPage(page));
  },
  membersPage: async ({ page }, use) => {
    await use(new MembersPage(page));
  },
});

export { expect };
export type { Session };
