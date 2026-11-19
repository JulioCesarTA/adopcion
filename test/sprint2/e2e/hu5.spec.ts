import { expect, test } from '@playwright/test';
import { captura, type Campo, login, loginPortal, registrar, USUARIOS } from './helpers';

/**
 * HU5 — Creación de Solicitud de Adopción.
 * El adoptante solicita desde su portal la adopción de un animal disponible con un solo clic;
 * el animal queda marcado como «Solicitud en progreso» y la solicitud le llega al administrador.
 */
test('HU5: solicitar la adopción de un animal desde el portal', async ({ page, browser }) => {
  const anio = new Date().getFullYear();
  const datos: Campo[] = [
    { campo: 'Usuario', valor: `${USUARIOS.adoptante} (rol Adoptante)` },
    { campo: 'Animal', valor: `Kira (ZOO-${anio}-0003), perro mediano, Disponible para adopción` },
  ];

  await loginPortal(page, USUARIOS.adoptante);
  await expect(page.getByRole('heading', { name: 'Animales en adopción' })).toBeVisible();
  // Cada animal del catálogo es una tarjeta; se identifica por su código.
  const tarjeta = page.locator('div.flex-col.overflow-hidden').filter({ hasText: `ZOO-${anio}-0003` });
  const boton = tarjeta.getByRole('button', { name: 'Solicitar adopción' });
  await boton.scrollIntoViewIfNeeded();

  // Captura inicial: catálogo del portal con el botón «Solicitar adopción».
  await captura(page, 'HU5-inicial.png');

  await boton.click();
  await expect(page.getByText('Solicitud enviada para Kira. El personal la revisará.')).toBeVisible();
  const kira = tarjeta;
  await expect(kira.getByText('Solicitud en progreso')).toBeVisible();
  const portal = {
    mensaje_confirmacion: true,
    animal_marcado_en_progreso: await kira.getByText('Solicitud en progreso').isVisible(),
    boton_oculto: (await kira.getByRole('button', { name: 'Solicitar adopción' }).count()) === 0,
  };
  await captura(page, 'HU5-final.png');

  // La solicitud le llega al administrador con los datos del adoptante.
  const contexto = await browser.newContext({
    baseURL: 'http://localhost:3000',
    viewport: { width: 1280, height: 800 },
    locale: 'es-BO',
    timezoneId: 'America/La_Paz',
  });
  const admin = await contexto.newPage();
  await login(admin, USUARIOS.admin);
  await admin.getByRole('link', { name: 'Solicitudes' }).click();
  // La solicitud nueva es la única de Kira en «Pendiente».
  const fila = admin.getByRole('row').filter({ hasText: 'Kira' }).filter({ hasText: 'Pendiente' });
  await expect(fila).toHaveCount(1);
  await fila.getByRole('link').first().click();
  await admin.waitForURL(/\/solicitudes\/[0-9a-f-]{36}$/);
  const main = admin.getByRole('main');
  // Espera a que la ficha cargue antes de leerla.
  await expect(main.getByRole('heading', { level: 1 })).toContainText('Kira');
  const ficha = await main.innerText();
  const observado = {
    ...portal,
    solicitud_recibida_por_el_personal: ficha.includes('Adoptante de Prueba'),
    solicitud_pendiente: await main.getByText('Pendiente', { exact: true }).first().isVisible(),
  };
  await captura(admin, 'HU5-solicitud-recibida.png');
  await contexto.close();

  registrar('HU5', { datos_entrada: datos, observado });
  for (const [k, v] of Object.entries(observado)) expect(v, k).toBe(true);
});
