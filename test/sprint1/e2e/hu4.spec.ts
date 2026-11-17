import { expect, test } from '@playwright/test';
import { captura, type Campo, fecha, login, registrar, USUARIOS } from './helpers';

/**
 * HU4 — Gestión de Vacunación.
 * El veterinario registra una vacuna con su lote y su próxima dosis, y revisa
 * el aviso de próximas dosis.
 */
test('HU4: registrar una vacuna y revisar el aviso de próximas dosis', async ({ page }) => {
  const proxima = fecha(6);
  const datos: Campo[] = [
    { campo: 'Animal', valor: 'Canela (ZOO-' + new Date().getFullYear() + '-0006)' },
    { campo: 'Vacuna', valor: 'Antirrabica (Perro, Gato)' },
    { campo: 'Fecha de aplicación', valor: fecha(0) },
    { campo: 'Dosis', valor: '1 ml' },
    { campo: 'Lote', valor: 'AR-2231' },
    { campo: 'Próxima dosis', valor: proxima },
    { campo: 'Horizonte del aviso', valor: 'Próximos 7 días' },
  ];

  await login(page, USUARIOS.veterinario);
  await page.getByRole('link', { name: 'Animales' }).click();
  await page.getByPlaceholder('Buscar por código o nombre').fill('Canela');
  await page.getByRole('link', { name: /Canela/ }).first().click();
  await page.getByRole('tab', { name: /Vacunas/ }).click();
  await page.getByRole('button', { name: 'Nueva vacuna' }).click();

  const dialogo = page.getByRole('dialog');
  await expect(dialogo.getByText('Nueva vacuna')).toBeVisible();
  await dialogo.getByLabel('Vacuna').selectOption({ label: 'Antirrabica (Perro, Gato)' });
  await dialogo.getByLabel('Fecha de aplicación').fill(fecha(0));
  await dialogo.getByLabel('Dosis', { exact: false }).first().fill('1 ml');
  await dialogo.getByLabel('Lote').fill('AR-2231');
  await dialogo.getByLabel('Próxima dosis').fill(proxima);

  // Captura inicial: formulario de vacuna completo, antes de registrar.
  await captura(page, 'HU4-inicial.png');

  await dialogo.getByRole('button', { name: 'Registrar' }).click();
  await expect(page.getByText('Vacuna registrada')).toBeVisible();
  const panel = page.locator('#animal-panel-vacunas');
  await expect(panel.getByText('AR-2231')).toBeVisible();

  // Aviso de próximas dosis.
  await page.getByRole('link', { name: 'Vacunas', exact: true }).click();
  await expect(page.getByRole('main').getByRole('heading', { name: 'Vacunas' })).toBeVisible();
  await page.getByLabel('Horizonte').selectOption({ label: 'Próximos 7 días' });
  await expect(page.getByText('Canela').first()).toBeVisible();

  const texto = await page.locator('main').innerText();
  const observado = {
    lote_registrado: 'AR-2231',
    aviso_incluye_canela: texto.includes('Canela'),
    aviso_incluye_nala: texto.includes('Nala'),
    // Max tiene vacunas, pero su última dosis no tiene próxima fecha: no debe aparecer.
    aviso_excluye_max: !texto.includes('Max'),
    // Rocky fue adoptado: no debe aparecer.
    aviso_excluye_rocky: !texto.includes('Rocky'),
  };

  await captura(page, 'HU4-final.png');
  registrar('HU4', { datos_entrada: datos, observado });

  expect(observado.aviso_incluye_canela).toBe(true);
  expect(observado.aviso_incluye_nala).toBe(true);
  expect(observado.aviso_excluye_max).toBe(true);
  expect(observado.aviso_excluye_rocky).toBe(true);
});
