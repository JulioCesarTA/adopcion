/**
 * Arma docs/pruebas-sprint2/resultados.json a partir de ejecuciones reales:
 *
 *   - caja negra : lo que cada prueba de Playwright cargó y observó
 *                  (test/sprint2/evidencia/caja-negra/HUx.json)
 *   - caja blanca: el código se EXTRAE de los archivos fuente del backend y se
 *                  le insertan los números de nodo; el resultado de cada camino
 *                  sale del informe de Jest (docs/pruebas-sprint2/caja-blanca-resultado.json)
 *
 * Uso (desde la raíz del repositorio):  node test/sprint2/generar-resultados.js
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'docs/pruebas-sprint2');
const leer = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const EVID = path.join(__dirname, 'evidencia');
const json = (f) => JSON.parse(fs.readFileSync(path.join(EVID, f), 'utf8'));

// =====================================================================
// CAJA BLANCA
// =====================================================================

/** Texto de un método de clase (de su firma a su llave de cierre), sin comentarios. */
function metodo(fuente, nombre) {
  const lineas = fuente.split('\n');
  const ini = lineas.findIndex((l) => new RegExp(`^  (private )?(async )?${nombre}\\(`).test(l));
  if (ini < 0) throw new Error(`No se encontró el método ${nombre}`);
  const fin = lineas.findIndex((l, i) => i > ini && l === '  }');
  return lineas
    .slice(ini, fin + 1)
    .filter((l) => !/^\s*(\/\/|\/\*|\*)/.test(l))
    .map((l) => l.replace(/^ {2}/, ''))
    .join('\n');
}

/** Texto de una función exportada de nivel superior, sin comentarios. */
function funcion(fuente, nombre) {
  const lineas = fuente.split('\n');
  const ini = lineas.findIndex((l) => l.startsWith(`export function ${nombre}(`));
  if (ini < 0) throw new Error(`No se encontró la función ${nombre}`);
  const fin = lineas.findIndex((l, i) => i > ini && l === '}');
  return lineas
    .slice(ini, fin + 1)
    .filter((l) => !/^\s*(\/\/|\/\*|\*)/.test(l))
    .join('\n');
}

/**
 * Inserta "(n) " delante de cada ancla (texto literal del código). Si se repite,
 * [n, ancla, aparición] indica cuál. Cada nodo queda al inicio de su línea y la
 * sangría pasa de 2 a 4 espacios. Es solo formato: el código no cambia.
 */
function numerar(codigo, anclas) {
  let out = codigo;
  for (const [n, ancla, vez = 1] of anclas) {
    let pos = -1;
    for (let k = 0; k < vez; k++) {
      pos = out.indexOf(ancla, pos + 1);
      if (pos < 0) throw new Error(`Ancla del nodo ${n} no encontrada: ${ancla}`);
    }
    out = out.slice(0, pos) + `(${n}) ` + out.slice(pos);
  }
  return out
    .split('\n')
    .flatMap((linea) => {
      const sangria = /^\s*/.exec(linea)[0];
      const partes = linea.trim().split(/ (?=\(\d+\) )/);
      return partes.map((p, i) => sangria + (i === 0 ? '' : '  ') + p);
    })
    .map((linea) => linea.replace(/^ +/, (s) => s.repeat(2)))
    .join('\n');
}

const AD = 'backend/src/modules/adopters/adopters.service.ts';
const AS = 'backend/src/modules/adoptions/adoptions.service.ts';
const RS = 'backend/src/modules/recommendation/recommendation.service.ts';
const EN = 'backend/src/modules/recommendation/engine.ts';
const CS = 'backend/src/modules/clinical/clinical.service.ts';
const AN = 'backend/src/modules/animals/animals.service.ts';

// aristas: [de, a, etiqueta]   caminos: [camino, entrada simulada, salida esperada]
const METODOS = [
  {
    id: 'CB-HU5-A',
    hu: 'HU5',
    titulo: 'HU5. Creación de Solicitud de Adopción - Verificar carnet único del adoptante',
    archivo: AD,
    metodo: 'AdoptersService.assertCiFree',
    partes: ['assertCiFree'],
    anclas: [
      [1, 'const person = await this.prisma.person.findUnique({'],
      [2, 'if (person &&'],
      [3, 'person.id !== exceptPersonId) {'],
      [4, 'throw new ConflictException({'],
    ],
    nodos: {
      1: 'Busca a la persona registrada con la CI indicada',
      2: '¿Existe una persona con esa CI?',
      3: '¿Es una persona distinta de la que se está editando?',
      4: 'Lanza ConflictException con el identificador del adoptante existente',
    },
    aristas: [[1, 2], [2, 3, 'V'], [2, 'F', 'F'], [3, 4, 'V'], [3, 'F', 'F'], [4, 'F']],
    caminos: [
      ['1, 2, (F)', 'No existe ninguna persona registrada con la CI 9000009 SC.', 'El sistema acepta la CI y no lanza ningún error.'],
      ['1, 2, 3, (F)', 'La CI 9000001 SC pertenece a la misma persona cuyos datos se están editando.', 'El sistema acepta la CI y no lanza ningún error.'],
      ['1, 2, 3, 4, (F)', 'La CI 9000001 SC pertenece a otra persona ya registrada como adoptante.', 'El sistema rechaza el registro y lanza ConflictException con el mensaje «Ya existe un adoptante registrado con la CI 9000001 SC» y el identificador del adoptante existente.'],
    ],
  },
  {
    id: 'CB-HU5-B',
    hu: 'HU5',
    titulo: 'HU5. Creación de Solicitud de Adopción - Crear Solicitud',
    archivo: AS,
    metodo: 'AdoptionsService.create',
    partes: ['create'],
    anclas: [
      [1, 'const adopter = await this.prisma.adopterProfile.findUnique({'],
      [2, 'if (!adopter) throw'],
      [3, 'return await this.prisma.$transaction(async (tx) => {'],
      [4, "if (animal.status === 'EN_PROCESO_ADOPCION') {"],
      [5, 'throw new ConflictException(', 1],
      [6, "if (animal.status !== 'DISPONIBLE_ADOPCION') {"],
      [7, 'throw new ConflictException(', 2],
      [8, 'const request = await tx.adoptionRequest.create({'],
      [9, 'if (err instanceof Prisma.PrismaClientKnownRequestError &&'],
      [10, "err.code === 'P2002') {"],
      [11, 'throw new ConflictException(', 3],
      [12, 'throw err;'],
    ],
    nodos: {
      1: 'Busca el perfil del adoptante',
      2: '¿El adoptante no existe?',
      3: 'Abre la transacción y bloquea el registro del animal',
      4: '¿El animal ya está «En proceso de adopción»?',
      5: 'Lanza ConflictException: el animal ya tiene una solicitud activa',
      6: '¿El animal no está «Disponible para adopción»?',
      7: 'Lanza ConflictException: el animal no está disponible',
      8: 'Crea la solicitud PENDIENTE y pasa el animal a «En proceso de adopción». ¿La base de datos lanza una excepción?',
      9: '¿El error es un error conocido de Prisma?',
      10: '¿Es la violación de unicidad P2002 (segunda solicitud activa)?',
      11: 'Lanza ConflictException: el animal ya tiene una solicitud activa',
      12: 'Vuelve a lanzar el error original',
    },
    aristas: [
      [1, 2], [2, 'F', 'V'], [2, 3, 'F'], [3, 4], [4, 5, 'V'], [4, 6, 'F'], [5, 9],
      [6, 7, 'V'], [6, 8, 'F'], [7, 9], [8, 9, 'V'], [8, 'F', 'F'], [9, 10, 'V'], [9, 12, 'F'],
      [10, 11, 'V'], [10, 12, 'F'], [11, 'F'], [12, 'F'],
    ],
    caminos: [
      ['1, 2, (F)', 'El identificador del adoptante no corresponde a ningún adoptante registrado.', 'El sistema rechaza la solicitud y lanza NotFoundException con el mensaje «Adoptante no encontrado». No se crea ningún registro.'],
      ['1, 2, 3, 4, 6, 8, (F)', 'Adoptante registrado y animal en la situación «Disponible para adopción».', 'El sistema crea la solicitud en estado Pendiente, con el usuario responsable, y pasa el animal a «En proceso de adopción».'],
      ['1, 2, 3, 4, 5, 9, 12, (F)', 'Animal en la situación «En proceso de adopción» (ya tiene una solicitud en curso).', 'El sistema rechaza la solicitud y lanza ConflictException con el mensaje «El animal ya tiene una solicitud de adopción activa». No se crea ningún registro.'],
      ['1, 2, 3, 4, 6, 7, 9, 12, (F)', 'Animal en la situación «Ingresado».', 'El sistema rechaza la solicitud y lanza ConflictException con el mensaje «El animal no está disponible para adopción (estado: Ingresado)». No se crea ningún registro.'],
      ['1, 2, 3, 4, 6, 8, 9, 10, 11, (F)', 'Animal disponible, pero la base de datos rechaza la creación por una segunda solicitud activa (código P2002).', 'El sistema lanza ConflictException con el mensaje «El animal ya tiene una solicitud de adopción activa».'],
      ['1, 2, 3, 4, 6, 8, 9, 10, 12, (F)', 'Animal disponible, pero la base de datos lanza otro error conocido (código P2003).', 'El sistema vuelve a lanzar el mismo error de la base de datos.'],
      ['1, 2, 3, 4, 6, 8, 9, 12, (F)', 'Animal disponible, pero la creación falla con un error que no es de Prisma (conexión interrumpida).', 'El sistema vuelve a lanzar el mismo error.'],
    ],
  },
  {
    id: 'CB-HU6-A',
    hu: 'HU6',
    titulo: 'HU6. Recomendación de Compatibilidad - Calcular el puntaje con el modelo o con las reglas',
    archivo: RS,
    metodo: 'RecommendationService.score',
    partes: ['score'],
    anclas: [
      [1, 'const rules = computeCompatibility(adopter, animal, settings);'],
      [2, 'if (!rules.hardFilters.passed) {'],
      [3, "return { ...base, method: 'REGLAS', ml: null };", 1],
      [4, 'const active = await this.ml.activeForest();'],
      [5, 'if (!active) {'],
      [6, "return { ...base, method: 'REGLAS', ml: null };", 2],
      [7, 'const features = toFeatures(adopter, animal);'],
    ],
    nodos: {
      1: 'Calcula el puntaje con el motor de reglas (filtros obligatorios y 5 criterios)',
      2: '¿El par no pasa los filtros obligatorios?',
      3: 'Devuelve el resultado de las reglas (INCOMPATIBLE, puntaje 0), método REGLAS',
      4: 'Obtiene el modelo de inteligencia artificial activo',
      5: '¿No hay un modelo activo?',
      6: 'Devuelve el puntaje de las reglas fijas, método REGLAS',
      7: 'Calcula la probabilidad con el Random Forest, el nivel y los factores, y devuelve el resultado, método MODELO',
    },
    aristas: [[1, 2], [2, 3, 'V'], [2, 4, 'F'], [3, 'F'], [4, 5], [5, 6, 'V'], [5, 7, 'F'], [6, 'F'], [7, 'F']],
    caminos: [
      ['1, 2, 3, (F)', 'Hogar con niños y animal que no se lleva bien con niños.', 'El sistema marca el par como INCOMPATIBLE con puntaje 0, usa las reglas fijas y no consulta el modelo.'],
      ['1, 2, 4, 5, 6, (F)', 'Par que pasa los filtros obligatorios y no hay ningún modelo activo.', 'El sistema calcula el puntaje con las reglas fijas (método REGLAS) y no incluye el detalle del modelo.'],
      ['1, 2, 4, 5, 7, (F)', 'Par que pasa los filtros obligatorios y hay un modelo activo cuya probabilidad es 0,7234.', 'El sistema calcula el puntaje 72,34 con el modelo (método MODELO), con el nivel MEDIA y los factores que más influyeron.'],
    ],
  },
  {
    id: 'CB-HU6-B',
    hu: 'HU6',
    titulo: 'HU6. Recomendación de Compatibilidad - Asignar el nivel de compatibilidad',
    archivo: EN,
    metodo: 'levelFor',
    funcion: 'levelFor',
    anclas: [
      [1, 'if (score >= s.thresholdHigh)'],
      [2, 'if (score >= s.thresholdMedium)'],
      [3, "return 'BAJA';"],
    ],
    nodos: {
      1: '¿El puntaje alcanza el umbral alto (80)? Si es así, devuelve ALTA',
      2: '¿El puntaje alcanza el umbral medio (60)? Si es así, devuelve MEDIA',
      3: 'Devuelve BAJA',
    },
    aristas: [[1, 'F', 'V'], [1, 2, 'F'], [2, 'F', 'V'], [2, 3, 'F'], [3, 'F']],
    caminos: [
      ['1, (F)', 'Puntaje 80, igual al umbral alto.', 'El sistema asigna el nivel ALTA.'],
      ['1, 2, (F)', 'Puntaje 60, igual al umbral medio.', 'El sistema asigna el nivel MEDIA.'],
      ['1, 2, 3, (F)', 'Puntaje 59,99, por debajo del umbral medio.', 'El sistema asigna el nivel BAJA.'],
    ],
  },
  {
    id: 'CB-HU10-A',
    hu: 'HU10',
    titulo: 'HU10. Gestión de Períodos de Cuarentena - Cerrar Período',
    archivo: CS,
    metodo: 'ClinicalService.closePeriod',
    partes: ['closePeriod', 'activePeriodOrThrow'],
    anclas: [
      [1, 'const period = await this.activePeriodOrThrow(periodId);'],
      [6, 'if (new Date(dto.endDate) < period.startDate) {'],
      [7, 'if (period._count.controls === 0 &&'],
      [8, '!dto.confirmWithoutControls) {'],
      [9, 'throw new ConflictException({'],
      [10, 'const { _count } = period;'],
      [2, 'const p = await this.prisma.quarantinePeriod.findUnique({'],
      [3, "if (!p) throw new NotFoundException('Periodo no encontrado');"],
      [4, "if (p.status !== 'ACTIVO')"],
      [5, 'return p;'],
    ],
    nodos: {
      1: 'Obtiene el período activo (activePeriodOrThrow)',
      2: 'Busca el período con la cantidad de controles',
      3: '¿El período no existe?',
      4: '¿El período ya está finalizado?',
      5: 'Devuelve el período activo',
      6: '¿La fecha de fin es anterior al inicio del período?',
      7: '¿El período no tiene controles registrados?',
      8: '¿No se confirmó el cierre sin controles?',
      9: 'Lanza ConflictException que pide la confirmación',
      10: 'Cierra el período, recalcula la situación del animal y devuelve el período cerrado',
    },
    aristas: [
      [1, 2], [2, 3], [3, 'F', 'V'], [3, 4, 'F'], [4, 'F', 'V'], [4, 5, 'F'], [5, 6],
      [6, 'F', 'V'], [6, 7, 'F'], [7, 8, 'V'], [7, 10, 'F'], [8, 9, 'V'], [8, 10, 'F'], [9, 'F'], [10, 'F'],
    ],
    caminos: [
      ['1, 2, 3, (F)', 'El identificador no corresponde a ningún período.', 'El sistema lanza NotFoundException con el mensaje «Periodo no encontrado». No se modifica ningún registro.'],
      ['1, 2, 3, 4, (F)', 'Período ya finalizado.', 'El sistema lanza ConflictException con el mensaje «El periodo ya está finalizado». No se modifica ningún registro.'],
      ['1, 2, 3, 4, 5, 6, (F)', 'Período activo y fecha de fin anterior a su inicio.', 'El sistema lanza BadRequestException con el mensaje «La fecha de fin no puede ser anterior al inicio del periodo».'],
      ['1, 2, 3, 4, 5, 6, 7, 10, (F)', 'Período activo con 2 controles y fecha de fin válida.', 'El sistema cierra el período con el responsable y recalcula la situación del animal.'],
      ['1, 2, 3, 4, 5, 6, 7, 8, 9, (F)', 'Período activo sin controles y sin confirmación del cierre.', 'El sistema lanza ConflictException y pide confirmar el cierre sin controles. No se modifica ningún registro.'],
      ['1, 2, 3, 4, 5, 6, 7, 8, 10, (F)', 'Período activo sin controles, con la confirmación del cierre.', 'El sistema cierra el período y recalcula la situación del animal.'],
    ],
  },
  {
    id: 'CB-HU10-B',
    hu: 'HU10',
    titulo: 'HU10. Gestión de Períodos de Cuarentena - Habilitar para Adopción',
    archivo: AN,
    metodo: 'AnimalsService.enableAdoption',
    partes: ['enableAdoption'],
    anclas: [
      [1, 'return this.prisma.$transaction(async (tx) => {'],
      [2, "if (animal.status === 'DISPONIBLE_ADOPCION') {"],
      [3, 'const blockers = await this.status.adoptionBlockers(tx, animal);'],
      [4, 'if (blockers.length) {'],
      [5, "return this.status.changeStatus(tx, animal, 'DISPONIBLE_ADOPCION');"],
    ],
    nodos: {
      1: 'Abre la transacción y bloquea el registro del animal',
      2: '¿El animal ya está «Disponible para adopción»?',
      3: 'Reúne los impedimentos (cuarentena u observación activa, tratamiento activo, sin consultas)',
      4: '¿Hay algún impedimento?',
      5: 'Cambia el animal a «Disponible para adopción» y lo devuelve',
    },
    aristas: [[1, 2], [2, 'F', 'V'], [2, 3, 'F'], [3, 4], [4, 'F', 'V'], [4, 5, 'F'], [5, 'F']],
    caminos: [
      ['1, 2, (F)', 'Animal en la situación «Disponible para adopción».', 'El sistema lanza ConflictException con el mensaje «El animal ya está disponible para adopción».'],
      ['1, 2, 3, 4, (F)', 'Animal «En cuarentena» con la cuarentena activa.', 'El sistema lanza ConflictException con el impedimento «Tiene cuarentena activa» y no cambia la situación del animal.'],
      ['1, 2, 3, 4, 5, (F)', 'Animal «Ingresado» sin impedimentos.', 'El sistema cambia el animal a «Disponible para adopción».'],
    ],
  },
  {
    id: 'CB-HU11-A',
    hu: 'HU11',
    titulo: 'HU11. Gestionar Proceso de Adopción - Registrar la Decisión',
    archivo: AS,
    metodo: 'AdoptionsService.decide',
    partes: ['decide', 'lockRequest'],
    anclas: [
      [1, 'const decisionDate = new Date(dto.decisionDate);'],
      [2, "if (dto.result === 'APROBADA') {", 1],
      [3, 'if (!dto.deliveryDate) {'],
      [4, 'deliveryDate = new Date(dto.deliveryDate);'],
      [5, 'if (deliveryDate.getTime() < decisionDate.getTime() - 86_400_000) {'],
      [6, 'const req = await this.lockRequest(tx, id);'],
      [9, "if (req.status !== 'EN_EVALUACION') {"],
      [10, 'assertRequestTransition(req.status, dto.result);'],
      [11, "if (dto.result === 'APROBADA') {", 2],
      [12, 'const animal = await this.status.getForUpdate(tx, req.animalId);'],
      [13, 'await this.releaseAnimal(tx, req.animalId);'],
      [14, 'return updated;'],
      [7, 'await tx.$executeRaw`SELECT id FROM adoption_requests'],
      [8, "if (!req) throw new NotFoundException('Solicitud no encontrada');"],
    ],
    nodos: {
      1: 'Toma la fecha de decisión y deja la fecha de entrega vacía',
      2: '¿El resultado es APROBADA?',
      3: '¿Falta la fecha de entrega?',
      4: 'Toma la fecha de entrega',
      5: '¿La entrega es anterior a la decisión?',
      6: 'Abre la transacción y bloquea la solicitud (lockRequest)',
      7: 'Bloquea la fila y busca la solicitud',
      8: '¿La solicitud no existe?',
      9: '¿La solicitud no está en evaluación?',
      10: 'Valida la transición y guarda el resultado, las fechas y la nota con fecha y autor',
      11: '¿El resultado es APROBADA?',
      12: 'Pasa el animal a «Adoptado»',
      13: 'Devuelve el animal a «Disponible para adopción» (releaseAnimal)',
      14: 'Devuelve la solicitud actualizada',
    },
    aristas: [
      [1, 2], [2, 3, 'V'], [2, 6, 'F'], [3, 'F', 'V'], [3, 4, 'F'], [4, 5], [5, 'F', 'V'], [5, 6, 'F'],
      [6, 7], [7, 8], [8, 'F', 'V'], [8, 9, 'F'], [9, 'F', 'V'], [9, 10, 'F'], [10, 11],
      [11, 12, 'V'], [11, 13, 'F'], [12, 14], [13, 14], [14, 'F'],
    ],
    caminos: [
      ['1, 2, 6, 7, 8, 9, 10, 11, 13, 14, (F)', 'Rechazo de una solicitud en evaluación, con su motivo.', 'El sistema registra la solicitud como rechazada y devuelve el animal a «Disponible para adopción».'],
      ['1, 2, 3, (F)', 'Aprobación sin fecha de entrega.', 'El sistema lanza BadRequestException con el mensaje «La fecha de entrega es obligatoria al aprobar». No se modifica ningún registro.'],
      ['1, 2, 3, 4, 5, (F)', 'Aprobación con una fecha de entrega anterior a la decisión.', 'El sistema lanza BadRequestException con el mensaje «La fecha de entrega no puede ser anterior a la decisión». No se modifica ningún registro.'],
      ['1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, (F)', 'Aprobación de una solicitud en evaluación, con motivo y fecha de entrega.', 'El sistema registra la solicitud como aprobada, con la fecha de entrega y la nota con fecha y autor, y pasa el animal a «Adoptado».'],
      ['1, 2, 6, 7, 8, (F)', 'Rechazo de una solicitud que no existe.', 'El sistema lanza NotFoundException con el mensaje «Solicitud no encontrada».'],
      ['1, 2, 6, 7, 8, 9, (F)', 'Rechazo de una solicitud en estado Pendiente.', 'El sistema lanza ConflictException con el mensaje «Solo se puede registrar el resultado de una solicitud en evaluación (estado actual: Pendiente)».'],
      ['1, 2, 3, 4, 5, 6, 7, 8, 9, (F)', 'Aprobación de una solicitud ya rechazada.', 'El sistema lanza ConflictException y no modifica la solicitud.'],
    ],
  },
  {
    id: 'CB-HU11-B',
    hu: 'HU11',
    titulo: 'HU11. Gestionar Proceso de Adopción - Obtener el Acta de Entrega',
    archivo: AS,
    metodo: 'AdoptionsService.act',
    partes: ['act', 'approvedOrThrow'],
    anclas: [
      [1, 'await this.approvedOrThrow(id);'],
      [6, 'const req = await this.prisma.adoptionRequest.findUniqueOrThrow({'],
      [2, 'const req = await this.prisma.adoptionRequest.findUnique({ where: { id } });'],
      [3, "if (!req) throw new NotFoundException('Solicitud no encontrada');"],
      [4, "if (req.status !== 'APROBADA') {"],
      [5, 'return req;'],
    ],
    nodos: {
      1: 'Verifica que la solicitud esté aprobada (approvedOrThrow)',
      2: 'Busca la solicitud',
      3: '¿La solicitud no existe?',
      4: '¿La solicitud no está aprobada?',
      5: 'Devuelve la solicitud aprobada',
      6: 'Reúne los datos del animal, del adoptante, la entrega, el responsable y los compromisos, y devuelve el acta',
    },
    aristas: [[1, 2], [2, 3], [3, 'F', 'V'], [3, 4, 'F'], [4, 'F', 'V'], [4, 5, 'F'], [5, 6], [6, 'F']],
    caminos: [
      ['1, 2, 3, (F)', 'El identificador no corresponde a ninguna solicitud.', 'El sistema lanza NotFoundException con el mensaje «Solicitud no encontrada» y no genera el acta.'],
      ['1, 2, 3, 4, (F)', 'Solicitud en estado En evaluación.', 'El sistema lanza ConflictException con el mensaje «Disponible solo para solicitudes aprobadas» y no genera el acta.'],
      ['1, 2, 3, 4, 5, 6, (F)', 'Solicitud aprobada.', 'El sistema devuelve el acta con los datos del animal y del adoptante, la fecha de entrega, el responsable de la institución y los 7 compromisos de tenencia responsable.'],
    ],
  },
];

const jest = JSON.parse(fs.readFileSync(path.join(OUT, 'caja-blanca-resultado.json'), 'utf8'));
const estadoJest = {};
for (const suite of jest.testResults) {
  for (const t of suite.assertionResults) {
    const id = /^(CB-HU\d+-[A-Z]-C\d+)/.exec(t.title)?.[1];
    if (id) estadoJest[id] = t.status;
  }
}

const cajaBlanca = METODOS.map((m) => {
  const fuente = leer(m.archivo);
  const texto = m.funcion ? funcion(fuente, m.funcion) : m.partes.map((p) => metodo(fuente, p)).join('\n\n');
  const codigo = numerar(texto, m.anclas);

  const ids = Object.keys(m.nodos);
  const nodos = [
    { id: 'Inicio' },
    ...ids.map((id) => ({ id, descripcion: m.nodos[id] })),
    { id: 'F', descripcion: 'Fin del método' },
  ];
  const aristas = [
    { de: 'Inicio', a: '1', etiqueta: '' },
    ...m.aristas.map(([de, a, etiqueta = '']) => ({ de: String(de), a: String(a), etiqueta })),
  ];
  const Ar = m.aristas.length;
  const N = ids.length + 1;
  const P = ids.filter((id) => m.aristas.filter(([de]) => String(de) === id).length === 2).length;
  const VG = Ar - N + 2;

  return {
    id: m.id,
    hu: m.hu,
    titulo: m.titulo,
    archivo: m.archivo,
    metodo: m.metodo,
    codigo,
    nodos,
    aristas,
    // R: en un grafo plano y conexo, regiones = aristas − nodos + 2 (fórmula de Euler).
    complejidad: { A: Ar, N, P, R: VG, VG },
    caminos: m.caminos.map(([camino, entrada, salida], i) => {
      const test = `${m.id}-C${i + 1}`;
      return {
        camino,
        entrada_simulada: entrada,
        salida_esperada: salida,
        test,
        resultado: estadoJest[test] === 'passed' ? 'Aprobado' : 'Fallido',
      };
    }),
  };
});

// =====================================================================
// CAJA NEGRA
// =====================================================================

const anio = new Date().getFullYear();
const obs = (hu) => json(`caja-negra/${hu}.json`);
const todo = (o) => Object.values(o).every((v) => v !== false && v !== null);
const COND = 'El backend, el frontend y la base de datos de prueba están en funcionamiento.';

const NEGRA = [
  {
    hu: 'HU5',
    nombre: 'Prueba de HU5. Creación de Solicitud de Adopción',
    descripcion:
      'Verificar que el sistema permita al personal de Gestión de Adopciones crear una solicitud que vincule a un adoptante registrado con un animal disponible para adopción, y que la solicitud quede pendiente de evaluación y el animal pase a «En proceso de adopción».',
    precondicion: `El usuario del rol Gestión Animal y Adopciones ha iniciado sesión. Existe la adoptante Ana Lucia Torres Suarez registrada con su carnet de identidad y el animal Kira (ZOO-${anio}-0003) en la situación «Disponible para adopción», sin solicitudes en curso.`,
    condicion: `${COND} El usuario tiene permiso para crear solicitudes de adopción.`,
    pasos: [
      'Ingresar al módulo «Solicitudes» desde el menú lateral.',
      'Presionar el botón «Nueva solicitud».',
      'En «1. Adoptante», escribir el nombre en «Buscar adoptante por CI o nombre» y seleccionar a la adoptante.',
      'En «2. Animal», seleccionar el animal en la lista de animales disponibles.',
      'En «3. Revisión», revisar el puntaje de compatibilidad y completar «Notas iniciales».',
      'Presionar el botón «Crear solicitud».',
    ],
    esperado:
      'El sistema registra la solicitud, la deja pendiente de evaluación y cambia la situación del animal a «En proceso de adopción».',
    obtenido: (o) =>
      `El sistema registró la solicitud, mostró el mensaje «Solicitud creada. El animal pasó a «En proceso de adopción».» y abrió la ficha «${o.titulo}» con el estado Pendiente, el animal en la situación «En proceso de adopción» y la nota inicial registrada.`,
  },
  {
    hu: 'HU6',
    nombre: 'Prueba de HU6. Recomendación de Compatibilidad Adoptante-Animal',
    descripcion:
      'Verificar que el sistema calcule la compatibilidad de un adoptante con los animales disponibles y muestre un puntaje de 0 a 100 con su nivel, los factores que más influyeron y el aviso de que es solo una recomendación.',
    precondicion:
      'El usuario del rol Gestión Animal y Adopciones ha iniciado sesión. Existe la adoptante Carla Mendoza Rojas con su perfil de evaluación completo y hay animales disponibles para adopción. El administrador entrenó y activó el modelo de recomendación.',
    condicion: `${COND} El modelo de recomendación está activo.`,
    pasos: [
      'Ingresar al módulo «Adoptantes» desde el menú lateral.',
      'Escribir el nombre en «Buscar por CI, nombres o apellidos» y abrir la ficha de la adoptante.',
      'Presionar el botón «Ver animales recomendados».',
      'En «Animales recomendados», presionar «Desglose» en el primer animal del ranking.',
    ],
    esperado:
      'El sistema muestra el ranking de los animales disponibles, ordenado de mayor a menor compatibilidad, con un puntaje de 0 a 100 y su nivel alto, medio o bajo, explica qué factores influyeron más en el resultado y muestra el aviso de que es solo una recomendación.',
    obtenido: (o) =>
      `El sistema mostró el ranking ordenado de mayor a menor (${o.ranking.join('; ')}), cada animal con su puntaje y su nivel, y el aviso «Resultado de apoyo. La decisión final es del personal responsable.». El desglose del primer animal mostró la probabilidad calculada por el Random Forest y los factores que más influyeron, encabezados por «${o.primer_factor}», junto al análisis por criterio del motor de reglas.`,
  },
  {
    hu: 'HU10',
    nombre: 'Prueba de HU10. Gestión de Períodos de Cuarentena',
    descripcion:
      'Verificar que el sistema permita al veterinario abrir un período de cuarentena para un animal ingresado y registrar un control con su fecha, lo observado y el responsable, y que el animal pase a «En cuarentena».',
    precondicion: `El usuario del rol Personal Veterinario ha iniciado sesión. Existe el animal Simba (ZOO-${anio}-0004) en la situación «Ingresado», sin períodos abiertos ni solicitudes de adopción en curso.`,
    condicion: `${COND} El animal no tiene otro período abierto.`,
    pasos: [
      'Ingresar al módulo «Animales» y buscar el animal en «Buscar por código o nombre».',
      'Abrir la ficha del animal y presionar el botón «Iniciar cuarentena».',
      'Seleccionar el Tipo «Cuarentena», completar «Fin estimado» y «Motivo».',
      'Presionar el botón «Iniciar».',
      'Presionar la pestaña «Cuarentena» y el botón «Registrar control».',
      'Completar «Condición del animal» y «Observaciones», y presionar «Guardar».',
    ],
    esperado:
      'El sistema abre el período de cuarentena, cambia la situación del animal a «En cuarentena» y registra el control con su fecha, lo observado y el responsable.',
    obtenido: () =>
      'El sistema abrió el período, mostró el mensaje «Periodo iniciado» y cambió la situación del animal a «En cuarentena». En la pestaña «Cuarentena» mostró el período activo con su motivo y el control registrado («Estable, sin fiebre ni secreciones») con su fecha y hora y el responsable Veterinario de Prueba, junto al mensaje «Control registrado».',
  },
  {
    hu: 'HU11',
    nombre: 'Prueba de HU11. Gestionar Proceso de Adopción',
    descripcion:
      'Verificar que el sistema permita al personal de Gestión de Adopciones aprobar una solicitud en evaluación con su motivo y su fecha de entrega, que el animal pase a «Adoptado» y que se genere el acta de entrega con los datos del animal y del adoptante.',
    precondicion: `El usuario del rol Gestión Animal y Adopciones ha iniciado sesión. Existe la solicitud del animal Lola (ZOO-${anio}-0006) para la adoptante Rosa Quiroga Leon en estado En evaluación, con una observación registrada.`,
    condicion: `${COND} La solicitud está en evaluación.`,
    pasos: [
      'Ingresar al módulo «Solicitudes» desde el menú lateral y abrir la solicitud.',
      'Presionar el botón «Registrar resultado».',
      'Seleccionar el Resultado «Aprobada», completar «Fecha y hora de entrega del animal» y «Nota / fundamento».',
      'Presionar el botón «Registrar resultado».',
      'Presionar el botón «Generar acta».',
    ],
    esperado:
      'El sistema registra la aprobación con el nombre de quien la tomó, la fecha y el motivo, cambia la situación del animal a «Adoptado» y genera el acta de entrega con los datos del animal y del adoptante, la fecha de entrega, el responsable de la institución y los compromisos de tenencia responsable, lista para imprimir desde el navegador.',
    obtenido: () =>
      'El sistema registró la aprobación, mostró el mensaje «Adopción aprobada. El animal pasó a «Adoptado».» y agregó a las notas de evaluación la decisión con la fecha, el autor Gestion de Adopciones de Prueba y el motivo. El acta de adopción responsable mostró los datos del animal y de la adoptante, la fecha de entrega, el responsable de la institución, los compromisos de tenencia responsable y el botón «Imprimir acta».',
  },
];

const cajaNegra = NEGRA.map((n) => {
  const r = obs(n.hu);
  return {
    hu: n.hu,
    nombre: n.nombre,
    descripcion: n.descripcion,
    precondicion: n.precondicion,
    datos_entrada: r.datos_entrada,
    condicion_ejecucion: n.condicion,
    pasos: n.pasos,
    resultado_esperado: n.esperado,
    resultado_obtenido: n.obtenido(r.observado),
    captura_inicial: `capturas/${n.hu}-inicial.png`,
    captura_final: `capturas/${n.hu}-final.png`,
    resultado_prueba: todo(r.observado) ? 'CORRECTO' : 'INCORRECTO',
    script: `test/sprint2/e2e/${n.hu.toLowerCase()}.spec.ts`,
  };
});

// =====================================================================
// DEFECTOS Y PENDIENTES
// =====================================================================

const modelo = json('modelo.json');
const defectos = [];
const pendientes = [
  `Random Forest: el administrador lo entrenó con el mecanismo real del sistema (pantalla «Modelo de recomendación», botón «Entrenar y activar») con la semilla ${modelo.seed}. Se usaron ${modelo.datasetSize} registros: ${modelo.realSamples} solicitudes resueltas de la base de prueba (2 aprobadas y 2 rechazadas, cargadas por el seed) y ${modelo.syntheticSamples} casos sintéticos que el sistema agrega porque hay menos de 150 casos reales. Todos son datos de prueba, no adopciones reales.`,
  'Por indicación del equipo, en HU6 no se probó el criterio de aceptación 3 (marcar como incompatible un perro grande para un departamento sin patio). La prueba de caja negra de HU6 cubre los criterios 1 y 2. Los criterios 4, 5 y 6 se comprobaron en la caja blanca (CB-HU6-A) y en las pruebas unitarias (PU-HU6-05 y PU-HU6-06).',
  'Los grafos de flujo no se dibujaron en este entregable: se entregan los nodos y las aristas de cada método para dibujarlos en el documento.',
  'El valor R (regiones) de cada método se obtuvo con la fórmula de Euler para grafos planos (R = A − N + 2), no contando las regiones sobre un dibujo. Conviene comprobarlo al dibujar cada grafo.',
  'En CB-HU5-B, el nodo 8 se cuenta como decisión porque la creación de la solicitud puede terminar normalmente o lanzar una excepción que pasa al bloque catch.',
  'Las llamadas a métodos de otras clases (getForUpdate, changeStatus y adoptionBlockers de AnimalStatusService, assertRequestTransition y computeCompatibility) se representan como un solo nodo; sus decisiones internas no forman parte del grafo del método analizado. Los auxiliares privados de la misma clase que validan y cortan el flujo (activePeriodOrThrow, lockRequest y approvedOrThrow) sí se incluyeron en el código numerado.',
  'Cada prueba de caja negra tiene dos capturas de la ventana del navegador (1280 × 800). En HU11, la captura final muestra la parte superior del acta (datos del animal y de la adoptante). Los compromisos de tenencia responsable y el responsable de la institución están más abajo en la misma página; la prueba los comprobó en el texto del acta.',
  'El sistema tiene un solo rol «Gestión Animal y Adopciones», no dos roles separados de Gestión Animal y Gestión de Adopciones. Las pruebas usan la cuenta adopciones.prueba@zoonosis.test con ese rol.',
  'Los carnets de identidad de los adoptantes de prueba (9000001 SC a 9000005 SC) son ficticios.',
];

const entorno = json('entorno.json');
const resultados = {
  fecha_ejecucion: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(new Date()),
  entorno: {
    sistema_operativo: entorno.sistema_operativo,
    node: entorno.node,
    navegador: 'Chromium (Playwright)',
    base_de_datos: 'PostgreSQL 16 (base de prueba)',
  },
  caja_negra: cajaNegra,
  caja_blanca: cajaBlanca,
  defectos,
  pendientes,
};

fs.writeFileSync(path.join(OUT, 'resultados.json'), JSON.stringify(resultados, null, 2) + '\n', 'utf8');

const caminos = cajaBlanca.flatMap((m) => m.caminos);
console.log('resultados.json generado');
console.log('  caja negra :', cajaNegra.map((c) => `${c.hu}=${c.resultado_prueba}`).join('  '));
console.log('  caja blanca:', cajaBlanca.map((m) => `${m.id} V(G)=${m.complejidad.VG}`).join('  '));
console.log(
  `  caminos    : ${caminos.filter((c) => c.resultado === 'Aprobado').length} aprobados, ` +
    `${caminos.filter((c) => c.resultado === 'Fallido').length} fallidos`,
);
