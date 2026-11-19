import { expect, test } from '@playwright/test';
import { statSync } from 'node:fs';
import { resolve } from 'node:path';
import { captura, type Campo, fecha, FIXTURES, login, registrar, USUARIOS } from './helpers';

/**
 * HU1 — Gestión de Animal.
 * El administrador registra un animal nuevo con una foto JPG de menos de 5 MB.
 */
test('HU1: registrar un animal nuevo con fotografía', async ({ page }) => {
  const foto = resolve(FIXTURES, 'perro-prueba.jpg');
  const kb = Math.round(statSync(foto).size / 1024);

  const datos: Campo[] = [
    { campo: 'Nombre', valor: 'Bruno' },
    { campo: 'Especie', valor: 'Perro' },
    { campo: 'Raza', valor: 'Labrador mestizo' },
    { campo: 'Sexo', valor: 'Macho' },
    { campo: 'Edad aproximada (meses)', valor: '24' },
    { campo: 'Color', valor: 'Dorado' },
    { campo: 'Tamaño', valor: 'Grande' },
    { campo: 'Fecha de ingreso', valor: fecha(0) },
    { campo: 'Motivo de ingreso', valor: 'Rescate en vía pública' },
    { campo: 'Nivel de energía (1–5)', valor: '4 — Alto' },
    { campo: 'Horas diarias de atención requeridas', valor: '3' },
    { campo: 'Se lleva bien con niños', valor: 'Sí' },
    { campo: 'Temperamento', valor: 'Sociable y juguetón' },
    { campo: 'Foto', valor: `perro-prueba.jpg (JPG, ${kb} KB)` },
  ];

  await login(page, USUARIOS.admin);
  await page.getByRole('link', { name: 'Animales' }).click();
  await page.getByRole('link', { name: 'Registrar animal' }).click();
  await expect(page.getByRole('main').getByRole('heading', { name: 'Registrar animal' })).toBeVisible();

  await page.getByRole('main').getByLabel('Nombre').fill('Bruno');
  await page.getByRole('main').getByLabel('Especie').selectOption({ label: 'Perro' });
  await page.getByRole('main').getByLabel('Raza').fill('Labrador mestizo');
  await page.getByRole('main').getByLabel('Sexo').selectOption({ label: 'Macho' });
  await page.getByRole('main').getByLabel('Edad aproximada (meses)').fill('24');
  await page.getByRole('main').getByLabel('Color').fill('Dorado');
  await page.getByRole('main').getByLabel('Tamaño').selectOption({ label: 'Grande' });
  await page.getByRole('main').getByLabel('Fecha de ingreso').fill(fecha(0));
  await page.getByRole('main').getByLabel('Motivo de ingreso').fill('Rescate en vía pública');
  await page.getByRole('main').getByLabel('Nivel de energía (1–5)').selectOption('4');
  await page.getByRole('main').getByLabel('Horas diarias de atención requeridas').fill('3');
  await page.getByRole('main').getByLabel('Se lleva bien con niños').check();
  await page.getByRole('main').getByLabel('Temperamento').fill('Sociable y juguetón');
  await page.locator('input[type="file"]').setInputFiles(foto);
  await expect(page.getByText('perro-prueba.jpg')).toBeVisible();

  // Captura inicial: formulario completo con la foto elegida, antes de registrar.
  const boton = page.getByRole('button', { name: 'Registrar animal' });
  await boton.scrollIntoViewIfNeeded();
  await captura(page, 'HU1-inicial.png');

  await boton.click();
  await page.waitForURL(/\/animales\/[0-9a-f-]{36}$/);
  await expect(page.getByText('Datos del animal')).toBeVisible();

  // Lo que se observa en la ficha.
  const codigo = (await page.getByText(/ZOO-\d{4}-\d{4}/).first().innerText()).match(
    /ZOO-\d{4}-\d{4}/,
  )?.[0];
  const ingresado = await page.getByText('Ingresado', { exact: true }).first().isVisible();
  const fotoVisible = await page.locator('img[src*="/uploads/"]').first().isVisible();

  await page.evaluate(() => window.scrollTo(0, 0));
  await captura(page, 'HU1-final.png');

  registrar('HU1', {
    datos_entrada: datos,
    observado: { codigo, situacion_ingresado: ingresado, foto_visible: fotoVisible },
  });

  expect(codigo).toMatch(/^ZOO-\d{4}-\d{4}$/);
  expect(ingresado).toBe(true);
  expect(fotoVisible).toBe(true);
});
