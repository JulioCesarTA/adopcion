import { expect, test } from '@playwright/test';
import { captura, type Campo, fecha, login, registrar, USUARIOS } from './helpers';

/**
 * HU11 — Gestionar Proceso de Adopción.
 * El administrador aprueba una solicitud en evaluación y
 * genera el acta de entrega.
 */
test('HU11: aprobar una solicitud en evaluación y generar el acta de entrega', async ({ page }) => {
  const anio = new Date().getFullYear();
  const entrega = `${fecha(1)}T10:00`;
  const motivo =
    'La familia cumple las condiciones de vivienda y tiempo. Visita domiciliaria favorable.';
  const datos: Campo[] = [
    { campo: 'Solicitud', valor: `Lola (ZOO-${anio}-0006) → Rosa Quiroga Leon, En evaluación` },
    { campo: 'Resultado', valor: 'Aprobada' },
    { campo: 'Fecha de decisión', valor: `${fecha(0)} (valor propuesto por el sistema)` },
    { campo: 'Fecha y hora de entrega del animal', valor: entrega.replace('T', ' ') },
    { campo: 'Nota / fundamento', valor: motivo },
  ];

  await login(page, USUARIOS.admin);
  await page.getByRole('link', { name: 'Solicitudes' }).click();
  await page.getByRole('link', { name: /Lola/ }).first().click();
  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toContainText('Lola');
  await expect(page.getByRole('main').getByText('En evaluación', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Registrar resultado' }).click();
  const dialogo = page.getByRole('dialog');
  await expect(dialogo.getByText('Registrar resultado de adopción')).toBeVisible();
  await dialogo.getByLabel('Resultado').selectOption({ label: 'Aprobada' });
  await dialogo.getByLabel('Fecha y hora de entrega del animal').fill(entrega);
  await dialogo.getByLabel('Nota / fundamento').fill(motivo);

  // Captura inicial: aprobación con el motivo y la fecha de entrega completos.
  await captura(page, 'HU11-inicial.png');

  await dialogo.getByRole('button', { name: 'Registrar resultado' }).click();
  await expect(page.getByText('Adopción aprobada. El animal pasó a «Adoptado».')).toBeVisible();
  const main = page.getByRole('main');
  await expect(main.getByText('Aprobada', { exact: true }).first()).toBeVisible();
  const ficha = await main.innerText();
  const decision = {
    solicitud_aprobada: true,
    animal_adoptado: ficha.includes('Adoptado'),
    decision_con_fecha: /decisión \d{2}\/\d{2}\/\d{4}/.test(ficha),
  };

  await page.getByRole('link', { name: 'Generar acta' }).click();
  await expect(page.getByRole('heading', { name: 'Acta de adopción responsable' })).toBeVisible();
  const acta = await page.locator('article.act').innerText();
  const observado = {
    ...decision,
    acta_datos_animal: acta.includes('DATOS DEL ANIMAL') || acta.includes('Datos del animal'),
    acta_codigo_animal: acta.includes(`ZOO-${anio}-0006`),
    acta_datos_adoptante: acta.includes('Rosa Quiroga Leon'),
    acta_fecha_entrega: /Fecha: \d{2}\/\d{2}\/\d{4}/.test(acta),
    acta_responsable: acta.includes('Responsable de la institución'),
    acta_compromisos: /compromisos de tenencia responsable/i.test(acta),
    boton_imprimir: await page.getByRole('button', { name: 'Imprimir acta' }).isVisible(),
  };

  await captura(page, 'HU11-final.png');
  registrar('HU11', { datos_entrada: datos, observado });

  for (const [k, v] of Object.entries(observado)) expect(v, k).toBe(true);
});
