/**
 * Arma docs/pruebas-sprint3/resultados.json a partir de ejecuciones reales:
 *
 *   - caja negra : lo que cada prueba de Playwright cargó y observó
 *                  (test/sprint3/evidencia/caja-negra/HUx.json)
 *   - caja blanca: el código se EXTRAE de los archivos fuente del backend y se
 *                  le insertan los números de nodo; el resultado de cada camino
 *                  sale del informe de Jest (docs/pruebas-sprint3/caja-blanca-resultado.json)
 *
 * Uso (desde la raíz del repositorio):  node test/sprint3/generar-resultados.js
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'docs/pruebas-sprint3');
const leer = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const EVID = path.join(__dirname, 'evidencia');
const json = (f) => JSON.parse(fs.readFileSync(path.join(EVID, f), 'utf8'));

// =====================================================================
// CAJA BLANCA
// =====================================================================

/** Texto de un método de clase (de su firma a su llave de cierre), sin comentarios. */
function metodo(fuente, nombre) {
  const lineas = fuente.split('\n');
  const ini = lineas.findIndex((l) => new RegExp(`^  (private )?(async )?${nombre}(<[^>]*>)?\\(`).test(l));
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

const DS = 'backend/src/modules/dashboard/dashboard.service.ts';
const KS = 'backend/src/modules/kpis/kpis.service.ts';
const CH = 'backend/src/modules/chat/chat.service.ts';
const AS = 'backend/src/modules/adoptions/adoptions.service.ts';

// aristas: [de, a, etiqueta]   caminos: [camino, entrada simulada, salida esperada]
const METODOS = [
  {
    id: 'CB-HU7-A',
    hu: 'HU7',
    titulo: 'HU7. Panel de KPI en Tiempo Real - Calcular un indicador aislado',
    archivo: DS,
    metodo: 'DashboardService.section',
    partes: ['section'],
    anclas: [
      [1, 'return { ok: true, data: await fn() };'],
      [2, 'this.logger.error(`Indicador'],
    ],
    nodos: {
      1: 'Calcula el indicador y devuelve ok con sus datos. ¿El cálculo lanza un error?',
      2: 'Registra el error y devuelve ok = false con el mensaje «No se pudo calcular este indicador»',
    },
    aristas: [[1, 2, 'V'], [1, 'F', 'F'], [2, 'F']],
    caminos: [
      ['1, (F)', 'El cálculo del indicador termina sin errores (tarjeta «Disponibles para adopción» = 3).', 'El sistema devuelve el indicador con ok = true y sus datos.'],
      ['1, 2, (F)', 'La consulta del indicador falla (error «consulta fallida»).', 'El sistema devuelve ese indicador con ok = false y el mensaje «No se pudo calcular este indicador», sin interrumpir el resto del panel.'],
    ],
  },
  {
    id: 'CB-HU7-B',
    hu: 'HU7',
    titulo: 'HU7. Panel de KPI en Tiempo Real - Armar el panel según el rol',
    archivo: DS,
    metodo: 'DashboardService.dashboard',
    partes: ['dashboard'],
    anclas: [
      [1, "const seesRequests = role !== 'VETERINARIO';"],
      [2, 'seesRequests', 2],
      [3, "? this.section('latestRequests'"],
      [4, ': Promise.resolve(null),'],
      [5, 'return { cards, byStatus, entriesVsAdoptions, latestRequests };'],
    ],
    nodos: {
      1: 'Determina si el rol ve las solicitudes y calcula las tarjetas y los dos gráficos, cada uno aislado',
      2: '¿El rol ve las solicitudes (no es Personal Veterinario)?',
      3: 'Calcula la sección de últimas solicitudes',
      4: 'Deja la sección de últimas solicitudes vacía (null)',
      5: 'Devuelve las tarjetas, los dos gráficos y las últimas solicitudes',
    },
    aristas: [[1, 2], [2, 3, 'V'], [2, 4, 'F'], [3, 5], [4, 5], [5, 'F']],
    caminos: [
      ['1, 2, 4, 5, (F)', 'Usuario con rol Personal Veterinario.', 'El sistema devuelve las tarjetas y los gráficos, sin la sección de últimas solicitudes.'],
      ['1, 2, 3, 5, (F)', 'Usuario con rol Personal Directivo.', 'El sistema devuelve las tarjetas, los gráficos y las últimas solicitudes.'],
    ],
  },
  {
    id: 'CB-HU7-C',
    hu: 'HU7',
    titulo: 'HU7. Panel de KPI en Tiempo Real - Calcular la tendencia de un indicador',
    archivo: KS,
    metodo: 'KpisService.build',
    partes: ['build'],
    anclas: [
      [1, 'const { value, previous } = base;'],
      [2, 'if (value === null ||'],
      [3, 'previous === null) {'],
      [4, "return { ...base, delta: null, trend: 'estable' };"],
      [5, 'const delta = r2(value - previous);'],
      [6, 'Math.abs(delta) < threshold'],
      [7, "? 'estable'"],
      [8, ': delta > 0'],
      [9, "? 'sube'"],
      [10, ": 'baja';"],
      [11, 'return { ...base, delta, trend };'],
    ],
    nodos: {
      1: 'Toma el valor del período actual y el del período anterior',
      2: '¿El período actual no tiene valor?',
      3: '¿El período anterior no tiene valor?',
      4: 'Devuelve el indicador sin diferencia y con tendencia estable',
      5: 'Calcula la diferencia contra el período anterior, con 2 decimales',
      6: '¿La diferencia es menor que el umbral?',
      7: 'Tendencia estable',
      8: '¿La diferencia es positiva?',
      9: 'Tendencia sube',
      10: 'Tendencia baja',
      11: 'Devuelve el indicador con su diferencia y su tendencia',
    },
    aristas: [
      [1, 2], [2, 4, 'V'], [2, 3, 'F'], [3, 4, 'V'], [3, 5, 'F'], [4, 'F'], [5, 6],
      [6, 7, 'V'], [6, 8, 'F'], [8, 9, 'V'], [8, 10, 'F'], [7, 11], [9, 11], [10, 11], [11, 'F'],
    ],
    caminos: [
      ['1, 2, 4, (F)', 'Período actual sin datos (valor null) y período anterior con 40 %.', 'El sistema devuelve el indicador sin diferencia y con la tendencia estable.'],
      ['1, 2, 3, 4, (F)', 'Período actual con 66,67 % y período anterior sin datos (valor null).', 'El sistema devuelve el indicador sin diferencia y con la tendencia estable.'],
      ['1, 2, 3, 5, 6, 7, 11, (F)', 'Período actual 50,3 y anterior 50 (diferencia 0,3, menor que el umbral 0,5).', 'El sistema devuelve la diferencia 0,3 y la tendencia estable.'],
      ['1, 2, 3, 5, 6, 8, 9, 11, (F)', 'Período actual 66,67 % y anterior 33,33 %.', 'El sistema devuelve la diferencia 33,34 y la tendencia sube.'],
      ['1, 2, 3, 5, 6, 8, 10, 11, (F)', 'Período actual 4,4 días y anterior 11 días, con umbral 1.', 'El sistema devuelve la diferencia −6,6 y la tendencia baja.'],
    ],
  },
  {
    id: 'CB-HU9-A',
    hu: 'HU9',
    titulo: 'HU9. Asistente Virtual con IA - Validar el historial de la conversación',
    archivo: CH,
    metodo: 'ChatService.validate',
    partes: ['validate'],
    anclas: [
      [1, "if (messages[0].role !== 'user' ||"],
      [2, "messages[messages.length - 1].role !== 'user') {"],
      [3, 'throw new BadRequestException(', 1],
      [4, 'for (let i = 1; i < messages.length; i++) {'],
      [5, 'if (messages[i].role === messages[i - 1].role) {'],
      [6, 'throw new BadRequestException(', 2],
    ],
    nodos: {
      1: '¿La conversación no empieza con un mensaje del usuario?',
      2: '¿La conversación no termina con un mensaje del usuario?',
      3: 'Lanza BadRequestException: debe empezar y terminar con un mensaje del usuario',
      4: '¿Quedan mensajes por revisar?',
      5: '¿El mensaje tiene el mismo rol que el anterior?',
      6: 'Lanza BadRequestException: los turnos deben alternar',
    },
    aristas: [[1, 3, 'V'], [1, 2, 'F'], [2, 3, 'V'], [2, 4, 'F'], [3, 'F'], [4, 5, 'V'], [4, 'F', 'F'], [5, 6, 'V'], [5, 4, 'F'], [6, 'F']],
    caminos: [
      ['1, 3, (F)', 'Historial que empieza con un mensaje del asistente.', 'El sistema rechaza la consulta con BadRequestException «La conversación debe empezar y terminar con un mensaje del usuario».'],
      ['1, 2, 3, (F)', 'Historial que termina con un mensaje del asistente.', 'El sistema rechaza la consulta con BadRequestException «La conversación debe empezar y terminar con un mensaje del usuario».'],
      ['1, 2, 4, (F)', 'Un solo mensaje del usuario.', 'El sistema acepta el historial; el ciclo no se repite.'],
      ['1, 2, 4, 5, 4, 5, 4, (F)', 'Usuario, asistente y usuario, alternados.', 'El sistema acepta el historial.'],
      ['1, 2, 4, 5, 6, (F)', 'Dos mensajes seguidos del usuario.', 'El sistema rechaza la consulta con BadRequestException «Los turnos deben alternar entre usuario y asistente».'],
    ],
  },
  {
    id: 'CB-HU9-B',
    hu: 'HU9',
    titulo: 'HU9. Asistente Virtual con IA - Responder una consulta',
    archivo: CH,
    metodo: 'ChatService.reply',
    partes: ['reply'],
    anclas: [
      [1, 'const { enabled, model } = this.config.chat;'],
      [2, 'if (!enabled) throw'],
      [3, 'this.validate(messages);'],
      [4, 'const response = await this.getClient()'],
      [5, '...(FALLBACK_MODELS.has(model)'],
      [6, '? { betas:'],
      [7, ': {}),'],
      [8, 'system: ['],
      [9, "if (response.stop_reason === 'refusal')"],
      [10, 'const text = response.content'],
      [11, 'return { reply: text ||'],
      [12, 'REFUSAL_REPLY };', 2],
      [13, 'if (err instanceof Anthropic.RateLimitError) {'],
      [14, 'throw new ServiceUnavailableException(', 2],
      [15, 'if (err instanceof Anthropic.AuthenticationError) {'],
      [16, "this.logger.error('ANTHROPIC_API_KEY inválida');"],
      [17, 'if (err instanceof Anthropic.APIError) {'],
      [18, 'this.logger.error(`Error de la API'],
      [19, 'throw err;'],
    ],
    nodos: {
      1: 'Lee si el servicio de IA está configurado y el modelo',
      2: '¿El servicio de IA no está configurado?',
      3: 'Valida el historial (validate) y obtiene los animales disponibles para adopción',
      4: 'Arma la consulta al modelo: límite de tokens y esfuerzo',
      5: '¿El modelo admite el respaldo automático de servidor?',
      6: 'Agrega el respaldo automático',
      7: 'Sin respaldo',
      8: 'Agrega el contexto de la institución y de los animales disponibles, y envía la consulta. ¿La API lanza un error?',
      9: '¿El modelo se negó a responder? Si es así, devuelve la respuesta amable de rechazo',
      10: 'Junta el texto de la respuesta',
      11: '¿La respuesta tiene texto? Si es así, lo devuelve',
      12: 'Devuelve la respuesta amable de rechazo',
      13: '¿Es un error de límite de la API (429)?',
      14: 'Lanza ServiceUnavailableException «El asistente está muy ocupado. Intenta en unos segundos.»',
      15: '¿Es un error de autenticación (clave inválida)?',
      16: 'Registra el error y lanza ServiceUnavailableException con el mensaje amable',
      17: '¿Es otro error de la API?',
      18: 'Registra el error y lanza ServiceUnavailableException con el mensaje amable',
      19: 'Vuelve a lanzar el error original',
    },
    aristas: [
      [1, 2], [2, 'F', 'V'], [2, 3, 'F'], [3, 4], [4, 5], [5, 6, 'V'], [5, 7, 'F'], [6, 8], [7, 8],
      [8, 13, 'V'], [8, 9, 'F'], [9, 'F', 'V'], [9, 10, 'F'], [10, 11], [11, 'F', 'V'], [11, 12, 'F'], [12, 'F'],
      [13, 14, 'V'], [13, 15, 'F'], [14, 'F'], [15, 16, 'V'], [15, 17, 'F'], [16, 'F'], [17, 18, 'V'], [17, 19, 'F'], [18, 'F'], [19, 'F'],
    ],
    caminos: [
      ['1, 2, (F)', 'Servicio de IA sin clave configurada.', 'El sistema rechaza la consulta con ServiceUnavailableException y el mensaje «El asistente no está disponible en este momento. Escríbenos por el formulario de contacto.». No consulta la base de datos.'],
      ['1, 2, 3, 4, 5, 7, 8, 9, 10, 11, (F)', 'Modelo sin respaldo de servidor; la API responde con texto.', 'El sistema devuelve el texto de la respuesta y no guarda la conversación.'],
      ['1, 2, 3, 4, 5, 6, 8, 9, 10, 11, (F)', 'Modelo con respaldo de servidor (claude-opus-5-5); la API responde con texto.', 'El sistema pide el respaldo automático y devuelve el texto de la respuesta.'],
      ['1, 2, 3, 4, 5, 7, 8, 9, (F)', 'La API responde con stop_reason «refusal».', 'El sistema devuelve la respuesta amable «Prefiero no responder a eso…».'],
      ['1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, (F)', 'La API responde sin bloques de texto.', 'El sistema devuelve la respuesta amable «Prefiero no responder a eso…».'],
      ['1, 2, 3, 4, 5, 7, 8, 13, 14, (F)', 'La API responde con el error 429 (límite).', 'El sistema lanza ServiceUnavailableException «El asistente está muy ocupado. Intenta en unos segundos.».'],
      ['1, 2, 3, 4, 5, 7, 8, 13, 15, 16, (F)', 'La API responde con el error 401 (clave inválida).', 'El sistema lanza ServiceUnavailableException con el mensaje amable de servicio no disponible.'],
      ['1, 2, 3, 4, 5, 7, 8, 13, 15, 17, 18, (F)', 'La API responde con el error 500.', 'El sistema lanza ServiceUnavailableException con el mensaje amable de servicio no disponible.'],
      ['1, 2, 3, 4, 5, 7, 8, 13, 15, 17, 19, (F)', 'La consulta falla con un error que no es de la API (TypeError).', 'El sistema vuelve a lanzar el mismo error.'],
    ],
  },
  {
    id: 'CB-HU12-A',
    hu: 'HU12',
    titulo: 'HU12. Seguimiento Post-adopción - Registrar un Seguimiento',
    archivo: AS,
    metodo: 'AdoptionsService.createFollowup',
    partes: ['createFollowup', 'approvedOrThrow'],
    anclas: [
      [1, 'const req = await this.approvedOrThrow(id);'],
      [6, 'if (req.deliveryDate &&'],
      [7, 'new Date(dto.followupDate) < req.deliveryDate) {'],
      [8, 'throw new BadRequestException('],
      [9, 'return this.prisma.$transaction(async (tx) => {'],
      [2, 'const req = await this.prisma.adoptionRequest.findUnique({ where: { id } });'],
      [3, "if (!req) throw new NotFoundException('Solicitud no encontrada');"],
      [4, "if (req.status !== 'APROBADA') {"],
      [5, 'return req;'],
    ],
    nodos: {
      1: 'Verifica que la adopción esté aprobada (approvedOrThrow)',
      2: 'Busca la solicitud',
      3: '¿La solicitud no existe?',
      4: '¿La solicitud no está aprobada?',
      5: 'Devuelve la solicitud aprobada',
      6: '¿La solicitud tiene fecha de entrega?',
      7: '¿El seguimiento es anterior a la entrega del animal?',
      8: 'Lanza BadRequestException: el seguimiento no puede ser anterior a la entrega',
      9: 'Crea el seguimiento con la fecha, el estado del animal, las observaciones y el autor, y lo devuelve',
    },
    aristas: [[1, 2], [2, 3], [3, 'F', 'V'], [3, 4, 'F'], [4, 'F', 'V'], [4, 5, 'F'], [5, 6], [6, 7, 'V'], [6, 9, 'F'], [7, 8, 'V'], [7, 9, 'F'], [8, 'F'], [9, 'F']],
    caminos: [
      ['1, 2, 3, (F)', 'El identificador no corresponde a ninguna solicitud.', 'El sistema lanza NotFoundException «Solicitud no encontrada». No se crea ningún registro.'],
      ['1, 2, 3, 4, (F)', 'Solicitud en estado En evaluación.', 'El sistema rechaza el seguimiento con ConflictException «Disponible solo para solicitudes aprobadas». No se crea ningún registro.'],
      ['1, 2, 3, 4, 5, 6, 9, (F)', 'Solicitud aprobada sin fecha de entrega registrada.', 'El sistema registra el seguimiento.'],
      ['1, 2, 3, 4, 5, 6, 7, 8, (F)', 'Solicitud aprobada con entrega el 15/11/2026 y seguimiento del 14/11/2026.', 'El sistema rechaza el seguimiento con BadRequestException «El seguimiento no puede ser anterior a la entrega del animal».'],
      ['1, 2, 3, 4, 5, 6, 7, 9, (F)', 'Solicitud aprobada con entrega el 15/11/2026 y seguimiento del 17/11/2026.', 'El sistema registra el seguimiento vinculado a la adopción, con su fecha y el usuario autenticado como autor.'],
    ],
  },
  {
    id: 'CB-HU12-B',
    hu: 'HU12',
    titulo: 'HU12. Seguimiento Post-adopción - Listar los Seguimientos de una Solicitud',
    archivo: AS,
    metodo: 'AdoptionsService.listFollowups',
    partes: ['listFollowups'],
    anclas: [
      [1, 'const req = await this.prisma.adoptionRequest.findUnique({'],
      [2, 'if (!req) throw'],
      [3, 'return this.prisma.adoptionFollowup.findMany({'],
    ],
    nodos: {
      1: 'Busca la solicitud',
      2: '¿La solicitud no existe?',
      3: 'Devuelve sus seguimientos ordenados por fecha, con el autor',
    },
    aristas: [[1, 2], [2, 'F', 'V'], [2, 3, 'F'], [3, 'F']],
    caminos: [
      ['1, 2, (F)', 'El identificador no corresponde a ninguna solicitud.', 'El sistema lanza NotFoundException «Solicitud no encontrada».'],
      ['1, 2, 3, (F)', 'Solicitud existente con dos seguimientos.', 'El sistema devuelve los seguimientos de la solicitud.'],
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
    hu: 'HU7',
    nombre: 'Prueba de HU7. Panel de KPI en Tiempo Real',
    descripcion:
      'Verificar que el sistema muestre al personal directivo el panel de indicadores, con las cinco tarjetas y los dos gráficos, y la pantalla de indicadores de gestión con los seis indicadores y su tendencia respecto al período anterior.',
    precondicion:
      'Existe un usuario con el rol Personal Directivo. La base de prueba tiene animales en distintas situaciones, solicitudes, adopciones, devoluciones y vacunas en el período actual y en el período anterior.',
    condicion: `${COND} El usuario tiene permiso para ver el panel y los indicadores de gestión.`,
    pasos: [
      'Ingresar al sistema con el Email y la Contraseña del usuario directivo y presionar «Iniciar sesión».',
      'Revisar el «Panel»: las tarjetas «En la institución», «En cuarentena / observación», «Disponibles para adopción», «Solicitudes activas» y «Adopciones del mes», y los gráficos «Animales por estado» e «Ingresos vs. adopciones».',
      'Ingresar al módulo «KPIs» desde el menú lateral.',
      'En «Periodo de análisis», seleccionar «Últimos 3 meses».',
    ],
    esperado:
      'El sistema muestra en el panel la cantidad de animales en la institución, en cuarentena u observación y disponibles para adopción, las solicitudes en curso y las adopciones del mes, junto con el gráfico de animales por situación y el que compara los ingresos con las adopciones de cada mes. La pantalla de indicadores muestra las adopciones concretadas, el tiempo promedio hasta la adopción, los animales devueltos, las solicitudes recibidas, el tiempo de evaluación y el porcentaje de animales vacunados, y la tendencia respecto al período anterior de los cinco primeros.',
    obtenido: (o) =>
      `El sistema mostró el panel con las tarjetas ${o.tarjetas.join('; ')}, y los gráficos «Animales por estado» e «Ingresos vs. adopciones». En «Indicadores de gestión», con «Últimos 3 meses», mostró los seis indicadores: ${o.indicadores
        .map((t) => t.split(' vs. periodo anterior')[0].split(' Sin periodo anterior')[0])
        .join('; ')}. Los cinco primeros mostraron su diferencia «vs. periodo anterior»; la cobertura de vacunación mostró su valor.`,
  },
  {
    hu: 'HU9',
    nombre: 'Prueba de HU9. Asistente Virtual con IA',
    descripcion:
      'Verificar que un visitante pueda usar el asistente virtual desde el sitio público sin iniciar sesión y que, si el servicio de inteligencia artificial no está disponible, el asistente muestre un mensaje amable.',
    precondicion:
      'El visitante no inició sesión. Hay animales disponibles para adopción en la base de prueba. El entorno de prueba no tiene la clave de la API de Anthropic, por lo que el servicio de inteligencia artificial no está disponible.',
    condicion: `${COND} El servicio de inteligencia artificial no está disponible.`,
    pasos: [
      'Ingresar al sitio público del sistema, sin iniciar sesión.',
      'En el aviso de cookies, presionar «Solo necesarias».',
      'Presionar el botón flotante del asistente («Abrir asistente virtual»).',
      'En la ventana «Asistente virtual», escribir la pregunta en «Escribe tu pregunta…».',
      'Presionar el botón «Enviar».',
    ],
    esperado:
      'El sistema permite usar el asistente sin iniciar sesión y, como el servicio de inteligencia artificial no está disponible, muestra un mensaje amable que indica que el asistente no está disponible en ese momento.',
    obtenido: (o) =>
      `El sistema abrió el asistente sin pedir el inicio de sesión. Al enviar la pregunta, el servicio respondió con el estado ${o.estado_http} y el asistente mostró el mensaje «${o.mensaje}». La pregunta quedó en el campo de texto para volver a enviarla.`,
  },
  {
    hu: 'HU12',
    nombre: 'Prueba de HU12. Seguimiento Post-adopción',
    descripcion:
      'Verificar que el sistema permita al personal de Gestión de Adopciones registrar un seguimiento de una adopción aprobada, con su fecha, sus observaciones y su autor, y que lo muestre en la lista de seguimientos ordenada por fecha.',
    precondicion: `El usuario del rol Gestión Animal y Adopciones ha iniciado sesión. Existe la solicitud aprobada del animal Lola (ZOO-${anio}-0007) para la adoptante Rosa Quiroga Leon, con el animal entregado y un seguimiento anterior.`,
    condicion: `${COND} La solicitud está aprobada.`,
    pasos: [
      'Ingresar al módulo «Solicitudes» desde el menú lateral.',
      'Abrir la solicitud aprobada.',
      'En «Seguimiento posterior a la adopción», presionar el botón «Nuevo seguimiento».',
      'Completar «Estado general del animal» y «Observaciones».',
      'Presionar el botón «Guardar».',
    ],
    esperado:
      'El sistema registra el seguimiento de la adopción aprobada con su fecha, sus observaciones y el nombre de quien lo registró, y lo muestra en la lista de seguimientos ordenada por fecha.',
    obtenido: (o) =>
      `El sistema registró el seguimiento, mostró el mensaje «Seguimiento registrado» y lo listó primero: «${o.nuevo_registro}». Debajo quedó el seguimiento anterior: «${o.registro_anterior}».`,
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
    script: `test/sprint3/e2e/${n.hu.toLowerCase()}.spec.ts`,
  };
});

// =====================================================================
// DEFECTOS Y PENDIENTES
// =====================================================================

const defectos = [];
const pendientes = [
  'HU9: el equipo no tiene una clave de la API de Anthropic, así que la caja negra probó el criterio 5 (mensaje amable cuando el servicio de inteligencia artificial no está disponible), como indica la guía. Con una clave real en .env.test, la misma prueba puede repetirse para ver la respuesta del asistente. Las respuestas con la IA se probaron en la caja blanca (CB-HU9-B) con el SDK simulado.',
  'Por indicación del equipo, en HU7 no se probó la tendencia de la cobertura de vacunación: el sistema la muestra como una foto del momento («Sin periodo anterior para comparar»). La prueba de caja negra comprueba la tendencia de los otros cinco indicadores.',
  'Por indicación del equipo, el criterio 4 de HU7 («si un indicador no se puede calcular, los demás se siguen mostrando») se probó en el panel (CB-HU7-A), donde cada indicador está aislado, y con indicadores sin datos en la pantalla de indicadores de gestión (PU-HU7-04). No se probó el caso de un indicador de gestión que lanza un error.',
  'La pantalla de indicadores de gestión ofrece períodos de 3, 6 y 12 meses. La prueba usó «Últimos 3 meses»: el período actual son los 3 últimos meses y el anterior, los 3 meses previos. El seed carga datos en ambos, con fechas relativas a la fecha de ejecución.',
  'En la captura inicial de HU7, el gráfico «Ingresos vs. adopciones» queda debajo del borde de la ventana de 1280 × 800; se ve su título. La prueba comprobó que los dos gráficos están en el panel.',
  'ChatService.reply tiene más de 10 decisiones si se incluye la validación del historial. Por eso, como pide la guía, la validación se analizó aparte (CB-HU9-A, ChatService.validate) y en CB-HU9-B la llamada a validate es un solo nodo.',
  'En CB-HU9-B, el nodo 8 se cuenta como decisión porque la consulta a la API puede terminar normalmente o lanzar una excepción que pasa al bloque catch. En CB-HU7-A pasa lo mismo con el nodo 1.',
  'Los grafos de flujo no se dibujaron: se entregan los nodos y las aristas. El valor R se obtuvo con la fórmula de Euler (R = A − N + 2).',
  'El sistema tiene un solo rol «Gestión Animal y Adopciones». Las pruebas usan la cuenta adopciones.prueba@zoonosis.test con ese rol.',
];

const entorno = json('entorno.json');
const resultados = {
  fecha_ejecucion: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(new Date()),
  entorno: {
    sistema_operativo: entorno.sistema_operativo,
    node: entorno.node,
    navegador: 'Chromium (Playwright)',
    base_de_datos: 'PostgreSQL 16 (base de prueba)',
    servicio_ia: 'No disponible (sin clave de la API de Anthropic en el entorno de prueba)',
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
