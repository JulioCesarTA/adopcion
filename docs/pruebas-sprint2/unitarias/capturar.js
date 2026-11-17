/**
 * Genera las 6 capturas de las pruebas unitarias del Sprint 2.
 *  - PU-HUx.png y PU-resumen.png: la salida real de Jest (salidas/*.txt) convertida de ANSI a
 *    HTML con ansi-to-html, sin editar ni recortar líneas, capturada a 1100 px de ancho.
 *  - PU-cobertura.png: cobertura/index.html abierto en el navegador, 1280 × 800.
 * Uso (desde la raíz del repositorio): node docs/pruebas-sprint2/unitarias/capturar.js
 * Las dependencias (playwright y ansi-to-html) se toman de test/sprint1/node_modules.
 */
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');

const raiz = path.resolve(__dirname, '../../..');
const req = createRequire(path.join(raiz, 'test/sprint1/package.json'));
const { chromium } = req('@playwright/test');
const Convert = req('ansi-to-html');

const dir = __dirname;
const salidas = ['PU-HU5', 'PU-HU6', 'PU-HU10', 'PU-HU11', 'PU-resumen'];

function pagina(texto) {
  const html = new Convert({ fg: '#d4d4d4', bg: '#1e1e1e', escapeXML: true, newline: false }).toHtml(texto);
  return `<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;background:#1e1e1e}
    pre{margin:0;padding:16px 20px;color:#d4d4d4;font:14px/1.45 Consolas,'Courier New',monospace;
        white-space:pre-wrap;word-break:break-all}
  </style><pre>${html}</pre>`;
}

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 200 } });
    for (const nombre of salidas) {
      const texto = fs.readFileSync(path.join(dir, 'salidas', `${nombre}.txt`), 'utf8').replace(/\s+$/, '');
      await page.setContent(pagina(texto));
      await page.screenshot({ path: path.join(dir, 'capturas', `${nombre}.png`), fullPage: true });
      console.log(`capturas/${nombre}.png`);
    }
    const cov = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await cov.goto(pathToFileURL(path.join(dir, 'cobertura', 'index.html')).href);
    await cov.screenshot({ path: path.join(dir, 'capturas', 'PU-cobertura.png') });
    console.log('capturas/PU-cobertura.png');
  } finally {
    await browser.close();
  }
})();
