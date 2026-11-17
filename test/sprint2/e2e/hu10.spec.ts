import { expect, test } from '@playwright/test';
import { captura, type Campo, fecha, login, registrar, USUARIOS } from './helpers';

/**
 * HU10 — Gestión de Períodos de Cuarentena.
 * El veterinario abre un período de cuarentena para un animal ingresado y
 * registra un control.
 */
test('HU10: abrir un período de cuarentena y registrar un control', async ({ page }) => {
  const anio = new Date().getFullYear();
  const finEstimado = `${fecha(14)}T09:00`;
  const motivo = 'Contacto con un animal con sospecha de moquillo en el canil de ingreso.';
  const condicion = 'Estable, sin fiebre ni secreciones';
  const obs = 'Come con normalidad. Se mantiene aislado en el canil 3.';
  const datos: Campo[] = [
    { campo: 'Animal', valor: `Simba (ZOO-${anio}-0004), situación Ingresado` },
    { campo: 'Tipo', valor: 'Cuarentena' },
    { campo: 'Inicio', valor: 'Fecha y hora actuales (valor propuesto por el sistema)' },
    { campo: 'Fin estimado', valor: finEstimado.replace('T', ' ') },
    { campo: 'Motivo', valor: motivo },
    { campo: 'Control: Fecha y hora', valor: 'Fecha y hora actuales (valor propuesto por el sistema)' },
    { campo: 'Control: Condición del animal', valor: condicion },
    { campo: 'Control: Observaciones', valor: obs },
  ];

  await login(page, USUARIOS.veterinario);
  await page.getByRole('link', { name: 'Animales' }).click();
  await page.getByPlaceholder('Buscar por código o nombre').fill('Simba');
  await page.getByRole('link', { name: /Simba/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Simba' })).toBeVisible();

  await page.getByRole('button', { name: 'Iniciar cuarentena' }).click();
  const dialogo = page.getByRole('dialog');
  await expect(dialogo.getByText('Iniciar observación / cuarentena')).toBeVisible();
  await dialogo.getByLabel('Tipo').selectOption({ label: 'Cuarentena' });
  await dialogo.getByLabel('Fin estimado').fill(finEstimado);
  await dialogo.getByLabel('Motivo').fill(motivo);

  // Captura inicial: formulario de apertura del período completo.
  await captura(page, 'HU10-inicial.png');

  await dialogo.getByRole('button', { name: 'Iniciar', exact: true }).click();
  await expect(page.getByText('Periodo iniciado')).toBeVisible();

  await page.getByRole('tab', { name: /Cuarentena/ }).click();
  const panel = page.locator('#animal-panel-cuarentena');
  await panel.getByRole('button', { name: 'Registrar control' }).click();
  const control = page.getByRole('dialog');
  await expect(control.getByText('Registrar control')).toBeVisible();
  await control.getByLabel('Condición del animal').fill(condicion);
  await control.getByLabel('Observaciones').fill(obs);
  await control.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText('Control registrado')).toBeVisible();
  await expect(panel.getByText(condicion)).toBeVisible();

  const cabecera = page.getByRole('main');
  const textoPanel = await panel.innerText();
  const observado = {
    animal_en_cuarentena: await cabecera.getByText('En cuarentena', { exact: true }).first().isVisible(),
    periodo_activo: textoPanel.includes('Activo'),
    motivo_registrado: textoPanel.includes(motivo),
    control_registrado: textoPanel.includes(condicion) && textoPanel.includes(obs),
    responsable_del_control: textoPanel.includes('Veterinario de Prueba'),
    controles: /Controles \(1\)/i.test(textoPanel),
  };

  await captura(page, 'HU10-final.png');
  registrar('HU10', { datos_entrada: datos, observado });

  for (const [k, v] of Object.entries(observado)) expect(v, k).toBe(true);
});
