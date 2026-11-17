/**
 * El informe HTML de Playwright guarda los pasos de cada prueba, y el paso que llena el campo
 * «Contraseña» lleva el valor escrito. Este script reemplaza ese valor por «contraseña válida»
 * dentro de los datos que Playwright incrusta en el HTML (un zip en base64) y vuelve a armar el
 * archivo. No cambia ningún resultado.
 *
 *   node test/cap9/enmascarar-informe.js [ruta del informe]
 */
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.test'), quiet: true });

const SECRETO = process.env.SPRINT1_PASSWORD;
const REEMPLAZO = 'contraseña válida';

/** Lee las entradas de un zip (método 0 o 8) usando el directorio central. */
function leerZip(buf) {
  let fin = buf.length - 22;
  while (fin >= 0 && buf.readUInt32LE(fin) !== 0x06054b50) fin--;
  if (fin < 0) throw new Error('zip sin directorio central');
  const total = buf.readUInt16LE(fin + 10);
  let p = buf.readUInt32LE(fin + 16);
  const entradas = [];
  for (let i = 0; i < total; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('directorio central inválido');
    const metodo = buf.readUInt16LE(p + 10);
    const comprimido = buf.readUInt32LE(p + 20);
    const nombreLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const comentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const nombre = buf.toString('utf8', p + 46, p + 46 + nombreLen);
    const inicio = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const datos = buf.subarray(inicio, inicio + comprimido);
    const contenido = metodo === 8 ? zlib.inflateRawSync(datos) : Buffer.from(datos);
    entradas.push({ nombre, contenido });
    p += 46 + nombreLen + extraLen + comentLen;
  }
  return entradas;
}

/** Escribe un zip con compresión deflate. */
function escribirZip(entradas) {
  const locales = [];
  const centrales = [];
  let offset = 0;
  for (const e of entradas) {
    const nombre = Buffer.from(e.nombre, 'utf8');
    const comprimido = zlib.deflateRawSync(e.contenido);
    const crc = zlib.crc32(e.contenido);
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0);
    h.writeUInt16LE(20, 4);
    h.writeUInt16LE(0x0800, 6);
    h.writeUInt16LE(8, 8);
    h.writeUInt16LE(0, 10);
    h.writeUInt16LE(0x21, 12);
    h.writeUInt32LE(crc >>> 0, 14);
    h.writeUInt32LE(comprimido.length, 18);
    h.writeUInt32LE(e.contenido.length, 22);
    h.writeUInt16LE(nombre.length, 26);
    h.writeUInt16LE(0, 28);
    locales.push(h, nombre, comprimido);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(20, 4);
    c.writeUInt16LE(20, 6);
    c.writeUInt16LE(0x0800, 8);
    c.writeUInt16LE(8, 10);
    c.writeUInt16LE(0, 12);
    c.writeUInt16LE(0x21, 14);
    c.writeUInt32LE(crc >>> 0, 16);
    c.writeUInt32LE(comprimido.length, 20);
    c.writeUInt32LE(e.contenido.length, 24);
    c.writeUInt16LE(nombre.length, 28);
    c.writeUInt32LE(offset, 42);
    centrales.push(c, nombre);
    offset += 30 + nombre.length + comprimido.length;
  }
  const central = Buffer.concat(centrales);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(entradas.length, 8);
  fin.writeUInt16LE(entradas.length, 10);
  fin.writeUInt32LE(central.length, 12);
  fin.writeUInt32LE(offset, 16);
  return Buffer.concat([...locales, central, fin]);
}

function enmascarar(archivo) {
  if (!SECRETO) throw new Error('Falta SPRINT1_PASSWORD en .env.test');
  const html = fs.readFileSync(archivo, 'utf8');
  const re = /data:application\/zip;base64,([A-Za-z0-9+/=]+)/;
  const m = re.exec(html);
  if (!m) throw new Error('El informe no tiene datos incrustados');
  const entradas = leerZip(Buffer.from(m[1], 'base64'));
  let reemplazos = 0;
  for (const e of entradas) {
    const texto = e.contenido.toString('utf8');
    const partes = texto.split(SECRETO);
    if (partes.length > 1) {
      reemplazos += partes.length - 1;
      e.contenido = Buffer.from(partes.join(REEMPLAZO), 'utf8');
    }
  }
  const nuevo = escribirZip(entradas).toString('base64');
  const salida = html.replace(re, () => `data:application/zip;base64,${nuevo}`);
  if (salida.includes(SECRETO)) throw new Error('El informe todavía contiene la contraseña');
  fs.writeFileSync(archivo, salida, 'utf8');
  // Comprobación: el zip nuevo se puede leer y ya no contiene la contraseña.
  const control = leerZip(Buffer.from(re.exec(fs.readFileSync(archivo, 'utf8'))[1], 'base64'));
  if (control.some((e) => e.contenido.toString('utf8').includes(SECRETO)))
    throw new Error('El zip nuevo todavía contiene la contraseña');
  console.log(`informe enmascarado: ${reemplazos} reemplazos en ${entradas.length} archivos internos`);
  return reemplazos;
}

module.exports = { enmascarar, leerZip };

if (require.main === module)
  enmascarar(
    process.argv[2] ?? path.resolve(__dirname, '../../docs/pruebas-cap9/reportes/playwright-informe.html'),
  );
