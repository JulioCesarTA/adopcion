import { expect, test } from '@playwright/test';
import { captura, type Campo, login, registrar, USUARIOS } from './helpers';

/**
 * HU12 — Seguimiento Post-adopción.
 * El administrador registra un seguimiento de una adopción aprobada.
 */
test('HU12: registrar un seguimiento de una adopción aprobada', async ({ page }) => {
  const anio = new Date().getFullYear();
  const estado = 'Sano y bien adaptado';
  const obs = 'Visita domiciliaria: duerme dentro de la casa, tiene su vacuna al día y juega con la familia.';
  const datos: Campo[] = [
    { campo: 'Solicitud', valor: `Lola (ZOO-${anio}-0007) → Rosa Quiroga Leon, Aprobada` },
    { campo: 'Fecha y hora', valor: 'Fecha y hora actuales (valor propuesto por el sistema)' },
    { campo: 'Estado general del animal', valor: estado },
    { campo: 'Observaciones', valor: obs },
  ];

  await login(page, USUARIOS.admin);
  await page.getByRole('link', { name: 'Solicitudes' }).click();
  await page.getByRole('link', { name: /Lola/ }).first().click();
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { level: 1 })).toContainText('Lola');
  await expect(main.getByText('Seguimiento posterior a la adopción')).toBeVisible();

  await main.getByRole('button', { name: 'Nuevo seguimiento' }).click();
  const dialogo = page.getByRole('dialog');
  await expect(dialogo.getByText('Nuevo seguimiento')).toBeVisible();
  await dialogo.getByLabel('Estado general del animal').fill(estado);
  await dialogo.getByLabel('Observaciones').fill(obs);

  // Captura inicial: formulario del seguimiento completo, en la ficha de la solicitud.
  await captura(page, 'HU12-inicial.png');

  await dialogo.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText('Seguimiento registrado')).toBeVisible();

  // La lista de seguimientos es la única lista ordenada de la ficha de la solicitud.
  const lista = main.locator('ol');
  const items = lista.locator(':scope > li');
  await expect(items).toHaveCount(2);
  const primero = (await items.nth(0).innerText()).replace(/\s+/g, ' ').trim();
  const segundo = (await items.nth(1).innerText()).replace(/\s+/g, ' ').trim();
  const fecha = (s: string) => {
    const m = /(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2})/.exec(s);
    return m ? `${m[3]}${m[2]}${m[1]}${m[4]}${m[5]}` : '';
  };
  const observado = {
    nuevo_registro: primero,
    registro_anterior: segundo,
    con_fecha: /\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}/.test(primero),
    con_observaciones: primero.includes(estado) && primero.includes(obs),
    con_autor: primero.includes('Administrador de Prueba'),
    ordenados_por_fecha: fecha(primero) >= fecha(segundo),
  };

  await lista.scrollIntoViewIfNeeded();
  await captura(page, 'HU12-final.png');
  registrar('HU12', { datos_entrada: datos, observado });

  for (const k of ['con_fecha', 'con_observaciones', 'con_autor', 'ordenados_por_fecha'] as const)
    expect(observado[k], k).toBe(true);
});
