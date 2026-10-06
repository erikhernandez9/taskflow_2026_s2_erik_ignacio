import type { Locator } from '@playwright/test';
import { BaseComponent } from './base.component';

export interface MemberSnapshot {
  email: string;
  role: string;
  removable: boolean;
}

/**
 * Component Object de `member-item` — una fila de la lista de miembros.
 *
 * Igual que comment-item, su render depende del contexto: el botón de quitar
 * aparece solo si quien mira es el owner y la fila no es la del owner mismo.
 */
export class MemberItemComponent extends BaseComponent {
  static readonly TEST_ID = 'member-item';

  get email(): Locator {
    return this.child('member-item-email');
  }

  get role(): Locator {
    return this.child('member-item-role');
  }

  get removeButton(): Locator {
    return this.child('member-remove-button');
  }

  async emailText(): Promise<string> {
    return this.textOf('member-item-email');
  }

  async roleText(): Promise<string> {
    return this.textOf('member-item-role');
  }

  async canRemove(): Promise<boolean> {
    return (await this.removeButton.count()) > 0;
  }

  async remove(): Promise<void> {
    await this.removeButton.click();
    await this.root.waitFor({ state: 'detached' });
  }

  async snapshot(): Promise<MemberSnapshot> {
    return {
      email: await this.emailText(),
      role: await this.roleText(),
      removable: await this.canRemove(),
    };
  }
}
