/**
 * Valida el entregable de pruebas del Sprint 3 contra las fuentes reales:
 * resultados.json (caja negra y caja blanca), caja-blanca-resultado.json,
 * unitarias/unitarias.json, unitarias/jest-resultado.json, la cobertura, las
 * capturas, las salidas y los archivos de prueba.
 * Uso (desde la raíz del repositorio): node docs/pruebas-sprint2/validar.js
 */
const fs = require('node:fs');
const path = require('node:path');

const DIR = __dirname;
const RAIZ = path.resolve(DIR, '../..');
const leer = (p) => fs.readFileSync(path.join(DIR, p), 'utf8');
const errores = [];
const err = (m) => errores.push(m);

const r = JSON.parse(leer('resultados.json'));
const cb = JSON.parse(leer('caja-blanca-resultado.json'));
const u = JSON.parse(leer('unitarias/unitarias.json'));
const ju = JSON.parse(leer('unitarias/jest-resultado.json'));
const cov = JSON.parse(leer('unitarias/cobertura/coverage-summary.json'));
const HUS = ['HU7', 'HU9', 'HU12'];

function rango(filas) {
  const m = filas.map((f) => [...f]);
  let rg = 0;
  for (let c = 0; c < (m[0]?.length ?? 0) && rg < m.length; c++) {
    let p = rg;
    for (let i = rg + 1; i < m.length; i++) if (Math.abs(m[i][c]) > Math.abs(m[p][c])) p = i;
    if (Math.abs(m[p][c]) < 1e-9) continue;
    [m[rg], m[p]] = [m[p], m[rg]];
    for (let i = rg + 1; i < m.length; i++) {
      const k = m[i][c] / m[rg][c];
      for (let j = c; j < m[0].length; j++) m[i][j] -= k * m[rg][j];
    }
    rg++;
  }
  return rg;
}

/** Ningún texto vacío. La etiqueta de una arista que no sale de una decisión va vacía, como en la guía. */
function sinTextosVacios(v, ruta) {
  if (typeof v === 'string' && !v.trim()) err(`Texto vacío en ${ruta}`);
  else if (Array.isArray(v)) v.forEach((x, i) => sinTextosVacios(x, `${ruta}[${i}]`));
  else if (v && typeof v === 'object')
    for (const [k, x] of Object.entries(v)) if (k !== 'etiqueta') sinTextosVacios(x, `${ruta}.${k}`);
}

// ===================================================== CAJA NEGRA Y CAJA BLANCA

// Estructura
const CLAVES_R = ['fecha_ejecucion', 'entorno', 'caja_negra', 'caja_blanca', 'defectos', 'pendientes'];
if (JSON.stringify(Object.keys(r)) !== JSON.stringify(CLAVES_R)) err('resultados.json: claves de primer nivel distintas a la estructura');
if (!/^\d{4}-\d{2}-\d{2}$/.test(r.fecha_ejecucion)) err('resultados.json: fecha_ejecucion sin formato AAAA-MM-DD');

// 1. caja_negra con HU5, HU6, HU10 y HU11 y sin textos vacíos
const husNegra = r.caja_negra.map((c) => c.hu);
if (JSON.stringify(husNegra) !== JSON.stringify(HUS)) err(`caja_negra debe tener ${HUS.join(', ')}; tiene ${husNegra.join(', ')}`);
sinTextosVacios(r.caja_negra, 'caja_negra');
for (const c of r.caja_negra) {
  if (!['CORRECTO', 'INCORRECTO'].includes(c.resultado_prueba)) err(`${c.hu}: resultado_prueba no permitido`);
  if (!c.datos_entrada.length || !c.pasos.length) err(`${c.hu}: sin datos de entrada o sin pasos`);
  if (!fs.existsSync(path.join(RAIZ, c.script))) err(`${c.hu}: no existe ${c.script}`);
}

// 2. Las 6 capturas de caja negra
for (const hu of HUS)
  for (const t of ['inicial', 'final']) {
    const f = path.join(DIR, 'capturas', `${hu}-${t}.png`);
    if (!fs.existsSync(f) || fs.statSync(f).size < 1000) err(`Falta la captura capturas/${hu}-${t}.png`);
  }

// 3. Cada historia con al menos un método de caja blanca
for (const hu of HUS) if (!r.caja_blanca.some((m) => m.hu === hu)) err(`${hu} no tiene métodos de caja blanca`);

// Estado de cada prueba CB en Jest
const estadoCB = {};
for (const s of cb.testResults)
  for (const a of s.assertionResults) {
    const id = /^(CB-HU\d+-[A-Z]-C\d+)/.exec(a.title)?.[1];
    if (id) estadoCB[id] = a.status === 'passed' ? 'Aprobado' : 'Fallido';
  }

for (const m of r.caja_blanca) {
  sinTextosVacios(m, m.id);
  if (!fs.existsSync(path.join(RAIZ, m.archivo))) err(`${m.id}: no existe ${m.archivo}`);
  const nodos = m.nodos.filter((n) => n.id !== 'Inicio');
  const aristas = m.aristas.filter((a) => a.de !== 'Inicio');
  const ids = new Set(nodos.map((n) => n.id));
  if (!m.aristas.some((a) => a.de === 'Inicio' && a.a === '1')) err(`${m.id}: falta la arista Inicio → 1`);
  if (!ids.has('F')) err(`${m.id}: falta el nodo F`);

  // Decisiones: nodos con dos salidas, etiquetadas V y F
  const salidas = {};
  for (const a of aristas) (salidas[a.de] ??= []).push(a);
  let P = 0;
  for (const [n, sal] of Object.entries(salidas)) {
    if (sal.length === 2) {
      P++;
      const et = sal.map((s) => s.etiqueta).sort().join('');
      if (et !== 'FV') err(`${m.id}: la decisión ${n} debe tener aristas V y F`);
    } else if (sal.length > 2) err(`${m.id}: el nodo ${n} tiene más de dos salidas`);
  }

  // 4. VG = A − N + 2 = P + 1 = R, sin contar Inicio, y caminos = VG
  const A = aristas.length;
  const N = nodos.length;
  const c = m.complejidad;
  if (c.A !== A) err(`${m.id}: A declarado ${c.A}, contado ${A}`);
  if (c.N !== N) err(`${m.id}: N declarado ${c.N}, contado ${N}`);
  if (c.P !== P) err(`${m.id}: P declarado ${c.P}, contado ${P}`);
  if (c.VG !== A - N + 2) err(`${m.id}: VG=${c.VG} pero A − N + 2 = ${A - N + 2}`);
  if (c.VG !== P + 1) err(`${m.id}: VG=${c.VG} pero P + 1 = ${P + 1}`);
  if (c.VG !== c.R) err(`${m.id}: VG=${c.VG} pero R = ${c.R}`);
  if (m.caminos.length !== c.VG) err(`${m.id}: ${m.caminos.length} caminos; deben ser ${c.VG}`);

  const existe = new Set(aristas.map((a) => `${a.de}>${a.a}`));
  const lista = [...existe];
  const vistas = new Set();
  const matriz = [];
  for (const cam of m.caminos) {
    const pasos = cam.camino.split(',').map((s) => s.trim().replace(/[()]/g, ''));
    // 5. Cada número del camino existe en nodos y aparece como (n) en el código
    for (const p of pasos) {
      if (!ids.has(p)) err(`${m.id} ${cam.test}: el nodo ${p} no existe`);
      if (p !== 'F' && !m.codigo.includes(`(${p}) `)) err(`${m.id}: el nodo (${p}) no aparece en el código`);
    }
    if (pasos[0] !== '1' || pasos.at(-1) !== 'F') err(`${m.id} ${cam.test}: el camino debe ir de 1 a F`);
    const fila = lista.map(() => 0);
    for (let i = 0; i + 1 < pasos.length; i++) {
      const ar = `${pasos[i]}>${pasos[i + 1]}`;
      if (!existe.has(ar)) err(`${m.id} ${cam.test}: la arista ${pasos[i]}→${pasos[i + 1]} no existe`);
      else fila[lista.indexOf(ar)] += 1;
      vistas.add(ar);
    }
    matriz.push(fila);
    // 6. Cada camino tiene su prueba CB en caja-blanca-resultado.json con el mismo resultado
    if (!estadoCB[cam.test]) err(`${m.id}: ${cam.test} no aparece en caja-blanca-resultado.json`);
    else if (estadoCB[cam.test] !== cam.resultado) err(`${cam.test}: resultado ${cam.resultado} ≠ Jest ${estadoCB[cam.test]}`);
    if (!['Aprobado', 'Fallido'].includes(cam.resultado)) err(`${cam.test}: resultado no permitido`);
  }
  if (rango(matriz) !== m.caminos.length) err(`${m.id}: los caminos no son linealmente independientes (rango ${rango(matriz)})`);
  for (const ar of existe) if (!vistas.has(ar)) err(`${m.id}: ningún camino recorre la arista ${ar.replace('>', '→')}`);
  for (const [, n] of m.codigo.matchAll(/^\s*\((\d+)\) /gm)) if (!ids.has(n)) err(`${m.id}: el código numera (${n}), que no está en el grafo`);
}

// ===================================================== PRUEBAS UNITARIAS

const CLAVES_U = ['fecha_ejecucion', 'entorno', 'comandos', 'resumen', 'pruebas', 'cobertura', 'cobertura_total', 'capturas', 'defectos', 'pendientes'];
if (JSON.stringify(Object.keys(u)) !== JSON.stringify(CLAVES_U)) err('unitarias.json: claves de primer nivel distintas a la estructura');
sinTextosVacios(u, 'unitarias');

// 7. Entre 4 y 6 pruebas por historia; IDs únicos con formato PU-HUx-NN
for (const hu of HUS) {
  const n = u.pruebas.filter((p) => p.hu === hu).length;
  if (n < 4 || n > 6) err(`${hu} tiene ${n} pruebas unitarias (deben ser de 4 a 6)`);
}
const idsU = u.pruebas.map((p) => p.id);
if (new Set(idsU).size !== idsU.length) err('Hay IDs de pruebas unitarias repetidos');
for (const p of u.pruebas) {
  if (!/^PU-HU(7|9|12)-\d{2}$/.test(p.id)) err(`${p.id}: formato de ID inválido`);
  if (!p.id.startsWith(`PU-${p.hu}-`)) err(`${p.id}: no coincide con hu=${p.hu}`);
  if (!['Servicio', 'Validación', 'Función auxiliar'].includes(p.tipo_unidad)) err(`${p.id}: tipo_unidad no permitido`);
  if (!['APROBADO', 'FALLIDO'].includes(p.estado)) err(`${p.id}: estado no permitido`);
  if (!p.nombre_it.startsWith(`${p.id} `)) err(`${p.id}: el nombre del it() no empieza con el ID`);
  if (!fs.existsSync(path.join(RAIZ, p.archivo_prueba))) err(`${p.id}: no existe ${p.archivo_prueba}`);
}

// 8. Cada ID en jest-resultado.json con el mismo estado y tiempo; resumen coincide
const enJest = new Map();
for (const s of ju.testResults) for (const a of s.assertionResults) enJest.set(a.title.split(' ')[0], a);
for (const p of u.pruebas) {
  const a = enJest.get(p.id);
  if (!a) { err(`${p.id}: no aparece en jest-resultado.json`); continue; }
  const estado = a.status === 'passed' ? 'APROBADO' : 'FALLIDO';
  if (estado !== p.estado) err(`${p.id}: estado ${p.estado} ≠ Jest ${estado}`);
  if (a.duration !== p.tiempo_ms) err(`${p.id}: tiempo ${p.tiempo_ms} ≠ Jest ${a.duration}`);
}
const rs = u.resumen;
const aprob = u.pruebas.filter((p) => p.estado === 'APROBADO').length;
const fall = u.pruebas.filter((p) => p.estado === 'FALLIDO').length;
if (rs.total !== u.pruebas.length || rs.total !== ju.numTotalTests) err('resumen.total no coincide');
if (rs.aprobadas !== aprob || rs.aprobadas !== ju.numPassedTests) err('resumen.aprobadas no coincide');
if (rs.fallidas !== fall || rs.fallidas !== ju.numFailedTests) err('resumen.fallidas no coincide');
if (rs.omitidas !== ju.numPendingTests + ju.numTodoTests) err('resumen.omitidas no coincide');
if (rs.suites !== ju.numTotalTestSuites) err('resumen.suites no coincide');
const fin = Math.max(...ju.testResults.map((s) => s.endTime));
if (Math.abs(rs.tiempo_s - (fin - ju.startTime) / 1000) > 0.01) err('resumen.tiempo_s no coincide con Jest');

// 9. Cada codigo_prueba contiene su ID y los comentarios AAA (máximo 30 líneas, código real)
for (const p of u.pruebas) {
  for (const marca of [p.id, '// Arrange', '// Act', '// Assert'])
    if (!p.codigo_prueba.includes(marca)) err(`${p.id}: el código no contiene «${marca}»`);
  if (p.codigo_prueba.split('\n').length > 30) err(`${p.id}: el código supera 30 líneas`);
  const fuente = fs.readFileSync(path.join(RAIZ, p.archivo_prueba), 'utf8').replace(/\r\n/g, '\n');
  if (!p.codigo_prueba.split('\n').every((l) => fuente.includes(l))) err(`${p.id}: el código no coincide con el archivo`);
}

// 10. Cobertura igual a coverage-summary.json
const relCov = (k) => path.relative(RAIZ, k).split(path.sep).join('/');
const igual = (a, c) => a.sentencias === c.statements.pct && a.ramas === c.branches.pct && a.funciones === c.functions.pct && a.lineas === c.lines.pct;
if (!igual(u.cobertura_total, cov.total)) err('cobertura_total no coincide con coverage-summary.json');
const archivosCov = Object.keys(cov).filter((k) => k !== 'total');
if (archivosCov.length !== u.cobertura.length) err('Cantidad de archivos de cobertura distinta');
for (const k of archivosCov) {
  const f = u.cobertura.find((x) => x.archivo === relCov(k));
  if (!f) err(`Falta la cobertura de ${relCov(k)}`);
  else if (!igual(f, cov[k])) err(`Cobertura de ${f.archivo} no coincide`);
}

// 11. Las 5 capturas de unitarias y los archivos de salidas
for (const c of ['PU-HU7', 'PU-HU9', 'PU-HU12', 'PU-resumen', 'PU-cobertura']) {
  const f = path.join(DIR, 'unitarias/capturas', `${c}.png`);
  if (!fs.existsSync(f) || fs.statSync(f).size < 1000) err(`Falta la captura unitarias/capturas/${c}.png`);
}
if (u.capturas.length !== 5) err('unitarias.capturas debe tener 5 elementos');
for (const c of u.capturas) {
  if (!fs.existsSync(path.join(DIR, 'unitarias', c.archivo))) err(`No existe unitarias/${c.archivo}`);
  if (!fs.existsSync(path.join(DIR, 'unitarias', c.salida))) err(`No existe unitarias/${c.salida}`);
}
for (const hu of HUS) {
  const txt = leer(`unitarias/salidas/PU-${hu}.txt`);
  for (const p of u.pruebas.filter((x) => x.hu === hu)) if (!txt.includes(p.id)) err(`salidas/PU-${hu}.txt no contiene ${p.id}`);
}
if (!/Test Suites:[\s\S]*Tests:[\s\S]*Time:/.test(leer('unitarias/salidas/PU-resumen.txt'))) err('PU-resumen.txt sin Test Suites/Tests/Time');

// 12. Los archivos *.sprint3.spec.ts y *.sprint3.unit.spec.ts no usan una base de datos real ni la API real de Anthropic
const specs = new Set([...u.pruebas.map((p) => p.archivo_prueba), ...cb.testResults.map((s) => s.name.split('\\').join('/'))]);
for (const s of specs) {
  const ruta = path.isAbsolute(s) ? s : path.join(RAIZ, s);
  const t = fs.readFileSync(ruta, 'utf8');
  if (/DATABASE_URL/.test(t)) err(`${s} usa DATABASE_URL`);
  if (/new\s+(PrismaClient|PrismaService)\s*\(/.test(t)) err(`${s} crea un cliente de Prisma real`);
  if (/\$connect\(/.test(t)) err(`${s} se conecta a la base de datos`);
  // Todo archivo que carga el SDK (directamente o a través del módulo del asistente) debe simularlo.
  const cargaSdk = /@anthropic-ai\/sdk|from '\.\/chat(\.service|\.controller)'/.test(t);
  if (cargaSdk && !/jest\.mock\('@anthropic-ai\/sdk'/.test(t)) err(`${s} carga el SDK de Anthropic sin jest.mock()`);
}

// ===================================================== EN LOS DOS

// 13. Cada INCORRECTO, Fallido o FALLIDO tiene su defecto
for (const c of r.caja_negra.filter((x) => x.resultado_prueba === 'INCORRECTO'))
  if (!r.defectos.some((d) => d.hu === c.hu)) err(`${c.hu}: caja negra INCORRECTO sin defecto`);
for (const m of r.caja_blanca)
  for (const cam of m.caminos.filter((x) => x.resultado === 'Fallido'))
    if (!r.defectos.some((d) => d.prueba === cam.test)) err(`${cam.test}: camino Fallido sin defecto`);
for (const p of u.pruebas.filter((x) => x.estado === 'FALLIDO'))
  if (!u.defectos.some((d) => d.prueba === p.id)) err(`${p.id}: prueba FALLIDA sin defecto`);
for (const d of [...r.defectos, ...u.defectos])
  if (!['Pendiente', 'Corregido'].includes(d.estado)) err(`Defecto con estado no permitido: ${d.estado}`);

// 14. Nada sensible en los JSON ni en las salidas
const textos = [
  ['resultados.json', leer('resultados.json')],
  ['caja-blanca-resultado.json', leer('caja-blanca-resultado.json')],
  ['unitarias/unitarias.json', leer('unitarias/unitarias.json')],
  ['unitarias/jest-resultado.json', leer('unitarias/jest-resultado.json')],
  ...fs.readdirSync(path.join(DIR, 'unitarias/salidas')).map((f) => [`unitarias/salidas/${f}`, leer(`unitarias/salidas/${f}`)]),
];
const PATRONES = [
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, 'un token JWT'],
  [/AKIA[0-9A-Z]{16}/, 'una clave de acceso de AWS'],
  [/sk-ant-[A-Za-z0-9_-]+/, 'una clave de API'],
  [/\$2[aby]\$\d{2}\$[./A-Za-z0-9]{50,}/, 'un hash de contraseña'],
  [/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, 'una dirección IP'],
  [/https?:\/\/(?!localhost)[^\s"')]+/, 'una URL'],
  [/amazonaws\.com/i, 'una dirección de AWS'],
  [/(^|[^\d])\d{12}([^\d]|$)/, 'un identificador de cuenta de AWS (12 dígitos)'],
  [/[A-Za-z]:[\\/]Users[\\/]/, 'una ruta personal del equipo'],
];
const secretos = [];
const envTest = path.join(RAIZ, '.env.test');
if (fs.existsSync(envTest))
  for (const l of fs.readFileSync(envTest, 'utf8').split(/\r?\n/)) {
    if (/^\s*#/.test(l)) continue;
    const v = l.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '');
    if (v.length >= 8 && !/^(true|false|local|lax|strict|none|\.\/|http)/i.test(v)) secretos.push(v);
  }
for (const [nombre, t] of textos) {
  for (const [re, que] of PATRONES) {
    const m = t.match(re);
    if (m) err(`${nombre} contiene ${que}: ${m[0].trim()}`);
  }
  for (const s of secretos) if (t.includes(s)) err(`${nombre} contiene un valor de .env.test`);
}

// ===================================================== RESULTADO

if (errores.length) {
  console.log(`VALIDACIÓN CON ERRORES (${errores.length}):`);
  for (const e of errores) console.log(` - ${e}`);
  process.exit(1);
}
const caminos = r.caja_blanca.flatMap((m) => m.caminos);
console.log(
  `VALIDACIÓN CORRECTA: caja negra ${r.caja_negra.filter((c) => c.resultado_prueba === 'CORRECTO').length}/3 CORRECTO; ` +
    `caja blanca ${r.caja_blanca.length} métodos, ${caminos.filter((c) => c.resultado === 'Aprobado').length}/${caminos.length} caminos aprobados; ` +
    `unitarias ${aprob}/${u.pruebas.length} aprobadas, cobertura ${u.cobertura_total.sentencias} % de sentencias; ` +
    `defectos ${r.defectos.length + u.defectos.length}; 11 capturas.`,
);
