import { expect, test } from '@playwright/test';
import { captura, type Campo, login, registrar, USUARIOS } from './helpers';

/**
 * HU6 — Recomendación de Compatibilidad Adoptante-Animal.
 * El personal de Gestión de Adopciones consulta la compatibilidad de un
 * adoptante con los animales disponibles para adopción.
 */
test('HU6: consultar la compatibilidad de un adoptante con los animales disponibles', async ({
  page,
}) => {
  const datos: Campo[] = [
    { campo: 'Adoptante', valor: 'Carla Mendoza Rojas (CI 9000001 SC, ficticia)' },
    { campo: 'Vivienda', valor: 'Departamento, sin patio' },
    { campo: 'Horas diarias disponibles', valor: '3' },
    { campo: 'Experiencia', valor: 'Básica' },
    { campo: 'Preferencias', valor: 'Gato, tamaño pequeño' },
  ];

  await login(page, USUARIOS.adopciones);
  await page.getByRole('link', { name: 'Adoptantes' }).click();
  await page.getByLabel('Buscar por CI, nombres o apellidos').fill('Carla');
  await page.getByRole('link', { name: /Carla Mendoza Rojas/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Carla Mendoza Rojas' })).toBeVisible();
  await expect(page.getByText('Perfil de evaluación')).toBeVisible();

  // Captura inicial: ficha del adoptante, antes de pedir la recomendación.
  await captura(page, 'HU6-inicial.png');

  await page.getByRole('button', { name: 'Ver animales recomendados' }).click();
  const tarjeta = page
    .locator('div.mb-6', { has: page.getByText('Animales recomendados', { exact: true }) })
    .last();
  await expect(tarjeta.getByRole('meter').first()).toBeVisible({ timeout: 30_000 });

  // Abre el desglose del primer animal del ranking.
  await tarjeta.getByRole('button', { name: /Desglose/ }).first().click();
  await expect(tarjeta.getByText('Qué pesa más en este caso concreto')).toBeVisible();

  const medidores = tarjeta.getByRole('meter');
  const puntajes: number[] = [];
  for (let i = 0; i < (await medidores.count()); i++) {
    puntajes.push(Number(await medidores.nth(i).getAttribute('aria-valuenow')));
  }
  const texto = await tarjeta.innerText();
  // Factores del modelo: filas «variable … ±n pts» de la lista «Qué pesa más…».
  const factores = await tarjeta.locator('ul > li').filter({ hasText: / pts$/ }).allInnerTexts();
  const nombres = await tarjeta.locator('ol > li a[href^="/animales/"]').allInnerTexts();
  const observado = {
    ranking: nombres.map((n, i) => `${n.trim()}: ${puntajes[i]}`),
    puntajes_entre_0_y_100: puntajes.length > 0 && puntajes.every((p) => p >= 0 && p <= 100),
    ordenado_de_mayor_a_menor: puntajes.every((p, i) => i === 0 || puntajes[i - 1] >= p),
    nivel_mostrado: /\b(Alta|Media|Baja)\b/.test(texto),
    factores_mostrados: factores.length > 0,
    primer_factor: factores[0]?.replace(/\s+/g, ' ').trim() ?? null,
    aviso_recomendacion: texto.includes('Resultado de apoyo. La decisión final es del personal responsable.'),
    metodo_modelo: texto.includes('Random Forest v'),
  };

  await tarjeta.scrollIntoViewIfNeeded();
  await captura(page, 'HU6-final.png');
  registrar('HU6', { datos_entrada: datos, observado });

  expect(observado.puntajes_entre_0_y_100).toBe(true);
  expect(observado.ordenado_de_mayor_a_menor).toBe(true);
  expect(observado.nivel_mostrado).toBe(true);
  expect(observado.factores_mostrados).toBe(true);
  expect(observado.aviso_recomendacion).toBe(true);
});
