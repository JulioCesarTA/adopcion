import { expect, test } from '@playwright/test';
import { captura, type Campo, login, registrar, USUARIOS } from './helpers';

/**
 * HU3 — Gestionar Historial Clínico.
 * El veterinario abre el historial clínico de un animal que tiene consultas,
 * vacunas y un tratamiento.
 */
test('HU3: consultar el historial clínico de un animal', async ({ page }) => {
  const datos: Campo[] = [
    { campo: 'Usuario', valor: 'veterinario.prueba@zoonosis.test (Personal Veterinario)' },
    { campo: 'Animal consultado', valor: 'Max (ZOO-' + new Date().getFullYear() + '-0004)' },
    { campo: 'Pestaña', valor: 'Historial clínico' },
  ];

  await login(page, USUARIOS.veterinario);
  await page.getByRole('link', { name: 'Animales' }).click();
  await page.getByPlaceholder('Buscar por código o nombre').fill('Max');
  await page.getByRole('link', { name: /Max/ }).first().click();
  await expect(page.getByText('Datos del animal')).toBeVisible();

  // Captura inicial: ficha del animal, antes de abrir el historial.
  await captura(page, 'HU3-inicial.png');

  await page.getByRole('tab', { name: /Historial clínico/ }).click();
  const panel = page.locator('#animal-panel-historial');
  await expect(panel.getByText(/Consulta:/).first()).toBeVisible();

  // Cada registro del historial, en el orden en que la pantalla lo muestra.
  const registros = await panel.locator('ol > li, ul > li.relative, li.relative').evaluateAll((items) =>
    items
      .map((li) => {
        const titulo =
          li.querySelector('a.font-semibold, p.font-semibold')?.textContent?.trim().replace(/\s+/g, ' ') ?? '';
        const fecha = li.querySelector('time')?.textContent?.trim() ?? '';
        return { titulo, fecha, texto: (li as HTMLElement).innerText };
      })
      .filter((r) => r.titulo),
  );

  // dd/mm/aaaa[, hh:mm] -> número comparable
  const aNumero = (f: string) => {
    const m = f.match(/(\d{2})\/(\d{2})\/(\d{4})(?:,? (\d{1,2}):(\d{2}))?/);
    if (!m) return NaN;
    return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] ?? 0), +(m[5] ?? 0)).getTime();
  };
  const tiempos = registros.map((r) => aNumero(r.fecha));
  const ordenado = tiempos.every((t, i) => i === 0 || tiempos[i - 1] >= t);

  const observado = {
    cantidad_registros: registros.length,
    orden_mostrado: registros.map((r) => `${r.fecha} — ${r.titulo}`),
    del_mas_reciente_al_mas_antiguo: ordenado,
    hay_consultas: registros.some((r) => r.titulo.startsWith('Consulta')),
    hay_vacunas: registros.some((r) => r.titulo.startsWith('Vacuna')),
    muestra_tratamiento: registros.some((r) => r.texto.includes('Antibioticoterapia')),
    muestra_profesional: registros.every((r) => r.texto.includes('Veterinario de Prueba')),
  };

  await captura(page, 'HU3-final.png');
  registrar('HU3', { datos_entrada: datos, observado });

  expect(observado.cantidad_registros).toBeGreaterThanOrEqual(4);
  expect(observado.del_mas_reciente_al_mas_antiguo).toBe(true);
  expect(observado.hay_consultas).toBe(true);
  expect(observado.hay_vacunas).toBe(true);
  expect(observado.muestra_tratamiento).toBe(true);
});
