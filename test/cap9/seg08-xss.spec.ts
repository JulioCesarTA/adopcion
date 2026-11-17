import { expect, test } from '@playwright/test';
import { fecha, guardarEvidencia, login, USUARIOS } from './helpers';

/**
 * SEG-08 — XSS almacenado: se registra por la interfaz un animal con nombre
 * <script>alert(1)</script> (y, en «Temperamento», <img src=x onerror=alert(2)>) y se comprueba
 * que ninguna pantalla que lo muestra ejecuta código: no se abre ningún diálogo de JavaScript y el
 * texto se ve literal.
 */
test('SEG-08: el nombre <script>alert(1)</script> no se ejecuta al mostrarse', async ({ page }) => {
  const nombre = '<script>alert(1)</script>';
  const temperamento = '<img src=x onerror=alert(2)>';
  const dialogos: string[] = [];
  page.on('dialog', async (d) => {
    dialogos.push(`${d.type()}: ${d.message()}`);
    await d.dismiss();
  });

  await login(page, USUARIOS.gestion);
  await page.getByRole('link', { name: 'Animales' }).click();
  await page.getByRole('link', { name: 'Registrar animal' }).click();
  const m = page.getByRole('main');
  // Igual que HU1: se espera a que el formulario esté listo antes de escribir.
  await expect(m.getByRole('heading', { name: 'Registrar animal' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  await m.getByLabel('Nombre').fill(nombre);
  await m.getByLabel('Especie').selectOption({ label: 'Gato' });
  await m.getByLabel('Sexo').selectOption({ label: 'Macho' });
  await m.getByLabel('Tamaño').selectOption({ label: 'Pequeño' });
  await m.getByLabel('Fecha de ingreso').fill(fecha(0));
  await m.getByLabel('Motivo de ingreso').fill('Prueba de seguridad SEG-08');
  await m.getByLabel('Nivel de energía (1–5)').selectOption('2');
  await m.getByLabel('Horas diarias de atención requeridas').fill('1');
  await m.getByLabel('Temperamento').fill(temperamento);
  await expect(m.getByLabel('Nombre')).toHaveValue(nombre);
  await expect(m.getByLabel('Temperamento')).toHaveValue(temperamento);
  const respuesta = page.waitForResponse(
    (r) => r.url().endsWith('/api/v1/animals') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Registrar animal' }).click();
  const creado = await respuesta;
  const guardado = (await creado.json()) as { name?: string | null; temperament?: string | null };
  await page.waitForURL(/\/animales\/[0-9a-f-]{36}$/);
  await expect(page.getByText('Datos del animal')).toBeVisible();
  await page.waitForLoadState('networkidle');

  // Ficha del animal: el título debe mostrar el texto literal.
  const titulo = (await m.getByRole('heading', { level: 1 }).first().innerText()).trim();
  const fichaTexto = await m.innerText();
  const scriptsInyectados = await page.evaluate(
    () => [...document.querySelectorAll('script')].filter((s) => s.textContent?.includes('alert(1)')).length,
  );
  const imagenesInyectadas = await page.evaluate(
    () => document.querySelectorAll('img[src="x"]').length,
  );

  // Listado de animales con la búsqueda por nombre.
  await page.getByRole('link', { name: 'Animales' }).click();
  await page.getByPlaceholder('Buscar por código o nombre').fill('script');
  await expect(m.getByText(nombre).first()).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const ok =
    dialogos.length === 0 &&
    titulo === nombre &&
    fichaTexto.includes(temperamento) &&
    scriptsInyectados === 0 &&
    imagenesInyectadas === 0;

  guardarEvidencia('seguridad-seg08.json', {
    id: 'SEG-08',
    nombre: 'XSS almacenado en el nombre del animal',
    enviado:
      'Registro de un animal por la interfaz con el nombre <script>alert(1)</script> y el temperamento <img src=x onerror=alert(2)>; luego se abrió su ficha y el listado con la búsqueda «script» (Playwright, Chromium)',
    esperado:
      'El sistema guarda el texto, pero al mostrarlo no ejecuta código: no aparece ningún diálogo de JavaScript y el texto se ve literal.',
    codigo_http: String(creado.status()),
    mensaje: `Título de la ficha: «${titulo}»`,
    obtenido: `El registro respondió ${creado.status()} y guardó el nombre y el temperamento tal como se escribieron (${guardado.name === nombre && guardado.temperament === temperamento ? 'sí' : 'no'}); diálogos de JavaScript: ${dialogos.length}; el título mostró el texto literal: ${titulo === nombre ? 'sí' : 'no'}; elementos <script> o <img src="x"> insertados en la página: ${scriptsInyectados + imagenesInyectadas}.`,
    estado: ok ? 'Aprobada' : 'Fallida',
  });

  expect(dialogos).toEqual([]);
  expect(titulo).toBe(nombre);
  expect(scriptsInyectados + imagenesInyectadas).toBe(0);
});
