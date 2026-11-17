import { expect, type Browser, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const CAPTURAS = resolve(__dirname, '../../docs/pruebas-cap9/capturas');
export const EVIDENCIA = resolve(__dirname, 'evidencia');

/** Usuarios del seed del Sprint 3 (test/sprint3/seed-sprint3.ts). */
export const USUARIOS = {
  admin: 'admin.prueba@zoonosis.test',
  veterinario: 'veterinario.prueba@zoonosis.test',
  gestion: 'adopciones.prueba@zoonosis.test',
  directivo: 'directivo.prueba@zoonosis.test',
} as const;

export function password(): string {
  const p = process.env.SPRINT1_PASSWORD;
  if (!p) throw new Error('Falta SPRINT1_PASSWORD en .env.test');
  return p;
}

/** Contexto nuevo con las mismas opciones del proyecto (un usuario por contexto). */
export async function nuevaPagina(browser: Browser): Promise<Page> {
  const context = await browser.newContext({
    baseURL: 'http://localhost:3000',
    viewport: { width: 1280, height: 800 },
    locale: 'es-BO',
    timezoneId: 'America/La_Paz',
  });
  return context.newPage();
}

/** Inicia sesión por la pantalla real de login. */
export async function login(page: Page, email: string, pass = password()) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña').fill(pass);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForURL('**/dashboard');
  await expect(page.getByRole('link', { name: 'Animales' })).toBeVisible();
}

/** Captura de la ventana del navegador (1280 × 800). */
export async function captura(page: Page, nombre: string) {
  mkdirSync(CAPTURAS, { recursive: true });
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.mouse.move(1, 1);
  await page.waitForTimeout(400);
  await page.screenshot({ path: resolve(CAPTURAS, nombre), fullPage: false });
}

/** Fecha para <input type="date">, desplazada n días desde hoy (hora de La Paz). */
export function fecha(dias = 0): string {
  const d = new Date(Date.now() + dias * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(d);
}

/** Fecha y hora para <input type="datetime-local">, desplazada n minutos desde ahora (La Paz). */
export function fechaHora(minutos = 0): string {
  const d = new Date(Date.now() + minutos * 60_000);
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/La_Paz',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export function guardarEvidencia(nombre: string, datos: unknown) {
  mkdirSync(EVIDENCIA, { recursive: true });
  writeFileSync(resolve(EVIDENCIA, nombre), JSON.stringify(datos, null, 2) + '\n', 'utf8');
}
