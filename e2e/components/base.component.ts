import type { Locator, Page } from '@playwright/test';

/**
 * Base de todo Component Object.
 *
 * Un Component Object encapsula UNA pieza de UI que se repite, y se ancla a un
 * `root` (el Locator del elemento raíz de esa pieza). Todas las consultas salen
 * desde ese root, nunca desde `page`: eso es lo que permite tener N instancias
 * de la misma pieza en pantalla sin que los selectores se pisen entre sí.
 */
export abstract class BaseComponent {
  constructor(readonly root: Locator) {}

  protected get page(): Page {
    return this.root.page();
  }

  /** Busca un data-testid dentro de esta instancia de la pieza. */
  protected child(testId: string): Locator {
    return this.root.getByTestId(testId);
  }

  async isVisible(): Promise<boolean> {
    return this.root.isVisible();
  }

  async waitFor(): Promise<void> {
    await this.root.waitFor({ state: 'visible' });
  }

  /** Texto normalizado de un hijo (sin espacios de más ni saltos de línea). */
  protected async textOf(testId: string): Promise<string> {
    return (await this.child(testId).innerText()).trim();
  }
}

/**
 * Convierte un Locator que matchea N elementos en N Component Objects.
 * Es el puente entre "una lista en el DOM" y "una lista de objetos tipados".
 */
export async function toComponents<T extends BaseComponent>(
  locator: Locator,
  make: (root: Locator) => T,
): Promise<T[]> {
  const count = await locator.count();
  return Array.from({ length: count }, (_, i) => make(locator.nth(i)));
}
