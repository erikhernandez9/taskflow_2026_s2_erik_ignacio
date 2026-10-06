import type { Locator } from '@playwright/test';
import { BaseComponent } from './base.component';
import type { TaskStatus } from '../config';

export interface TaskCardSnapshot {
  title: string;
  priority: string;
  assignee: string;
  dueDate: string;
  commentCount: number;
  status: string;
}

/**
 * Component Object de `task-card` — la tarjeta de tarea del tablero.
 *
 * Se repite en las tres columnas (TODO / IN_PROGRESS / DONE) y es la pieza con
 * más comportamiento propio del tablero: además de mostrar datos, tiene un
 * select que dispara el cambio de estado sin salir de la pantalla.
 */
export class TaskCardComponent extends BaseComponent {
  static readonly TEST_ID = 'task-card';

  get titleLink(): Locator {
    return this.child('task-card-title');
  }

  get priority(): Locator {
    return this.child('task-card-priority');
  }

  get assignee(): Locator {
    return this.child('task-card-assignee');
  }

  get dueDate(): Locator {
    return this.child('task-card-duedate');
  }

  get commentCount(): Locator {
    return this.child('task-card-comment-count');
  }

  get statusSelect(): Locator {
    return this.child('task-card-status-select');
  }

  async title(): Promise<string> {
    return this.textOf('task-card-title');
  }

  /** Navega al detalle de la tarea. */
  async open(): Promise<void> {
    await this.titleLink.click();
  }

  /** Estado actual según el select de la tarjeta. */
  async status(): Promise<string> {
    return this.statusSelect.inputValue();
  }

  /** Mueve la tarea a otro estado desde la tarjeta misma. */
  async moveTo(status: TaskStatus): Promise<void> {
    await this.statusSelect.selectOption(status);
  }

  /** "3 comentarios" -> 3 */
  async comments(): Promise<number> {
    const raw = await this.textOf('task-card-comment-count');
    return Number.parseInt(raw, 10);
  }

  /** Lectura completa de la tarjeta, para assertions sobre varios campos a la vez. */
  async snapshot(): Promise<TaskCardSnapshot> {
    return {
      title: await this.title(),
      priority: await this.textOf('task-card-priority'),
      assignee: await this.textOf('task-card-assignee'),
      dueDate: await this.textOf('task-card-duedate'),
      commentCount: await this.comments(),
      status: await this.status(),
    };
  }
}
