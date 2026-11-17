/**
 * Prueba de carga del backend local con k6 (imagen grafana/k6).
 *
 * Cada usuario virtual inicia una iteración que consulta los seis servicios en orden y espera 1 s
 * (tiempo de lectura) antes de la siguiente. Escenario: subida de 0 a USUARIOS en 30 s y carga
 * sostenida 1 min 30 s (2 minutos en total).
 *
 *   docker run --network zoonosis-cap9_default -e USUARIOS=10 -e K6_EMAIL=… -e K6_PASSWORD=… \
 *     -v <salida>:/out -v <este archivo>:/carga.js grafana/k6 run /carga.js
 *
 * El inicio de sesión se hace una sola vez en setup(); el token se comparte entre los usuarios
 * virtuales. Las credenciales llegan por variables de entorno y no se guardan en el resumen.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';

const BASE = __ENV.BASE_URL || 'http://backend:4000';
const USUARIOS = Number(__ENV.USUARIOS || 10);

export const SERVICIOS = [
  'listado_animales',
  'ficha_animal',
  'historial_clinico',
  'panel_indicadores',
  'ranking_recomendacion',
  'catalogo_publico',
];
const CODIGOS = [200, 201, 304, 400, 401, 403, 404, 409, 429, 500, 502, 503, 504, 0];

// Los umbrales siempre se cumplen: solo sirven para que k6 calcule cada submétrica por servicio
// y por código de estado en el resumen.
const thresholds = {};
for (const s of SERVICIOS) {
  thresholds[`http_req_duration{servicio:${s}}`] = ['max>=0'];
  thresholds[`http_reqs{servicio:${s}}`] = ['count>=0'];
  thresholds[`http_req_failed{servicio:${s}}`] = ['rate>=0'];
  for (const c of CODIGOS) thresholds[`http_reqs{servicio:${s},status:${c}}`] = ['count>=0'];
}

export const options = {
  scenarios: {
    carga: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: USUARIOS },
        { duration: '1m30s', target: USUARIOS },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds,
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)', 'count'],
};

function json(res) {
  try {
    return res.json();
  } catch {
    return null;
  }
}

export function setup() {
  const login = http.post(
    `${BASE}/api/v1/auth/login`,
    JSON.stringify({ email: __ENV.K6_EMAIL, password: __ENV.K6_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' }, tags: { servicio: 'preparacion' } },
  );
  if (login.status !== 200) throw new Error(`No se pudo iniciar sesión: ${login.status}`);
  const token = json(login).accessToken;
  const h = { headers: { Authorization: `Bearer ${token}` }, tags: { servicio: 'preparacion' } };
  // Animal con historial (Lola, adoptada en el seed del Sprint 3) y un adoptante para el ranking.
  const animales = json(http.get(`${BASE}/api/v1/animals?q=Lola`, h));
  const adoptantes = json(http.get(`${BASE}/api/v1/adopters?q=Rosa`, h));
  const respaldo = json(http.get(`${BASE}/api/v1/adopters?pageSize=1`, h));
  const animalId = animales.data[0].id;
  const adopterId = (adoptantes.data[0] || respaldo.data[0]).id;
  return { token, animalId, adopterId };
}

export default function (d) {
  const auth = (servicio) => ({
    headers: { Authorization: `Bearer ${d.token}` },
    tags: { servicio },
  });
  const r = [
    http.get(`${BASE}/api/v1/animals?page=1&pageSize=20`, auth('listado_animales')),
    http.get(`${BASE}/api/v1/animals/${d.animalId}`, auth('ficha_animal')),
    http.get(`${BASE}/api/v1/animals/${d.animalId}/timeline`, auth('historial_clinico')),
    http.get(`${BASE}/api/v1/dashboard`, auth('panel_indicadores')),
    http.get(`${BASE}/api/v1/recommendations/adopter/${d.adopterId}`, auth('ranking_recomendacion')),
    http.get(`${BASE}/api/v1/public/animals`, { tags: { servicio: 'catalogo_publico' } }),
  ];
  check(r, { 'los seis servicios respondieron 200': (rs) => rs.every((x) => x.status === 200) });
  sleep(1);
}

export function handleSummary(data) {
  // setup_data contiene el token de acceso y los identificadores: no se exporta.
  delete data.setup_data;
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    [`/out/k6-${USUARIOS}-usuarios.json`]: JSON.stringify(data, null, 1),
  };
}
