import type { Locator } from '@playwright/test';
import { BaseComponent } from './base.component';

export interface CommentSnapshot {
  body: string;
  author: string;
  date: string;
  deletable: boolean;
}

/**
 * Component Object de `comment-item` — un comentario de la lista del detalle.
 *
 * Su particularidad es que NO todas las instancias son iguales: el botón de
 * borrar solo se renderiza si el comentario es del usuario logueado. Esa
 * condicionalidad es justamente lo que conviene encapsular, para que los tests
 * pregunten `canDelete()` en vez de reimplementar el chequeo cada vez.
 */
export class CommentItemComponent extends BaseComponent {
  static readonly TEST_ID = 'comment-item';

  get body(): Locator {
    return this.child('comment-item-body');
  }

  get author(): Locator {
    return this.child('comment-item-author');
  }

  get date(): Locator {
    return this.child('comment-item-date');
  }

  get deleteButton(): Locator {
    return this.child('comment-delete-button');
  }

  async text(): Promise<string> {
    return this.textOf('comment-item-body');
  }

  /** El botón de borrar solo existe sobre los comentarios propios. */
  async canDelete(): Promise<boolean> {
    return (await this.deleteButton.count()) > 0;
  }

  async delete(): Promise<void> {
    await this.deleteButton.click();
    await this.root.waitFor({ state: 'detached' });
  }

  async snapshot(): Promise<CommentSnapshot> {
    return {
      body: await this.text(),
      author: await this.textOf('comment-item-author'),
      date: await this.textOf('comment-item-date'),
      deletable: await this.canDelete(),
    };
  }
}
