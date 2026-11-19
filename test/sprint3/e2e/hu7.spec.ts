import { expect, test } from '@playwright/test';
import { captura, type Campo, login, registrar, USUARIOS } from './helpers';

/**
 * HU7 — Panel de KPI en Tiempo Real.
 * El administrador revisa el panel de indicadores y abre la pantalla de
 * indicadores de gestión.
 */
test('HU7: revisar el panel y los indicadores de gestión', async ({ page }) => {
  const datos: Campo[] = [
    { campo: 'Usuario', valor: USUARIOS.admin },
    { campo: 'Contraseña', valor: 'contraseña válida' },
    { campo: 'Periodo de análisis', valor: 'Últimos 3 meses' },
  ];

  await login(page, USUARIOS.admin);
  const main = page.getByRole('main');
  const TARJETAS = [
    'En la institución',
    'En cuarentena / observación',
    'Disponibles para adopción',
    'Solicitudes activas',
    'Adopciones del mes',
  ];
  for (const t of TARJETAS) await expect(main.getByText(t, { exact: true })).toBeVisible();
  await expect(main.getByText('Animales por estado')).toBeVisible();
  await expect(main.getByText('Ingresos vs. adopciones')).toBeVisible();
  await page.waitForTimeout(800); // animación de los gráficos

  const panel = await main.innerText();
  const tarjetas = TARJETAS.map((t) => {
    const m = new RegExp(`${t}\\s*\\n\\s*(\\d+)`).exec(panel);
    return `${t}: ${m ? m[1] : '?'}`;
  });

  // Captura inicial: panel con las cinco tarjetas y los gráficos (puntero fuera de los gráficos).
  await page.mouse.move(5, 790);
  await page.waitForTimeout(300);
  await captura(page, 'HU7-inicial.png');

  await page.getByRole('link', { name: 'KPIs' }).click();
  await expect(main.getByRole('heading', { name: 'Indicadores de gestión' })).toBeVisible();
  await page.getByLabel('Periodo de análisis').selectOption({ label: 'Últimos 3 meses' });
  const INDICADORES = [
    'Adopciones concretadas',
    'Permanencia hasta la adopción',
    'Animales devueltos',
    'Solicitudes recibidas',
    'Tiempo de evaluación',
    'Cobertura de vacunación',
  ];
  for (const k of INDICADORES) await expect(main.getByRole('heading', { name: k })).toBeVisible();
  await expect(main.getByText('vs. periodo anterior').first()).toBeVisible();

  const tarjetasKpi = main.locator('h3').filter({ hasText: /./ });
  const resumen: string[] = [];
  let conTendencia = 0;
  for (let i = 0; i < (await tarjetasKpi.count()); i++) {
    const card = tarjetasKpi.nth(i).locator('xpath=ancestor::div[contains(@class,"flex-col")][1]');
    const texto = (await card.innerText()).replace(/\s+/g, ' ').trim();
    resumen.push(texto);
    if (texto.includes('vs. periodo anterior')) conTendencia++;
  }

  const observado = {
    tarjetas,
    graficos: true,
    indicadores: resumen,
    seis_indicadores: resumen.length === 6,
    // Adopciones, permanencia, devueltos, solicitudes y tiempo de evaluación comparan contra el período anterior.
    cinco_con_tendencia: conTendencia === 5,
  };

  await captura(page, 'HU7-final.png');
  registrar('HU7', { datos_entrada: datos, observado });

  expect(observado.seis_indicadores).toBe(true);
  expect(observado.cinco_con_tendencia).toBe(true);
});
