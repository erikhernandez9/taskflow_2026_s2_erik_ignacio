import type { Locator, Page } from '@playwright/test';

/**
 * Base de todo Page Object.
 *
 * El Page Object es dueño de la navegación, del chrome de la pantalla
 * (header, errores, loading) y de los formularios que existen una sola vez.
 * Lo que se repite dentro de la pantalla NO vive acá: lo devuelve como
 * Component Object.
 */
export abstract class BasePage {
  constructor(readonly page: Page) {}

  /** Raíz de la pantalla; cada Page Object define su propio data-testid. */
  abstract get root(): Locator;

  protected async navigate(path: string): Promise<void> {
    await this.page.goto(path);
    await this.root.waitFor({ state: 'visible' });
  }

  // --- chrome común a todas las pantallas autenticadas ---

  get header(): Locator {
    return this.page.getByTestId('app-header');
  }

  get currentUserEmail(): Locator {
    return this.page.getByTestId('header-user-email');
  }

  get logoutButton(): Locator {
    return this.page.getByTestId('logout-button');
  }

  get errorMessage(): Locator {
    return this.page.getByTestId('error-message');
  }

  get emptyState(): Locator {
    return this.page.getByTestId('empty-state');
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
  }
}
