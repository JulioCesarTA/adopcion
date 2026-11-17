import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
import { resolve } from 'node:path';

// SPRINT1_PASSWORD (contraseña de los usuarios de prueba) sale de .env.test, que no se versiona.
config({ path: resolve(__dirname, '../../.env.test') });

export default defineConfig({
  testDir: '.',
  testMatch: ['flujo-completo.spec.ts', 'seg08-xss.spec.ts', 'accesibilidad.spec.ts'],
  // Una prueba a la vez y sin reintentos: lo que se registra es lo que pasó.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 300_000,
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
