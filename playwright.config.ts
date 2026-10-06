import { defineConfig, devices } from '@playwright/test';
import { WEB_URL } from './e2e/config';

/**
 * Configuración del framework de E2E de TaskFlow.
 *
 * `npm run dev` levanta API (:3000) y frontend (:5173) juntos, así que un solo
 * webServer alcanza para las dos puntas. La base tiene que existir previamente:
 * `npm run db:setup` una vez.
 */
export default defineConfig({
  testDir: './e2e/specs',
  testMatch: '**/*.spec.ts',

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 5_000 },

  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],

  use: {
    baseURL: WEB_URL,
    // Los data-testid ya están puestos en el cliente; es el locator por defecto.
    testIdAttribute: 'data-testid',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    command: 'npm run dev',
    url: WEB_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
