/**
 * Arma docs/pruebas-sprint1/resultados.json a partir de ejecuciones reales:
 *
 *   - caja negra : lo que cada prueba de Playwright cargó y observó
 *                  (test/sprint1/evidencia/caja-negra/HUx.json)
 *   - caja blanca: el código se EXTRAE de los archivos fuente del backend y se
 *                  le insertan los números de nodo; el resultado de cada camino
 *                  sale del informe de Jest (caja-blanca-jest.json)
 *
 * Uso (desde la raíz del repositorio):  node test/sprint1/generar-resultados.js
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'docs/pruebas-sprint1');
const leer = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const EVID = path.join(__dirname, 'evidencia');
const json = (f) => JSON.parse(fs.readFileSync(path.join(EVID, f), 'utf8'));

// =====================================================================
// CAJA BLANCA
// =====================================================================

/** Devuelve el texto de un método de clase (de su firma a su llave de cierre), sin comentarios. */
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

/**
 * Inserta "(n) " delante de cada ancla. Un ancla es texto literal del código;
 * si se repite, se indica cuál aparición con [n, ancla, aparición].
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
  // Cada nodo va al inicio de su línea: si quedó en medio (condición compuesta
  // u operador ternario), se parte la línea ahí. Es solo formato; el código no cambia.
  // Además se pasa la sangría de 2 a 4 espacios.
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

const A = 'backend/src/modules/animals/animals.service.ts';
const C = 'backend/src/modules/clinical/clinical.service.ts';
const AU = 'backend/src/modules/auth/auth.service.ts';
const U = 'backend/src/modules/users/users.service.ts';

// aristas: [de, a, etiqueta]   caminos: [camino, entrada simulada, salida esperada]
const METODOS = [
  {
    id: 'CB-HU1-A',
    hu: 'HU1',
    titulo: 'HU1. Gestión de Animal - Registrar Animal',
    archivo: A,
    metodo: 'AnimalsService.create',
    partes: ['create', 'nextCode'],
    anclas: [
      [1, 'return this.prisma.$transaction(async (tx) => {'],
      [7, 'const animal = await tx.animal.create({'],
      [2, 'await tx.$executeRaw'],
      [3, 'const next = last'],
      [4, '? Number(last.code.slice(prefix.length)) + 1'],
      [5, ': 1;'],
      [6, 'return `${prefix}'],
    ],
    nodos: {
      1: 'Abre la transacción y pide el siguiente código (nextCode)',
      2: 'Toma el bloqueo, calcula el prefijo del año y busca el último código',
      3: '¿Existe un código registrado este año?',
      4: 'Siguiente = número del último código + 1',
      5: 'Siguiente = 1',
      6: 'Devuelve el código con el formato ZOO-AAAA-NNNN',
      7: 'Crea el animal con el código y la situación INGRESADO, y lo devuelve',
    },
    aristas: [[1, 2], [2, 3], [3, 4, 'V'], [3, 5, 'F'], [4, 6], [5, 6], [6, 7], [7, 'F']],
    caminos: [
      [
        '1, 2, 3, 4, 6, 7, (F)',
        'Ya existe un animal registrado en el año en curso; el último código es ZOO-AAAA-0007.',
        'El sistema asigna el código ZOO-AAAA-0008, registra el animal con la situación «Ingresado» y devuelve el animal creado.',
      ],
      [
        '1, 2, 3, 5, 6, 7, (F)',
        'No existe ningún animal registrado en el año en curso (último código = null).',
        'El sistema asigna el código ZOO-AAAA-0001, registra el animal con la situación «Ingresado» y devuelve el animal creado.',
      ],
    ],
  },
  {
    id: 'CB-HU1-B',
    hu: 'HU1',
    titulo: 'HU1. Gestión de Animal - Editar Animal',
    archivo: A,
    metodo: 'AnimalsService.update',
    partes: ['update', 'getOrThrow'],
    anclas: [
      [1, 'const current = await this.getOrThrow(id);'],
      [3, 'const isFinal = OUTSIDE_STATES.includes(current.status);'],
      [4, 'if (isFinal) {'],
      [5, 'const forbidden = provided'],
      [6, 'if (forbidden.length) {'],
      [7, 'const data: Prisma.AnimalUpdateInput = Object.fromEntries('],
      [8, 'if (dto.entryDate)'],
      [9, 'data.entryDate = new Date(dto.entryDate);'],
      [10, 'return this.prisma.$transaction(async (tx) => {'],
      [2, "if (!animal) throw new NotFoundException('Animal no encontrado');"],
    ],
    nodos: {
      1: 'Busca el animal (getOrThrow)',
      2: '¿El animal no existe?',
      3: 'Determina si el animal salió de la institución y reúne los campos enviados',
      4: '¿El animal está en una situación final (Adoptado, Fallecido o Devuelto)?',
      5: 'Reúne los campos enviados que no son notas',
      6: '¿Se envió algún campo que no es una nota?',
      7: 'Arma los datos por actualizar',
      8: '¿Se envió la fecha de ingreso?',
      9: 'Convierte la fecha de ingreso',
      10: 'Actualiza el animal y lo devuelve',
    },
    aristas: [
      [1, 2], [2, 'F', 'V'], [2, 3, 'F'], [3, 4], [4, 5, 'V'], [4, 7, 'F'], [5, 6],
      [6, 'F', 'V'], [6, 7, 'F'], [7, 8], [8, 9, 'V'], [8, 10, 'F'], [9, 10], [10, 'F'],
    ],
    caminos: [
      [
        '1, 2, (F)',
        'Identificador de un animal que no existe (animal = null).',
        'El sistema rechaza la edición y lanza NotFoundException con el mensaje «Animal no encontrado». No se actualiza ningún registro.',
      ],
      [
        '1, 2, 3, 4, 7, 8, 10, (F)',
        'Animal en la situación «Ingresado»; se envía solo el nombre.',
        'El sistema actualiza el nombre del animal y devuelve el animal actualizado.',
      ],
      [
        '1, 2, 3, 4, 7, 8, 9, 10, (F)',
        'Animal en la situación «Ingresado»; se envía la fecha de ingreso.',
        'El sistema convierte la fecha de ingreso, actualiza el animal y lo devuelve.',
      ],
      [
        '1, 2, 3, 4, 5, 6, (F)',
        'Animal en la situación «Adoptado»; se intenta cambiar el nombre.',
        'El sistema rechaza la edición y lanza ConflictException: en una situación final solo se pueden editar las notas. No se actualiza ningún registro.',
      ],
      [
        '1, 2, 3, 4, 5, 6, 7, 8, 10, (F)',
        'Animal en la situación «Adoptado»; se envían solo las notas de salida.',
        'El sistema actualiza las notas de salida y devuelve el animal actualizado.',
      ],
    ],
  },
  {
    id: 'CB-HU1-C',
    hu: 'HU1',
    titulo: 'HU1. Gestión de Animal - Subir o Reemplazar la Fotografía',
    archivo: A,
    metodo: 'AnimalsService.savePhoto',
    partes: ['savePhoto', 'getOrThrow'],
    anclas: [
      [1, 'if (!file) throw'],
      [2, 'if (file.size > MAX_PHOTO_BYTES) throw'],
      [3, 'const ext = detectImageType(file.buffer);'],
      [4, 'if (!ext) throw'],
      [5, 'const current = await this.getOrThrow(id);'],
      [7, 'const photoUrl = await this.storage.put('],
      [6, "if (!animal) throw new NotFoundException('Animal no encontrado');"],
    ],
    nodos: {
      1: '¿No se adjuntó ningún archivo?',
      2: '¿El archivo supera los 5 MB?',
      3: 'Detecta el formato por el contenido del archivo',
      4: '¿El formato no es JPG, PNG ni WEBP?',
      5: 'Busca el animal (getOrThrow)',
      6: '¿El animal no existe?',
      7: 'Guarda la foto nueva, actualiza el animal, elimina la foto anterior y devuelve el animal',
    },
    aristas: [
      [1, 'F', 'V'], [1, 2, 'F'], [2, 'F', 'V'], [2, 3, 'F'], [3, 4], [4, 'F', 'V'], [4, 5, 'F'],
      [5, 6], [6, 'F', 'V'], [6, 7, 'F'], [7, 'F'],
    ],
    caminos: [
      [
        '1, (F)',
        'No se adjunta ningún archivo (file = undefined).',
        'El sistema rechaza la carga y lanza BadRequestException con el mensaje «Debes adjuntar una foto». No se guarda ningún archivo.',
      ],
      [
        '1, 2, (F)',
        'Archivo de 5 MB más un byte.',
        'El sistema rechaza la carga y lanza BadRequestException con el mensaje «La foto supera los 5 MB». No se guarda ningún archivo.',
      ],
      [
        '1, 2, 3, 4, (F)',
        'Archivo cuyo contenido es un PDF (no es JPG, PNG ni WEBP).',
        'El sistema rechaza la carga y lanza BadRequestException con el mensaje «Formato no permitido. Usa JPG, PNG o WEBP». No se guarda ningún archivo.',
      ],
      [
        '1, 2, 3, 4, 5, 6, (F)',
        'Archivo JPG válido; identificador de un animal que no existe.',
        'El sistema lanza NotFoundException con el mensaje «Animal no encontrado». No se guarda ningún archivo.',
      ],
      [
        '1, 2, 3, 4, 5, 6, 7, (F)',
        'Archivo JPG válido de menos de 5 MB; el animal existe y ya tenía una foto.',
        'El sistema guarda la foto nueva, la asocia al animal, elimina la foto anterior y devuelve el animal actualizado.',
      ],
    ],
  },
  {
    id: 'CB-HU2-A',
    hu: 'HU2',
    titulo: 'HU2. Registro de Consulta Clínica - Registrar Consulta',
    archivo: C,
    metodo: 'ClinicalService.createConsultation',
    partes: ['createConsultation', 'animalOrThrow', 'assertAcceptsRecords'],
    anclas: [
      [1, 'const animal = await this.animalOrThrow(animalId);'],
      [3, 'this.assertAcceptsRecords(animal);'],
      [5, 'return this.prisma.$transaction(async (tx) => {'],
      [2, "if (!animal) throw new NotFoundException('Animal no encontrado');"],
      [4, 'if (NO_CLINICAL_RECORDS_STATES.includes(animal.status)) {'],
    ],
    nodos: {
      1: 'Busca el animal (animalOrThrow)',
      2: '¿El animal no existe?',
      3: 'Verifica si el animal admite registros clínicos (assertAcceptsRecords)',
      4: '¿El animal salió de la institución (Adoptado, Fallecido o Devuelto)?',
      5: 'Registra la consulta con el animal, el veterinario y la fecha, y la devuelve',
    },
    aristas: [[1, 2], [2, 'F', 'V'], [2, 3, 'F'], [3, 4], [4, 'F', 'V'], [4, 5, 'F'], [5, 'F']],
    caminos: [
      [
        '1, 2, (F)',
        'Identificador de un animal que no existe (animal = null).',
        'El sistema rechaza el registro y lanza NotFoundException con el mensaje «Animal no encontrado». No se crea la consulta.',
      ],
      [
        '1, 2, 3, 4, (F)',
        'Animal en la situación «Adoptado».',
        'El sistema rechaza el registro y lanza ConflictException: no se pueden registrar datos clínicos de un animal que salió de la institución. No se crea la consulta.',
      ],
      [
        '1, 2, 3, 4, 5, (F)',
        'Animal en la situación «Ingresado»; datos de la consulta válidos.',
        'El sistema registra la consulta, guarda automáticamente el veterinario que la realiza y la fecha, y devuelve la consulta creada.',
      ],
    ],
  },
  {
    id: 'CB-HU3-A',
    hu: 'HU3',
    titulo: 'HU3. Gestionar Historial Clínico - Corregir un Registro Clínico',
    archivo: C,
    metodo: 'ClinicalService.updateConsultation',
    partes: ['updateConsultation', 'assertCanEdit'],
    anclas: [
      [1, 'const current = await this.prisma.veterinaryConsultation.findUnique({'],
      [2, "if (!current) throw new NotFoundException('Consulta no encontrada');"],
      [3, 'this.assertCanEdit(current.veterinarianId, user);'],
      [6, '...(dto.consultationDate'],
      [7, '? { consultationDate: new Date(dto.consultationDate) }'],
      [8, ': {}),'],
      [9, 'return updated;'],
      [4, "if (user.role !== 'ADMIN'"],
      [5, '&& user.id !== authorId) {'],
    ],
    nodos: {
      1: 'Busca la consulta',
      2: '¿La consulta no existe?',
      3: 'Verifica quién puede corregir el registro (assertCanEdit)',
      4: '¿El usuario no es administrador?',
      5: '¿El usuario no es el veterinario autor?',
      6: 'Abre la transacción. ¿Se envió una nueva fecha de consulta?',
      7: 'Convierte la nueva fecha de consulta',
      8: 'No modifica la fecha de consulta',
      9: 'Actualiza la consulta y la devuelve',
    },
    aristas: [
      [1, 2], [2, 'F', 'V'], [2, 3, 'F'], [3, 4], [4, 5, 'V'], [4, 6, 'F'], [5, 'F', 'V'],
      [5, 6, 'F'], [6, 7, 'V'], [6, 8, 'F'], [7, 9], [8, 9], [9, 'F'],
    ],
    caminos: [
      [
        '1, 2, (F)',
        'Identificador de una consulta que no existe (current = null).',
        'El sistema lanza NotFoundException con el mensaje «Consulta no encontrada». No se modifica ningún registro.',
      ],
      [
        '1, 2, 3, 4, 6, 8, 9, (F)',
        'Usuario administrador; se corrige el motivo, sin cambiar la fecha.',
        'El sistema permite la corrección, actualiza el motivo de la consulta y devuelve la consulta actualizada.',
      ],
      [
        '1, 2, 3, 4, 5, (F)',
        'Usuario veterinario que no es el autor de la consulta.',
        'El sistema rechaza la corrección y lanza ForbiddenException: solo el veterinario autor o un administrador puede corregir el registro. No se modifica la consulta.',
      ],
      [
        '1, 2, 3, 4, 5, 6, 8, 9, (F)',
        'Usuario veterinario autor de la consulta; se corrigen las observaciones, sin cambiar la fecha.',
        'El sistema permite la corrección, actualiza las observaciones y devuelve la consulta actualizada.',
      ],
      [
        '1, 2, 3, 4, 6, 7, 9, (F)',
        'Usuario administrador; se corrige la fecha de la consulta.',
        'El sistema convierte la nueva fecha, actualiza la consulta y la devuelve.',
      ],
    ],
  },
  {
    id: 'CB-HU4-A',
    hu: 'HU4',
    titulo: 'HU4. Gestión de Vacunación - Registrar Vacuna',
    archivo: C,
    metodo: 'ClinicalService.createVaccination',
    partes: ['createVaccination', 'animalOrThrow', 'assertAcceptsRecords', 'assertDateOrder'],
    anclas: [
      [1, 'const animal = await this.animalOrThrow(animalId);'],
      [3, 'this.assertAcceptsRecords(animal);'],
      [5, 'this.assertDateOrder('],
      [8, 'const vaccine = await this.prisma.vaccine.findUnique({'],
      [9, 'if (!vaccine) throw'],
      [10, 'if (!vaccine.isActive)'],
      [11, 'const warnings = vaccine.species.includes(animal.species)'],
      [12, '? []'],
      [13, ': [`La vacuna'],
      [14, 'nextDoseDate: dto.nextDoseDate'],
      [15, '? toDateOnly(dto.nextDoseDate)'],
      [16, ': null,'],
      [17, 'return { ...vaccination, warnings };'],
      [2, "if (!animal) throw new NotFoundException('Animal no encontrado');"],
      [4, 'if (NO_CLINICAL_RECORDS_STATES.includes(animal.status)) {'],
      [6, 'if (end'],
      [7, '&& toDateOnly(end) < toDateOnly(start)) throw new BadRequestException(msg);'],
    ],
    nodos: {
      1: 'Busca el animal (animalOrThrow)',
      2: '¿El animal no existe?',
      3: 'Verifica si el animal admite registros clínicos (assertAcceptsRecords)',
      4: '¿El animal salió de la institución?',
      5: 'Verifica el orden de las fechas (assertDateOrder)',
      6: '¿Se envió la fecha de la próxima dosis?',
      7: '¿La próxima dosis es anterior a la fecha de aplicación?',
      8: 'Busca la vacuna en el catálogo',
      9: '¿La vacuna no existe en el catálogo?',
      10: '¿La vacuna está dada de baja?',
      11: '¿La vacuna está indicada para la especie del animal?',
      12: 'Sin advertencias',
      13: 'Agrega la advertencia de especie no indicada',
      14: 'Abre la transacción. ¿Se envió la fecha de la próxima dosis?',
      15: 'Convierte la fecha de la próxima dosis',
      16: 'Deja la próxima dosis vacía (null)',
      17: 'Registra la vacunación y la devuelve con las advertencias',
    },
    aristas: [
      [1, 2], [2, 'F', 'V'], [2, 3, 'F'], [3, 4], [4, 'F', 'V'], [4, 5, 'F'], [5, 6],
      [6, 7, 'V'], [6, 8, 'F'], [7, 'F', 'V'], [7, 8, 'F'], [8, 9], [9, 'F', 'V'], [9, 10, 'F'],
      [10, 'F', 'V'], [10, 11, 'F'], [11, 12, 'V'], [11, 13, 'F'], [12, 14], [13, 14],
      [14, 15, 'V'], [14, 16, 'F'], [15, 17], [16, 17], [17, 'F'],
    ],
    caminos: [
      [
        '1, 2, (F)',
        'Identificador de un animal que no existe (animal = null).',
        'El sistema lanza NotFoundException con el mensaje «Animal no encontrado». No se registra la vacuna.',
      ],
      [
        '1, 2, 3, 4, (F)',
        'Animal en la situación «Fallecido».',
        'El sistema rechaza el registro y lanza ConflictException: no se pueden registrar datos clínicos de un animal que salió de la institución.',
      ],
      [
        '1, 2, 3, 4, 5, 6, 7, (F)',
        'Fecha de la próxima dosis anterior a la fecha de aplicación.',
        'El sistema rechaza el registro y lanza BadRequestException con el mensaje «La próxima dosis no puede ser anterior a la fecha de aplicación».',
      ],
      [
        '1, 2, 3, 4, 5, 6, 8, 9, (F)',
        'Sin fecha de próxima dosis; identificador de una vacuna que no existe (vaccine = null).',
        'El sistema rechaza el registro y lanza BadRequestException con el mensaje «La vacuna no existe en el catálogo».',
      ],
      [
        '1, 2, 3, 4, 5, 6, 8, 9, 10, (F)',
        'Sin fecha de próxima dosis; la vacuna existe pero está dada de baja (isActive = false).',
        'El sistema rechaza el registro y lanza BadRequestException con el mensaje «La vacuna está desactivada en el catálogo». No se registra la vacuna.',
      ],
      [
        '1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 14, 16, 17, (F)',
        'Perro; vacuna activa indicada para perros; sin fecha de próxima dosis.',
        'El sistema registra la vacunación sin advertencias, con la próxima dosis vacía, y guarda el veterinario que la aplica.',
      ],
      [
        '1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 13, 14, 16, 17, (F)',
        'Perro; vacuna activa indicada solo para gatos; sin fecha de próxima dosis.',
        'El sistema registra la vacunación igualmente y devuelve una advertencia: la vacuna no está indicada para la especie del animal.',
      ],
      [
        '1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 17, (F)',
        'Perro; vacuna activa indicada para perros; fecha de próxima dosis posterior a la aplicación.',
        'El sistema registra la vacunación sin advertencias y guarda la fecha de la próxima dosis.',
      ],
      [
        '1, 2, 3, 4, 5, 6, 7, 8, 9, (F)',
        'Fecha de próxima dosis posterior a la aplicación; identificador de una vacuna que no existe.',
        'El sistema acepta el orden de las fechas, no encuentra la vacuna y lanza BadRequestException con el mensaje «La vacuna no existe en el catálogo».',
      ],
    ],
  },
  {
    id: 'CB-HU8-A',
    hu: 'HU8',
    titulo: 'HU8. Gestión de Usuario - Iniciar Sesión',
    archivo: AU,
    metodo: 'AuthService.login',
    partes: ['login'],
    anclas: [
      [1, 'const user = await this.prisma.user.findUnique({'],
      [2, 'if (!user) throw new UnauthorizedException(INVALID_CREDENTIALS);'],
      [3, 'const now = new Date();'],
      [4, 'if (user.lockedUntil'],
      [5, '&& user.lockedUntil > now) {'],
      [6, 'const ok = await bcrypt.compare(password, user.passwordHash);'],
      [7, 'if (!ok) {'],
      [8, 'const attempts = user.failedAttempts + 1;'],
      [9, 'if (attempts >= MAX_FAILED_ATTEMPTS) {'],
      [10, 'const lockedUntil = new Date(now.getTime() + LOCK_MINUTES * 60_000);'],
      [11, 'await this.prisma.user.update({', 2],
      [12, 'if (!user.isActive) throw new ForbiddenException(ACCOUNT_DISABLED);'],
      [13, 'const session = await this.issueSession(user, {'],
    ],
    nodos: {
      1: 'Busca el usuario por su email',
      2: '¿El usuario no existe?',
      3: 'Toma la fecha y hora actual',
      4: '¿La cuenta tiene una fecha de bloqueo?',
      5: '¿El bloqueo sigue vigente?',
      6: 'Compara la contraseña con la almacenada',
      7: '¿La contraseña es incorrecta?',
      8: 'Suma un intento fallido',
      9: '¿Se alcanzaron los 5 intentos fallidos?',
      10: 'Bloquea la cuenta 10 minutos y rechaza el ingreso',
      11: 'Guarda la cantidad de intentos fallidos y rechaza el ingreso',
      12: '¿La cuenta está desactivada?',
      13: 'Emite la sesión (tokens) y la devuelve',
    },
    aristas: [
      [1, 2], [2, 'F', 'V'], [2, 3, 'F'], [3, 4], [4, 5, 'V'], [4, 6, 'F'], [5, 'F', 'V'],
      [5, 6, 'F'], [6, 7], [7, 8, 'V'], [7, 12, 'F'], [8, 9], [9, 10, 'V'], [9, 11, 'F'],
      [10, 'F'], [11, 'F'], [12, 'F', 'V'], [12, 13, 'F'], [13, 'F'],
    ],
    caminos: [
      [
        '1, 2, (F)',
        'Email no registrado (user = null).',
        'El sistema rechaza el ingreso y lanza UnauthorizedException con el mensaje «Credenciales inválidas». No se emite ninguna sesión.',
      ],
      [
        '1, 2, 3, 4, 6, 7, 12, 13, (F)',
        'Email registrado, contraseña correcta, cuenta activa y sin bloqueo.',
        'El sistema emite la sesión, reinicia el contador de intentos fallidos y devuelve los datos del usuario.',
      ],
      [
        '1, 2, 3, 4, 5, (F)',
        'Cuenta con un bloqueo que vence dentro de 5 minutos.',
        'El sistema rechaza el ingreso con el código 429 e informa que la cuenta está bloqueada por intentos fallidos. No compara la contraseña.',
      ],
      [
        '1, 2, 3, 4, 5, 6, 7, 12, 13, (F)',
        'Cuenta cuyo bloqueo ya venció; contraseña correcta.',
        'El sistema permite el ingreso, emite la sesión y devuelve los datos del usuario.',
      ],
      [
        '1, 2, 3, 4, 6, 7, 8, 9, 11, (F)',
        'Contraseña incorrecta; la cuenta tiene 2 intentos fallidos previos.',
        'El sistema registra el tercer intento fallido y lanza UnauthorizedException con el mensaje «Credenciales inválidas».',
      ],
      [
        '1, 2, 3, 4, 6, 7, 8, 9, 10, (F)',
        'Contraseña incorrecta; la cuenta tiene 4 intentos fallidos previos (quinto intento).',
        'El sistema bloquea la cuenta durante 10 minutos, reinicia el contador y rechaza el ingreso con el código 429.',
      ],
      [
        '1, 2, 3, 4, 6, 7, 12, (F)',
        'Contraseña correcta; la cuenta está desactivada (isActive = false).',
        'El sistema rechaza el ingreso y lanza ForbiddenException con el mensaje «Cuenta desactivada, contacta al administrador». No se emite ninguna sesión.',
      ],
    ],
  },
  {
    id: 'CB-HU8-B',
    hu: 'HU8',
    titulo: 'HU8. Gestión de Usuario - Activar o Desactivar Usuario',
    archivo: U,
    metodo: 'UsersService.setActive',
    partes: ['setActive', 'getOrThrow'],
    anclas: [
      [1, 'if (id === actor.id'],
      [2, '&& !isActive) {'],
      [3, 'await this.getOrThrow(id);'],
      [5, 'data: isActive'],
      [6, '? { isActive: true, failedAttempts: 0, lockedUntil: null }'],
      [7, ': { isActive: false, refreshTokenHash: null },'],
      [8, 'return toPublicUser(updated);'],
      [4, "if (!user) throw new NotFoundException('Usuario no encontrado');"],
    ],
    nodos: {
      1: '¿El usuario a modificar es el mismo que ejecuta la acción?',
      2: '¿La acción es desactivar?',
      3: 'Busca el usuario (getOrThrow)',
      4: '¿El usuario no existe?',
      5: 'Abre la transacción. ¿La acción es activar?',
      6: 'Activa la cuenta y limpia los intentos fallidos y el bloqueo',
      7: 'Desactiva la cuenta e invalida su sesión',
      8: 'Devuelve el usuario actualizado',
    },
    aristas: [
      [1, 2, 'V'], [1, 3, 'F'], [2, 'F', 'V'], [2, 3, 'F'], [3, 4], [4, 'F', 'V'], [4, 5, 'F'],
      [5, 6, 'V'], [5, 7, 'F'], [6, 8], [7, 8], [8, 'F'],
    ],
    caminos: [
      [
        '1, 3, 4, (F)',
        'Identificador de otro usuario que no existe (user = null).',
        'El sistema lanza NotFoundException con el mensaje «Usuario no encontrado». No se modifica ninguna cuenta.',
      ],
      [
        '1, 3, 4, 5, 7, 8, (F)',
        'El administrador desactiva la cuenta de otro usuario.',
        'El sistema desactiva la cuenta, invalida la sesión del usuario y devuelve el usuario actualizado.',
      ],
      [
        '1, 3, 4, 5, 6, 8, (F)',
        'El administrador activa la cuenta de otro usuario.',
        'El sistema activa la cuenta, limpia los intentos fallidos y el bloqueo, y devuelve el usuario actualizado.',
      ],
      [
        '1, 2, (F)',
        'El administrador intenta desactivar su propia cuenta.',
        'El sistema rechaza la acción y lanza BadRequestException con el mensaje «No puedes desactivar tu propia cuenta». No se consulta ni se modifica ninguna cuenta.',
      ],
      [
        '1, 2, 3, 4, 5, 6, 8, (F)',
        'El administrador activa su propia cuenta.',
        'El sistema permite la acción, activa la cuenta y devuelve el usuario actualizado.',
      ],
    ],
  },
  {
    id: 'CB-HU8-C',
    hu: 'HU8',
    titulo: 'HU8. Gestión de Usuario - Crear Usuario',
    archivo: U,
    metodo: 'UsersService.create',
    partes: ['create', 'assertEmailFree'],
    anclas: [
      [1, 'await this.assertEmailFree(dto.email);'],
      [3, 'const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);'],
      [2, "if (exists) throw new ConflictException('El email ya está registrado');"],
    ],
    nodos: {
      1: 'Busca si el email ya está registrado (assertEmailFree)',
      2: '¿El email ya está registrado?',
      3: 'Cifra la contraseña temporal, crea la cuenta con su rol y la devuelve',
    },
    aristas: [[1, 2], [2, 'F', 'V'], [2, 3, 'F'], [3, 'F']],
    caminos: [
      [
        '1, 2, (F)',
        'Email que ya pertenece a otra cuenta.',
        'El sistema rechaza la creación y lanza ConflictException con el mensaje «El email ya está registrado». No se crea la cuenta.',
      ],
      [
        '1, 2, 3, (F)',
        'Email libre, rol Personal Veterinario y contraseña temporal válida.',
        'El sistema crea la cuenta con el rol indicado, guarda la contraseña cifrada y devuelve el usuario sin exponer la contraseña.',
      ],
    ],
  },
];

// Resultado real de cada prueba de Jest, por su identificador (CB-HU1-A-C1, ...).
const jest = json('caja-blanca-jest.json');
const estadoJest = {};
for (const suite of jest.testResults) {
  for (const t of suite.assertionResults) {
    const id = /^(CB-HU\d+-[A-Z]-C\d+)/.exec(t.title)?.[1];
    if (id) estadoJest[id] = t.status;
  }
}

const cajaBlanca = METODOS.map((m) => {
  const fuente = leer(m.archivo);
  const codigo = numerar(m.partes.map((p) => metodo(fuente, p)).join('\n\n'), m.anclas);

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

  // Complejidad, sin contar Inicio ni su arista.
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
    // R: en un grafo plano y conexo, regiones = aristas − nodos + 2.
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

const NEGRA = [
  {
    hu: 'HU1',
    nombre: 'Prueba de HU1. Gestión de Animal',
    descripcion:
      'Verificar que el sistema permita al personal de Gestión Animal registrar un animal nuevo con su fotografía, le asigne automáticamente un código único y lo deje en la situación «Ingresado».',
    precondicion:
      'El usuario del rol Gestión Animal y Adopciones ha iniciado sesión. Se dispone de una fotografía JPG de menos de 5 MB.',
    condicion:
      'El backend, el frontend y la base de datos de prueba están en funcionamiento. El usuario tiene permiso para registrar animales.',
    pasos: [
      'Ingresar al módulo «Animales» desde el menú lateral.',
      'Presionar el botón «Registrar animal».',
      'Completar los campos de «Datos generales»: Nombre, Especie, Raza, Sexo, Edad aproximada (meses), Color, Tamaño, Fecha de ingreso y Motivo de ingreso.',
      'Completar los campos de «Comportamiento y necesidades»: Nivel de energía (1–5), Horas diarias de atención requeridas, Se lleva bien con niños y Temperamento.',
      'En la sección «Foto», presionar «Seleccionar foto» y elegir la fotografía.',
      'Presionar el botón «Registrar animal».',
    ],
    esperado:
      'El sistema registra el animal, le asigna automáticamente un código único, lo deja en la situación «Ingresado» y muestra su ficha con la fotografía adjunta.',
    obtenido: (o) =>
      `El sistema registró el animal, le asignó automáticamente el código ${o.codigo}, lo dejó en la situación «Ingresado» y mostró su ficha con la fotografía adjunta y el mensaje «Animal registrado».`,
  },
  {
    hu: 'HU2',
    nombre: 'Prueba de HU2. Registro de Consulta Clínica',
    descripcion:
      'Verificar que el sistema permita al veterinario registrar una consulta clínica con signos vitales válidos, un diagnóstico y un tratamiento con un medicamento, y que guarde automáticamente el veterinario, la fecha y la hora.',
    precondicion: `El usuario del rol Personal Veterinario ha iniciado sesión. Existe el animal Toby (ZOO-${anio}-0001) en la situación «Ingresado».`,
    condicion:
      'El backend, el frontend y la base de datos de prueba están en funcionamiento. El animal no ha salido de la institución.',
    pasos: [
      'Ingresar al módulo «Animales» y buscar el animal por su nombre.',
      'Abrir la ficha del animal y presionar el botón «Nueva consulta».',
      'Completar los campos Motivo, Peso (kg), Temperatura (°C) y Evaluación clínica.',
      'Presionar «Agregar diagnóstico» y completar la Descripción.',
      'Presionar «Agregar tratamiento» y completar la Descripción y las Instrucciones.',
      'Presionar «Agregar medicamento» y completar Nombre, Dosis, Vía, Frecuencia y Duración.',
      'Presionar el botón «Guardar consulta».',
    ],
    esperado:
      'El sistema registra la consulta con sus signos vitales, el diagnóstico y el tratamiento con su medicamento, y guarda automáticamente el veterinario que la realiza, la fecha y la hora.',
    obtenido: (o) =>
      `El sistema registró la consulta con el peso y la temperatura ingresados, el diagnóstico y el tratamiento con su medicamento, y mostró el detalle con el veterinario Veterinario de Prueba y la fecha y hora ${o.fecha_hora}, junto al mensaje «Consulta registrada».`,
  },
  {
    hu: 'HU3',
    nombre: 'Prueba de HU3. Gestionar Historial Clínico',
    descripcion:
      'Verificar que el sistema muestre en un solo historial las consultas, las vacunas y los tratamientos de un animal, ordenados del más reciente al más antiguo, con la fecha, el tipo y el profesional de cada registro.',
    precondicion: `El usuario del rol Personal Veterinario ha iniciado sesión. Existe el animal Max (ZOO-${anio}-0004) con dos consultas, dos vacunas y un tratamiento registrados en fechas distintas.`,
    condicion:
      'El backend, el frontend y la base de datos de prueba están en funcionamiento. El usuario ha iniciado sesión.',
    pasos: [
      'Ingresar al módulo «Animales» y buscar el animal por su nombre.',
      'Abrir la ficha del animal.',
      'Presionar la pestaña «Historial clínico».',
    ],
    esperado:
      'El sistema muestra en un solo historial las consultas, las vacunas y los tratamientos del animal, ordenados del más reciente al más antiguo. Cada registro muestra su fecha, su tipo y el profesional que lo realizó.',
    obtenido: (o) =>
      `El sistema mostró ${o.cantidad_registros} registros en un solo historial, ordenados del más reciente al más antiguo: ${o.orden_mostrado.join('; ')}. Cada registro mostró su fecha, su tipo y el profesional que lo realizó, y el tratamiento se mostró dentro de su consulta.`,
  },
  {
    hu: 'HU4',
    nombre: 'Prueba de HU4. Gestión de Vacunación',
    descripcion:
      'Verificar que el sistema permita al veterinario registrar una vacuna con su fecha de aplicación, su lote y su próxima dosis, y que el aviso de próximas dosis muestre los animales cuya dosis vence en los próximos 7 días.',
    precondicion: `El usuario del rol Personal Veterinario ha iniciado sesión. Existe el animal Canela (ZOO-${anio}-0006) en la situación «Ingresado» y la vacuna Antirrabica activa en el catálogo.`,
    condicion:
      'El backend, el frontend y la base de datos de prueba están en funcionamiento. La vacuna no está dada de baja y el animal no ha salido de la institución.',
    pasos: [
      'Ingresar al módulo «Animales» y abrir la ficha del animal.',
      'Presionar la pestaña «Vacunas» y luego el botón «Nueva vacuna».',
      'Seleccionar la Vacuna y completar Fecha de aplicación, Dosis, Lote y Próxima dosis.',
      'Presionar el botón «Registrar».',
      'Ingresar al módulo «Vacunas» desde el menú lateral.',
      'En la pestaña «Próximas a vencer», seleccionar «Próximos 7 días».',
    ],
    esperado:
      'El sistema registra la vacuna con su fecha de aplicación, su lote y su próxima dosis, y el aviso muestra los animales cuya próxima dosis vence en los próximos 7 días, considerando solo la última vacuna aplicada y excluyendo a los animales que salieron de la institución.',
    obtenido: (o) =>
      `El sistema registró la vacuna con el lote ${o.lote_registrado} y su próxima dosis, y mostró el mensaje «Vacuna registrada». El aviso de los próximos 7 días mostró a Canela y a Nala, y no mostró a Max (su última dosis no tiene próxima fecha) ni a Rocky (animal adoptado).`,
  },
  {
    hu: 'HU8',
    nombre: 'Prueba de HU8. Gestión de Usuario',
    descripcion:
      'Verificar que el sistema permita al administrador crear una cuenta con un rol y una contraseña temporal, y que el nuevo usuario pueda iniciar sesión y ver el menú que corresponde a su rol.',
    precondicion:
      'El usuario del rol Administrador ha iniciado sesión. No existe ninguna cuenta con el email que se va a registrar.',
    condicion:
      'El backend, el frontend y la base de datos de prueba están en funcionamiento. El usuario tiene permiso para administrar cuentas.',
    pasos: [
      'Ingresar al módulo «Usuarios» desde el menú lateral.',
      'Presionar el botón «Nuevo usuario».',
      'Completar Nombre completo, Email, Rol y Contraseña temporal.',
      'Presionar el botón «Crear usuario».',
      'En una sesión nueva, ingresar el Email y la Contraseña de la cuenta creada y presionar «Iniciar sesión».',
    ],
    esperado:
      'El sistema crea la cuenta con el rol asignado y la contraseña temporal. El nuevo usuario inicia sesión y el sistema muestra su pantalla principal con el menú que corresponde a su rol.',
    obtenido: (o) =>
      `El sistema creó la cuenta y mostró el mensaje «Usuario creado». El nuevo usuario inició sesión y el sistema mostró su pantalla principal con el menú del rol Personal Veterinario: ${o.menu_del_rol.join(', ')}. El menú no incluyó el módulo «Usuarios».`,
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
    script: `test/sprint1/e2e/${n.hu.toLowerCase()}.spec.ts`,
  };
});

// =====================================================================
// DEFECTOS Y PENDIENTES (comprobados con ejecuciones reales; ver mapa.md)
// =====================================================================

const defectos = [
  {
    hu: 'HU1',
    descripcion:
      'El listado de animales no permite filtrar por tamaño. El criterio de aceptación 4 de HU1 pide filtrar por especie, situación, sexo y tamaño; el listado solo ofrece especie, situación (estado) y sexo.',
    causa:
      'El filtro no está implementado: la pantalla del listado no tiene el selector de tamaño y el servicio rechaza el parámetro (la petición con el filtro de tamaño devuelve 400, «property size should not exist»).',
    correccion: '',
    estado: 'Pendiente',
  },
  {
    hu: 'HU2',
    descripcion:
      'El administrador no puede registrar consultas clínicas. El criterio de aceptación 1 de HU2 dice que el veterinario y el administrador pueden registrar o corregir consultas; el sistema solo permite al administrador corregirlas.',
    causa:
      'El registro de consultas está restringido al rol veterinario: la petición de registro hecha por un administrador devuelve 403. La corrección sí admite los dos roles.',
    correccion: '',
    estado: 'Pendiente',
  },
];

const pendientes = [
  'Los dos defectos registrados quedan en estado Pendiente: no se modificó el código de la aplicación. El equipo debe decidir si se corrige el sistema o se ajusta el criterio de aceptación. Ninguno afecta a los cinco escenarios de caja negra, que resultaron CORRECTO.',
  'Los grafos de flujo no se dibujaron en este entregable: se entregan los nodos y las aristas de cada método para que se dibujen en el documento.',
  'El valor R (regiones) de cada método se obtuvo con la fórmula de Euler para grafos planos (R = A − N + 2), no contando las regiones sobre un dibujo. Conviene comprobarlo al dibujar cada grafo.',
  'Cada prueba de caja negra tiene dos capturas de la ventana del navegador (1280 × 800). En los formularios largos de HU1 y HU2 la captura inicial muestra la parte final del formulario, con el botón de la acción; los campos superiores no entran en la ventana.',
  'HU3: el animal de prueba no tiene períodos de cuarentena u observación, por lo que el historial capturado muestra consultas, vacunas y un tratamiento. La presencia de los períodos en el historial no se probó en este escenario.',
  'Las situaciones del animal del documento coinciden con el sistema, pero los roles no: el sistema tiene un solo rol «Gestión Animal y Adopciones», no dos roles separados de Gestión Animal y Gestión de Adopciones.',
  'El formato real del código del animal es ZOO-AAAA-NNNN (por ejemplo, ZOO-2026-0007), no ZA-0001 como en el ejemplo de estilo de la guía.',
];

// =====================================================================
// SALIDA
// =====================================================================

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
console.log(
  '  caja negra :',
  cajaNegra.map((c) => `${c.hu}=${c.resultado_prueba}`).join('  '),
);
console.log(
  '  caja blanca:',
  cajaBlanca.map((m) => `${m.id} V(G)=${m.complejidad.VG}`).join('  '),
);
console.log(
  `  caminos    : ${caminos.filter((c) => c.resultado === 'Aprobado').length} aprobados, ` +
    `${caminos.filter((c) => c.resultado === 'Fallido').length} fallidos`,
);
