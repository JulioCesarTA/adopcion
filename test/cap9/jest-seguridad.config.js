/**
 * Configuración de Jest para test/cap9/seguridad.e2e-spec.ts.
 * Se ejecuta desde backend/ (npx jest --config ../test/cap9/jest-seguridad.config.js) y reutiliza
 * las dependencias del backend sin copiarlas ni modificar su configuración.
 */
const path = require('node:path');

const backend = path.resolve(__dirname, '../../backend');

module.exports = {
  rootDir: __dirname,
  testMatch: ['<rootDir>/seguridad.e2e-spec.ts'],
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json', 'ts'],
  moduleDirectories: ['node_modules', path.join(backend, 'node_modules')],
  transform: {
    '^.+\\.(t|j)s$': [
      require.resolve('ts-jest', { paths: [backend] }),
      { tsconfig: path.join(__dirname, 'tsconfig.seguridad.json') },
    ],
  },
  testTimeout: 120_000,
};
