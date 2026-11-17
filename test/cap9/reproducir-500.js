/**
 * Reproduce a mano las respuestas 500 que informó el escaneo de la API con ZAP.
 * Backend local (http://localhost:4000), usuario de Gestión del seed del Sprint 3.
 * Guarda solo la solicitud (sin el token) y la respuesta.
 *
 *   node test/cap9/reproducir-500.js
 */
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.test') });

const BASE = 'http://localhost:4000/api/v1';

(async () => {
  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'adopciones.prueba@zoonosis.test', password: process.env.SPRINT1_PASSWORD }),
  });
  const { accessToken } = await login.json();
  const auth = { Authorization: `Bearer ${accessToken}` };
  const casos = [
    ['GET', '/animals?q=%00', 'búsqueda con el carácter nulo'],
    ['GET', '/adopters?q=%00', 'búsqueda con el carácter nulo'],
    ['GET', '/adoptions?q=%00', 'búsqueda con el carácter nulo'],
    ['GET', '/contact-messages?q=%00', 'búsqueda con el carácter nulo'],
    ['GET', '/animals?q=Lola', 'búsqueda normal, para comparar'],
    ['GET', '/ml/models/816432691334276512', 'versión fuera del rango de Int'],
    ['GET', '/ml/models/99999', 'versión inexistente dentro del rango, para comparar'],
    ['PATCH', '/auth/me', 'nombre con el carácter nulo (U+0000)', { fullName: 'Nombre\u0000Nulo' }],
  ];
  const lineas = [
    'Reproducción manual de las respuestas 500 informadas por ZAP (backend local, usuario de Gestión)',
    '',
  ];
  for (const [metodo, ruta, desc, cuerpo] of casos) {
    const r = await fetch(`${BASE}${ruta}`, {
      method: metodo,
      headers: { ...auth, ...(cuerpo ? { 'Content-Type': 'application/json' } : {}) },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    const t = await r.text();
    lineas.push(`${metodo} /api/v1${ruta} (${desc}) -> ${r.status} ${t.length > 160 ? t.slice(0, 160) + '…' : t}`);
  }
  const salida = path.join(__dirname, 'evidencia/zap/reproduccion-500.txt');
  fs.writeFileSync(salida, lineas.join('\n') + '\n', 'utf8');
  console.log(lineas.join('\n'));
})();
