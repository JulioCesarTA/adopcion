import { expect, test } from '@playwright/test';
import { captura, type Campo, fecha, login, registrar, USUARIOS } from './helpers';

/**
 * HU2 — Registro de Consulta Clínica.
 * El veterinario registra una consulta con signos vitales válidos, un diagnóstico
 * y un tratamiento con un medicamento.
 */
test('HU2: registrar una consulta clínica completa', async ({ page }) => {
  const datos: Campo[] = [
    { campo: 'Animal', valor: 'Toby (ZOO-' + new Date().getFullYear() + '-0001)' },
    { campo: 'Motivo', valor: 'Decaimiento y falta de apetito' },
    { campo: 'Peso (kg)', valor: '12.5' },
    { campo: 'Temperatura (°C)', valor: '39.2' },
    { campo: 'Evaluación clínica', valor: 'Mucosas rosadas, leve deshidratación, abdomen sin dolor.' },
    { campo: 'Diagnóstico — Descripción', valor: 'Gastroenteritis leve' },
    { campo: 'Tratamiento — Descripción', valor: 'Hidratación y protector gástrico' },
    { campo: 'Tratamiento — Inicio', valor: fecha(0) },
    { campo: 'Tratamiento — Instrucciones', valor: 'Dieta blanda por cinco días y agua a libre demanda.' },
    { campo: 'Medicamento — Nombre', valor: 'Omeprazol' },
    { campo: 'Medicamento — Dosis', valor: '1 mg/kg' },
    { campo: 'Medicamento — Vía', valor: 'Oral' },
    { campo: 'Medicamento — Frecuencia', valor: 'Cada 24 horas' },
    { campo: 'Medicamento — Duración', valor: '5 días' },
  ];

  await login(page, USUARIOS.veterinario);
  await page.getByRole('link', { name: 'Animales' }).click();
  await page.getByPlaceholder('Buscar por código o nombre').fill('Toby');
  await page.getByRole('link', { name: /Toby/ }).first().click();
  await page.getByRole('link', { name: 'Nueva consulta' }).click();
  await expect(page.getByRole('main').getByRole('heading', { name: 'Nueva consulta veterinaria' })).toBeVisible();

  await page.getByRole('main').getByLabel('Motivo').fill('Decaimiento y falta de apetito');
  await page.getByRole('main').getByLabel('Peso (kg)').fill('12.5');
  await page.getByRole('main').getByLabel('Temperatura (°C)').fill('39.2');
  await page
    .getByLabel('Evaluación clínica')
    .fill('Mucosas rosadas, leve deshidratación, abdomen sin dolor.');

  await page.getByRole('button', { name: 'Agregar diagnóstico' }).click();
  await page.getByRole('main').getByLabel('Descripción').first().fill('Gastroenteritis leve');

  await page.getByRole('button', { name: 'Agregar tratamiento' }).click();
  await page.getByRole('main').getByLabel('Descripción').nth(1).fill('Hidratación y protector gástrico');
  await page.getByRole('main').getByLabel('Instrucciones').fill('Dieta blanda por cinco días y agua a libre demanda.');

  await page.getByRole('button', { name: 'Agregar medicamento' }).click();
  await page.getByRole('main').getByLabel('Nombre').fill('Omeprazol');
  await page.getByRole('main').getByLabel('Dosis').fill('1 mg/kg');
  await page.getByRole('main').getByLabel('Vía').fill('Oral');
  await page.getByRole('main').getByLabel('Frecuencia').fill('Cada 24 horas');
  await page.getByRole('main').getByLabel('Duración').fill('5 días');

  // Captura inicial: formulario completo, antes de guardar.
  const boton = page.getByRole('button', { name: 'Guardar consulta' });
  await boton.scrollIntoViewIfNeeded();
  await captura(page, 'HU2-inicial.png');

  await boton.click();
  await page.waitForURL(/\/consultas\/[0-9a-f-]{36}$/);
  await expect(page.getByText('Datos de la consulta')).toBeVisible();

  const texto = await page.locator('main').innerText();
  const observado = {
    veterinario_visible: texto.includes('Veterinario de Prueba'),
    diagnostico_visible: texto.includes('Gastroenteritis leve'),
    tratamiento_visible: texto.includes('Hidratación y protector gástrico'),
    medicamento_visible: texto.includes('Omeprazol'),
    peso_visible: texto.includes('12.5 kg'),
    // fecha y hora con el formato que muestra la pantalla: dd/mm/aaaa hh:mm
    fecha_hora: texto.match(/\d{2}\/\d{2}\/\d{4},? \d{1,2}:\d{2}/)?.[0] ?? null,
  };

  await page.evaluate(() => window.scrollTo(0, 0));
  await captura(page, 'HU2-final.png');

  registrar('HU2', { datos_entrada: datos, observado });

  expect(observado.veterinario_visible).toBe(true);
  expect(observado.diagnostico_visible).toBe(true);
  expect(observado.tratamiento_visible).toBe(true);
  expect(observado.medicamento_visible).toBe(true);
  expect(observado.fecha_hora).not.toBeNull();
});
