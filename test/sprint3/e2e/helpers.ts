import { expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const OUT = resolve(__dirname, '../../../docs/pruebas-sprint3');
export const CAPTURAS = resolve(OUT, 'capturas');
export const FIXTURES = resolve(__dirname, '../fixtures');

export const USUARIOS = {
  admin: 'admin.prueba@zoonosis.test',
  veterinario: 'veterinario.prueba@zoonosis.test',
  adopciones: 'adopciones.prueba@zoonosis.test',
  directivo: 'directivo.prueba@zoonosis.test',
} as const;

export function password(): string {
  const p = process.env.SPRINT1_PASSWORD;
  if (!p) throw new Error('Falta SPRINT1_PASSWORD en .env.test');
  return p;
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

/** Captura de la ventana del navegador (1280 × 800), sin el resto del escritorio. */
export async function captura(page: Page, nombre: string) {
  mkdirSync(CAPTURAS, { recursive: true });
  // Deja que terminen animaciones y peticiones antes de la foto.
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.waitForTimeout(400);
  await page.screenshot({ path: resolve(CAPTURAS, nombre), fullPage: false });
}

/** Fecha en formato de <input type="date">, desplazada n días desde hoy (hora de La Paz). */
export function fecha(dias = 0): string {
  const d = new Date(Date.now() + dias * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(d);
}

export interface Campo {
  campo: string;
  valor: string;
}

/** Guarda lo que la prueba cargó y lo que observó, para armar resultados.json sin escribir nada a mano. */
export function registrar(hu: string, datos: Record<string, unknown>) {
  const dir = resolve(__dirname, '../evidencia/caja-negra');
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, `${hu}.json`), JSON.stringify(datos, null, 2) + '\n', 'utf8');
}
