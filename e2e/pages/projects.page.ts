import type { Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { ProjectCardComponent, toComponents } from '../components';

export class ProjectsPage extends BasePage {
  get root(): Locator {
    return this.page.getByTestId('projects-page');
  }

  async open(): Promise<void> {
    await this.navigate('/projects');
  }

  get createForm(): Locator {
    return this.page.getByTestId('project-create-form');
  }

  // --- project-card (la pieza repetida) ---

  get cards(): Locator {
    return this.page.getByTestId('project-list').getByTestId(ProjectCardComponent.TEST_ID);
  }

  async projectCards(): Promise<ProjectCardComponent[]> {
    return toComponents(this.cards, (root) => new ProjectCardComponent(root));
  }

  cardByName(name: string): ProjectCardComponent {
    const nameLink = this.page.getByTestId('project-card-name').filter({ hasText: name });
    const root = this.page.getByTestId(ProjectCardComponent.TEST_ID).filter({ has: nameLink });
    return new ProjectCardComponent(root);
  }

  async createProject(name: string, description?: string): Promise<void> {
    await this.page.getByTestId('project-name-input').fill(name);
    if (description !== undefined) {
      await this.page.getByTestId('project-description-input').fill(description);
    }
    await this.page.getByTestId('project-create-submit').click();
  }
}
