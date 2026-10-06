import type { Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { CommentItemComponent, TagChipComponent, toComponents } from '../components';
import type { TaskPriority, TaskStatus } from '../config';

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

  async fillForm(fields: {
    title?: string;
    description?: string;
    priority?: TaskPriority;
  }): Promise<void> {
    if (fields.title !== undefined) await this.titleInput.fill(fields.title);
    if (fields.description !== undefined) await this.descriptionInput.fill(fields.description);
    if (fields.priority !== undefined) await this.prioritySelect.selectOption(fields.priority);
  }

  async save(): Promise<void> {
    await this.clickAndWaitForApi(this.saveButton, 'PATCH', '/api/tasks/');
  }

  async edit(fields: {
    title?: string;
    description?: string;
    priority?: TaskPriority;
  }): Promise<void> {
    await this.fillForm(fields);
    await this.save();
  }

  async rename(title: string): Promise<void> {
    await this.edit({ title });
  }

  // --- estado ---

  get currentStatus(): Locator {
    return this.page.getByTestId('task-current-status');
  }

  get statusSubmit(): Locator {
    return this.page.getByTestId('task-status-submit');
  }

  async changeStatus(status: TaskStatus): Promise<void> {
    await this.page.getByTestId('task-status-select').selectOption(status);
    await this.clickAndWaitForApi(this.statusSubmit, 'PATCH', '/api/tasks/');
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

  get commentAddButton(): Locator {
    return this.page.getByTestId('comment-add-button');
  }

  async addComment(body: string): Promise<void> {
    await this.page.getByTestId('comment-add-input').fill(body);
    await this.clickAndWaitForApi(this.commentAddButton, 'POST', '/comments');
  }

  // --- etiquetas e historial ---

  get tagChips(): Locator {
    return this.page.getByTestId('tag-list').getByTestId(TagChipComponent.TEST_ID);
  }

  async tags(): Promise<TagChipComponent[]> {
    return toComponents(this.tagChips, (root) => new TagChipComponent(root));
  }

  tagByName(name: string): TagChipComponent {
    const nameLocator = this.page.getByTestId('tag-chip-name').filter({ hasText: name });
    const root = this.page.getByTestId(TagChipComponent.TEST_ID).filter({ has: nameLocator });
    return new TagChipComponent(root);
  }

  get tagAddInput(): Locator {
    return this.page.getByTestId('tag-add-input');
  }

  get tagAddButton(): Locator {
    return this.page.getByTestId('tag-add-button');
  }

  /**
   * Agrega una etiqueta y espera a que el chip aparezca. La espera no es
   * cosmetica: el cliente limpia el input y recarga la tarea despues de que
   * responde el POST, asi que encadenar dos altas sin esperar hace que la
   * segunda se pise con el reset de la primera.
   * Para los casos negativos usar tagAddInput/tagAddButton directamente.
   */
  async addTag(name: string): Promise<void> {
    await this.tagAddInput.fill(name);
    await this.tagAddButton.click();
    await this.tagByName(name).waitFor();
  }

  get historyItems(): Locator {
    return this.page.getByTestId('history-item');
  }
}
