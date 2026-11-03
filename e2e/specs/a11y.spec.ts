import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Auditoría de accesibilidad WCAG 2.1 AA — Clase 12, Módulo 2.
 *
 * Adaptado de la guía de la cátedra al repo real de TaskFlow (server/ + client/,
 * API :3000, usuarios del seed con ana@test.com). El repo de referencia de la
 * guía usa otra estructura, rutas y testids; acá se ajustan.
 *
 * Cómo se usa:
 *   1. Informe:   npx playwright test a11y --project=chromium
 *      Cada violación muestra la regla de axe, el SC de WCAG, el nivel y los
 *      elementos afectados. No falla nunca: sirve para leer y documentar.
 *   2. Se corrige UNA violación en client/src/.
 *   3. Se pone el id de esa regla en VERIFICAR.regla y se vuelve a correr: el
 *      test de verificación pasa de rojo a verde cuando la corrección funciona.
 */

const TAGS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/**
 * Corrección aplicada: se agregó aria-label a tag-add-input y comment-add-input
 * en client/src/pages/TaskDetailPage.tsx (regla "label", SC 4.1.2, en la vista
 * Detalle de tarea). El test de verificación confirma que ya no aparece.
 */
const VERIFICAR: { regla: string | null; vistas: string[] } = {
  regla: 'label',
  vistas: ['Detalle de tarea'],
};

const ANA = { email: 'ana@test.com', password: 'Password1' };

async function loginComoAna(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByTestId('login-email-input').fill(ANA.email);
  await page.getByTestId('login-password-input').fill(ANA.password);
  await page.getByTestId('login-submit').click();
  await page.waitForURL('**/projects');
}

async function abrirPrimerProyecto(page: Page): Promise<void> {
  await loginComoAna(page);
  await page.getByTestId('project-card-name').first().click();
  await expect(page.getByTestId('board-page')).toBeVisible();
}

const VISTAS: { nombre: string; abrir: (page: Page) => Promise<void> }[] = [
  { nombre: 'Login', abrir: async (page) => { await page.goto('/login'); } },
  {
    nombre: 'Registro',
    abrir: async (page) => {
      await page.goto('/login');
      await page.getByTestId('login-mode-toggle').click();
      await expect(page.getByTestId('login-name-input')).toBeVisible();
    },
  },
  {
    nombre: 'Proyectos',
    abrir: async (page) => {
      await loginComoAna(page);
      await expect(page.getByTestId('project-card').first()).toBeVisible();
    },
  },
  {
    nombre: 'Tablero',
    abrir: abrirPrimerProyecto,
  },
  {
    nombre: 'Detalle de tarea',
    abrir: async (page) => {
      await abrirPrimerProyecto(page);
      await page.getByTestId('task-card-title').first().click();
      await expect(page.getByTestId('task-detail-page')).toBeVisible();
    },
  },
];

/** 'wcag143' -> '1.4.3' ; 'wcag2410' -> '2.4.10' */
function tagASc(tag: string): string | null {
  const m = /^wcag(\d)(\d)(\d{1,2})$/.exec(tag);
  return m ? `${m[1]}.${m[2]}.${m[3]}` : null;
}

function nivel(tags: string[]): string {
  return tags.some((t) => t.endsWith('aa')) ? 'AA' : 'A';
}

async function auditar(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS_WCAG).analyze();
  return violations;
}

// 1) Informe: no falla, sirve para leer y documentar los hallazgos.
test.describe('Informe de accesibilidad WCAG 2.1 AA', () => {
  for (const vista of VISTAS) {
    test(`${vista.nombre}: informe de violaciones`, async ({ page }, testInfo) => {
      await vista.abrir(page);
      const violations = await auditar(page);

      // eslint-disable-next-line no-console
      console.log(`\n=== ${vista.nombre}: ${violations.length} regla(s) violada(s) ===`);
      for (const v of violations) {
        const sc = v.tags.map(tagASc).filter(Boolean).join(', ');
        // eslint-disable-next-line no-console
        console.log(`\n[${(v.impact ?? 'n/a').toUpperCase()}] ${v.id} — ${v.help}`);
        // eslint-disable-next-line no-console
        console.log(`   SC WCAG: ${sc || 'n/a'}  ·  Nivel ${nivel(v.tags)}`);
        // eslint-disable-next-line no-console
        console.log(`   Elementos afectados: ${v.nodes.length}`);
        v.nodes.slice(0, 3).forEach((n) =>
          // eslint-disable-next-line no-console
          console.log(`   · ${n.target.join(' ')}`),
        );
      }

      await testInfo.attach(`axe-${vista.nombre}.json`, {
        body: JSON.stringify(violations, null, 2),
        contentType: 'application/json',
      });
    });
  }
});

// 2) Verificación de la corrección (rojo -> verde).
test.describe('Verificación de la corrección', () => {
  test.skip(!VERIFICAR.regla, 'Definí VERIFICAR.regla con el id de la regla que corregiste');

  for (const vista of VISTAS.filter((v) => VERIFICAR.vistas.includes(v.nombre))) {
    test(`${vista.nombre}: ya no hay violaciones de "${VERIFICAR.regla}"`, async ({ page }) => {
      await vista.abrir(page);
      const ids = (await auditar(page)).map((v) => v.id);
      expect(ids).not.toContain(VERIFICAR.regla);
    });
  }
});
