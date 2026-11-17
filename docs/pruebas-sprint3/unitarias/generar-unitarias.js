/**
 * Arma unitarias.json del Sprint 3 a partir de datos reales:
 *  - estado y tiempo_ms: jest-resultado.json
 *  - codigo_prueba: extraído del archivo hu*.sprint3.unit.spec.ts
 *  - cobertura: cobertura/coverage-summary.json
 * Los textos descriptivos (qué prepara, ejecuta y verifica cada prueba) están abajo, en TEXTOS,
 * y describen el código de cada it(). Si una prueba fallara, resultado_obtenido se completaría
 * con el mensaje real de Jest.
 * Uso (desde la raíz del repositorio): node docs/pruebas-sprint3/unitarias/generar-unitarias.js
 */
const fs = require('node:fs');
const path = require('node:path');

const dir = __dirname;
const raiz = path.resolve(dir, '../../..');
const rel = (p) =>
  path.isAbsolute(p) ? path.relative(raiz, p).split(path.sep).join('/') : p.split('\\').join('/');

const ARCHIVOS = {
  HU7: 'backend/src/modules/dashboard/hu7.sprint3.unit.spec.ts',
  HU9: 'backend/src/modules/chat/hu9.sprint3.unit.spec.ts',
  HU12: 'backend/src/modules/adoptions/hu12.sprint3.unit.spec.ts',
};

const MOCK = 'Prisma simulado con jest.fn(); sin base de datos ni red.';
const SIN_DEP = 'Función pura; no requiere base de datos, red ni simulaciones.';
const PIPE = 'ValidationPipe global del sistema (createValidationPipe), sin base de datos ni red.';
const SDK = ' El SDK de Anthropic está simulado con jest.mock(); no se llama a la API real.';

// id: [unidad, tipo, descripcion, precondiciones, datos, arrange, act, assert, esperado, obtenido]
const TEXTOS = {
  'PU-HU7-01': ['lastMonths', 'Función auxiliar',
    'Verificar que el gráfico de ingresos y adopciones usa los últimos 6 meses, también al cruzar el cambio de año.',
    'Reloj fijado con jest.useFakeTimers() en 2026-02-10 15:00 UTC; función pura.',
    'Fecha de ejecución simulada: 10/02/2026.',
    'Se fija el reloj en febrero de 2026.',
    'Se llama a lastMonths(6).',
    'Se comprueba la lista de meses.',
    'La función devuelve los meses de septiembre de 2025 a febrero de 2026.',
    'La función devolvió 2025-09, 2025-10, 2025-11, 2025-12, 2026-01 y 2026-02.'],
  'PU-HU7-02': ['monthLabel', 'Función auxiliar',
    'Verificar la etiqueta de cada mes del gráfico: mes abreviado en español y año con dos cifras.',
    SIN_DEP,
    'Meses 2026-01, 2026-09 y 2025-12.',
    'Se preparan tres meses.',
    'Se llama a monthLabel con cada uno.',
    'Se comprueban las etiquetas.',
    'La función devuelve «ene 26», «sep 26» y «dic 25».',
    'La función devolvió «ene 26», «sep 26» y «dic 25».'],
  'PU-HU7-03': ['KpisService.kpis', 'Servicio',
    'Verificar que el período anterior abarca los meses inmediatamente previos de la misma duración.',
    MOCK + ' Reloj fijado con jest.useFakeTimers() en 2026-11-17 15:00 UTC.',
    'Período de análisis de 3 meses.',
    'Se fija el reloj y se simulan las consultas sin datos.',
    'Se llama a kpis(3).',
    'Se comprueba el inicio del período actual y el rango consultado para el período anterior.',
    'El período actual empieza el 01/09/2026 y el anterior va del 01/06/2026 al 01/09/2026 (hora de Bolivia).',
    'El período actual empezó el 01/09/2026 y el anterior se consultó del 01/06/2026 al 01/09/2026 (hora de Bolivia).'],
  'PU-HU7-04': ['KpisService.kpis', 'Servicio',
    'Verificar que, sin animales en la institución, la cobertura de vacunación queda sin datos, no divide por cero y los demás indicadores se siguen devolviendo.',
    MOCK + ' Reloj fijado con jest.useFakeTimers() en 2026-11-17 15:00 UTC.',
    'Base simulada sin animales ni solicitudes.',
    'Se fija el reloj y se simulan las consultas vacías.',
    'Se llama a kpis(3).',
    'Se comprueba el valor y el detalle de la cobertura, y que se devuelven los 6 indicadores.',
    'El método devuelve la cobertura sin valor («0 de 0 animales…») y los 6 indicadores.',
    'El método devolvió la cobertura sin valor, con el detalle «0 de 0 animales en la institución, con esquema al día», y los 6 indicadores.'],
  'PU-HU7-05': ['DashboardService.dashboard', 'Servicio',
    'Verificar que la tarjeta «En la institución» no cuenta a los animales que salieron.',
    MOCK,
    'Usuario con rol DIRECTIVO.',
    'Se simulan las consultas del panel.',
    'Se llama a dashboard.',
    'Se comprueba el filtro del conteo de animales en la institución.',
    'El método cuenta solo los animales que no están Adoptados, Fallecidos ni Devueltos.',
    'El método contó los animales excluyendo los estados ADOPTADO, FALLECIDO y DEVUELTO.'],
  'PU-HU7-06': ['RolesGuard (GET /kpis)', 'Validación',
    'Verificar que la pantalla de indicadores de gestión corresponde al personal y se niega a un cliente del portal.',
    'RolesGuard con un Reflector real que lee el decorador @Roles de KpisController.get; usuarios simulados, sin base de datos ni red.',
    'Usuario con rol DIRECTIVO y usuario con rol CLIENTE.',
    'Se crea el RolesGuard y una petición de cada rol.',
    'Se llama a canActivate con cada petición.',
    'Se comprueba que el directivo pasa y el cliente recibe ForbiddenException.',
    'El guard permite el acceso al directivo y lo niega al cliente.',
    'El guard permitió el acceso al directivo y lo negó al cliente con ForbiddenException.'],
  'PU-HU9-01': ['ChatDto', 'Validación',
    'Verificar que un mensaje de más de 2000 caracteres se rechaza y que el límite exacto se acepta.',
    PIPE + SDK,
    'Mensaje de 2001 caracteres y mensaje de 2000 caracteres.',
    'Se preparan las dos consultas.',
    'Se valida cada una con el ValidationPipe global contra ChatDto.',
    'Se comprueba el campo con error de cada una.',
    'La validación rechaza el mensaje de 2001 caracteres y acepta el de 2000.',
    'La validación rechazó el mensaje de 2001 caracteres en messages.0.content y aceptó el de 2000.'],
  'PU-HU9-02': ['ChatDto', 'Validación',
    'Verificar que una conversación demasiado extensa se rechaza y que el límite de 20 mensajes se acepta.',
    PIPE + SDK,
    'Conversación de 21 mensajes y conversación de 20 mensajes, alternados.',
    'Se preparan las dos conversaciones.',
    'Se valida cada una con el ValidationPipe global contra ChatDto.',
    'Se comprueba el campo con error de cada una.',
    'La validación rechaza la conversación de 21 mensajes y acepta la de 20.',
    'La validación rechazó la conversación de 21 mensajes en el campo messages y aceptó la de 20.'],
  'PU-HU9-03': ['ThrottlerGuard (POST /chat)', 'Validación',
    'Verificar el límite de 15 consultas por minuto de cada visitante.',
    'ThrottlerGuard real con el decorador @Throttle de ChatController.reply y almacenamiento en memoria; visitante con una dirección ficticia; reloj fijado con jest.useFakeTimers().' + SDK,
    '16 consultas del mismo visitante en el mismo minuto y una más pasado el minuto.',
    'Se crea el guard del asistente y se fija el reloj.',
    'Se hacen 15 consultas, una 16.ª y otra después de avanzar el reloj 60 segundos.',
    'Se comprueba que las 15 pasan, la 16.ª se rechaza y la siguiente al minuto pasa.',
    'El guard acepta 15 consultas, rechaza la 16.ª con ThrottlerException y acepta otra pasado el minuto.',
    'El guard aceptó las 15 consultas, rechazó la 16.ª con ThrottlerException y aceptó otra pasado el minuto.'],
  'PU-HU9-04': ['adoptablesPrompt', 'Función auxiliar',
    'Verificar que el contexto del asistente incluye los animales disponibles y ningún dato privado.',
    SIN_DEP,
    'Perro Bruno (ZOO-2026-0001), grande, 30 meses; gato sin nombre (ZOO-2026-0002), pequeño, 6 meses.',
    'Se preparan dos animales disponibles.',
    'Se llama a adoptablesPrompt.',
    'Se comprueban las líneas de cada animal y la ausencia de datos privados.',
    'La función describe cada animal con nombre, código, especie, tamaño, edad y convivencia, sin carnets, diagnósticos ni adoptantes.',
    'La función describió los dos animales con nombre, código, especie, tamaño, edad y convivencia, sin carnets, diagnósticos ni adoptantes.'],
  'PU-HU9-05': ['stableSystemPrompt', 'Función auxiliar',
    'Verificar que el contexto del asistente incluye la información de la institución.',
    SIN_DEP,
    'Institución ficticia: nombre, dirección, teléfono y horario de prueba.',
    'Se preparan los datos de la institución.',
    'Se llama a stableSystemPrompt.',
    'Se comprueba que el texto contiene cada dato.',
    'La función incluye el nombre, la dirección, el teléfono y el horario de la institución.',
    'La función incluyó el nombre, la dirección, el teléfono y el horario de la institución.'],
  'PU-HU9-06': ['ChatController (@Public)', 'Validación',
    'Verificar que la ruta del asistente es pública y no exige iniciar sesión.',
    'Reflector real que lee los metadatos del controlador; sin base de datos ni red.' + SDK,
    'Método ChatController.reply.',
    'Se crea un Reflector.',
    'Se lee la marca de ruta pública del método y del controlador.',
    'Se comprueba que la ruta es pública.',
    'La ruta del asistente está marcada como pública.',
    'La ruta del asistente estaba marcada como pública.'],
  'PU-HU12-01': ['CreateFollowupDto', 'Validación',
    'Verificar que un seguimiento no se registra sin el estado general del animal.',
    PIPE,
    'Seguimiento con fecha y observaciones, sin el estado del animal.',
    'Se prepara el seguimiento incompleto.',
    'Se valida con el ValidationPipe global contra CreateFollowupDto.',
    'Se comprueba que el único campo con error es animalCondition.',
    'La validación rechaza el seguimiento e indica el campo animalCondition.',
    'La validación rechazó el seguimiento e indicó únicamente el campo animalCondition.'],
  'PU-HU12-02': ['CreateFollowupDto', 'Validación',
    'Verificar que un seguimiento no se registra sin una fecha válida.',
    PIPE,
    'Seguimiento con la fecha «mañana».',
    'Se prepara el seguimiento con una fecha inválida.',
    'Se valida con el ValidationPipe global contra CreateFollowupDto.',
    'Se comprueba que el único campo con error es followupDate.',
    'La validación rechaza el seguimiento e indica el campo followupDate.',
    'La validación rechazó el seguimiento e indicó únicamente el campo followupDate.'],
  'PU-HU12-03': ['AdoptionsService.createFollowup', 'Servicio',
    'Verificar que el autor del seguimiento se toma del usuario autenticado y que el seguimiento queda vinculado a la adopción.',
    'Prisma y AnimalStatusService simulados con jest.fn(); la solicitud está aprobada.',
    'Seguimiento con un createdById ajeno en el cuerpo de la petición.',
    'Se simula la solicitud aprobada y se prepara el cuerpo con otro autor.',
    'Se llama a createFollowup con el usuario autenticado.',
    'Se comprueba el autor y la solicitud guardados.',
    'El método guarda como autor al usuario autenticado y vincula el seguimiento a la solicitud.',
    'El método guardó como autor al usuario autenticado y vinculó el seguimiento a la solicitud.'],
  'PU-HU12-04': ['AdoptionsService.listFollowups', 'Servicio',
    'Verificar que los seguimientos de una solicitud se obtienen ordenados por fecha.',
    'Prisma y AnimalStatusService simulados con jest.fn(); la solicitud existe.',
    'Identificador de la solicitud aprobada.',
    'Se simula la solicitud.',
    'Se llama a listFollowups.',
    'Se comprueba el filtro y el orden de la consulta.',
    'El método pide los seguimientos de esa solicitud ordenados por fecha, del más reciente al más antiguo.',
    'El método pidió los seguimientos de esa solicitud ordenados por fecha, del más reciente al más antiguo.'],
  'PU-HU12-05': ['AnimalsService.findOne', 'Servicio',
    'Verificar que la ficha del animal incluye los seguimientos de sus adopciones, ordenados por fecha.',
    MOCK + ' El animal está Adoptado.',
    'Identificador del animal adoptado.',
    'Se simula el animal.',
    'Se llama a findOne.',
    'Se comprueba que la consulta incluye los seguimientos de cada solicitud con su orden.',
    'El método incluye los seguimientos de las solicitudes del animal, ordenados por fecha.',
    'El método incluyó los seguimientos de las solicitudes del animal, ordenados por fecha.'],
  'PU-HU12-06': ['RolesGuard (POST /adoptions/:id/followups)', 'Validación',
    'Verificar que solo el personal de Gestión registra seguimientos.',
    'RolesGuard con un Reflector real que lee el decorador @Roles de AdoptionsController.createFollowup; usuarios simulados, sin base de datos ni red.',
    'Usuario con rol GESTION y usuario con rol DIRECTIVO.',
    'Se crea el RolesGuard y una petición de cada rol.',
    'Se llama a canActivate con cada petición.',
    'Se comprueba que Gestión pasa y el directivo recibe ForbiddenException.',
    'El guard permite el registro a Gestión y lo niega al personal directivo.',
    'El guard permitió el registro a Gestión y lo negó al personal directivo con ForbiddenException.'],
};

// eslint-disable-next-line no-control-regex
const sinAnsi = (s) => s.replace(/\u001b\[[0-9;]*m/g, '');

function codigoDe(fuente, id) {
  const lineas = fuente.split(/\r?\n/);
  const i = lineas.findIndex((l) => l.includes(`it('${id} `));
  if (i < 0) throw new Error(`No se encontró ${id}`);
  const sangria = lineas[i].match(/^\s*/)[0];
  let j = i;
  while (!(lineas[j].startsWith(`${sangria}});`) && j > i)) j++;
  return lineas.slice(i, j + 1).map((l) => l.slice(sangria.length)).join('\n');
}

const jest = JSON.parse(fs.readFileSync(path.join(dir, 'jest-resultado.json'), 'utf8'));
const asserts = new Map();
for (const suite of jest.testResults)
  for (const a of suite.assertionResults) asserts.set(a.title.split(' ')[0], { ...a, archivo: rel(suite.name) });

const fuentes = Object.fromEntries(
  Object.entries(ARCHIVOS).map(([hu, f]) => [hu, fs.readFileSync(path.join(raiz, f), 'utf8')]),
);

const pruebas = Object.entries(TEXTOS).map(([id, t]) => {
  const hu = /^PU-(HU\d+)-/.exec(id)[1];
  const a = asserts.get(id);
  if (!a) throw new Error(`${id} no aparece en jest-resultado.json`);
  const aprobado = a.status === 'passed';
  const mensaje = sinAnsi(a.failureMessages.join('\n'))
    .split('\n')
    .map((l) => l.trim().replace(/\s+/g, ' '))
    .filter((l) => l && !/^(at |>|\||\d+ \|)/.test(l));
  return {
    id, hu, unidad: t[0], tipo_unidad: t[1], archivo_prueba: a.archivo, nombre_it: a.title,
    descripcion: t[2], precondiciones: t[3], datos_entrada: t[4], arrange: t[5], act: t[6], assert: t[7],
    resultado_esperado: t[8],
    resultado_obtenido: aprobado ? t[9] : `La prueba falló. Jest informó: «${mensaje.slice(0, 4).join(' ')}».`,
    estado: aprobado ? 'APROBADO' : 'FALLIDO',
    tiempo_ms: a.duration,
    codigo_prueba: codigoDe(fuentes[hu], id),
    nueva: true,
  };
});

const fin = Math.max(...jest.testResults.map((s) => s.endTime));
const resumen = {
  suites: jest.numTotalTestSuites, total: jest.numTotalTests, aprobadas: jest.numPassedTests,
  fallidas: jest.numFailedTests, omitidas: jest.numPendingTests + jest.numTodoTests,
  tiempo_s: Math.round((fin - jest.startTime) / 10) / 100,
};

const cov = JSON.parse(fs.readFileSync(path.join(dir, 'cobertura', 'coverage-summary.json'), 'utf8'));
const fila = (c) => ({ sentencias: c.statements.pct, ramas: c.branches.pct, funciones: c.functions.pct, lineas: c.lines.pct });
const cobertura = Object.entries(cov).filter(([k]) => k !== 'total')
  .map(([k, c]) => ({ archivo: rel(k), ...fila(c) }))
  .sort((x, y) => x.archivo.localeCompare(y.archivo));

const fecha = new Date(jest.startTime);
const fechaLocal = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(fecha);

const COLLECT = [
  'modules/dashboard/dashboard.service.ts', 'modules/kpis/kpis.service.ts',
  'modules/chat/chat-prompt.ts', 'modules/chat/dto/chat.dto.ts',
  'modules/adoptions/adoptions.service.ts', 'modules/adoptions/dto/adoptions.dto.ts',
  'modules/animals/animals.service.ts', 'common/guards/roles.guard.ts',
].map((f) => `--collectCoverageFrom=${f}`).join(' ');

const salida = {
  fecha_ejecucion: fechaLocal,
  entorno: JSON.parse(fs.readFileSync(path.join(dir, 'entorno.json'), 'utf8')),
  comandos: {
    ejecucion: 'cd backend && npx jest sprint3.unit.spec -t "PU-HU" --json --outputFile=../docs/pruebas-sprint3/unitarias/jest-resultado.json',
    cobertura: `cd backend && npx jest sprint3.unit.spec -t "PU-HU" --coverage ${COLLECT} --coverageReporters=text --coverageReporters=json-summary --coverageReporters=html --coverageDirectory=../../docs/pruebas-sprint3/unitarias/cobertura`,
  },
  resumen,
  pruebas,
  cobertura,
  cobertura_total: fila(cov.total),
  capturas: [
    ...['HU7', 'HU9', 'HU12'].map((hu) => ({
      archivo: `capturas/PU-${hu}.png`,
      muestra: `Ejecución de las pruebas unitarias de ${hu}`,
      comando: `npx jest sprint3.unit.spec -t "PU-${hu}-" --verbose`,
      salida: `salidas/PU-${hu}.txt`,
    })),
    { archivo: 'capturas/PU-resumen.png', muestra: 'Ejecución de todas las pruebas unitarias PU-HU del Sprint 3 con el resumen de Test Suites, Tests y Time', comando: 'npx jest sprint3.unit.spec -t "PU-HU"', salida: 'salidas/PU-resumen.txt' },
    { archivo: 'capturas/PU-cobertura.png', muestra: 'Reporte de cobertura de Jest (cobertura/index.html) abierto en el navegador', comando: 'npx jest sprint3.unit.spec -t "PU-HU" --coverage (comando completo en comandos.cobertura)', salida: 'salidas/cobertura-texto.txt' },
  ],
  defectos: [],
  pendientes: [
    'Las capturas de cada historia muestran «2 skipped» en Test Suites y la cantidad de pruebas omitidas: es la salida real del comando de la guía (npx jest sprint3.unit.spec -t "PU-HUx-"), que carga los 3 archivos de pruebas unitarias del Sprint 3 y ejecuta solo las de la historia filtrada.',
    'Ninguna prueba unitaria llama a la API real de Anthropic: el archivo de HU9 simula el SDK con jest.mock().',
    'La cobertura se mide sobre los archivos completos de las unidades probadas. Esos archivos incluyen métodos de otras historias y sprints (solicitudes, actas, animales, etc.) que estas 18 pruebas no ejecutan, y por eso el porcentaje total no es alto.',
    'Los caminos de caja blanca del Sprint 3 (CB-HU7 a CB-HU12) no se repitieron: las pruebas unitarias cubren validaciones, funciones auxiliares, guards y otros métodos.',
    'Por indicación del equipo, en HU7 no se incluyó una prueba de la tendencia de la cobertura de vacunación (el sistema no la compara con el período anterior) ni de un indicador de gestión que lanza un error. PU-HU7-04 prueba la cobertura sin datos junto a los demás indicadores.',
    'Las capturas de cada historia y la del resumen salen de ejecuciones separadas de Jest, por lo que sus tiempos en milisegundos pueden diferir de los de jest-resultado.json. Los tiempos oficiales del JSON salen de jest-resultado.json.',
    'No se reutilizó ninguna prueba existente: las 18 son nuevas («nueva»: true). Las pruebas que ya existían están listadas en inventario.md.',
  ],
};

fs.writeFileSync(path.join(dir, 'unitarias.json'), JSON.stringify(salida, null, 2) + '\n');
console.log(`unitarias.json: ${pruebas.length} pruebas, ${resumen.aprobadas} aprobadas, ${resumen.fallidas} fallidas`);
