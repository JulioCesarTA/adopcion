/**
 * Arma unitarias.json a partir de datos reales:
 *  - estado y tiempo_ms: jest-resultado.json
 *  - codigo_prueba: extraído del archivo *.unit.spec.ts
 *  - cobertura: cobertura/coverage-summary.json
 * Los textos descriptivos (qué prepara, ejecuta y verifica cada prueba) están abajo, en TEXTOS,
 * y describen el código de cada it(). Para una prueba fallida, resultado_obtenido se completa
 * con el mensaje real de Jest.
 * Uso (desde la raíz del repositorio): node docs/pruebas-sprint1/unitarias/generar-unitarias.js
 */
const fs = require('node:fs');
const path = require('node:path');

const dir = __dirname;
const raiz = path.resolve(dir, '../../..');
const rel = (p) => path.relative(raiz, p).split(path.sep).join('/');

const ARCHIVOS = {
  HU1: 'backend/src/modules/animals/animals.hu1.unit.spec.ts',
  HU2: 'backend/src/modules/clinical/consultas.hu2.unit.spec.ts',
  HU3: 'backend/src/modules/clinical/historial.hu3.unit.spec.ts',
  HU4: 'backend/src/modules/clinical/vacunas.hu4.unit.spec.ts',
  HU8: 'backend/src/modules/users/usuarios.hu8.unit.spec.ts',
};

const MOCK_PRISMA = 'Prisma simulado con jest.fn(); sin base de datos ni red.';
const SIN_DEP = 'Función pura; no requiere base de datos, red ni simulaciones.';
const PIPE = 'ValidationPipe global del sistema (createValidationPipe), sin base de datos ni red.';
const GUARD = 'RolesGuard con un Reflector real que lee el decorador @Roles del controlador; usuario simulado en la petición, sin base de datos ni red.';

// id: [unidad, tipo, descripcion, precondiciones, datos, arrange, act, assert, esperado, obtenido]
const TEXTOS = {
  'PU-HU1-01': ['detectImageType', 'Función auxiliar',
    'Verificar que la detección del tipo de imagen reconoce los tres formatos permitidos por su contenido.',
    SIN_DEP,
    'Cabeceras binarias de un JPG (FF D8 FF E0), un PNG (89 50 4E 47 0D 0A 1A 0A) y un WEBP (RIFF…WEBP).',
    'Se preparan tres buffers con las cabeceras reales de JPG, PNG y WEBP.',
    'Se llama a detectImageType con cada buffer.',
    'Se comprueba que los resultados son jpg, png y webp, en ese orden.',
    'La función devuelve «jpg», «png» y «webp» respectivamente.',
    'La función devolvió «jpg», «png» y «webp» respectivamente.'],
  'PU-HU1-02': ['detectImageType', 'Función auxiliar',
    'Verificar que un archivo PDF no se acepta como imagen aunque se intente subir como foto.',
    SIN_DEP,
    'Buffer con el contenido «%PDF-1.7 documento».',
    'Se prepara un buffer que empieza con la firma de un PDF.',
    'Se llama a detectImageType con ese buffer.',
    'Se comprueba que el resultado es null.',
    'La función devuelve null y el archivo no se reconoce como imagen.',
    'La función devolvió null y el archivo no se reconoció como imagen.'],
  'PU-HU1-03': ['AnimalsService.savePhoto', 'Servicio',
    'Verificar el valor límite del tamaño de la foto: un archivo de exactamente 5 MB se acepta.',
    'Prisma y el almacenamiento de fotos simulados con jest.fn(); el animal existe y no tiene foto.',
    'Archivo JPG de 5 242 880 bytes (5 MB exactos).',
    'Se simula el animal existente y se prepara un archivo JPG con tamaño igual a MAX_PHOTO_BYTES.',
    'Se llama a savePhoto con el identificador del animal y el archivo.',
    'Se comprueba que el límite es 5 MB, que el archivo se guardó una vez y que el animal quedó con la nueva foto.',
    'El método acepta la foto, la guarda en el almacenamiento y actualiza la foto del animal.',
    'El método aceptó la foto, la guardó una vez en el almacenamiento y actualizó la foto del animal.'],
  'PU-HU1-04': ['CreateAnimalDto', 'Validación',
    'Verificar que no se puede registrar un animal sin indicar la especie.',
    PIPE,
    'Datos completos de un animal sin el campo species.',
    'Se arma un animal válido y se le quita la especie.',
    'Se valida con el ValidationPipe global contra CreateAnimalDto.',
    'Se comprueba que se lanza BadRequestException y que el único campo con error es species.',
    'La validación rechaza los datos con BadRequestException e indica el campo species.',
    'La validación rechazó los datos con BadRequestException e indicó únicamente el campo species.'],
  'PU-HU1-05': ['AnimalsService.create', 'Servicio',
    'Verificar que el código del animal tiene el formato ZOO-AAAA-NNNN, usa el año de Bolivia y que el animal queda Ingresado.',
    'Prisma simulado con jest.fn(); reloj fijado con jest.useFakeTimers() en 2027-01-01 03:00 UTC (31/12/2026 23:00 en Bolivia).',
    'Último código registrado: ZOO-2026-0041.',
    'Se fija el reloj en la última hora de 2026 en Bolivia y se simula que el último código del año es ZOO-2026-0041.',
    'Se llama a create con un animal válido.',
    'Se comprueba el formato del código, que el código es ZOO-2026-0042 y que el estado es INGRESADO.',
    'El método asigna el código ZOO-2026-0042 y registra el animal en estado Ingresado.',
    'El método asignó el código ZOO-2026-0042 y registró el animal en estado Ingresado.'],
  'PU-HU1-06': ['ListAnimalsQueryDto', 'Validación',
    'Verificar que el listado de animales admite el filtro por tamaño (criterio de aceptación de HU1).',
    PIPE,
    'Parámetros de búsqueda: species=PERRO, size=GRANDE.',
    'Se preparan los parámetros de búsqueda con especie y tamaño.',
    'Se validan con el ValidationPipe global contra ListAnimalsQueryDto.',
    'Se comprueba que la validación acepta los parámetros y conserva el tamaño.',
    'La validación acepta los parámetros y conserva size=GRANDE para filtrar.',
    null],
  'PU-HU2-01': ['CreateConsultationDto', 'Validación',
    'Verificar que se rechazan temperaturas fuera del rango de 30 a 45 °C.',
    PIPE,
    'Consulta con temperatura 29,9 °C y otra con 45,1 °C.',
    'Se preparan dos consultas válidas que solo difieren en la temperatura.',
    'Se valida cada una con el ValidationPipe global contra CreateConsultationDto.',
    'Se comprueba que en ambos casos el único campo con error es temperatureC.',
    'La validación rechaza ambas consultas e indica el campo temperatureC.',
    'La validación rechazó ambas consultas e indicó únicamente el campo temperatureC.'],
  'PU-HU2-02': ['CreateConsultationDto', 'Validación',
    'Verificar que las temperaturas límite de 30 °C y 45 °C se aceptan.',
    PIPE,
    'Consulta con temperatura 30 °C y otra con 45 °C.',
    'Se preparan dos consultas con las temperaturas límite.',
    'Se valida cada una con el ValidationPipe global contra CreateConsultationDto.',
    'Se comprueba que ninguna tiene campos con error.',
    'La validación acepta ambas consultas.',
    'La validación aceptó ambas consultas sin errores.'],
  'PU-HU2-03': ['CreateConsultationDto', 'Validación',
    'Verificar que el peso debe ser mayor que cero, con el valor límite 0,1 kg.',
    PIPE,
    'Consulta con peso 0 kg y otra con 0,1 kg.',
    'Se preparan dos consultas que solo difieren en el peso.',
    'Se valida cada una con el ValidationPipe global contra CreateConsultationDto.',
    'Se comprueba que 0 kg da error en weightKg y que 0,1 kg no da errores.',
    'La validación rechaza el peso de 0 kg y acepta el de 0,1 kg.',
    'La validación rechazó el peso de 0 kg en el campo weightKg y aceptó el de 0,1 kg.'],
  'PU-HU2-04': ['CreateMedicationDto', 'Validación',
    'Verificar que cada medicamento debe tener dosis.',
    PIPE,
    'Medicamento con nombre, vía, frecuencia y duración, sin dosis.',
    'Se prepara un medicamento completo excepto la dosis.',
    'Se valida con el ValidationPipe global contra CreateMedicationDto.',
    'Se comprueba que el único campo con error es dose.',
    'La validación rechaza el medicamento e indica el campo dose.',
    'La validación rechazó el medicamento e indicó únicamente el campo dose.'],
  'PU-HU2-05': ['ClinicalService.createConsultation', 'Servicio',
    'Verificar que el veterinario de la consulta se toma del usuario autenticado y no de los datos enviados.',
    MOCK_PRISMA + ' El animal está Ingresado.',
    'Consulta con un veterinarianId ajeno en el cuerpo; usuario autenticado con rol VETERINARIO.',
    'Se simula un animal en la institución y se envía una consulta con otro veterinarianId.',
    'Se llama a createConsultation con el usuario autenticado.',
    'Se comprueba que la consulta quedó con el identificador del usuario autenticado.',
    'El método guarda la consulta con el veterinario autenticado.',
    'El método guardó la consulta con el identificador del veterinario autenticado.'],
  'PU-HU2-06': ['RolesGuard (POST /animals/:id/consultations)', 'Validación',
    'Verificar que el administrador puede registrar consultas (criterio de aceptación de HU2).',
    GUARD,
    'Usuario con rol ADMIN; manejador ClinicalController.createConsultation.',
    'Se crea el RolesGuard y una petición de un ADMIN dirigida al registro de consultas.',
    'Se llama a canActivate.',
    'Se comprueba que no se lanza ninguna excepción.',
    'El guard permite el acceso del administrador.',
    null],
  'PU-HU3-01': ['AnimalsService.timeline', 'Servicio',
    'Verificar que el historial une los registros y los ordena del más reciente al más antiguo.',
    MOCK_PRISMA,
    'Consulta del 05/10/2026, vacuna del 12/11/2026 y período del 20/09/2026.',
    'Se simula un registro de cada tipo con fechas mezcladas.',
    'Se llama a timeline sin filtros.',
    'Se comprueba el orden de los identificadores.',
    'El historial devuelve vacuna, consulta y período, en ese orden.',
    'El historial devolvió vacuna, consulta y período, en ese orden.'],
  'PU-HU3-02': ['AnimalsService.timeline', 'Servicio',
    'Verificar que un animal sin registros clínicos tiene un historial vacío.',
    MOCK_PRISMA,
    'Animal existente sin consultas, vacunas ni períodos.',
    'Se simula un animal sin registros.',
    'Se llama a timeline sin filtros.',
    'Se comprueba que el resultado es una lista vacía.',
    'El método devuelve { data: [] }.',
    'El método devolvió { data: [] }.'],
  'PU-HU3-03': ['AnimalsService.timeline', 'Servicio',
    'Verificar que cada registro del historial tiene fecha y tipo, y que se pide el profesional que lo registró.',
    MOCK_PRISMA,
    'Una consulta del 10/11/2026.',
    'Se simula una consulta con fecha.',
    'Se llama a timeline sin filtros.',
    'Se comprueba el tipo, la fecha y el identificador del registro, y que la búsqueda incluye al veterinario.',
    'El registro tiene tipo CONSULTA y su fecha, y la búsqueda incluye al veterinario.',
    'El registro tuvo tipo CONSULTA y su fecha, y la búsqueda incluyó al veterinario.'],
  'PU-HU3-04': ['ClinicalService.updateTreatment', 'Servicio',
    'Verificar que un veterinario que no es el autor no puede corregir un tratamiento.',
    MOCK_PRISMA + ' El tratamiento pertenece a una consulta de otro veterinario.',
    'Corrección de observaciones enviada por otro veterinario.',
    'Se simula un tratamiento cuyo autor es otro veterinario.',
    'Se llama a updateTreatment con el veterinario que no es el autor.',
    'Se comprueba que se lanza ForbiddenException y que no se actualiza nada.',
    'El método lanza ForbiddenException y no modifica el tratamiento.',
    'El método lanzó ForbiddenException y no modificó el tratamiento.'],
  'PU-HU3-05': ['ClinicalService.updateVaccination', 'Servicio',
    'Verificar que el administrador puede corregir un registro de vacunación de otro profesional.',
    MOCK_PRISMA + ' La vacunación fue registrada por un veterinario.',
    'Corrección del lote a «LOTE-2» enviada por un ADMIN.',
    'Se simula una vacunación registrada por un veterinario.',
    'Se llama a updateVaccination con un usuario ADMIN.',
    'Se comprueba que se actualizó una vez y solo con el lote.',
    'El método permite la corrección y actualiza únicamente el lote.',
    'El método permitió la corrección y actualizó únicamente el lote.'],
  'PU-HU3-06': ['RolesGuard (GET /animals/:id/timeline)', 'Validación',
    'Verificar que el historial solo lo ve el personal y no un usuario del portal público.',
    GUARD,
    'Usuario con rol CLIENTE; manejador AnimalsController.timeline.',
    'Se crea el RolesGuard y una petición de un CLIENTE dirigida al historial.',
    'Se llama a canActivate.',
    'Se comprueba que se lanza ForbiddenException.',
    'El guard niega el acceso con ForbiddenException.',
    'El guard negó el acceso con ForbiddenException.'],
  'PU-HU4-01': ['toDateOnly', 'Función auxiliar',
    'Verificar la conversión de fechas sin hora y con hora a la medianoche UTC usada en las columnas de fecha.',
    SIN_DEP,
    '«2026-11-17» y «2026-11-17T21:45:00.000Z».',
    'Se preparan la misma fecha sin hora y con hora.',
    'Se llama a toDateOnly con cada valor.',
    'Se comprueba que ambos resultados son 2026-11-17T00:00:00.000Z.',
    'La función devuelve 2026-11-17 a medianoche UTC en ambos casos.',
    'La función devolvió 2026-11-17 a medianoche UTC en ambos casos.'],
  'PU-HU4-02': ['addDays', 'Función auxiliar',
    'Verificar el cálculo de hoy + 7 días cuando se cruza el fin de mes.',
    SIN_DEP,
    'Fecha 2026-11-28 y 7 días.',
    'Se prepara una fecha a tres días del fin de noviembre.',
    'Se llama a addDays con 7 días.',
    'Se comprueba que el resultado es 2026-12-05.',
    'La función devuelve 2026-12-05.',
    'La función devolvió 2026-12-05.'],
  'PU-HU4-03': ['todayLaPaz', 'Función auxiliar',
    'Verificar que «hoy» se calcula en hora de Bolivia y no en UTC.',
    'Reloj fijado con jest.useFakeTimers() en 2026-11-18 02:30 UTC (17/11/2026 22:30 en Bolivia).',
    'Instante 2026-11-18T02:30:00Z.',
    'Se fija el reloj en un instante que ya es 18 en UTC pero todavía 17 en Bolivia.',
    'Se llama a todayLaPaz.',
    'Se comprueba que el resultado es 2026-11-17.',
    'La función devuelve 2026-11-17.',
    'La función devolvió 2026-11-17.'],
  'PU-HU4-04': ['ClinicalService.upcomingVaccinations', 'Servicio',
    'Verificar que el aviso de próximas dosis busca hasta hoy + 7 días.',
    'Prisma simulado con jest.fn() ($queryRaw); reloj fijado con jest.useFakeTimers() en 2026-11-17 15:00 UTC.',
    'Plazo de 7 días.',
    'Se fija el reloj en el 17/11/2026 y se simula la consulta SQL.',
    'Se llama a upcomingVaccinations(7).',
    'Se comprueba que el límite enviado a la consulta es 2026-11-24.',
    'El método consulta las dosis que vencen hasta el 24/11/2026 inclusive.',
    'El método envió a la consulta el límite 2026-11-24.'],
  'PU-HU4-05': ['ClinicalService.upcomingVaccinations', 'Servicio',
    'Verificar que la consulta de próximas dosis considera solo la última dosis de cada vacuna y excluye a los animales que salieron.',
    'Prisma simulado con jest.fn() ($queryRaw); reloj fijado con jest.useFakeTimers() en 2026-11-17 15:00 UTC.',
    'Plazo de 7 días.',
    'Se fija el reloj y se simula la consulta SQL.',
    'Se llama a upcomingVaccinations(7).',
    'Se comprueba que el SQL enviado agrupa por animal y vacuna con la fecha más reciente y excluye ADOPTADO, FALLECIDO y DEVUELTO.',
    'La consulta toma la última dosis por animal y vacuna y excluye a los animales adoptados, fallecidos o devueltos.',
    'La consulta enviada tomó la última dosis por animal y vacuna y excluyó los estados ADOPTADO, FALLECIDO y DEVUELTO.'],
  'PU-HU4-06': ['ClinicalService.createVaccination', 'Servicio',
    'Verificar el valor límite de la próxima dosis: el mismo día de la aplicación se acepta.',
    MOCK_PRISMA + ' Gato en la institución y vacuna activa indicada para gatos.',
    'Aplicación 2026-11-17, lote TF-9, próxima dosis 2026-11-17.',
    'Se simulan el animal y la vacuna, y se prepara una próxima dosis igual a la fecha de aplicación.',
    'Se llama a createVaccination.',
    'Se comprueba que no hay advertencias y que la próxima dosis quedó el 17/11/2026.',
    'El método registra la vacuna sin advertencias y con la próxima dosis el 17/11/2026.',
    'El método registró la vacuna sin advertencias y con la próxima dosis el 17/11/2026.'],
  'PU-HU8-01': ['CreateUserDto', 'Validación',
    'Verificar la política de la contraseña temporal: mínimo 8 caracteres con al menos una letra y un número.',
    PIPE,
    'Contraseña de prueba de 8 letras sin números, otra de 7 caracteres y otra de 9 caracteres con letras y número.',
    'Se prepara una cuenta válida y tres contraseñas de prueba.',
    'Se valida cada cuenta con el ValidationPipe global contra CreateUserDto.',
    'Se comprueba que las dos primeras se rechazan y la tercera se acepta.',
    'La validación rechaza la contraseña sin números y la de 7 caracteres, y acepta la que cumple la política.',
    'La validación rechazó la contraseña sin números y la de 7 caracteres, y aceptó la que cumplía la política.'],
  'PU-HU8-02': ['toPublicUser', 'Función auxiliar',
    'Verificar que los datos públicos del usuario no exponen el hash de la contraseña ni de la sesión.',
    SIN_DEP,
    'Usuario con passwordHash, refreshTokenHash y failedAttempts.',
    'Se prepara un usuario completo con datos internos.',
    'Se llama a toPublicUser.',
    'Se comprueba que no aparecen passwordHash, refreshTokenHash ni failedAttempts y que se conserva el email.',
    'La función devuelve el usuario sin los datos internos.',
    'La función devolvió el usuario sin passwordHash, refreshTokenHash ni failedAttempts.'],
  'PU-HU8-03': ['UsersService.resetPassword', 'Servicio',
    'Verificar que al restablecer la contraseña se guarda cifrada y se cierran todas las sesiones.',
    MOCK_PRISMA + ' El usuario existe y tiene una sesión abierta.',
    'Nueva contraseña temporal de prueba.',
    'Se simula un usuario con sesión abierta y dos intentos fallidos.',
    'Se llama a resetPassword con la contraseña temporal.',
    'Se comprueba que el hash no es el texto, que corresponde a la contraseña, que la sesión queda anulada y los intentos en cero.',
    'El método guarda la contraseña cifrada con bcrypt, anula el refresh token y reinicia los intentos.',
    'El método guardó la contraseña cifrada con bcrypt, anuló el refresh token y reinició los intentos.'],
  'PU-HU8-04': ['UsersService.update', 'Servicio',
    'Verificar que el administrador no puede cambiar su propio rol.',
    MOCK_PRISMA + ' El actor es el propio administrador.',
    'Cambio de rol de ADMIN a GESTION sobre la propia cuenta.',
    'Se simula la cuenta del administrador y se prepara el cambio de rol.',
    'Se llama a update con el mismo identificador como actor.',
    'Se comprueba el mensaje de error y que no se actualiza nada.',
    'El método lanza BadRequestException «No puedes cambiar tu propio rol» y no modifica la cuenta.',
    'El método lanzó BadRequestException «No puedes cambiar tu propio rol» y no modificó la cuenta.'],
  'PU-HU8-05': ['AuthService.changePassword', 'Servicio',
    'Verificar que el usuario puede cambiar su contraseña y que la nueva se guarda cifrada.',
    MOCK_PRISMA + ' El usuario existe y su contraseña actual está cifrada.',
    'Contraseña actual correcta y nueva contraseña de prueba distinta.',
    'Se simula un usuario con la contraseña actual cifrada.',
    'Se llama a changePassword con la actual y la nueva.',
    'Se comprueba que el hash guardado no es el texto y que corresponde a la nueva contraseña.',
    'El método guarda la nueva contraseña cifrada con bcrypt.',
    'El método guardó la nueva contraseña cifrada con bcrypt.'],
  'PU-HU8-06': ['AuthService.refresh', 'Servicio',
    'Verificar que un usuario desactivado no puede renovar su sesión.',
    'Prisma y JwtService simulados con jest.fn(); el usuario está desactivado y su refresh token es válido.',
    'Refresh token ficticio cuyo hash coincide con el guardado.',
    'Se simula un usuario desactivado con un refresh token vigente.',
    'Se llama a refresh con ese token.',
    'Se comprueba que se lanza UnauthorizedException y que no se emiten tokens.',
    'El método lanza UnauthorizedException y no emite una nueva sesión.',
    'El método lanzó UnauthorizedException y no emitió una nueva sesión.'],
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
  const hu = id.slice(3, 6);
  const a = asserts.get(id);
  if (!a) throw new Error(`${id} no aparece en jest-resultado.json`);
  const aprobado = a.status === 'passed';
  const mensaje = sinAnsi(a.failureMessages.join('\n')).split('\n').map((l) => l.trim().replace(/\s+/g, ' '))
    .filter((l) => l && !/^(at |>|\||\d+ \|)/.test(l)); // sin pila ni fragmentos de código
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
const fechaLocal = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

const COLLECT = [
  'modules/animals/animals.service.ts', 'modules/animals/dto/animals.dto.ts',
  'modules/clinical/clinical.service.ts', 'modules/clinical/dto/clinical.dto.ts',
  'modules/users/users.service.ts', 'modules/users/dto/users.dto.ts', 'modules/auth/auth.service.ts',
  'common/dates.ts', 'common/validation.ts', 'common/guards/roles.guard.ts',
].map((f) => `--collectCoverageFrom=${f}`).join(' ');

const salida = {
  fecha_ejecucion: fechaLocal,
  entorno: JSON.parse(fs.readFileSync(path.join(dir, 'entorno.json'), 'utf8')),
  comandos: {
    ejecucion: 'cd backend && npx jest unit.spec -t "PU-HU" --json --outputFile=../docs/pruebas-sprint1/unitarias/jest-resultado.json',
    cobertura: `cd backend && npx jest unit.spec -t "PU-HU" --coverage ${COLLECT} --coverageReporters=text --coverageReporters=json-summary --coverageReporters=html --coverageDirectory=../../docs/pruebas-sprint1/unitarias/cobertura`,
  },
  resumen,
  pruebas,
  cobertura,
  cobertura_total: fila(cov.total),
  capturas: [
    ...['HU1', 'HU2', 'HU3', 'HU4', 'HU8'].map((hu) => ({
      archivo: `capturas/PU-${hu}.png`,
      muestra: `Ejecución de las pruebas unitarias de ${hu}`,
      comando: `npx jest ${hu.toLowerCase()}.unit.spec -t "PU-${hu}" --verbose`,
      salida: `salidas/PU-${hu}.txt`,
    })),
    { archivo: 'capturas/PU-resumen.png', muestra: 'Ejecución de todas las pruebas unitarias PU-HU con el resumen de Test Suites, Tests y Time', comando: 'npx jest unit.spec -t "PU-HU"', salida: 'salidas/PU-resumen.txt' },
    { archivo: 'capturas/PU-cobertura.png', muestra: 'Reporte de cobertura de Jest (cobertura/index.html) abierto en el navegador', comando: salidaCob(), salida: 'salidas/cobertura-texto.txt' },
  ],
  defectos: [
    {
      hu: 'HU1', prueba: 'PU-HU1-06',
      descripcion: 'El listado de animales no permite filtrar por tamaño; la validación rechaza el parámetro size con «Datos inválidos».',
      causa: 'ListAnimalsQueryDto (backend/src/modules/animals/dto/animals.dto.ts) solo declara q, species, status y sex, y AnimalsService.list no filtra por tamaño; el ValidationPipe global rechaza las propiedades no declaradas.',
      estado: 'Pendiente',
    },
    {
      hu: 'HU2', prueba: 'PU-HU2-06',
      descripcion: 'El administrador no puede registrar consultas clínicas; el guard de roles responde «No tienes acceso a este recurso».',
      causa: 'ClinicalController.createConsultation está decorado con @Roles(VETERINARIO), sin ADMIN; la corrección (PATCH /consultations/:id) sí incluye ADMIN.',
      estado: 'Pendiente',
    },
  ],
  pendientes: [
    'Los dos defectos no se corrigieron porque la guía prohíbe cambiar el código de la aplicación. Mientras sigan abiertos, la suite completa del backend (npx jest) termina con 2 pruebas fallidas, por lo que el CI fallaría si esta rama se integra a main.',
    'Al comando de la guía se le agregó el patrón de archivos «unit.spec» (npx jest unit.spec -t "PU-HU"). Sin él, Jest carga los 14 archivos de prueba del backend y lista como omitidas las 143 pruebas que no son unitarias de este punto.',
    'La cobertura se mide sobre los archivos completos de las unidades probadas. Esos archivos incluyen métodos de otros sprints (adopciones, períodos de cuarentena, salidas, etc.) que estas 30 pruebas no ejecutan, y por eso el porcentaje total es bajo.',
    'Las condiciones «hoy + 8 días no entra», «solo la última dosis» y «sin animales que salieron» las resuelve PostgreSQL dentro de la consulta SQL de upcomingVaccinations. Una prueba unitaria no usa base de datos, así que PU-HU4-04 y PU-HU4-05 comprueban el límite y el texto de la consulta enviada, no su ejecución. La ejecución real quedó comprobada en la caja negra de HU4.',
    'PU-HU2-06 y PU-HU3-06 prueban el RolesGuard, que controla el acceso por rol. Se clasificaron como «Validación» porque la guía solo admite Servicio, Validación y Función auxiliar.',
    'Las capturas por HU y la del resumen salen de ejecuciones separadas de Jest, por lo que sus tiempos en milisegundos pueden diferir de los de jest-resultado.json. Los tiempos oficiales del JSON salen de jest-resultado.json.',
    'No se reutilizó ninguna prueba existente: las 30 son nuevas («nueva»: true). Las pruebas que ya existían están listadas en inventario.md.',
  ],
};

function salidaCob() {
  return 'npx jest unit.spec -t "PU-HU" --coverage (comando completo en comandos.cobertura)';
}

fs.writeFileSync(path.join(dir, 'unitarias.json'), JSON.stringify(salida, null, 2) + '\n');
console.log(`unitarias.json: ${pruebas.length} pruebas, ${resumen.aprobadas} aprobadas, ${resumen.fallidas} fallidas`);
