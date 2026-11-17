/**
 * Valida docs/pruebas-sprint1/resultados.json antes de entregarlo.
 *
 *   node docs/pruebas-sprint1/validar.js
 *
 * Comprueba los seis puntos de la guía y dos más, que evitan errores de
 * transcripción en la caja blanca: que cada camino exista de verdad en el
 * grafo, y que los caminos de un método sean independientes entre sí.
 */
const fs = require('node:fs');
const path = require('node:path');

const DIR = __dirname;
const r = JSON.parse(fs.readFileSync(path.join(DIR, 'resultados.json'), 'utf8'));
const errores = [];
const err = (m) => errores.push(m);

const HUS = ['HU1', 'HU2', 'HU3', 'HU4', 'HU8'];

/** Rango de una matriz por eliminación de Gauss. */
function rango(filas) {
  const m = filas.map((f) => [...f]);
  let r = 0;
  for (let c = 0; c < (m[0]?.length ?? 0) && r < m.length; c++) {
    let p = r;
    for (let i = r + 1; i < m.length; i++) if (Math.abs(m[i][c]) > Math.abs(m[p][c])) p = i;
    if (Math.abs(m[p][c]) < 1e-9) continue;
    [m[r], m[p]] = [m[p], m[r]];
    for (let i = r + 1; i < m.length; i++) {
      const k = m[i][c] / m[r][c];
      for (let j = c; j < m[0].length; j++) m[i][j] -= k * m[r][j];
    }
    r++;
  }
  return r;
}

// ---------- 1. Caja negra: las cinco HU y ningún texto vacío ----------
const negra = r.caja_negra ?? [];
if (negra.length !== 5) err(`caja_negra tiene ${negra.length} objetos; deben ser 5`);
for (const hu of HUS) {
  if (!negra.some((c) => c.hu === hu)) err(`Falta ${hu} en caja_negra`);
}
const TEXTOS = [
  'hu', 'nombre', 'descripcion', 'precondicion', 'condicion_ejecucion', 'resultado_esperado',
  'resultado_obtenido', 'captura_inicial', 'captura_final', 'resultado_prueba', 'script',
];
for (const c of negra) {
  for (const k of TEXTOS) {
    if (typeof c[k] !== 'string' || !c[k].trim()) err(`${c.hu}: el campo "${k}" está vacío`);
  }
  if (!Array.isArray(c.pasos) || !c.pasos.length || c.pasos.some((p) => !String(p).trim())) {
    err(`${c.hu}: "pasos" está vacío o tiene un paso vacío`);
  }
  if (!Array.isArray(c.datos_entrada) || !c.datos_entrada.length) {
    err(`${c.hu}: "datos_entrada" está vacío`);
  } else {
    for (const d of c.datos_entrada) {
      if (!String(d.campo ?? '').trim() || !String(d.valor ?? '').trim()) {
        err(`${c.hu}: un dato de entrada tiene el campo o el valor vacío`);
      }
    }
  }
  if (!['CORRECTO', 'INCORRECTO'].includes(c.resultado_prueba)) {
    err(`${c.hu}: resultado_prueba no permitido (${c.resultado_prueba})`);
  }

  // ---------- 2. Existen los archivos de las capturas ----------
  for (const k of ['captura_inicial', 'captura_final']) {
    const f = path.join(DIR, c[k] ?? '');
    if (!c[k] || !fs.existsSync(f) || fs.statSync(f).size < 1000) {
      err(`${c.hu}: no existe la captura ${c[k]}`);
    }
  }
  if (c.script && !fs.existsSync(path.join(DIR, '../..', c.script))) {
    err(`${c.hu}: no existe el script ${c.script}`);
  }
}

// ---------- 3. Cada HU tiene al menos un método en caja blanca ----------
const blanca = r.caja_blanca ?? [];
for (const hu of HUS) {
  if (!blanca.some((m) => m.hu === hu)) err(`Falta un método de ${hu} en caja_blanca`);
}

for (const m of blanca) {
  const nodos = m.nodos.filter((n) => n.id !== 'Inicio');
  const aristas = m.aristas.filter((a) => a.de !== 'Inicio');
  const ids = new Set(nodos.map((n) => n.id));

  if (!m.nodos.some((n) => n.id === 'Inicio')) err(`${m.id}: falta el nodo Inicio`);
  if (!ids.has('F')) err(`${m.id}: falta el nodo F`);
  if (!m.aristas.some((a) => a.de === 'Inicio' && a.a === '1')) {
    err(`${m.id}: falta la arista Inicio → 1`);
  }
  if (!fs.existsSync(path.join(DIR, '../..', m.archivo))) err(`${m.id}: no existe ${m.archivo}`);

  for (const a of aristas) {
    if (!ids.has(a.de) || !ids.has(a.a)) err(`${m.id}: la arista ${a.de}→${a.a} usa un nodo inexistente`);
  }

  // Nodos de decisión: los que tienen dos salidas, etiquetadas V y F.
  const salidas = {};
  for (const a of aristas) (salidas[a.de] ??= []).push(a);
  let P = 0;
  for (const [de, lista] of Object.entries(salidas)) {
    if (lista.length === 2) {
      P++;
      const et = lista.map((x) => x.etiqueta).sort().join('');
      if (et !== 'FV') err(`${m.id}: las salidas de la decisión ${de} deben llevar V y F`);
    } else if (lista.length > 2) {
      err(`${m.id}: el nodo ${de} tiene ${lista.length} salidas`);
    }
  }
  for (const n of nodos) {
    if (n.id !== 'F' && !salidas[n.id]) err(`${m.id}: el nodo ${n.id} no tiene salida`);
    if (n.id !== 'F' && !String(n.descripcion ?? '').trim()) err(`${m.id}: el nodo ${n.id} no tiene descripción`);
  }

  // ---------- 4. VG = A − N + 2 = P + 1 = R, y cantidad de caminos = VG ----------
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
  const vistas = new Set();
  const textos = new Set();
  const listaAristas = [...existe];
  const matriz = [];
  for (const cam of m.caminos) {
    const pasos = cam.camino.split(',').map((s) => s.trim().replace(/[()]/g, ''));

    // ---------- 5. Cada número del camino existe en nodos y en el código ----------
    for (const p of pasos) {
      if (!ids.has(p)) err(`${m.id} ${cam.test}: el nodo ${p} no existe`);
      if (p !== 'F' && !m.codigo.includes(`(${p}) `)) err(`${m.id}: el nodo (${p}) no aparece en el código`);
    }

    // Extra: el camino empieza en 1, termina en F y recorre aristas que existen.
    if (pasos[0] !== '1') err(`${m.id} ${cam.test}: el camino no empieza en 1`);
    if (pasos.at(-1) !== 'F') err(`${m.id} ${cam.test}: el camino no termina en F`);
    const fila = listaAristas.map(() => 0);
    for (let i = 0; i + 1 < pasos.length; i++) {
      const ar = `${pasos[i]}>${pasos[i + 1]}`;
      if (!existe.has(ar)) err(`${m.id} ${cam.test}: la arista ${pasos[i]}→${pasos[i + 1]} no existe en el grafo`);
      else fila[listaAristas.indexOf(ar)] += 1;
      vistas.add(ar);
    }
    matriz.push(fila);
    if (textos.has(cam.camino)) err(`${m.id}: camino repetido ${cam.camino}`);
    textos.add(cam.camino);

    if (!String(cam.entrada_simulada).trim()) err(`${m.id} ${cam.test}: entrada simulada vacía`);
    if (!String(cam.salida_esperada).trim()) err(`${m.id} ${cam.test}: salida esperada vacía`);
    if (!['Aprobado', 'Fallido'].includes(cam.resultado)) err(`${m.id} ${cam.test}: resultado no permitido`);
  }
  // Extra: independencia. Los caminos son independientes si ninguno se obtiene
  // combinando los demás, es decir, si el rango de la matriz caminos × aristas
  // es igual a la cantidad de caminos. (Que cada camino aporte una arista nueva
  // es suficiente pero no necesario; por eso se calcula el rango.)
  if (rango(matriz) !== m.caminos.length) {
    err(`${m.id}: los caminos no son independientes (rango ${rango(matriz)} de ${m.caminos.length})`);
  }
  // Extra: entre todos los caminos se recorren todas las aristas del grafo.
  for (const ar of existe) {
    if (!vistas.has(ar)) err(`${m.id}: ningún camino recorre la arista ${ar.replace('>', '→')}`);
  }
  // Todo nodo numerado en el código existe en el grafo.
  for (const [, n] of m.codigo.matchAll(/^\s*\((\d+)\) /gm)) {
    if (!ids.has(n)) err(`${m.id}: el código numera el nodo (${n}), que no está en el grafo`);
  }
}

for (const d of r.defectos ?? []) {
  if (!['Corregido', 'Pendiente'].includes(d.estado)) err(`Defecto con estado no permitido: ${d.estado}`);
}

// ---------- 6. Nada sensible ----------
const texto = JSON.stringify(r);
const SENSIBLE = [
  [/https?:\/\//i, 'una URL'],
  [/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, 'una dirección IP'],
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, 'un token JWT'],
  [/AKIA[0-9A-Z]{16}/, 'una clave de acceso de AWS'],
  [/sk-[A-Za-z0-9_-]{20,}/, 'una clave de API'],
  [/\$2[aby]\$\d{2}\$[./A-Za-z0-9]{20,}/, 'un hash de contraseña'],
  [/amazonaws\.com/i, 'una dirección del servidor de AWS'],
];
for (const [re, que] of SENSIBLE) {
  if (re.test(texto)) err(`El JSON contiene ${que}`);
}
// La contraseña real de los usuarios de prueba no puede aparecer.
const envTest = path.join(DIR, '../../.env.test');
if (fs.existsSync(envTest)) {
  for (const linea of fs.readFileSync(envTest, 'utf8').split('\n')) {
    const m = /^(SPRINT1_PASSWORD|JWT_ACCESS_SECRET|JWT_REFRESH_SECRET)=(.+)$/.exec(linea.trim());
    if (m && texto.includes(m[2])) err(`El JSON contiene el valor de ${m[1]}`);
  }
}
for (const c of negra) {
  for (const d of c.datos_entrada ?? []) {
    if (/contrase/i.test(d.campo) && d.valor !== 'contraseña válida') {
      err(`${c.hu}: la contraseña debe figurar como "contraseña válida"`);
    }
  }
}

// ---------- Resultado ----------
if (errores.length) {
  console.error(`VALIDACIÓN FALLIDA: ${errores.length} problema(s)`);
  for (const e of errores) console.error('  - ' + e);
  process.exit(1);
}
const caminos = blanca.flatMap((m) => m.caminos);
console.log('VALIDACIÓN CORRECTA');
console.log(`  caja negra : ${negra.length} pruebas, ${negra.filter((c) => c.resultado_prueba === 'CORRECTO').length} CORRECTO`);
console.log(`  caja blanca: ${blanca.length} métodos, ${caminos.length} caminos, ${caminos.filter((c) => c.resultado === 'Aprobado').length} aprobados`);
console.log(`  defectos   : ${(r.defectos ?? []).length}   pendientes: ${(r.pendientes ?? []).length}`);
