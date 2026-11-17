/**
 * Deja la evidencia del Capítulo IX lista para versionar y entregar:
 *  - quita setup_data (token de acceso) de los resúmenes de k6;
 *  - quita el código fuente que ESLint copia en su salida JSON (se conservan los mensajes);
 *  - reemplaza las rutas absolutas del equipo por rutas relativas al repositorio;
 *  - borra archivos grandes que ya están resumidos (cobertura por sentencia, JSON completos de
 *    Lighthouse) y los «blob» de Playwright una vez armado el informe HTML.
 *
 *   node test/cap9/limpiar-evidencia.js
 */
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '../..');
const EV = path.join(__dirname, 'evidencia');
const REPORTES = path.join(RAIZ, 'docs/pruebas-cap9/reportes');
const BS = String.fromCharCode(92);

// 1. k6: sin setup_data.
for (const f of fs.readdirSync(REPORTES).filter((x) => /^k6-.*\.json$/.test(x))) {
  const p = path.join(REPORTES, f);
  const d = JSON.parse(fs.readFileSync(p, 'utf8'));
  if ('setup_data' in d) {
    delete d.setup_data;
    fs.writeFileSync(p, JSON.stringify(d, null, 1));
    console.log(`k6: setup_data quitado de ${f}`);
  }
}

// 2. ESLint: sin el código fuente.
for (const f of ['eslint-complejidad-backend.json', 'eslint-complejidad-frontend.json']) {
  const p = path.join(EV, f);
  if (!fs.existsSync(p)) continue;
  const d = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const x of d) delete x.source;
  fs.writeFileSync(p, JSON.stringify(d));
  console.log(`eslint: código fuente quitado de ${f}`);
}

// 3. Archivos que ya están resumidos.
const borrar = [
  path.join(EV, 'cobertura', 'coverage-final.json'),
  path.join(EV, 'playwright', 'blob'),
  path.join(EV, 'playwright', 'informe-html'),
  ...fs
    .readdirSync(path.join(EV, 'lighthouse'))
    .filter((x) => x.endsWith('.report.json'))
    .map((x) => path.join(EV, 'lighthouse', x)),
];
for (const p of borrar)
  if (fs.existsSync(p)) {
    fs.rmSync(p, { recursive: true, force: true });
    console.log(`borrado ${path.relative(RAIZ, p)}`);
  }

// 4. Rutas absolutas → relativas (en todas sus formas: \, \\ y /).
const variantes = (r) => {
  const normal = r.split(BS).join('/');
  const conBarra = normal.split('/').join(BS);
  const doble = normal.split('/').join(BS + BS);
  const v = [doble, conBarra, normal];
  return [...v, ...v.map((x) => x.charAt(0).toLowerCase() + x.slice(1))];
};
const raices = variantes(RAIZ);
const usuario = variantes(require('node:os').homedir());
const texto = (p) => /\.(json|jsonl|ansi|txt|log|yaml|md)$/.test(p);
function recorrer(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) recorrer(p);
    else if (texto(p)) {
      let s = fs.readFileSync(p, 'utf8');
      const antes = s;
      for (const r of raices) s = s.split(r).join('.');
      for (const u of usuario) s = s.split(u).join('~');
      if (s !== antes) {
        fs.writeFileSync(p, s);
        console.log(`rutas relativas: ${path.relative(RAIZ, p)}`);
      }
    }
  }
}
recorrer(EV);
recorrer(REPORTES);
console.log('listo');
