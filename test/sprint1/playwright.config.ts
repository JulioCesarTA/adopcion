import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
import { resolve } from 'node:path';

// SPRINT1_PASSWORD sale de .env.test (sin versionar). No hay contraseñas en el repositorio.
config({ path: resolve(__dirname, '../../.env.test') });

export default defineConfig({
  testDir: './e2e',
  // Una prueba a la vez y sin reintentos: lo que se registra es lo que pasó.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 800 },
    locale: 'es-BO',
    timezoneId: 'America/La_Paz',
    actionTimeout: 15_000,
  },
});
