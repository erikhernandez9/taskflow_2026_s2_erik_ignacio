import type { Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  get root(): Locator {
    return this.page.getByTestId('login-page');
  }

  get emailInput(): Locator {
    return this.page.getByTestId('login-email-input');
  }

  get passwordInput(): Locator {
    return this.page.getByTestId('login-password-input');
  }

  get nameInput(): Locator {
    return this.page.getByTestId('login-name-input');
  }

  get submitButton(): Locator {
    return this.page.getByTestId('login-submit');
  }

  get modeToggle(): Locator {
    return this.page.getByTestId('login-mode-toggle');
  }

  async open(): Promise<void> {
    await this.navigate('/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  /** El formulario es el mismo; el toggle agrega el campo nombre. */
  async switchToRegister(): Promise<void> {
    await this.modeToggle.click();
    await this.nameInput.waitFor({ state: 'visible' });
  }

  async register(email: string, password: string, name = ''): Promise<void> {
    await this.switchToRegister();
    if (name) await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
