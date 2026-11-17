import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { login, USUARIOS } from './helpers';

/**
 * Preparación de HU6: el administrador entrena y activa el Random Forest con el
 * mecanismo real del sistema (pantalla «Modelo de recomendación»), con la
 * semilla fija 2026. No es una de las 4 pruebas de caja negra: deja el modelo
 * activo y guarda el informe del entrenamiento como evidencia.
 */
test('Preparación: el administrador entrena el modelo de recomendación', async ({ page }) => {
  test.setTimeout(300_000);
  await login(page, USUARIOS.admin);
  await page.getByRole('link', { name: 'Modelo de recomendación' }).click();
  await expect(page.getByText('Entrenar un modelo nuevo')).toBeVisible();

  const respuesta = page.waitForResponse(
    (r) => r.url().includes('/ml/train') && r.request().method() === 'POST',
    { timeout: 280_000 },
  );
  await page.getByRole('button', { name: 'Entrenar y activar' }).click();
  const r = await respuesta;
  expect(r.status()).toBe(201);
  const informe = (await r.json()) as Record<string, unknown>;
  await expect(page.getByText(/Modelo v\d+ entrenado y activado/)).toBeVisible({ timeout: 60_000 });

  const dir = resolve(__dirname, '../evidencia');
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    resolve(dir, 'modelo.json'),
    JSON.stringify(
      {
        version: informe.version,
        algorithm: informe.algorithm,
        source: informe.source,
        datasetSize: informe.datasetSize,
        realSamples: informe.realSamples,
        syntheticSamples: informe.syntheticSamples,
        seed: informe.seed,
        oobScore: informe.oobScore,
      },
      null,
      2,
    ) + '\n',
  );
});
