/**
 * Valida unitarias.json contra las fuentes reales (jest-resultado.json, coverage-summary.json,
 * capturas, salidas y archivos *.unit.spec.ts).
 * Uso (desde la raíz del repositorio): node docs/pruebas-sprint1/unitarias/validar-unitarias.js
 */
const fs = require('node:fs');
const path = require('node:path');

const dir = __dirname;
const raiz = path.resolve(dir, '../../..');
const leer = (p) => fs.readFileSync(path.join(dir, p), 'utf8');
const j = JSON.parse(leer('unitarias.json'));
const jest = JSON.parse(leer('jest-resultado.json'));
const cov = JSON.parse(leer('cobertura/coverage-summary.json'));
const errores = [];
const error = (m) => errores.push(m);

// Estructura exacta
const CLAVES = ['fecha_ejecucion', 'entorno', 'comandos', 'resumen', 'pruebas', 'cobertura', 'cobertura_total', 'capturas', 'defectos', 'pendientes'];
if (JSON.stringify(Object.keys(j)) !== JSON.stringify(CLAVES)) error(`Claves de primer nivel distintas: ${Object.keys(j)}`);
const CLAVES_PRUEBA = ['id', 'hu', 'unidad', 'tipo_unidad', 'archivo_prueba', 'nombre_it', 'descripcion', 'precondiciones', 'datos_entrada', 'arrange', 'act', 'assert', 'resultado_esperado', 'resultado_obtenido', 'estado', 'tiempo_ms', 'codigo_prueba', 'nueva'];
if (!/^\d{4}-\d{2}-\d{2}$/.test(j.fecha_ejecucion)) error('fecha_ejecucion sin formato AAAA-MM-DD');

// 1. HU, cantidad e IDs
const HUS = ['HU1', 'HU2', 'HU3', 'HU4', 'HU8'];
for (const hu of HUS) {
  const n = j.pruebas.filter((p) => p.hu === hu).length;
  if (n < 4 || n > 6) error(`${hu} tiene ${n} pruebas (deben ser de 4 a 6)`);
}
const ids = j.pruebas.map((p) => p.id);
if (new Set(ids).size !== ids.length) error('Hay IDs repetidos');
for (const p of j.pruebas) {
  if (!/^PU-HU[12348]-\d{2}$/.test(p.id)) error(`${p.id}: formato de ID inválido`);
  if (p.id.slice(3, 6) !== p.hu) error(`${p.id}: no coincide con hu=${p.hu}`);
  if (JSON.stringify(Object.keys(p)) !== JSON.stringify(CLAVES_PRUEBA)) error(`${p.id}: claves distintas a la estructura`);
  if (!['Servicio', 'Validación', 'Función auxiliar'].includes(p.tipo_unidad)) error(`${p.id}: tipo_unidad inválido`);
  if (!['APROBADO', 'FALLIDO'].includes(p.estado)) error(`${p.id}: estado inválido`);
  if (!p.nombre_it.startsWith(`${p.id} `)) error(`${p.id}: el nombre del it() no empieza con el ID`);
  if (typeof p.nueva !== 'boolean') error(`${p.id}: «nueva» no es booleano`);
  if (!fs.existsSync(path.join(raiz, p.archivo_prueba))) error(`${p.id}: no existe ${p.archivo_prueba}`);
}

// 2. Ningún texto vacío (recorre todo el JSON)
(function recorrer(v, ruta) {
  if (typeof v === 'string' && !v.trim()) error(`Texto vacío en ${ruta}`);
  else if (Array.isArray(v)) v.forEach((x, i) => recorrer(x, `${ruta}[${i}]`));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) recorrer(x, `${ruta}.${k}`);
})(j, 'unitarias');

// 3. Cada ID en jest-resultado.json con el mismo estado y tiempo
const enJest = new Map();
for (const s of jest.testResults) for (const a of s.assertionResults) enJest.set(a.title.split(' ')[0], a);
for (const p of j.pruebas) {
  const a = enJest.get(p.id);
  if (!a) { error(`${p.id}: no aparece en jest-resultado.json`); continue; }
  const estado = a.status === 'passed' ? 'APROBADO' : a.status === 'failed' ? 'FALLIDO' : a.status;
  if (estado !== p.estado) error(`${p.id}: estado ${p.estado} ≠ Jest ${estado}`);
  if (a.duration !== p.tiempo_ms) error(`${p.id}: tiempo ${p.tiempo_ms} ≠ Jest ${a.duration}`);
  if (a.title !== p.nombre_it) error(`${p.id}: nombre_it distinto del título en Jest`);
}

// 4. Resumen
const r = j.resumen;
const aprob = j.pruebas.filter((p) => p.estado === 'APROBADO').length;
const fall = j.pruebas.filter((p) => p.estado === 'FALLIDO').length;
if (r.total !== j.pruebas.length || r.total !== jest.numTotalTests) error('resumen.total no coincide');
if (r.aprobadas !== aprob || r.aprobadas !== jest.numPassedTests) error('resumen.aprobadas no coincide');
if (r.fallidas !== fall || r.fallidas !== jest.numFailedTests) error('resumen.fallidas no coincide');
if (r.omitidas !== jest.numPendingTests + jest.numTodoTests) error('resumen.omitidas no coincide');
if (r.suites !== jest.numTotalTestSuites) error('resumen.suites no coincide');
const fin = Math.max(...jest.testResults.map((s) => s.endTime));
if (Math.abs(r.tiempo_s - (fin - jest.startTime) / 1000) > 0.01) error('resumen.tiempo_s no coincide con Jest');

// 5. Código con ID y AAA, máximo 30 líneas, y que sea el código real del archivo
for (const p of j.pruebas) {
  const c = p.codigo_prueba;
  for (const marca of [p.id, '// Arrange', '// Act', '// Assert'])
    if (!c.includes(marca)) error(`${p.id}: el código no contiene «${marca}»`);
  if (c.split('\n').length > 30) error(`${p.id}: el código supera 30 líneas`);
  const fuente = fs.readFileSync(path.join(raiz, p.archivo_prueba), 'utf8').replace(/\r\n/g, '\n');
  const real = c.split('\n').every((l) => fuente.includes(l));
  if (!real) error(`${p.id}: el código no coincide con ${p.archivo_prueba}`);
}

// 6. Cada FALLIDA tiene su defecto (y cada defecto apunta a una fallida)
for (const p of j.pruebas.filter((x) => x.estado === 'FALLIDO'))
  if (!j.defectos.some((d) => d.prueba === p.id && d.hu === p.hu && d.estado === 'Pendiente')) error(`${p.id}: FALLIDA sin defecto`);
for (const d of j.defectos)
  if (!j.pruebas.some((p) => p.id === d.prueba && p.estado === 'FALLIDO')) error(`Defecto de ${d.prueba} sin prueba fallida`);

// 7. Cobertura
const rel = (k) => path.relative(raiz, k).split(path.sep).join('/');
const igual = (a, c) => a.sentencias === c.statements.pct && a.ramas === c.branches.pct && a.funciones === c.functions.pct && a.lineas === c.lines.pct;
if (!igual(j.cobertura_total, cov.total)) error('cobertura_total no coincide con coverage-summary.json');
const archivosCov = Object.keys(cov).filter((k) => k !== 'total');
if (archivosCov.length !== j.cobertura.length) error('Cantidad de archivos de cobertura distinta');
for (const k of archivosCov) {
  const f = j.cobertura.find((x) => x.archivo === rel(k));
  if (!f) error(`Falta la cobertura de ${rel(k)}`);
  else if (!igual(f, cov[k])) error(`Cobertura de ${f.archivo} no coincide`);
}

// 8. Capturas y salidas
const CAPTURAS = ['PU-HU1', 'PU-HU2', 'PU-HU3', 'PU-HU4', 'PU-HU8', 'PU-resumen', 'PU-cobertura'];
for (const c of CAPTURAS) {
  const f = path.join(dir, 'capturas', `${c}.png`);
  if (!fs.existsSync(f) || fs.statSync(f).size < 1000) error(`Falta la captura ${c}.png`);
}
for (const c of j.capturas) {
  if (!fs.existsSync(path.join(dir, c.archivo))) error(`No existe ${c.archivo}`);
  if (!fs.existsSync(path.join(dir, c.salida))) error(`No existe ${c.salida}`);
}
if (j.capturas.length !== 7) error('capturas debe tener 7 elementos');
for (const hu of HUS) {
  const txt = leer(`salidas/PU-${hu}.txt`);
  for (const p of j.pruebas.filter((x) => x.hu === hu))
    if (!txt.includes(p.id)) error(`salidas/PU-${hu}.txt no contiene ${p.id}`);
}
if (!/Test Suites:[\s\S]*Tests:[\s\S]*Time:/.test(leer('salidas/PU-resumen.txt'))) error('PU-resumen.txt sin Test Suites/Tests/Time');

// 9. Sin base de datos real en *.unit.spec.ts
const specs = [...new Set(j.pruebas.map((p) => p.archivo_prueba))];
for (const s of specs) {
  const t = fs.readFileSync(path.join(raiz, s), 'utf8');
  if (/DATABASE_URL/.test(t)) error(`${s} usa DATABASE_URL`);
  if (/new\s+PrismaClient|new\s+PrismaService/.test(t)) error(`${s} crea un cliente de Prisma real`);
  if (/\$connect\(/.test(t)) error(`${s} se conecta a la base de datos`);
}

// 10. Nada sensible en el JSON ni en las salidas
const textos = [['unitarias.json', leer('unitarias.json')],
  ...fs.readdirSync(path.join(dir, 'salidas')).map((f) => [`salidas/${f}`, leer(`salidas/${f}`)])];
const secretos = [];
const envTest = path.join(raiz, '.env.test');
if (fs.existsSync(envTest))
  for (const l of fs.readFileSync(envTest, 'utf8').split(/\r?\n/)) {
    const v = l.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '');
    if (v.length >= 8 && !/^(true|false|local|\.\/)/.test(v)) secretos.push(v);
  }
const PATRONES = [
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, 'token JWT'],
  [/AKIA[0-9A-Z]{16}/, 'clave de AWS'],
  [/sk-ant-[A-Za-z0-9_-]+/, 'clave de API'],
  [/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, 'dirección IP'],
  [/https?:\/\/(?!localhost)[^\s"')]+/, 'URL'],
  [/[A-Z]:\\Users\\/, 'ruta personal del equipo'],
];
for (const [nombre, t] of textos) {
  for (const [re, que] of PATRONES) if (re.test(t)) error(`${nombre} contiene ${que}: ${t.match(re)[0]}`);
  for (const s of secretos) if (t.includes(s)) error(`${nombre} contiene un valor de .env.test`);
}

if (errores.length) {
  console.log(`VALIDACIÓN CON ERRORES (${errores.length}):`);
  for (const e of errores) console.log(` - ${e}`);
  process.exit(1);
}
console.log(`VALIDACIÓN CORRECTA: ${j.pruebas.length} pruebas (${aprob} aprobadas, ${fall} fallidas) en ${HUS.length} HU; ` +
  `cobertura total ${j.cobertura_total.sentencias} % sentencias; ${j.defectos.length} defectos; ${j.pendientes.length} pendientes; 7 capturas.`);
