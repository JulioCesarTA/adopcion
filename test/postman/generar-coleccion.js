// Genera la colección de Postman con las pruebas funcionales de la API de Adopet.
// Uso: node test/postman/generar-coleccion.js  → test/postman/Adopet-API.postman_collection.json
// Corre contra el sistema de prueba (http://localhost:4000), nunca contra producción.
const fs = require('fs');
const path = require('path');

const json = { key: 'Content-Type', value: 'application/json' };
const auth = (rol) => ({ key: 'Authorization', value: `Bearer {{${rol}Token}}` });

function req(name, method, url, { rol, body, tests, pre } = {}) {
  const header = [json];
  if (rol) header.push(auth(rol));
  const item = {
    name,
    request: {
      method,
      header,
      url: { raw: `{{base}}${url}`, host: ['{{base}}'], path: url.replace(/^\//, '').split('/') },
    },
    event: [{ listen: 'test', script: { type: 'text/javascript', exec: tests } }],
  };
  if (body) item.request.body = { mode: 'raw', raw: JSON.stringify(body, null, 2), options: { raw: { language: 'json' } } };
  if (pre) item.event.push({ listen: 'prerequest', script: { type: 'text/javascript', exec: pre } });
  return item;
}

const status = (code) => `pm.test('Responde ${code}', () => pm.response.to.have.status(${code}));`;
const animal = (nombre, extra = {}) => ({
  name: nombre, species: 'PERRO', sex: 'MACHO', size: 'MEDIANO', energyLevel: 3,
  goodWithChildren: true, goodWithAnimals: true, needsYard: false, specialCare: false,
  requiredDailyHours: 2, entryDate: '{{hoy}}', entryReason: 'Prueba con Postman', ...extra,
});

const items = [
  req('01 Iniciar sesión como administrador', 'POST', '/auth/login', {
    body: { email: 'admin@zoonosis.test', password: 'Zoo12345' },
    pre: [
      "pm.collectionVariables.set('stamp', Date.now().toString().slice(-7));",
      "pm.collectionVariables.set('hoy', new Date().toISOString());",
      "pm.collectionVariables.set('manana', new Date(Date.now() + 86400000).toISOString());",
    ],
    tests: [status(200), "pm.test('Devuelve el token y el rol ADMIN', () => { const b = pm.response.json(); pm.expect(b.user.role).to.eql('ADMIN'); pm.collectionVariables.set('adminToken', b.accessToken); });"],
  }),
  req('02 Iniciar sesión como veterinario', 'POST', '/auth/login', {
    body: { email: 'vet@zoonosis.test', password: 'Zoo12345' },
    tests: [status(200), "pm.collectionVariables.set('vetToken', pm.response.json().accessToken);"],
  }),
  req('03 Credenciales inválidas', 'POST', '/auth/login', {
    body: { email: 'vet@zoonosis.test', password: 'incorrecta1' },
    tests: [status(401), "pm.test('Mensaje genérico', () => pm.expect(pm.response.json().message).to.eql('Credenciales inválidas'));"],
  }),
  req('04 Registrar una cuenta de cliente', 'POST', '/public/register', {
    body: { fullName: 'Cliente Postman', email: 'cliente{{stamp}}@example.com', password: 'Prueba123', acceptTerms: true, accountType: 'CLIENTE' },
    tests: [status(201), "pm.test('Rol CLIENTE', () => pm.expect(pm.response.json().role).to.eql('CLIENTE'));", "pm.collectionVariables.set('clienteId', pm.response.json().id);"],
  }),
  req('05 Registrar una cuenta de adoptante', 'POST', '/public/register', {
    body: { fullName: 'Adoptante Postman', email: 'adoptante{{stamp}}@example.com', password: 'Prueba123', acceptTerms: true, accountType: 'ADOPTANTE' },
    tests: [status(201), "pm.test('Rol ADOPTANTE', () => pm.expect(pm.response.json().role).to.eql('ADOPTANTE'));"],
  }),
  req('06 Iniciar sesión como cliente', 'POST', '/auth/login', {
    body: { email: 'cliente{{stamp}}@example.com', password: 'Prueba123' },
    tests: [status(200), "pm.collectionVariables.set('clienteToken', pm.response.json().accessToken);"],
  }),
  req('07 Iniciar sesión como adoptante', 'POST', '/auth/login', {
    body: { email: 'adoptante{{stamp}}@example.com', password: 'Prueba123' },
    tests: [status(200), "pm.collectionVariables.set('adoptanteToken', pm.response.json().accessToken);"],
  }),
  req('08 Sin token, el sistema interno responde 401', 'GET', '/animals', {
    tests: [status(401)],
  }),
  req('09 El administrador registra un animal', 'POST', '/animals', {
    rol: 'admin', body: animal('Postman {{stamp}}'),
    tests: [status(201), "pm.test('Código ZOO-AAAA-NNNN y estado Ingresado', () => { const b = pm.response.json(); pm.expect(b.code).to.match(/^ZOO-\\d{4}-\\d{4}$/); pm.expect(b.status).to.eql('INGRESADO'); pm.collectionVariables.set('animalId', b.id); });"],
  }),
  req('10 El veterinario no puede registrar animales', 'POST', '/animals', {
    rol: 'vet', body: animal('Sin permiso'),
    tests: [status(403)],
  }),
  req('11 El administrador edita el estado del animal', 'PATCH', '/animals/{{animalId}}', {
    rol: 'admin', body: { status: 'EN_OBSERVACION', color: 'Negro' },
    tests: [status(200), "pm.test('Estado En observación', () => pm.expect(pm.response.json().status).to.eql('EN_OBSERVACION'));"],
  }),
  req('12 El listado filtra por tamaño', 'GET', '/animals?size=GRANDE&pageSize=100', {
    rol: 'admin',
    tests: [status(200), "pm.test('Solo animales grandes', () => pm.response.json().data.forEach((a) => pm.expect(a.size).to.eql('GRANDE')));"],
  }),
  req('13 El veterinario registra una consulta', 'POST', '/animals/{{animalId}}/consultations', {
    rol: 'vet', body: { consultationDate: '{{hoy}}', reason: 'Control', weightKg: 12.5, temperatureC: 38.5, animalStatus: 'INGRESADO' },
    tests: [status(201)],
  }),
  req('14 Historial clínico en orden cronológico inverso', 'GET', '/animals/{{animalId}}/timeline', {
    rol: 'vet',
    tests: [status(200), "pm.test('Del más reciente al más antiguo', () => { const d = pm.response.json().data.map((i) => new Date(i.date).getTime()); pm.expect(d).to.eql([...d].sort((a, b) => b - a)); });"],
  }),
  req('15 El veterinario habilita al animal para adopción', 'POST', '/animals/{{animalId}}/enable-adoption', {
    rol: 'vet',
    tests: [status(200), "pm.test('Disponible para adopción', () => pm.expect(pm.response.json().status).to.eql('DISPONIBLE_ADOPCION'));"],
  }),
  req('16 El cliente no puede solicitar adopciones', 'POST', '/adoptions/mine', {
    rol: 'cliente', body: { animalId: '{{animalId}}' },
    tests: [status(403)],
  }),
  req('17 El adoptante solicita la adopción desde el portal', 'POST', '/adoptions/mine', {
    rol: 'adoptante', body: { animalId: '{{animalId}}' },
    tests: [status(201), "pm.test('Solicitud Pendiente', () => pm.expect(pm.response.json().status).to.eql('PENDIENTE'));", "pm.collectionVariables.set('solicitudId', pm.response.json().id);"],
  }),
  req('18 Una segunda solicitud del mismo animal se rechaza', 'POST', '/adoptions/mine', {
    rol: 'adoptante', body: { animalId: '{{animalId}}' },
    tests: [status(409)],
  }),
  req('19 El administrador pasa la solicitud a evaluación', 'PATCH', '/adoptions/{{solicitudId}}/status', {
    rol: 'admin', body: { status: 'EN_EVALUACION' },
    tests: [status(200)],
  }),
  req('20 El administrador aprueba la solicitud', 'POST', '/adoptions/{{solicitudId}}/decision', {
    rol: 'admin', body: { result: 'APROBADA', notes: 'Cumple las condiciones', decisionDate: '{{hoy}}', deliveryDate: '{{hoy}}' },
    tests: [status(200), "pm.test('Solicitud Aprobada', () => pm.expect(pm.response.json().status).to.eql('APROBADA'));"],
  }),
  req('21 Acta de adopción responsable', 'GET', '/adoptions/{{solicitudId}}/act', {
    rol: 'admin',
    tests: [status(200), "pm.test('Acta del animal', () => pm.expect(pm.response.json().animal.id).to.eql(pm.collectionVariables.get('animalId')));"],
  }),
  req('22 Seguimiento posterior a la adopción', 'POST', '/adoptions/{{solicitudId}}/followups', {
    rol: 'admin', body: { followupDate: '{{manana}}', animalCondition: 'Sano y adaptado' },
    tests: [status(201)],
  }),
  req('23 Panel de indicadores', 'GET', '/dashboard', {
    rol: 'admin',
    tests: [status(200), "pm.test('Tarjetas calculadas', () => pm.expect(pm.response.json().cards.ok).to.eql(true));"],
  }),
  req('24 Seis indicadores de gestión', 'GET', '/kpis?months=6', {
    rol: 'admin',
    tests: [status(200), "pm.test('Seis indicadores', () => pm.expect(pm.response.json().kpis).to.have.lengthOf(6));"],
  }),
  req('25 El administrador registra la mascota del cliente', 'POST', '/animals', {
    rol: 'admin', body: animal('Mascota {{stamp}}', { ownerId: '{{clienteId}}' }),
    tests: [status(201), "pm.collectionVariables.set('mascotaId', pm.response.json().id);"],
  }),
  req('26 El cliente reserva una consulta para su mascota', 'POST', '/bookings', {
    rol: 'cliente', body: { animalId: '{{mascotaId}}', scheduledAt: '{{manana}}', reason: 'Vacuna anual' },
    tests: [status(201), "pm.test('Reserva Pendiente', () => pm.expect(pm.response.json().status).to.eql('PENDIENTE'));"],
  }),
  req('27 El cliente no puede reservar para un animal ajeno', 'POST', '/bookings', {
    rol: 'cliente', body: { animalId: '{{animalId}}', scheduledAt: '{{manana}}', reason: 'Ajeno' },
    tests: [status(400)],
  }),
  req('28 El cliente ve el historial de su mascota', 'GET', '/bookings/my-animals', {
    rol: 'cliente',
    tests: [status(200), "pm.test('Una mascota con su reserva', () => { const b = pm.response.json(); pm.expect(b).to.have.lengthOf(1); pm.expect(b[0].bookings).to.have.lengthOf(1); });"],
  }),
  req('29 Animales del sitio público sin datos internos', 'GET', '/public/animals', {
    tests: [status(200), "pm.test('Sin datos internos', () => pm.response.json().data.forEach((a) => { pm.expect(a).to.not.have.property('entryReason'); pm.expect(a).to.not.have.property('createdById'); }));"],
  }),
];

const coleccion = {
  info: {
    name: 'Adopet - Pruebas de la API',
    description: 'Pruebas funcionales de la API de Adopet contra el sistema de prueba (base zoonosis_test).',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  item: items,
  variable: [{ key: 'base', value: 'http://localhost:4000/api/v1' }],
};
const out = path.join(__dirname, 'Adopet-API.postman_collection.json');
fs.writeFileSync(out, JSON.stringify(coleccion, null, 2));
console.log(`${items.length} solicitudes → ${out}`);
