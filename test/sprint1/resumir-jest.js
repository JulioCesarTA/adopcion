// Deja del informe de Jest solo lo que usa generar-resultados.js:
// el informe completo guarda rutas absolutas de la máquina donde se ejecutó.
const fs = require('node:fs');
const path = require('node:path');
const dir = path.join(__dirname, 'evidencia');
const j = JSON.parse(fs.readFileSync(path.join(dir, 'jest-crudo.json'), 'utf8'));
const out = {
  numTotalTests: j.numTotalTests,
  numPassedTests: j.numPassedTests,
  numFailedTests: j.numFailedTests,
  testResults: j.testResults.map((s) => ({
    archivo: s.name.split(path.sep).join('/').replace(/^.*\/backend\//, 'backend/'),
    assertionResults: s.assertionResults.map((a) => ({ title: a.title, status: a.status })),
  })),
};
fs.writeFileSync(path.join(dir, 'caja-blanca-jest.json'), JSON.stringify(out, null, 2) + '\n');
fs.unlinkSync(path.join(dir, 'jest-crudo.json'));
console.log(`Jest: ${out.numPassedTests} de ${out.numTotalTests} pruebas aprobadas`);
