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

  /**
   * Hace click y espera la respuesta de la API que ese click dispara.
   *
   * Esperar a que un boton "vuelva a habilitarse" no sirve: el chequeo corre
   * antes de que React re-renderice el estado deshabilitado, pasa de una y deja
   * la request en vuelo. Un reload o una navegacion posterior la cancela y el
   * cambio se pierde de forma intermitente.
   */
  protected async clickAndWaitForApi(
    button: Locator,
    method: string,
    pathFragment: string,
  ): Promise<void> {
    const response = this.page.waitForResponse(
      (r) => r.request().method() === method && r.url().includes(pathFragment),
    );
    await button.click();
    await response;
  }

  protected async navigate(path: string): Promise<void> {
    await this.page.goto(path);
    await this.root.waitFor({ state: 'visible' });
    await this.settle();
  }

  /**
   * Espera a que la pantalla termine de pedir datos antes de devolver el control.
   *
   * No es paranoia: el cliente corre con React.StrictMode, que en desarrollo
   * invoca los efectos dos veces. La segunda respuesta de loadTask() vuelve a
   * llamar a syncForm() y pisa lo que el test haya tipeado en el formulario
   * mientras tanto — el root ya es visible desde la primera respuesta, asi que
   * esperar al root no alcanza. Esto hace que la espera sea explicita y no
   * dependa de la suerte del scheduler.
   */
  protected async settle(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
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
