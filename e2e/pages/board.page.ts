import type { Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { TaskCardComponent, toComponents } from '../components';
import type { TaskPriority, TaskStatus } from '../config';

/**
 * Page Object del tablero.
 *
 * Es dueño de: navegación, formulario de alta, formulario de filtros y
 * contadores de columna. Las tarjetas las expone como TaskCardComponent.
 */
export class BoardPage extends BasePage {
  static path(projectId: string): string {
    return `/projects/${projectId}`;
  }

  get root(): Locator {
    return this.page.getByTestId('board-page');
  }

  async open(projectId: string): Promise<void> {
    await this.navigate(BoardPage.path(projectId));
  }

  get projectName(): Locator {
    return this.page.getByTestId('board-project-name');
  }

  get total(): Locator {
    return this.page.getByTestId('board-total');
  }

  get membersLink(): Locator {
    return this.page.getByTestId('board-members-link');
  }

  // --- columnas ---

  column(status: TaskStatus): Locator {
    return this.page.getByTestId(`board-column-${status}`);
  }

  columnCount(status: TaskStatus): Locator {
    return this.page.getByTestId(`board-column-count-${status}`);
  }

  // --- task-card (la pieza repetida) ---

  /** Todas las tarjetas del tablero, o las de una columna si se pasa status. */
  cards(status?: TaskStatus): Locator {
    const scope = status
      ? this.page.getByTestId(`board-column-list-${status}`)
      : this.page.getByTestId('board-page');
    return scope.getByTestId(TaskCardComponent.TEST_ID);
  }

  async taskCards(status?: TaskStatus): Promise<TaskCardComponent[]> {
    return toComponents(this.cards(status), (root) => new TaskCardComponent(root));
  }

  /** La tarjeta cuyo título coincide. Los tests usan títulos únicos. */
  cardByTitle(title: string): TaskCardComponent {
    const titleLink = this.page.getByTestId('task-card-title').filter({ hasText: title });
    const root = this.page.getByTestId(TaskCardComponent.TEST_ID).filter({ has: titleLink });
    return new TaskCardComponent(root);
  }

  // --- alta de tarea ---

  async createTask(input: {
    title: string;
    description?: string;
    priority?: TaskPriority;
    dueDate?: string;
  }): Promise<void> {
    await this.page.getByTestId('task-create-title-input').fill(input.title);
    if (input.description !== undefined) {
      await this.page.getByTestId('task-create-description-input').fill(input.description);
    }
    if (input.priority !== undefined) {
      await this.page.getByTestId('task-create-priority-select').selectOption(input.priority);
    }
    if (input.dueDate !== undefined) {
      await this.page.getByTestId('task-create-duedate-input').fill(input.dueDate);
    }
    await this.page.getByTestId('task-create-submit').click();
  }

  // --- filtros ---

  async filterByPriority(priority: TaskPriority | ''): Promise<void> {
    await this.page.getByTestId('filter-priority-select').selectOption(priority);
    await this.applyFilters();
  }

  async search(text: string): Promise<void> {
    await this.page.getByTestId('filter-search-input').fill(text);
    await this.applyFilters();
  }

  async applyFilters(): Promise<void> {
    await this.page.getByTestId('filter-apply-button').click();
  }

  async clearFilters(): Promise<void> {
    await this.page.getByTestId('filter-clear-button').click();
  }
}
