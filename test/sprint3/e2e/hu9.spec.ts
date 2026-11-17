import { expect, test } from '@playwright/test';
import { captura, type Campo, registrar } from './helpers';

/**
 * HU9 — Asistente Virtual con IA.
 * Un visitante, sin iniciar sesión, abre el asistente desde el sitio público y
 * pregunta qué animales hay disponibles. El entorno de prueba no tiene clave de
 * la API de Anthropic, así que se prueba el criterio 5: el mensaje amable cuando
 * el servicio de inteligencia artificial no está disponible.
 */
test('HU9: un visitante consulta al asistente y el servicio de IA no está disponible', async ({
  page,
}) => {
  const pregunta = '¿Qué animales hay disponibles para adoptar?';
  const datos: Campo[] = [
    { campo: 'Usuario', valor: 'Visitante sin iniciar sesión' },
    { campo: 'Pregunta', valor: pregunta },
    { campo: 'Servicio de IA', valor: 'No disponible (entorno de prueba sin clave de la API)' },
  ];

  await page.goto('/');
  await page.getByRole('button', { name: 'Solo necesarias' }).click();
  await page.getByRole('button', { name: 'Abrir asistente virtual' }).click();
  const ventana = page.getByRole('dialog', { name: 'Asistente virtual' });
  await expect(ventana).toBeVisible();
  await ventana.getByLabel('Escribe tu pregunta').fill(pregunta);

  // Captura inicial: ventana del asistente con la pregunta escrita, antes de enviarla.
  await captura(page, 'HU9-inicial.png');

  const respuesta = page.waitForResponse((r) => r.url().includes('/chat') && r.request().method() === 'POST');
  await ventana.getByRole('button', { name: 'Enviar' }).click();
  const r = await respuesta;
  const aviso = ventana.getByRole('alert');
  await expect(aviso).toBeVisible();

  const cookies = await page.context().cookies();
  const observado = {
    sin_sesion: !cookies.some((c) => /token|session|refresh/i.test(c.name)),
    estado_http: r.status(),
    mensaje: (await aviso.innerText()).trim(),
    mensaje_amable:
      (await aviso.innerText()).trim() ===
      'El asistente no está disponible en este momento. Escríbenos por el formulario de contacto.',
    pregunta_conservada: (await ventana.getByLabel('Escribe tu pregunta').inputValue()) === pregunta,
  };

  await captura(page, 'HU9-final.png');
  registrar('HU9', { datos_entrada: datos, observado });

  expect(observado.sin_sesion).toBe(true);
  expect(observado.estado_http).toBe(503);
  expect(observado.mensaje_amable).toBe(true);
});
