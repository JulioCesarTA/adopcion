/**
 * Valida el entregable del Capítulo IX:
 *  1. datos-cap9.json es JSON válido y tiene la estructura pedida;
 *  2. ni el JSON, ni los reportes, ni la evidencia, ni las pruebas contienen contraseñas, tokens,
 *     claves, la cadena de conexión de la base ni datos del servidor de AWS. El informe HTML de
 *     Playwright se revisa también por dentro (zip incrustado).
 *
 *   node test/cap9/validar.js
 */
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.test'), quiet: true });
const { leerZip } = require('./enmascarar-informe.js');

const RAIZ = path.resolve(__dirname, '../..');
const DOCS = path.join(RAIZ, 'docs/pruebas-cap9');
const errores = [];
const error = (m) => errores.push(m);

// ------------------------------------------------------------- estructura
let d = null;
try {
  d = JSON.parse(fs.readFileSync(path.join(DOCS, 'datos-cap9.json'), 'utf8'));
} catch (e) {
  error(`datos-cap9.json no es JSON válido: ${e.message}`);
}
if (d) {
  const claves = [
    'fecha', 'entorno', 'implementacion', 'inventario', 'unidad', 'complejidad', 'integracion',
    'playwright', 'regresion', 'sistema', 'rendimiento', 'seguridad', 'accesibilidad',
    'grafos_sprint3', 'defectos_nuevos', 'capturas', 'pendientes',
  ];
  for (const k of claves) if (!(k in d)) error(`falta la clave «${k}»`);
  const tiene = (obj, campos, donde) => {
    for (const c of campos) if (!obj || !(c in obj)) error(`falta «${c}» en ${donde}`);
  };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.fecha)) error('fecha con formato distinto de AAAA-MM-DD');
  tiene(d.entorno, ['sistema_operativo', 'procesador', 'ram', 'docker', 'node', 'k6', 'zap', 'lighthouse', 'playwright', 'navegador'], 'entorno');
  for (const i of d.inventario ?? []) tiene(i, ['archivo', 'tipo', 'cubre', 'pruebas'], 'inventario');
  tiene(d.unidad, ['total', 'aprobadas', 'fallidas', 'tiempo_s', 'cobertura_total', 'cobertura_por_modulo'], 'unidad');
  tiene(d.complejidad, ['funciones', 'maximo', 'top10', 'mayores_a_10'], 'complejidad');
  tiene(d.integracion, ['total', 'aprobadas', 'fallidas', 'tiempo_s', 'casos'], 'integracion');
  for (const c of d.integracion?.casos ?? [])
    tiene(c, ['archivo', 'nombre', 'endpoints', 'modulos', 'verifica', 'esperado', 'obtenido', 'estado', 'tiempo_ms'], 'integracion.casos');
  tiene(d.playwright, ['total', 'aprobadas', 'fallidas', 'casos'], 'playwright');
  tiene(d.regresion, ['comparacion', 'nuevas_fallas'], 'regresion');
  tiene(d.sistema, ['pasos', 'estado'], 'sistema');
  for (const p of d.sistema?.pasos ?? []) tiene(p, ['accion', 'esperado', 'obtenido', 'estado'], 'sistema.pasos');
  tiene(d.rendimiento, ['limitador', 'escenarios', 'recursos', 'lighthouse'], 'rendimiento');
  tiene(d.seguridad, ['zap', 'manuales', 'owasp_top10', 'npm_audit'], 'seguridad');
  tiene(d.seguridad?.zap, ['frontend', 'api', 'resumen'], 'seguridad.zap');
  tiene(d.seguridad?.npm_audit, ['backend', 'frontend'], 'seguridad.npm_audit');
  if ((d.seguridad?.manuales ?? []).length !== 19) error('seguridad.manuales no tiene las 19 pruebas SEG');
  if ((d.seguridad?.owasp_top10 ?? []).length !== 10) error('owasp_top10 no tiene A01 a A10');
  if ((d.grafos_sprint3 ?? []).length !== 2) error('grafos_sprint3 no tiene los 2 grafos');
  for (const c of d.capturas ?? []) {
    tiene(c, ['archivo', 'muestra'], 'capturas');
    if (!fs.existsSync(path.join(DOCS, c.archivo))) error(`no existe ${c.archivo}`);
  }
  if (d.integracion?.total !== 24) error('integracion.total distinto de 24');
  if (d.playwright?.total !== 13) error('playwright.total distinto de 13');
  if (d.unidad.aprobadas + d.unidad.fallidas !== d.unidad.total) error('unidad: aprobadas + fallidas ≠ total');
}

// ------------------------------------------------------------- secretos
const prohibidos = [];
const agregar = (valor, nombre) => {
  if (valor && valor.length >= 6) prohibidos.push({ valor, nombre });
};
agregar(process.env.SPRINT1_PASSWORD, 'contraseña de los usuarios de prueba');
agregar(process.env.JWT_ACCESS_SECRET, 'JWT_ACCESS_SECRET');
agregar(process.env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET');
agregar(process.env.DATABASE_URL, 'DATABASE_URL');
// La contraseña del seed de desarrollo y los datos del servidor se leen del repositorio en el
// momento, para no escribirlos en este archivo.
const seed = fs.readFileSync(path.join(RAIZ, 'backend/prisma/seed.ts'), 'utf8');
agregar((/DEV_PASSWORD\s*=\s*'([^']+)'/.exec(seed) || [])[1], 'contraseña del seed de desarrollo');
const deploy = fs.readFileSync(path.join(RAIZ, '.github/workflows/deploy.yml'), 'utf8');
for (const clave of ['ECR_REGISTRY', 'INSTANCE_ID', 'PUBLIC_HOST', 'AWS_ROLE']) {
  const valor = (new RegExp(`^\\s*${clave}:\\s*(\\S+)`, 'm').exec(deploy) || [])[1];
  agregar(valor, `dato del servidor de AWS (${clave})`);
  if (clave === 'ECR_REGISTRY' && valor) agregar(valor.split('.')[0], 'cuenta de AWS');
}
const patrones = [
  [/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, 'token JWT'],
  [/sk-ant-[A-Za-z0-9_-]{10,}/, 'clave de la API de Anthropic'],
  [/AKIA[0-9A-Z]{16}/, 'clave de acceso de AWS'],
  [/postgres(ql)?:\/\/[^\s"'<>]+:[^\s"'<>]+@/, 'cadena de conexión con credenciales'],
  // Se arma por partes para que este archivo no se detecte a sí mismo.
  [new RegExp(['amazon', 'aws\\.com|', 'arn', ':aws:'].join('')), 'dato del servidor o la cuenta de AWS'],
  [new RegExp(require('node:os').homedir().split(/[\\/]/).filter(Boolean).pop() ?? '\\0', 'i'), 'nombre del usuario del equipo'],
];

function revisarTexto(texto, donde) {
  for (const p of prohibidos) if (texto.includes(p.valor)) error(`${donde}: contiene ${p.nombre}`);
  for (const [re, nombre] of patrones) if (re.test(texto)) error(`${donde}: contiene ${nombre}`);
}

const omitir = new Set(['node_modules', 'test-results', 'playwright-report']);
function recorrer(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (omitir.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) recorrer(p);
    else if (/\.(json|jsonl|html|ansi|txt|log|yaml|md|ts|js|sh|yml|conf)$/.test(e.name)) {
      const texto = fs.readFileSync(p, 'utf8');
      const donde = path.relative(RAIZ, p);
      revisarTexto(texto, donde);
      const m = /data:application\/zip;base64,([A-Za-z0-9+/=]+)/.exec(texto);
      if (m)
        for (const z of leerZip(Buffer.from(m[1], 'base64')))
          revisarTexto(z.contenido.toString('utf8'), `${donde} › ${z.nombre}`);
    }
  }
}
recorrer(DOCS);
recorrer(__dirname);

if (errores.length) {
  console.log(`VALIDACIÓN CON ERRORES (${errores.length}):`);
  for (const e of errores) console.log(` - ${e}`);
  process.exit(1);
}
console.log('Validación correcta: JSON válido, estructura completa y sin datos sensibles.');
