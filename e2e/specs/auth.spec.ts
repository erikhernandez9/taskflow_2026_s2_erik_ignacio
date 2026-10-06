import { expect, test } from '../support/fixtures';
import { DEFAULT_PASSWORD } from '../config';
import { unique } from '../support/api-client';

/**
 * Casos de la pantalla de login/registro y del guard de rutas.
 *
 * Es el único spec que entra por la UI de autenticación: el resto de la suite
 * inyecta la sesión en localStorage para no pagar el login en cada test.
 */
test.describe('Autenticacion', () => {
  test('registrarse desde la UI crea la cuenta y entra a proyectos', async ({
    page,
    loginPage,
    projectsPage,
  }) => {
    const email = `${unique('nuevo')}@test.com`;

    await loginPage.open();
    await loginPage.register(email, DEFAULT_PASSWORD, 'Usuario Nuevo');

    await expect(projectsPage.root).toBeVisible();
    await expect(page).toHaveURL(/\/projects$/);
    await expect(projectsPage.currentUserEmail).toHaveText(email);
  });

  test('iniciar sesion con credenciales validas muestra el email en el header', async ({
    api,
    loginPage,
    projectsPage,
  }) => {
    const user = await api.registerUser('login');

    await loginPage.open();
    await loginPage.login(user.email, DEFAULT_PASSWORD);

    await expect(projectsPage.root).toBeVisible();
    await expect(projectsPage.currentUserEmail).toHaveText(user.email);
  });

  test('contrasena incorrecta muestra el error y no navega', async ({
    api,
    page,
    loginPage,
  }) => {
    const user = await api.registerUser('login');

    await loginPage.open();
    await loginPage.login(user.email, 'ContrasenaMala9');

    await expect(loginPage.errorMessage).toHaveText('Invalid credentials');
    await expect(loginPage.root).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('email inexistente tambien cae en credenciales invalidas', async ({ loginPage }) => {
    await loginPage.open();
    await loginPage.login(`${unique('fantasma')}@test.com`, DEFAULT_PASSWORD);

    await expect(loginPage.errorMessage).toHaveText('Invalid credentials');
  });

  test('registrarse con un email ya usado muestra el conflicto', async ({
    api,
    loginPage,
  }) => {
    const existente = await api.registerUser('duplicado');

    await loginPage.open();
    await loginPage.register(existente.email, DEFAULT_PASSWORD);

    await expect(loginPage.errorMessage).toHaveText('Email already registered');
    await expect(loginPage.root).toBeVisible();
  });

  test('registrarse con un email invalido muestra el error de validacion', async ({
    loginPage,
  }) => {
    await loginPage.open();
    await loginPage.register('no-es-un-email', DEFAULT_PASSWORD);

    await expect(loginPage.errorMessage).toHaveText('Email must be a valid address');
  });

  test('entrar a una ruta protegida sin sesion redirige al login', async ({
    page,
    loginPage,
  }) => {
    await page.goto('/projects');

    await expect(loginPage.root).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('cerrar sesion vuelve al login y limpia el token', async ({
    owner,
    page,
    signIn,
    projectsPage,
    loginPage,
  }) => {
    await signIn(owner);
    await projectsPage.open();
    await expect(projectsPage.header).toBeVisible();

    await projectsPage.logout();

    await expect(loginPage.root).toBeVisible();
    await expect(projectsPage.header).toHaveCount(0);
    expect(await page.evaluate(() => window.localStorage.getItem('taskflow_token'))).toBeNull();
  });
});
