/**
 * Capturas del Capítulo IX que no salen de la prueba de sistema:
 *   - salidas reales de la terminal (Jest, k6, axe) convertidas a imagen;
 *   - reportes HTML (Lighthouse, ZAP e informe de Playwright).
 * También arma el informe HTML de Playwright uniendo los reportes «blob» de cada ejecución.
 *
 *   node test/cap9/capturar.js
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('@playwright/test');
const Convert = require('ansi-to-html');

const RAIZ = path.resolve(__dirname, '../..');
const EV = path.join(__dirname, 'evidencia');
const DOCS = path.join(RAIZ, 'docs/pruebas-cap9');
const CAPTURAS = path.join(DOCS, 'capturas');
const REPORTES = path.join(DOCS, 'reportes');
fs.mkdirSync(CAPTURAS, { recursive: true });
const ESC = String.fromCharCode(27);
const sinAnsi = (s) => s.split(new RegExp(ESC + '\\[[0-9;]*m')).join('');

function terminal(titulo, comando, texto) {
  const html = new Convert({ fg: '#d4d4d4', bg: '#1e1e1e', escapeXML: true }).toHtml(texto);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0;background:#1e1e1e;font:13px/1.45 Consolas,'Cascadia Mono',monospace;color:#d4d4d4}
    .barra{background:#2d2d2d;color:#ccc;padding:8px 14px;font:12px Segoe UI,Arial,sans-serif;border-bottom:1px solid #111}
    .cmd{color:#9cdcfe;padding:10px 14px 0}
    pre{margin:0;padding:6px 14px 14px;white-space:pre-wrap;word-break:break-word}
  </style></head><body><div class="barra">${titulo}</div><div class="cmd">PS&gt; ${comando}</div><pre>${html}</pre></body></html>`;
}

async function capturaTerminal(browser, archivo, titulo, comando, texto, ancho = 1280) {
  const page = await browser.newPage({ viewport: { width: ancho, height: 400 } });
  await page.setContent(terminal(titulo, comando, texto));
  await page.screenshot({ path: path.join(CAPTURAS, archivo), fullPage: true });
  await page.close();
  console.log(`captura ${archivo}`);
}

function lineas(archivo) {
  return fs.readFileSync(archivo, 'utf8').replace(/\r/g, '').split('\n');
}

(async () => {
  // 1. Informe HTML de Playwright (une los blob de los sprints y del Capítulo IX).
  const blobs = path.join(EV, 'playwright', 'blob');
  const salidaInforme = path.join(EV, 'playwright', 'informe-html');
  fs.rmSync(salidaInforme, { recursive: true, force: true });
  execFileSync(
    process.execPath,
    [
      require.resolve('@playwright/test/cli'),
      'merge-reports',
      '-c',
      path.join(__dirname, 'merge.config.ts'),
      '--reporter',
      'html',
      blobs,
    ],
    {
      cwd: __dirname,
      env: { ...process.env, PLAYWRIGHT_HTML_OUTPUT_DIR: salidaInforme, PLAYWRIGHT_HTML_OPEN: 'never' },
      stdio: 'inherit',
    },
  );
  const extra = fs.readdirSync(salidaInforme).filter((f) => f !== 'index.html');
  if (extra.length) console.log(`aviso: el informe tiene archivos adjuntos (${extra.join(', ')})`);
  fs.copyFileSync(path.join(salidaInforme, 'index.html'), path.join(REPORTES, 'playwright-informe.html'));
  // Los pasos «fill» guardan el valor escrito: se enmascara la contraseña de prueba.
  require('./enmascarar-informe.js').enmascarar(path.join(REPORTES, 'playwright-informe.html'));

  const browser = await chromium.launch();

  // 2. Captura del informe de Playwright.
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(pathToFileURL(path.join(REPORTES, 'playwright-informe.html')).href);
    await page.waitForSelector('.test-file-test, [data-testid="test-file-test"], .chip', { timeout: 30_000 }).catch(() => undefined);
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(CAPTURAS, 'playwright-resumen.png'), fullPage: true });
    await page.close();
    console.log('captura playwright-resumen.png');
  }

  // 3. Jest: lista de archivos, cobertura y resumen final.
  {
    const l = lineas(path.join(EV, 'salida-unidad.ansi'));
    const i = l.findIndex((x) => sinAnsi(x).includes('Coverage summary'));
    const fin = l.findIndex((x, k) => k > i && sinAnsi(x).startsWith('====='));
    const suites = l.filter((x) => /^\s*(PASS|FAIL)\s/.test(sinAnsi(x)));
    const resumen = l.filter((x) => /^(Test Suites|Tests|Snapshots|Time|Ran all):?/.test(sinAnsi(x)));
    const texto = [...suites, '', ...l.slice(i, fin + 1), '', ...resumen].join('\n');
    await capturaTerminal(
      browser,
      'jest-cobertura.png',
      'Pruebas unitarias del backend con cobertura — extracto de la salida real',
      'cd backend; npx jest --coverage',
      texto,
    );
  }

  // 4. k6, escenario de 50 usuarios: encabezado y resumen final (sin las líneas de progreso ni
  //    las combinaciones de servicio y código de estado sin solicitudes).
  {
    const l = lineas(path.join(EV, 'k6', 'salida-50.ansi'));
    const texto = l
      .filter((x) => !/^(running \(|carga\s+\[)/.test(sinAnsi(x)))
      .filter((x) => {
        const s = sinAnsi(x);
        if (!s.includes(',status:')) return true;
        const m = /:\s+(\d+)\s/.exec(s.split('}').pop() || '');
        return m ? Number(m[1]) > 0 : true;
      })
      .join('\n')
      .replace(/\n{3,}/g, '\n\n');
    await capturaTerminal(
      browser,
      'k6-50-usuarios.png',
      'k6 — escenario de 50 usuarios virtuales (extracto de la salida real)',
      'docker run --network zoonosis-cap9_default -e USUARIOS=50 … grafana/k6 run /carga.js',
      texto,
      1500,
    );
  }

  // 5. axe-core: resumen por pantalla impreso por la prueba.
  {
    const l = lineas(path.join(EV, 'playwright', 'salida-accesibilidad.ansi')).filter(
      (x) => !sinAnsi(x).includes('injected env'),
    );
    await capturaTerminal(
      browser,
      'axe-resumen.png',
      'Accesibilidad con axe-core (@axe-core/playwright) — salida real',
      'cd test/cap9; npx playwright test accesibilidad.spec.ts',
      l.join('\n').trim(),
      1100,
    );
  }

  // 6. Lighthouse: inicio público en móvil.
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1350 } });
    await page.goto(pathToFileURL(path.join(REPORTES, 'lighthouse-inicio-movil.html')).href);
    // El reporte repite los indicadores en un encabezado fijo oculto: se espera el visible.
    await page.locator('.lh-gauge__percentage:visible').first().waitFor({ timeout: 30_000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(CAPTURAS, 'lighthouse-inicio-movil.png'), fullPage: false });
    await page.close();
    console.log('captura lighthouse-inicio-movil.png');
  }

  // 7. ZAP: tabla de resumen y lista de alertas de cada reporte, una debajo de la otra.
  {
    const partes = [];
    for (const nombre of ['zap-frontend.html', 'zap-api.html']) {
      const archivo = path.join(REPORTES, nombre);
      if (!fs.existsSync(archivo)) continue;
      const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
      await page.goto(pathToFileURL(archivo).href);
      await page.waitForLoadState('load');
      const tablas = page.locator('table.summary, table.alerts');
      const n = await tablas.count();
      const recortes = [];
      for (let k = 0; k < Math.min(n, 2); k++) recortes.push(await tablas.nth(k).screenshot());
      if (!recortes.length) recortes.push(await page.screenshot({ fullPage: false }));
      partes.push({ nombre, imagenes: recortes.map((b) => b.toString('base64')) });
      await page.close();
    }
    const page = await browser.newPage({ viewport: { width: 1100, height: 600 } });
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
      body{margin:0;padding:16px;background:#fff;font:14px Segoe UI,Arial,sans-serif;color:#222}
      h2{font-size:15px;margin:18px 0 8px} img{display:block;max-width:100%;margin-bottom:10px;border:1px solid #ddd}
    </style></head><body>${partes
      .map(
        (p) =>
          `<h2>${p.nombre === 'zap-frontend.html' ? 'Frontend — zap-baseline.py (reportes/zap-frontend.html)' : 'API — zap-api-scan.py con OpenAPI (reportes/zap-api.html)'}</h2>` +
          p.imagenes.map((b) => `<img src="data:image/png;base64,${b}">`).join(''),
      )
      .join('')}</body></html>`);
    await page.screenshot({ path: path.join(CAPTURAS, 'zap-resumen.png'), fullPage: true });
    await page.close();
    console.log('captura zap-resumen.png');
  }

  await browser.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
