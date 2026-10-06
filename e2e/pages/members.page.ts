import type { Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { MemberItemComponent, toComponents } from '../components';

/**
 * Page Object de la pantalla de miembros.
 *
 * Es dueño de: navegación, alta por email y la nota de solo-lectura.
 * Las filas las expone como MemberItemComponent.
 */
export class MembersPage extends BasePage {
  static path(projectId: string): string {
    return `/projects/${projectId}/members`;
  }

  get root(): Locator {
    return this.page.getByTestId('members-page');
  }

  async open(projectId: string): Promise<void> {
    await this.navigate(MembersPage.path(projectId));
  }

  get addForm(): Locator {
    return this.page.getByTestId('member-add-form');
  }

  get readonlyNote(): Locator {
    return this.page.getByTestId('members-readonly-note');
  }

  get boardLink(): Locator {
    return this.page.getByTestId('members-board-link');
  }

  async addMember(email: string): Promise<void> {
    await this.page.getByTestId('member-email-input').fill(email);
    await this.page.getByTestId('member-add-button').click();
  }

  // --- member-item (la pieza repetida) ---

  get memberItems(): Locator {
    return this.page.getByTestId('member-list').getByTestId(MemberItemComponent.TEST_ID);
  }

  async members(): Promise<MemberItemComponent[]> {
    return toComponents(this.memberItems, (root) => new MemberItemComponent(root));
  }

  memberByEmail(email: string): MemberItemComponent {
    const emailLocator = this.page.getByTestId('member-item-email').filter({ hasText: email });
    const root = this.page
      .getByTestId(MemberItemComponent.TEST_ID)
      .filter({ has: emailLocator });
    return new MemberItemComponent(root);
  }
}
