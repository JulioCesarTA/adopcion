import { expect, test } from '@playwright/test';
import { captura, type Campo, login, registrar, USUARIOS } from './helpers';

/**
 * HU5 — Creación de Solicitud de Adopción.
 * El personal de Gestión de Adopciones crea una solicitud que vincula a un
 * adoptante registrado con un animal disponible para adopción.
 */
test('HU5: crear una solicitud de adopción', async ({ page }) => {
  const anio = new Date().getFullYear();
  const nota = 'Solicitud presentada en ventanilla. La adoptante visitó al animal el día anterior.';
  const datos: Campo[] = [
    { campo: 'Adoptante', valor: 'Ana Lucia Torres Suarez (CI 9000003 CB, ficticia)' },
    { campo: 'Animal', valor: `Kira (ZOO-${anio}-0003), perro mediano, Disponible para adopción` },
    { campo: 'Notas iniciales', valor: nota },
  ];

  await login(page, USUARIOS.adopciones);
  await page.getByRole('link', { name: 'Solicitudes' }).click();
  await page.getByRole('link', { name: 'Nueva solicitud' }).click();
  await expect(page.getByRole('heading', { name: 'Nueva solicitud de adopción' })).toBeVisible();

  await page.getByLabel('Buscar adoptante por CI o nombre').fill('Ana Lucia');
  await page
    .getByRole('listbox', { name: 'Adoptantes' })
    .getByRole('button', { name: /Ana Lucia Torres Suarez/ })
    .click();
  await page
    .getByRole('listbox', { name: 'Animales disponibles' })
    .getByRole('button', { name: /Kira/ })
    .click();

  await expect(page.getByText('3. Revisión')).toBeVisible();
  await expect(page.getByRole('meter')).toBeVisible();
  await page.getByLabel('Notas iniciales').fill(nota);
  await page.getByRole('button', { name: 'Crear solicitud' }).scrollIntoViewIfNeeded();

  // Captura inicial: formulario completo, justo antes de crear la solicitud.
  await captura(page, 'HU5-inicial.png');

  await page.getByRole('button', { name: 'Crear solicitud' }).click();
  await page.waitForURL(/\/solicitudes\/[0-9a-f-]{36}$/);
  await expect(page.getByText('Solicitud creada. El animal pasó a «En proceso de adopción».')).toBeVisible();

  const encabezado = page.getByRole('main').getByRole('heading', { level: 1 });
  await expect(encabezado).toContainText('Kira');
  const main = page.getByRole('main');
  const observado = {
    titulo: (await encabezado.innerText()).trim(),
    solicitud_pendiente: await main.getByText('Pendiente', { exact: true }).first().isVisible(),
    animal_en_proceso: await main.getByText('En proceso de adopción', { exact: true }).first().isVisible(),
    nota_registrada: (await main.innerText()).includes(nota),
  };

  await captura(page, 'HU5-final.png');
  registrar('HU5', { datos_entrada: datos, observado });

  expect(observado.solicitud_pendiente).toBe(true);
  expect(observado.animal_en_proceso).toBe(true);
  expect(observado.nota_registrada).toBe(true);
});
