/**
 * Lighthouse sobre la compilación de producción del frontend en local (imagen de producción detrás
 * de nginx, http://localhost:3000). Tres páginas públicas, en móvil y en escritorio.
 * Usa el Chromium de Playwright. Guarda los reportes HTML en docs/pruebas-cap9/reportes y los
 * JSON en test/cap9/evidencia/lighthouse.
 *
 *   node test/cap9/lighthouse.js
 */
const { execFileSync } = require('node:child_process');
const { mkdirSync, renameSync, readFileSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { chromium } = require('@playwright/test');

const BASE = 'http://localhost:3000';
const PAGINAS = [
  { id: 'inicio', nombre: 'Inicio público', ruta: '/' },
  { id: 'login', nombre: 'Inicio de sesión', ruta: '/login' },
  { id: 'registro', nombre: 'Registro de clientes (página pública)', ruta: '/registro' },
];
const MODOS = [
  { id: 'movil', nombre: 'Móvil', extra: [] },
  { id: 'escritorio', nombre: 'Escritorio', extra: ['--preset=desktop'] },
];

const REPORTES = resolve(__dirname, '../../docs/pruebas-cap9/reportes');
const EVIDENCIA = resolve(__dirname, 'evidencia/lighthouse');
mkdirSync(REPORTES, { recursive: true });
mkdirSync(EVIDENCIA, { recursive: true });

const cli = require.resolve('lighthouse/cli/index.js');
const env = { ...process.env, CHROME_PATH: chromium.executablePath() };
const resultados = [];

for (const p of PAGINAS) {
  for (const m of MODOS) {
    const base = resolve(EVIDENCIA, `lighthouse-${p.id}-${m.id}`);
    console.log(`Lighthouse: ${p.nombre} (${m.nombre})`);
    try {
      execFileSync(
        process.execPath,
        [
          cli,
          `${BASE}${p.ruta}`,
          '--output=html',
          '--output=json',
          `--output-path=${base}`,
          '--chrome-flags=--headless=new --no-first-run',
          '--locale=es',
          '--quiet',
          ...m.extra,
        ],
        { env, stdio: 'inherit' },
      );
    } catch (err) {
      // En Windows, chrome-launcher a veces no puede borrar su carpeta temporal al terminar
      // (EPERM) aunque el reporte ya se escribió; se comprueba abajo.
      console.log(`  aviso: lighthouse terminó con código ${err.status}`);
    }
    const json = JSON.parse(readFileSync(`${base}.report.json`, 'utf8'));
    renameSync(`${base}.report.html`, resolve(REPORTES, `lighthouse-${p.id}-${m.id}.html`));
    const a = json.audits;
    const c = json.categories;
    resultados.push({
      pagina: p.nombre,
      ruta: p.ruta,
      modo: m.nombre,
      reporte: `reportes/lighthouse-${p.id}-${m.id}.html`,
      lighthouse: json.lighthouseVersion,
      puntajes: {
        rendimiento: Math.round(c.performance.score * 100),
        accesibilidad: Math.round(c.accessibility.score * 100),
        buenas_practicas: Math.round(c['best-practices'].score * 100),
        seo: Math.round(c.seo.score * 100),
      },
      metricas: {
        fcp_s: +(a['first-contentful-paint'].numericValue / 1000).toFixed(2),
        lcp_s: +(a['largest-contentful-paint'].numericValue / 1000).toFixed(2),
        tbt_ms: Math.round(a['total-blocking-time'].numericValue),
        cls: +a['cumulative-layout-shift'].numericValue.toFixed(3),
      },
      advertencias: json.runWarnings ?? [],
    });
  }
}

writeFileSync(resolve(EVIDENCIA, 'lighthouse-resumen.json'), JSON.stringify(resultados, null, 2) + '\n');
for (const r of resultados) {
  console.log(
    `${r.pagina.padEnd(40)} ${r.modo.padEnd(10)} R ${r.puntajes.rendimiento} A ${r.puntajes.accesibilidad} BP ${r.puntajes.buenas_practicas} SEO ${r.puntajes.seo} | FCP ${r.metricas.fcp_s} s LCP ${r.metricas.lcp_s} s TBT ${r.metricas.tbt_ms} ms CLS ${r.metricas.cls}`,
  );
}
