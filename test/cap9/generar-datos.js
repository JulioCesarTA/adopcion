/**
 * Arma docs/pruebas-cap9/datos-cap9.json a partir de la evidencia de las ejecuciones
 * (test/cap9/evidencia y docs/pruebas-cap9/reportes). No escribe resultados a mano: todo número
 * sale de un archivo generado por las herramientas.
 *
 *   node test/cap9/generar-datos.js
 */
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '../..');
const EV = path.join(__dirname, 'evidencia');
const DOCS = path.join(RAIZ, 'docs/pruebas-cap9');
const leer = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const existe = (p) => fs.existsSync(p);
const BS = String.fromCharCode(92);
const rel = (p) => {
  const n = p.split(BS).join('/');
  const r = RAIZ.split(BS).join('/');
  const x = n.toLowerCase().startsWith(r.toLowerCase()) ? n.slice(r.length + 1) : n;
  // limpiar-evidencia.js deja las rutas como «./backend/…».
  return x.startsWith('./') ? x.slice(2) : x;
};
const sinAnsi = (s) => s.replace(new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g'), '');
const r2 = (n) => Math.round(n * 100) / 100;
const pct = (c, t) => (t ? r2((c / t) * 100) : 100);
const tiempoJest = (archivo) => {
  const m = /Time:\s+([\d.]+)\s*s/.exec(sinAnsi(fs.readFileSync(archivo, 'utf8')));
  return m ? Number(m[1]) : null;
};

// ------------------------------------------------------------------ entorno
const entorno = {
  sistema_operativo: 'Microsoft Windows 11 Home 10.0.26200 (64 bits)',
  procesador: 'AMD Ryzen 7 5700G with Radeon Graphics (8 núcleos, 16 hilos)',
  ram: '13,8 GB',
  docker:
    'Docker Desktop con Docker Engine 29.9.3 (máquina virtual de Docker con 16 CPU y 6,7 GB de memoria)',
  node: {
    equipo: 'v26.13.1 (Jest, Playwright, Lighthouse y scripts)',
    contenedores: 'v24.22.3 (imágenes node:24-slim del backend y del frontend)',
  },
  k6: 'v2.4.0 (imagen grafana/k6:latest)',
  zap: null,
  lighthouse: '13.6.0',
  playwright: '1.65.1',
  navegador: 'Chromium 159.0.8154.6 (el de Playwright), ventana de 1280 × 800',
  axe_core: '4.14.1 (@axe-core/playwright 4.14.0)',
  jest: '29.7.0 con ts-jest',
  base_de_datos:
    'PostgreSQL 16.16 en Docker (contenedor zoonosis-db-test, puerto 5433, base zoonosis_test); la misma base de prueba de los sprints',
  sistema_bajo_prueba: {
    backend:
      'Imagen construida con backend/Dockerfile sin cambios (etapa runtime, NODE_ENV=production, node dist/main); al arrancar aplica las migraciones pendientes',
    frontend:
      'Imagen construida con frontend/Dockerfile sin cambios (compilación de producción de Next.js, salida standalone)',
    proxy:
      'nginx 1.29.8 con la plantilla deploy/nginx/templates-http (la que monta docker-compose.ec2.yml), publicado en http://localhost:3000',
    orquestacion: 'test/cap9/docker-compose.cap9.yml, levantado con test/cap9/sistema.sh',
    variables: 'Las de .env.test (sin versionar); sin clave de la API de Anthropic ni servidor SMTP',
  },
  diferencias_con_produccion: [
    'Sin TLS: se usa la plantilla HTTP de nginx; la de producción con HTTPS sobre la IP (templates-ip-tls) necesita un certificado real.',
    'En local se anula el default.conf de la imagen nginx, porque declara server_name localhost y respondería en lugar de la plantilla del repositorio.',
    'Las fotos se guardan en disco (STORAGE_DRIVER=local) en lugar de S3.',
    'Sin clave de la API de Anthropic: el asistente responde 503, como en el Sprint 3.',
    'Sin servidor SMTP: el formulario de contacto guarda el mensaje, pero no envía correo.',
    'La base de datos es la de prueba, con los datos de los seeds de los sprints.',
  ],
};

// ----------------------------------------------------------- implementación
const pkgBack = leer(path.join(RAIZ, 'backend/package.json'));
const implementacion = {
  jest_unitarias: {
    configuracion: 'backend/package.json → jest',
    rootDir: pkgBack.jest.rootDir,
    testRegex: pkgBack.jest.testRegex,
    transformacion: 'ts-jest',
    entorno: pkgBack.jest.testEnvironment,
    cobertura: `collectCoverageFrom ${JSON.stringify(pkgBack.jest.collectCoverageFrom)}, coverageDirectory ${pkgBack.jest.coverageDirectory}`,
    comando: 'npm test (jest) · npm run test:cov (jest --coverage)',
    dependencias:
      'Prisma, servicios externos y SDK se reemplazan por dobles de prueba (jest.fn, jest.mock); la API de IA no se llama nunca.',
  },
  jest_integracion: {
    configuracion: 'backend/test/jest-e2e.json',
    rootDir: '.',
    testRegex: '.e2e-spec.ts$',
    transformacion: 'ts-jest',
    comando: 'npm run db:setup && npm run test:e2e (jest --config ./test/jest-e2e.json --runInBand)',
    forma:
      'Cada archivo crea la aplicación completa en el proceso con @nestjs/testing y setupApp(), y la recorre con Supertest contra una base PostgreSQL real.',
  },
  jest_seguridad: {
    configuracion: 'test/cap9/jest-seguridad.config.js (reutiliza las dependencias del backend)',
    comando: 'cd backend && npx jest --config ../test/cap9/jest-seguridad.config.js --runInBand',
  },
  playwright: {
    configuraciones: [
      'test/sprint1/playwright.config.ts',
      'test/sprint2/playwright.config.ts',
      'test/sprint3/playwright.config.ts',
      'test/cap9/playwright.config.ts',
    ],
    navegador: 'Chromium (perfil Desktop Chrome)',
    ventana: '1280 × 800',
    reintentos: 0,
    trabajadores: 1,
    tiempo_maximo: '90 s por prueba en los sprints; 300 s en el Capítulo IX (flujo completo de 600 s)',
    reportero: 'list (en esta ejecución se agregaron json y blob por la línea de comandos)',
    regional: 'locale es-BO, zona horaria America/La_Paz',
    url_base: 'http://localhost:3000',
  },
  datos_de_prueba: [
    {
      archivo: 'backend/prisma/seed.ts',
      uso: 'npm run db:setup y CI',
      descripcion:
        'Idempotente: crea los usuarios de prueba, el catálogo de vacunas y la configuración del algoritmo; los datos de ejemplo solo si la base no tiene animales.',
    },
    {
      archivo: 'test/sprint1/seed-sprint1.ts',
      uso: 'Caja negra del Sprint 1',
      descripcion: 'Vacía las tablas y carga los datos propios; se niega a ejecutarse fuera de la base de prueba.',
    },
    {
      archivo: 'test/sprint2/seed-sprint2.ts',
      uso: 'Caja negra del Sprint 2',
      descripcion: 'Igual que el anterior, con los datos de las historias del Sprint 2.',
    },
    {
      archivo: 'test/sprint3/seed-sprint3.ts',
      uso: 'Caja negra del Sprint 3 y pruebas del Capítulo IX',
      descripcion: 'Igual que el anterior, con fechas relativas al día de ejecución.',
    },
  ],
  github_actions: {
    'ci.yml': {
      backend: ['Lint', 'Verificar tipos', 'Compilar', 'Pruebas unitarias (npm test)', 'Migraciones y seed (npm run db:setup)', 'Pruebas de integración (npm run test:e2e) con postgres:16-alpine'],
      frontend: ['Lint', 'Verificar tipos', 'Compilar'],
      docker: ['Construir las imágenes del backend y del frontend (sin publicar)'],
    },
    'deploy.yml': 'No ejecuta pruebas: publica las imágenes en ECR y despliega por SSM cuando el CI termina bien en main.',
    no_incluidas: [
      'Playwright (caja negra, sistema, XSS y accesibilidad)',
      'Pruebas de seguridad del Capítulo IX',
      'k6, Lighthouse y OWASP ZAP',
    ],
  },
};

// --------------------------------------------------------------- inventario
const unidadJson = leer(path.join(EV, 'jest-unidad.json'));
const tipoDe = (archivo) => {
  if (/\.sprint\d\.spec\.ts$/.test(archivo)) return 'Caja blanca (camino básico, Jest)';
  if (/unit\.spec\.ts$/.test(archivo)) return 'Unitaria por historia de usuario (Jest, AAA)';
  return 'Unitaria (Jest)';
};
const cubreDe = (archivo, titulos) => {
  const mod = /\/(modules|common)\/([^/]+)/.exec(archivo);
  const hus = [...new Set(titulos.map((t) => (/\b(HU\d+)\b/.exec(t) || [])[1]).filter(Boolean))];
  const base = mod ? (mod[1] === 'common' ? `common/${mod[2]}` : `módulo ${mod[2]}`) : archivo;
  return hus.length ? `${hus.join(', ')} · ${base}` : base;
};
const inventario = [];
for (const t of unidadJson.testResults) {
  const archivo = rel(t.name);
  const titulos = t.assertionResults.map((a) => `${a.ancestorTitles.join(' ')} ${a.title}`);
  inventario.push({ archivo, tipo: tipoDe(archivo), cubre: cubreDe(archivo, titulos), pruebas: t.assertionResults.length });
}
inventario.sort((a, b) => a.archivo.localeCompare(b.archivo));
const integJson = leer(path.join(EV, 'jest-integracion.json'));
for (const t of integJson.testResults) {
  const archivo = rel(t.name);
  const cubre = {
    'auth.e2e-spec.ts': 'Autenticación y usuarios (auth, users)',
    'business-rules.e2e-spec.ts': 'Reglas de negocio RN-03 a RN-07, HCD, solicitudes, panel y KPI',
    'public.e2e-spec.ts': 'Sitio público, rol CLIENTE, contacto y asistente',
  }[path.basename(archivo)];
  inventario.push({ archivo, tipo: 'Integración (API + PostgreSQL, Supertest)', cubre, pruebas: t.assertionResults.length });
}
const pw = (n) => leer(path.join(EV, 'playwright', n));
const especsPw = (rep) => {
  const out = [];
  const visitar = (s, archivo) => {
    for (const sp of s.specs || []) out.push({ archivo: archivo || s.file, titulo: sp.title, tests: sp.tests });
    for (const h of s.suites || []) visitar(h, archivo || s.file);
  };
  for (const s of rep.suites) visitar(s, s.file);
  return out;
};
for (const [s, nombre] of [
  [1, 'sprint1.json'],
  [2, 'sprint2.json'],
  [3, 'sprint3.json'],
]) {
  for (const e of especsPw(pw(nombre))) {
    const hu = (/^(HU\d+)/.exec(e.titulo) || [])[1];
    inventario.push({
      archivo: `test/sprint${s}/e2e/${path.basename(e.archivo)}`,
      tipo: hu ? 'Caja negra (Playwright)' : 'Preparación de caja negra (Playwright)',
      cubre: hu ? `${hu} (Sprint ${s})` : `Entrenamiento del modelo antes de HU6 (Sprint ${s})`,
      pruebas: 1,
    });
  }
}
inventario.push(
  { archivo: 'test/cap9/flujo-completo.spec.ts', tipo: 'Sistema (Playwright)', cubre: 'Ciclo completo del animal: HU1, HU2, HU4, HU10, HU5, HU6, HU11, HU12, HU7 y sitio público', pruebas: 1 },
  { archivo: 'test/cap9/seguridad.e2e-spec.ts', tipo: 'Seguridad (Supertest)', cubre: 'SEG-01 a SEG-19, salvo SEG-08', pruebas: leer(path.join(EV, 'jest-seguridad.json')).numTotalTests },
  { archivo: 'test/cap9/seg08-xss.spec.ts', tipo: 'Seguridad (Playwright)', cubre: 'SEG-08 XSS almacenado', pruebas: 1 },
  { archivo: 'test/cap9/accesibilidad.spec.ts', tipo: 'Accesibilidad (axe-core con Playwright)', cubre: '7 pantallas', pruebas: 1 },
  { archivo: 'test/cap9/k6/carga.js', tipo: 'Rendimiento (k6)', cubre: '6 servicios del backend; escenarios de 10, 25 y 50 usuarios virtuales', pruebas: 3 },
  { archivo: 'test/cap9/lighthouse.js', tipo: 'Rendimiento web (Lighthouse)', cubre: '3 páginas públicas en móvil y escritorio', pruebas: 6 },
  { archivo: 'test/cap9/zap.sh', tipo: 'Seguridad (OWASP ZAP)', cubre: 'Escaneo base del frontend y escaneo de la API con OpenAPI', pruebas: 2 },
);

// ------------------------------------------------------------------- unidad
const cobSum = leer(path.join(EV, 'cobertura/coverage-summary.json'));
const metricas = ['statements', 'branches', 'functions', 'lines'];
const nombres = { statements: 'sentencias', branches: 'ramas', functions: 'funciones', lines: 'lineas' };
const cobertura = (o) =>
  Object.fromEntries(metricas.map((k) => [nombres[k], { cubiertas: o[k].covered, total: o[k].total, porcentaje: o[k].pct }]));
const porModulo = {};
for (const [archivo, datos] of Object.entries(cobSum)) {
  if (archivo === 'total') continue;
  const m = /[\\/]src[\\/]modules[\\/]([^\\/]+)[\\/]/.exec(archivo);
  const clave = m ? m[1] : null;
  if (!clave) continue;
  porModulo[clave] ??= Object.fromEntries(metricas.map((k) => [k, { covered: 0, total: 0 }]));
  for (const k of metricas) {
    porModulo[clave][k].covered += datos[k].covered;
    porModulo[clave][k].total += datos[k].total;
  }
}
const coberturaPorModulo = Object.entries(porModulo)
  .map(([modulo, v]) => ({
    modulo,
    ...Object.fromEntries(metricas.map((k) => [nombres[k], pct(v[k].covered, v[k].total)])),
  }))
  .sort((a, b) => a.modulo.localeCompare(b.modulo));
const fallidasUnidad = [];
for (const t of unidadJson.testResults)
  for (const a of t.assertionResults)
    if (a.status !== 'passed')
      fallidasUnidad.push({
        archivo: rel(t.name),
        prueba: a.title,
        mensaje: sinAnsi((a.failureMessages || [''])[0]).split('\n').slice(0, 4).join(' ').replace(/\s+/g, ' ').slice(0, 300),
      });
const unidad = {
  comando: 'cd backend && npx jest --coverage',
  total: unidadJson.numTotalTests,
  aprobadas: unidadJson.numPassedTests,
  fallidas: unidadJson.numFailedTests,
  archivos: unidadJson.numTotalTestSuites,
  tiempo_s: tiempoJest(path.join(EV, 'salida-unidad.ansi')),
  cobertura_total: cobertura(cobSum.total),
  cobertura_por_modulo: coberturaPorModulo,
  detalle_fallidas: fallidasUnidad,
};

// -------------------------------------------------------------- complejidad
const complejidadDe = (archivoJson) => {
  const r = leer(path.join(EV, archivoJson));
  const items = [];
  for (const f of r)
    for (const m of f.messages)
      if (m.ruleId === 'complexity') {
        const c = Number((/complexity of (\d+)/.exec(m.message) || [])[1]);
        const texto = (/^(.*?) has a complexity/.exec(m.message) || [])[1] || m.message;
        const nombre = (/'([^']+)'/.exec(texto) || [])[1] || null;
        const clase = texto.replace(/\s*'[^']*'/, '').trim();
        const tipos = {
          Function: 'Función',
          'Async function': 'Función asíncrona',
          'Generator function': 'Función generadora',
          'Arrow function': 'Función flecha',
          'Async arrow function': 'Función flecha asíncrona',
          Method: 'Método',
          'Async method': 'Método asíncrono',
          'Static method': 'Método estático',
          'Static async method': 'Método estático asíncrono',
          'Private method': 'Método privado',
          'Private async method': 'Método privado asíncrono',
          Getter: 'Getter',
          Setter: 'Setter',
          Constructor: 'Constructor',
          'Class field initializer': 'Inicializador de campo',
          'Class static block': 'Bloque estático',
        };
        items.push({
          archivo: rel(f.filePath),
          linea: m.line,
          funcion: nombre ?? '(anónima)',
          tipo: tipos[clase] ?? clase,
          complejidad: c,
        });
      }
  items.sort((a, b) => b.complejidad - a.complejidad || a.archivo.localeCompare(b.archivo));
  return {
    archivos: r.length,
    funciones: items.length,
    maximo: items[0]?.complejidad ?? null,
    promedio: r2(items.reduce((s, i) => s + i.complejidad, 0) / items.length),
    top10: items.slice(0, 10),
    mayores_a_10: items.filter((i) => i.complejidad > 10),
  };
};
const cBack = complejidadDe('eslint-complejidad-backend.json');
const cFront = complejidadDe('eslint-complejidad-frontend.json');
const complejidad = {
  alcance: 'Backend: backend/src sin los archivos *.spec.ts (código de la aplicación)',
  comando:
    'cd backend && npx eslint "src/**/*.ts" --ignore-pattern "**/*.spec.ts" --rule "complexity: [warn, 0]" -f json',
  criterio:
    'Con el máximo en 0, ESLint informa la complejidad ciclomática de todas las funciones; no se cambió eslint.config.mjs.',
  ...cBack,
  frontend: {
    alcance: 'frontend/src (componentes y páginas)',
    comando: 'cd frontend && npx eslint "src/**/*.ts" "src/**/*.tsx" --rule "complexity: [warn, 0]" -f json',
    ...cFront,
  },
};

// --------------------------------------------------------------- integración
const descripciones = require('./integracion-casos.js');
const casosInteg = [];
for (const t of integJson.testResults)
  for (const a of t.assertionResults) {
    const d = descripciones[a.title];
    if (!d) throw new Error(`Falta la descripción de la prueba de integración «${a.title}»`);
    casosInteg.push({
      archivo: rel(t.name),
      nombre: a.title,
      endpoints: d.endpoints,
      modulos: d.modulos,
      verifica: d.verifica,
      esperado: d.esperado,
      obtenido:
        a.status === 'passed'
          ? 'Se cumplieron todas las aserciones de la prueba: los códigos HTTP, los mensajes y los estados fueron los esperados.'
          : sinAnsi((a.failureMessages || [''])[0]).split('\n')[0],
      estado: a.status === 'passed' ? 'Aprobada' : 'Fallida',
      tiempo_ms: a.duration,
    });
  }
const integracion = {
  comando: 'cd backend && npm run db:setup && npm run test:e2e',
  base: 'Base de prueba zoonosis_test (puerto 5433) con los datos del seed del Sprint 3; npm run db:setup aplicó las migraciones pendientes (ninguna) y el seed idempotente de prisma/seed.ts.',
  total: integJson.numTotalTests,
  aprobadas: integJson.numPassedTests,
  fallidas: integJson.numFailedTests,
  tiempo_s: tiempoJest(path.join(EV, 'salida-integracion.ansi')),
  casos: casosInteg,
};

module.exports = { entorno, implementacion, inventario, unidad, complejidad, integracion, leer, existe, rel, sinAnsi, r2, pct, EV, DOCS, RAIZ, especsPw, pw };

if (require.main === module) require('./generar-datos-2.js');
