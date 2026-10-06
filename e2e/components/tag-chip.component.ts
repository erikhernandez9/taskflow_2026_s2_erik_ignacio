import type { Locator } from '@playwright/test';
import { BaseComponent } from './base.component';

/**
 * Component Object de `tag-chip` — una etiqueta del detalle de tarea.
 *
 * Pieza chica pero con acción propia (quitar) y direccionable por nombre, que
 * es lo que la hace calificar según los criterios del ADR 0001.
 */
export class TagChipComponent extends BaseComponent {
  static readonly TEST_ID = 'tag-chip';

  get name(): Locator {
    return this.child('tag-chip-name');
  }

  get removeButton(): Locator {
    return this.child('tag-remove-button');
  }

  async text(): Promise<string> {
    return this.textOf('tag-chip-name');
  }

  async remove(): Promise<void> {
    await this.removeButton.click();
    await this.root.waitFor({ state: 'detached' });
  }
}
