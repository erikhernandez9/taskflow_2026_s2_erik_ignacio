import type { Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class ProjectsPage extends BasePage {
  get root(): Locator {
    return this.page.getByTestId('projects-page');
  }

  async open(): Promise<void> {
    await this.navigate('/projects');
  }

  get projectCards(): Locator {
    return this.page.getByTestId('project-card');
  }

  cardByName(name: string): Locator {
    const nameLocator = this.page.getByTestId('project-card-name').filter({ hasText: name });
    return this.page.getByTestId('project-card').filter({ has: nameLocator });
  }

  async createProject(name: string, description?: string): Promise<void> {
    await this.page.getByTestId('project-name-input').fill(name);
    if (description !== undefined) {
      await this.page.getByTestId('project-description-input').fill(description);
    }
    await this.page.getByTestId('project-create-submit').click();
  }

  async openProject(name: string): Promise<void> {
    await this.cardByName(name).getByTestId('project-card-name').click();
  }
}
