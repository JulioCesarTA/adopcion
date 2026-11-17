/**
 * Los informes JSON de Jest guardan rutas absolutas de la máquina donde se
 * ejecutaron (incluido el nombre de usuario del equipo). Este script las deja
 * relativas a la raíz del repositorio. No cambia estados, tiempos ni títulos.
 * Uso (desde la raíz): node test/sprint3/limpiar-rutas.js
 */
const fs = require('node:fs');
const path = require('node:path');
const raiz = path.resolve(__dirname, '../..');
const archivos = ['docs/pruebas-sprint3/caja-blanca-resultado.json', 'docs/pruebas-sprint3/unitarias/jest-resultado.json'];
const variantes = [raiz + path.sep, raiz.split(path.sep).join('/') + '/'];
for (const f of archivos) {
  let t = fs.readFileSync(path.join(raiz, f), 'utf8');
  const j = JSON.parse(t);
  // La letra de unidad puede venir en mayúscula o minúscula: se compara sin distinguirlas.
  const prefijos = variantes.map((v) => v.split(String.fromCharCode(92)).join('/').toLowerCase());
  const limpiar = (s) => {
    let out = s.split(String.fromCharCode(92)).join('/');
    for (const p of prefijos) {
      let i = out.toLowerCase().indexOf(p);
      while (i >= 0) {
        out = out.slice(0, i) + out.slice(i + p.length);
        i = out.toLowerCase().indexOf(p);
      }
    }
    return out;
  };
  for (const s of j.testResults) {
    s.name = limpiar(s.name);
    s.message = limpiar(s.message ?? '');
    for (const a of s.assertionResults) a.failureMessages = a.failureMessages.map(limpiar);
  }
  if (j.coverageMap) delete j.coverageMap;
  fs.writeFileSync(path.join(raiz, f), JSON.stringify(j, null, 2) + '\n');
  console.log(`${f}: rutas relativas`);
}
