/**
 * Arma unitarias.json del Sprint 2 a partir de datos reales:
 *  - estado y tiempo_ms: jest-resultado.json
 *  - codigo_prueba: extraído del archivo hu*.sprint2.unit.spec.ts
 *  - cobertura: cobertura/coverage-summary.json
 * Los textos descriptivos (qué prepara, ejecuta y verifica cada prueba) están abajo, en TEXTOS,
 * y describen el código de cada it(). Si una prueba fallara, resultado_obtenido se completaría
 * con el mensaje real de Jest.
 * Uso (desde la raíz del repositorio): node docs/pruebas-sprint2/unitarias/generar-unitarias.js
 */
const fs = require('node:fs');
const path = require('node:path');

const dir = __dirname;
const raiz = path.resolve(dir, '../../..');
const rel = (p) =>
  path.isAbsolute(p) ? path.relative(raiz, p).split(path.sep).join('/') : p.split('\\').join('/');

const ARCHIVOS = {
  HU5: 'backend/src/modules/adopters/hu5.sprint2.unit.spec.ts',
  HU6: 'backend/src/modules/recommendation/hu6.sprint2.unit.spec.ts',
  HU10: 'backend/src/modules/clinical/hu10.sprint2.unit.spec.ts',
  HU11: 'backend/src/modules/adoptions/hu11.sprint2.unit.spec.ts',
};

const MOCK = 'Prisma simulado con jest.fn(); sin base de datos ni red.';
const SIN_DEP = 'Función pura; no requiere base de datos, red ni simulaciones.';
const PIPE = 'ValidationPipe global del sistema (createValidationPipe), sin base de datos ni red.';

// id: [unidad, tipo, descripcion, precondiciones, datos, arrange, act, assert, esperado, obtenido]
const TEXTOS = {
  'PU-HU5-01': ['CreateAdopterDto', 'Validación',
    'Verificar que las horas diarias disponibles fuera del rango de 0 a 24 se rechazan.',
    PIPE,
    'Adoptante válido con −1 horas diarias y otro con 25 horas diarias.',
    'Se preparan dos adoptantes válidos que solo difieren en las horas disponibles.',
    'Se valida cada uno con el ValidationPipe global contra CreateAdopterDto.',
    'Se comprueba que en ambos casos el único campo con error es availableHoursPerDay.',
    'La validación rechaza ambos datos e indica el campo availableHoursPerDay.',
    'La validación rechazó ambos datos e indicó únicamente el campo availableHoursPerDay.'],
  'PU-HU5-02': ['CreateAdopterDto', 'Validación',
    'Verificar que los valores límite de 0 y 24 horas diarias se aceptan.',
    PIPE,
    'Adoptante válido con 0 horas diarias y otro con 24 horas diarias.',
    'Se preparan dos adoptantes con las horas límite.',
    'Se valida cada uno con el ValidationPipe global contra CreateAdopterDto.',
    'Se comprueba que ninguno tiene campos con error.',
    'La validación acepta ambos adoptantes.',
    'La validación aceptó ambos adoptantes sin errores.'],
  'PU-HU5-03': ['maskCi', 'Función auxiliar',
    'Verificar que el enmascarado del carnet de identidad oculta el número y deja ver solo los 3 últimos caracteres.',
    SIN_DEP,
    'Carnet ficticio «9000010 SC».',
    'Se prepara un carnet de identidad ficticio.',
    'Se llama a maskCi.',
    'Se comprueba el resultado y que no contiene el número del carnet.',
    'La función devuelve «••••••• SC» sin mostrar el número.',
    'La función devolvió «••••••• SC» sin mostrar el número.'],
  'PU-HU5-04': ['canSeeFullCi', 'Función auxiliar',
    'Verificar qué roles pueden ver el carnet de identidad completo del adoptante.',
    SIN_DEP,
    'Roles GESTION, ADMIN, DIRECTIVO y VETERINARIO.',
    'Se prepara la lista de roles del personal.',
    'Se llama a canSeeFullCi con cada rol.',
    'Se comprueba que solo Gestión y el administrador ven el carnet completo.',
    'La función permite el carnet completo a Gestión y al administrador, y lo niega al personal directivo y al veterinario.',
    'La función permitió el carnet completo a Gestión y al administrador, y lo negó al personal directivo y al veterinario.'],
  'PU-HU5-05': ['AdoptersService.findOne', 'Servicio',
    'Verificar que la ficha del adoptante muestra el carnet enmascarado al personal directivo.',
    MOCK,
    'Adoptante con carnet ficticio «9000010 SC»; usuario con rol DIRECTIVO.',
    'Se simula el adoptante registrado y un usuario del personal directivo.',
    'Se llama a findOne con ese usuario.',
    'Se comprueba que el carnet devuelto está enmascarado.',
    'El método devuelve la ficha con el carnet «••••••• SC».',
    'El método devolvió la ficha con el carnet «••••••• SC».'],
  'PU-HU5-06': ['AdoptersService.create', 'Servicio',
    'Verificar que al registrar un adoptante se guardan por separado los datos personales y el perfil de evaluación.',
    MOCK + ' El carnet no está registrado.',
    'Adoptante ficticio Marta Rivero Paz, CI 9000010 SC, casa con patio, 4 horas diarias, experiencia básica.',
    'Se simula que el carnet está libre y se prepara un adoptante válido.',
    'Se llama a create.',
    'Se comprueba que la persona se crea con CI, nombres, apellidos y teléfono, y el perfil con los datos del hogar.',
    'El método crea la persona con sus datos personales y el perfil de evaluación con los datos del hogar.',
    'El método creó la persona con sus datos personales y el perfil de evaluación con los datos del hogar.'],
  'PU-HU6-01': ['computeCompatibility', 'Función auxiliar',
    'Verificar que el puntaje llega a 100 cuando todos los criterios son favorables y que incluye el aviso de recomendación.',
    SIN_DEP,
    'Casa con patio, 8 horas diarias y experiencia avanzada; perro mediano disponible, energía 3, 2 horas de atención.',
    'Se preparan un hogar y un animal que cumplen los 5 criterios.',
    'Se llama a computeCompatibility con los pesos del sistema.',
    'Se comprueba el puntaje, la cantidad de criterios y el aviso.',
    'La función devuelve el puntaje 100, los 5 criterios y el aviso de que es solo una recomendación.',
    'La función devolvió el puntaje 100, los 5 criterios y el aviso «Resultado de apoyo. La decisión final es del personal responsable.».'],
  'PU-HU6-02': ['computeCompatibility', 'Función auxiliar',
    'Verificar que un animal que no tolera otros animales es incompatible con un hogar que ya tiene animales.',
    SIN_DEP,
    'Hogar con otros animales; perro que no se lleva bien con otros animales.',
    'Se preparan el hogar y el animal con ese impedimento.',
    'Se llama a computeCompatibility.',
    'Se comprueba el nivel, el puntaje y el motivo del filtro.',
    'La función marca el par como INCOMPATIBLE, con puntaje 0 y el motivo del impedimento.',
    'La función marcó el par como INCOMPATIBLE, con puntaje 0 y el motivo «El animal no se lleva bien con otros animales y el adoptante tiene otros animales.».'],
  'PU-HU6-03': ['sortRanking', 'Función auxiliar',
    'Verificar que el ranking se ordena de mayor a menor puntaje y desempata por el código del animal.',
    SIN_DEP,
    'Puntajes 70 (ZOO-2026-0003), 91,5 (ZOO-2026-0002) y 70 (ZOO-2026-0001).',
    'Se preparan tres resultados desordenados, dos con el mismo puntaje.',
    'Se llama a sortRanking.',
    'Se comprueba el orden de los códigos.',
    'La función ordena ZOO-2026-0002, ZOO-2026-0001 y ZOO-2026-0003.',
    'La función ordenó ZOO-2026-0002, ZOO-2026-0001 y ZOO-2026-0003.'],
  'PU-HU6-04': ['RandomForest.train / predictProba', 'Función auxiliar',
    'Verificar que el Random Forest es reproducible: con la misma semilla da la misma probabilidad, entre 0 y 1.',
    'Conjunto sintético de 200 casos generado con la semilla 2026; sin base de datos ni red.',
    'Semilla 2026, 15 árboles.',
    'Se genera el conjunto de entrenamiento y se elige un caso.',
    'Se entrenan dos bosques con la misma semilla y se predice el caso.',
    'Se comprueba que ambas probabilidades son iguales y están entre 0 y 1.',
    'Los dos bosques dan la misma probabilidad, entre 0 y 1.',
    'Los dos bosques dieron la misma probabilidad, entre 0 y 1.'],
  'PU-HU6-05': ['RolesGuard (POST /ml/train)', 'Validación',
    'Verificar que solo el administrador puede entrenar el modelo de inteligencia artificial.',
    'RolesGuard con un Reflector real que lee el decorador @Roles de MlController.train; usuarios simulados en la petición, sin base de datos ni red.',
    'Usuario con rol ADMIN y usuario con rol GESTION.',
    'Se crea el RolesGuard y una petición de cada rol dirigida al entrenamiento.',
    'Se llama a canActivate con cada petición.',
    'Se comprueba que el administrador pasa y Gestión recibe ForbiddenException.',
    'El guard permite el acceso al administrador y lo niega a Gestión con ForbiddenException.',
    'El guard permitió el acceso al administrador y lo negó a Gestión con ForbiddenException.'],
  'PU-HU6-06': ['RecommendationService.rankingForAnimal', 'Servicio',
    'Verificar que la lista de adoptantes más compatibles con un animal no muestra el carnet de identidad.',
    'Prisma, el catálogo y el modelo simulados con jest.fn(); no hay modelo activo. La fila simulada del adoptante incluye su carnet.',
    'Animal ZOO-2026-0003 disponible; adoptante Jorge Vargas con carnet ficticio 9000002 LP.',
    'Se simulan el animal, un adoptante con carnet y la configuración del motor.',
    'Se llama a rankingForAnimal.',
    'Se comprueba el nombre del adoptante y que el resultado no contiene el carnet.',
    'El método devuelve el adoptante con su nombre y sin el carnet de identidad.',
    'El método devolvió el adoptante «Jorge Vargas» sin el carnet de identidad.'],
  'PU-HU10-01': ['CreatePeriodDto', 'Validación',
    'Verificar que solo se aceptan períodos de Observación o Cuarentena.',
    PIPE,
    'Período con el tipo «AISLAMIENTO».',
    'Se prepara un período válido con un tipo inexistente.',
    'Se valida con el ValidationPipe global contra CreatePeriodDto.',
    'Se comprueba que el único campo con error es type.',
    'La validación rechaza el período e indica el campo type.',
    'La validación rechazó el período e indicó únicamente el campo type.'],
  'PU-HU10-02': ['CreateControlDto', 'Validación',
    'Verificar que un control no se registra sin lo observado en el animal.',
    PIPE,
    'Control con fecha y observaciones, sin la condición del animal.',
    'Se prepara un control sin animalCondition.',
    'Se valida con el ValidationPipe global contra CreateControlDto.',
    'Se comprueba que el único campo con error es animalCondition.',
    'La validación rechaza el control e indica el campo animalCondition.',
    'La validación rechazó el control e indicó únicamente el campo animalCondition.'],
  'PU-HU10-03': ['clinicalStatusFor', 'Función auxiliar',
    'Verificar que la situación del animal corresponde al tipo de período abierto.',
    SIN_DEP,
    'Período de cuarentena con un tratamiento activo; período de observación sin tratamientos.',
    'Se preparan los dos casos.',
    'Se llama a clinicalStatusFor con cada caso.',
    'Se comprueba la situación devuelta en cada uno.',
    'La función devuelve «En cuarentena» y «En observación» respectivamente.',
    'La función devolvió EN_CUARENTENA y EN_OBSERVACION respectivamente.'],
  'PU-HU10-04': ['ClinicalService.startPeriod', 'Servicio',
    'Verificar que no se abre un segundo período si el animal ya tiene uno abierto.',
    'Prisma y AnimalStatusService simulados con jest.fn(); el animal está En observación con un período activo.',
    'Nuevo período de cuarentena para el mismo animal.',
    'Se simula el animal con un período activo.',
    'Se llama a startPeriod.',
    'Se comprueba el mensaje de error y que no se crea ningún período.',
    'El método rechaza la apertura con ConflictException y no crea el período.',
    'El método rechazó la apertura con el mensaje «El animal ya tiene un periodo de observación/cuarentena activo» y no creó el período.'],
  'PU-HU10-05': ['ClinicalService.startPeriod', 'Servicio',
    'Verificar que un animal con una solicitud de adopción en curso no ingresa a cuarentena.',
    'Prisma y AnimalStatusService simulados con jest.fn(); el animal está En proceso de adopción, sin períodos.',
    'Nuevo período de cuarentena.',
    'Se simula el animal con una solicitud en curso.',
    'Se llama a startPeriod.',
    'Se comprueba el mensaje de error y que no se crea ningún período.',
    'El método rechaza la apertura con ConflictException por la solicitud activa y no crea el período.',
    'El método rechazó la apertura con ConflictException por la solicitud de adopción activa y no creó el período.'],
  'PU-HU10-06': ['ClinicalService.addControl', 'Servicio',
    'Verificar que el control se guarda con su fecha, lo observado y el responsable.',
    MOCK + ' El período está activo desde el 17/11/2026.',
    'Control del 18/11/2026 09:00 (hora de Bolivia), condición «Estable», observaciones «Come bien».',
    'Se simula el período activo y se prepara el control.',
    'Se llama a addControl con el veterinario.',
    'Se comprueba lo guardado y la fecha convertida a UTC.',
    'El método guarda el control con la fecha 2026-11-18T13:00 UTC, lo observado y el veterinario como responsable.',
    'El método guardó el control con la fecha 2026-11-18T13:00:00.000Z, lo observado y el veterinario como responsable.'],
  'PU-HU11-01': ['canRequestTransition', 'Función auxiliar',
    'Verificar que una solicitud solo se aprueba o rechaza desde En evaluación.',
    SIN_DEP,
    'En evaluación → Aprobada; En evaluación → Rechazada; Pendiente → Aprobada; Aprobada → Cancelada.',
    'Se preparan las cuatro transiciones.',
    'Se llama a canRequestTransition con cada una.',
    'Se comprueba cuáles están permitidas.',
    'La función permite las dos primeras y prohíbe las dos últimas.',
    'La función permitió las dos primeras y prohibió las dos últimas.'],
  'PU-HU11-02': ['animalStatusAfter', 'Función auxiliar',
    'Verificar la situación final del animal según el resultado de la solicitud.',
    SIN_DEP,
    'Resultados Aprobada, Rechazada y Cancelada.',
    'Se preparan los tres resultados finales.',
    'Se llama a animalStatusAfter con cada uno.',
    'Se comprueba la situación devuelta.',
    'La función devuelve «Adoptado» al aprobar y «Disponible para adopción» al rechazar o cancelar.',
    'La función devolvió ADOPTADO al aprobar y DISPONIBLE_ADOPCION al rechazar o cancelar.'],
  'PU-HU11-03': ['DecisionDto', 'Validación',
    'Verificar que no se registra un rechazo sin el motivo.',
    PIPE,
    'Resultado «RECHAZADA» y fecha de decisión, sin nota.',
    'Se prepara una decisión de rechazo sin motivo.',
    'Se valida con el ValidationPipe global contra DecisionDto.',
    'Se comprueba que el único campo con error es notes.',
    'La validación rechaza la decisión e indica el campo notes.',
    'La validación rechazó la decisión e indicó únicamente el campo notes.'],
  'PU-HU11-04': ['appendNote', 'Función auxiliar',
    'Verificar que cada observación queda con su fecha y su autor sin borrar las anteriores.',
    'Reloj fijado con jest.useFakeTimers() en 2026-11-17 14:30 UTC (10:30 en Bolivia).',
    'Nota anterior y nueva nota «Visita domiciliaria realizada» de Gestion de Prueba.',
    'Se fija el reloj y se prepara una nota anterior.',
    'Se llama a appendNote con la nueva nota.',
    'Se comprueba que se conserva la anterior y que la nueva lleva fecha, hora, autor y estado.',
    'La función conserva la nota anterior y agrega la nueva con la fecha 17/11/26, la hora 10:30, el autor y el estado.',
    'La función conservó la nota anterior y agregó la nueva con la fecha 17/11/26, la hora 10:30, el autor Gestion de Prueba y el estado En evaluación.'],
  'PU-HU11-05': ['AdoptionsService.addNote', 'Servicio',
    'Verificar que no se agregan observaciones a una solicitud ya aprobada.',
    'Prisma y AnimalStatusService simulados con jest.fn(); la solicitud está Aprobada.',
    'Nota «Nota tardía».',
    'Se simula una solicitud aprobada.',
    'Se llama a addNote.',
    'Se comprueba el mensaje de error y que no se actualiza la solicitud.',
    'El método rechaza la nota con ConflictException y no modifica la solicitud.',
    'El método rechazó la nota con el mensaje «Solo se agregan notas a solicitudes activas» y no modificó la solicitud.'],
  'PU-HU11-06': ['AdoptionsService.changeStatus', 'Servicio',
    'Verificar que al cancelar una solicitud el animal vuelve a estar disponible para adopción.',
    'Prisma y AnimalStatusService simulados con jest.fn(); solicitud En evaluación y animal En proceso de adopción.',
    'Cancelación con la nota «El adoptante desistió».',
    'Se simulan la solicitud y el animal.',
    'Se llama a changeStatus con el estado CANCELADA.',
    'Se comprueba el nuevo estado de la solicitud y el cambio de situación del animal.',
    'El método cancela la solicitud y devuelve el animal a «Disponible para adopción».',
    'El método canceló la solicitud y devolvió el animal a DISPONIBLE_ADOPCION.'],
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
  'modules/adopters/adopters.service.ts', 'modules/adopters/dto/adopters.dto.ts',
  'modules/adoptions/adoptions.service.ts', 'modules/adoptions/dto/adoptions.dto.ts',
  'modules/adoptions/request-status.ts', 'modules/recommendation/engine.ts',
  'modules/recommendation/recommendation.service.ts', 'modules/recommendation/ml/random-forest.ts',
  'modules/clinical/clinical.service.ts', 'modules/clinical/dto/clinical.dto.ts',
  'modules/animals/animal-status.ts', 'common/guards/roles.guard.ts',
].map((f) => `--collectCoverageFrom=${f}`).join(' ');

const salida = {
  fecha_ejecucion: fechaLocal,
  entorno: JSON.parse(fs.readFileSync(path.join(dir, 'entorno.json'), 'utf8')),
  comandos: {
    ejecucion: 'cd backend && npx jest sprint2.unit.spec -t "PU-HU" --json --outputFile=../docs/pruebas-sprint2/unitarias/jest-resultado.json',
    cobertura: `cd backend && npx jest sprint2.unit.spec -t "PU-HU" --coverage ${COLLECT} --coverageReporters=text --coverageReporters=json-summary --coverageReporters=html --coverageDirectory=../../docs/pruebas-sprint2/unitarias/cobertura`,
  },
  resumen,
  pruebas,
  cobertura,
  cobertura_total: fila(cov.total),
  capturas: [
    ...['HU5', 'HU6', 'HU10', 'HU11'].map((hu) => ({
      archivo: `capturas/PU-${hu}.png`,
      muestra: `Ejecución de las pruebas unitarias de ${hu}`,
      comando: `npx jest sprint2.unit.spec -t "PU-${hu}-" --verbose`,
      salida: `salidas/PU-${hu}.txt`,
    })),
    { archivo: 'capturas/PU-resumen.png', muestra: 'Ejecución de todas las pruebas unitarias PU-HU del Sprint 2 con el resumen de Test Suites, Tests y Time', comando: 'npx jest sprint2.unit.spec -t "PU-HU"', salida: 'salidas/PU-resumen.txt' },
    { archivo: 'capturas/PU-cobertura.png', muestra: 'Reporte de cobertura de Jest (cobertura/index.html) abierto en el navegador', comando: 'npx jest sprint2.unit.spec -t "PU-HU" --coverage (comando completo en comandos.cobertura)', salida: 'salidas/cobertura-texto.txt' },
  ],
  defectos: [],
  pendientes: [
    'Las capturas de cada historia muestran «3 skipped» en Test Suites y la cantidad de pruebas omitidas: es la salida real del comando de la guía (npx jest sprint2.unit.spec -t "PU-HUx-"), que carga los 4 archivos de pruebas unitarias del Sprint 2 y ejecuta solo las de la historia filtrada.',
    'La cobertura se mide sobre los archivos completos de las unidades probadas. Esos archivos incluyen métodos de otras historias y sprints (seguimientos, tratamientos, vacunas, consultas, etc.) que estas 24 pruebas no ejecutan, y por eso el porcentaje total no es alto.',
    'Los caminos de caja blanca del Sprint 2 (CB-HU5 a CB-HU11) no se repitieron: las pruebas unitarias cubren validaciones, funciones auxiliares y otros métodos.',
    'Por indicación del equipo, en HU6 no se incluyó la prueba del criterio 3 (perro grande para un departamento sin patio marcado como incompatible). PU-HU6-02 prueba otro filtro obligatorio del sistema: el animal que no tolera otros animales en un hogar que ya tiene.',
    'Las capturas de cada historia y la del resumen salen de ejecuciones separadas de Jest, por lo que sus tiempos en milisegundos pueden diferir de los de jest-resultado.json. Los tiempos oficiales del JSON salen de jest-resultado.json.',
    'No se reutilizó ninguna prueba existente: las 24 son nuevas («nueva»: true). Las pruebas que ya existían están listadas en inventario.md.',
  ],
};

fs.writeFileSync(path.join(dir, 'unitarias.json'), JSON.stringify(salida, null, 2) + '\n');
console.log(`unitarias.json: ${pruebas.length} pruebas, ${resumen.aprobadas} aprobadas, ${resumen.fallidas} fallidas`);
