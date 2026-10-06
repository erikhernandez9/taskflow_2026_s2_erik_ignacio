import type { Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { CommentItemComponent, toComponents } from '../components';
import type { TaskStatus } from '../config';

/**
 * Page Object del detalle de tarea.
 *
 * Es dueño de: formulario de edición, cambio de estado, etiquetas e historial.
 * Los comentarios los expone como CommentItemComponent.
 */
export class TaskDetailPage extends BasePage {
  static path(projectId: string, taskId: string): string {
    return `/projects/${projectId}/tasks/${taskId}`;
  }

  get root(): Locator {
    return this.page.getByTestId('task-detail-page');
  }

  async open(projectId: string, taskId: string): Promise<void> {
    await this.navigate(TaskDetailPage.path(projectId, taskId));
  }

  get taskId(): Locator {
    return this.page.getByTestId('task-detail-id');
  }

  get backLink(): Locator {
    return this.page.getByTestId('task-detail-back-link');
  }

  // --- edición ---

  get titleInput(): Locator {
    return this.page.getByTestId('task-title-input');
  }

  get descriptionInput(): Locator {
    return this.page.getByTestId('task-description-input');
  }

  get prioritySelect(): Locator {
    return this.page.getByTestId('task-priority-select');
  }

  get saveButton(): Locator {
    return this.page.getByTestId('task-save-button');
  }

  async rename(title: string): Promise<void> {
    await this.titleInput.fill(title);
    await this.saveButton.click();
  }

  // --- estado ---

  get currentStatus(): Locator {
    return this.page.getByTestId('task-current-status');
  }

  async changeStatus(status: TaskStatus): Promise<void> {
    await this.page.getByTestId('task-status-select').selectOption(status);
    await this.page.getByTestId('task-status-submit').click();
  }

  // --- comment-item (la pieza repetida) ---

  get commentList(): Locator {
    return this.page.getByTestId('comment-list');
  }

  get commentItems(): Locator {
    return this.commentList.getByTestId(CommentItemComponent.TEST_ID);
  }

  async comments(): Promise<CommentItemComponent[]> {
    return toComponents(this.commentItems, (root) => new CommentItemComponent(root));
  }

  commentByBody(body: string): CommentItemComponent {
    const bodyLocator = this.page.getByTestId('comment-item-body').filter({ hasText: body });
    const root = this.page
      .getByTestId(CommentItemComponent.TEST_ID)
      .filter({ has: bodyLocator });
    return new CommentItemComponent(root);
  }

  async addComment(body: string): Promise<void> {
    await this.page.getByTestId('comment-add-input').fill(body);
    await this.page.getByTestId('comment-add-button').click();
  }

  // --- etiquetas e historial ---

  get tagChips(): Locator {
    return this.page.getByTestId('tag-chip');
  }

  async addTag(name: string): Promise<void> {
    await this.page.getByTestId('tag-add-input').fill(name);
    await this.page.getByTestId('tag-add-button').click();
  }

  get historyItems(): Locator {
    return this.page.getByTestId('history-item');
  }
}
