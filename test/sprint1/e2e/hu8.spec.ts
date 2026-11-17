import { expect, test } from '@playwright/test';
import { captura, type Campo, login, password, registrar, USUARIOS } from './helpers';

/**
 * HU8 — Gestión de Usuario.
 * El administrador crea una cuenta con rol y contraseña temporal, y luego se
 * inicia sesión con esa cuenta.
 */
test('HU8: crear un usuario e iniciar sesión con la cuenta nueva', async ({ page, browser }) => {
  const correo = 'maria.lopez@zoonosis.test';
  const datos: Campo[] = [
    { campo: 'Nombre completo', valor: 'María López Rojas' },
    { campo: 'Email', valor: correo },
    { campo: 'Rol', valor: 'Personal Veterinario' },
    { campo: 'Contraseña temporal', valor: 'contraseña válida' },
  ];

  await login(page, USUARIOS.admin);
  await page.getByRole('link', { name: 'Usuarios' }).click();
  await expect(page.getByRole('main').getByRole('heading', { name: 'Usuarios' })).toBeVisible();
  await page.getByRole('button', { name: 'Nuevo usuario' }).click();

  const dialogo = page.getByRole('dialog');
  await dialogo.getByLabel('Nombre completo').fill('María López Rojas');
  await dialogo.getByLabel('Email').fill(correo);
  await dialogo.getByLabel('Rol').selectOption({ label: 'Personal Veterinario' });
  await dialogo.getByLabel('Contraseña temporal').fill(password());

  // Captura inicial: formulario de nuevo usuario completo (la contraseña se ve enmascarada).
  await captura(page, 'HU8-inicial.png');

  await dialogo.getByRole('button', { name: 'Crear usuario' }).click();
  await expect(page.getByText('Usuario creado')).toBeVisible();
  await expect(page.getByText(correo)).toBeVisible();

  // Sesión nueva, sin cookies del administrador: ingresa la cuenta recién creada.
  const contexto = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'es-BO',
    timezoneId: 'America/La_Paz',
    baseURL: 'http://localhost:3000',
  });
  const nueva = await contexto.newPage();
  await login(nueva, correo);

  const menu = await nueva
    .locator('nav a')
    .evaluateAll((links) => links.map((a) => a.textContent?.trim() ?? '').filter(Boolean));
  const observado = {
    ingreso_correcto: nueva.url().includes('/dashboard'),
    menu_del_rol: menu,
    ve_vacunas: menu.includes('Vacunas'),
    no_ve_usuarios: !menu.includes('Usuarios'),
    nombre_visible: (await nueva.locator('body').innerText()).includes('María López Rojas'),
  };

  // Captura final: pantalla principal del nuevo usuario, con el menú de su rol.
  await captura(nueva, 'HU8-final.png');
  await contexto.close();

  registrar('HU8', { datos_entrada: datos, observado });

  expect(observado.ingreso_correcto).toBe(true);
  expect(observado.ve_vacunas).toBe(true);
  expect(observado.no_ve_usuarios).toBe(true);
});
