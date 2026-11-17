/**
 * Descripción de las 24 pruebas de integración de backend/test/*.e2e-spec.ts.
 * Sale de leer cada prueba: endpoints que llama, módulos que integra y lo que verifican sus
 * aserciones. El resultado obtenido y el tiempo se toman de la ejecución (jest-integracion.json).
 */
module.exports = {
  'login correcto devuelve access token y cookie httpOnly': {
    endpoints: ['POST /api/v1/auth/login'],
    modulos: ['auth', 'users (Prisma)', 'common (ValidationPipe)'],
    verifica: 'El inicio de sesión con un usuario del seed emite el token de acceso y la cookie del refresh token.',
    esperado: 'Responde 200 con el token de acceso, el rol ADMIN y la cookie refresh_token marcada HttpOnly.',
  },
  'credenciales inválidas → 401 con mensaje genérico': {
    endpoints: ['POST /api/v1/auth/login'],
    modulos: ['auth', 'users (Prisma)'],
    verifica: 'Una contraseña incorrecta no revela si el correo existe.',
    esperado: 'Responde 401 con el mensaje genérico «Credenciales inválidas».',
  },
  'sin token → 401; rol sin permiso → 403': {
    endpoints: ['GET /api/v1/users', 'POST /api/v1/auth/login'],
    modulos: ['auth (JwtAuthGuard)', 'common (RolesGuard)', 'users'],
    verifica: 'La administración de usuarios exige sesión y el rol ADMIN.',
    esperado: 'Responde 401 sin token y 403 con el token de un veterinario.',
  },
  'ADMIN crea usuario, lo desactiva y el token del usuario deja de funcionar (RN-10)': {
    endpoints: [
      'POST /api/v1/users',
      'POST /api/v1/auth/login',
      'GET /api/v1/auth/me',
      'PATCH /api/v1/users/:id/active',
    ],
    modulos: ['users', 'auth', 'common (JwtAuthGuard)', 'Prisma'],
    verifica: 'Alta de usuario, correo único y efecto inmediato de la desactivación (RN-10).',
    esperado:
      'Crea el usuario (201); el correo repetido responde 409; tras desactivarlo, su token responde 401 y su inicio de sesión responde 403 «Cuenta desactivada, contacta al administrador».',
  },
  'el admin no puede desactivarse a sí mismo': {
    endpoints: ['POST /api/v1/auth/login', 'PATCH /api/v1/users/:id/active'],
    modulos: ['users', 'auth'],
    verifica: 'El administrador no puede desactivar su propia cuenta.',
    esperado: 'Responde 400.',
  },
  'info y animales públicos sin sesión (sin datos internos)': {
    endpoints: ['GET /api/v1/public/info', 'GET /api/v1/public/animals'],
    modulos: ['public', 'animals (Prisma)', 'config'],
    verifica: 'El sitio público funciona sin sesión y no expone datos internos de los animales.',
    esperado: 'Responde 200 sin sesión; los animales no incluyen entryReason, specialCareNotes ni createdById.',
  },
  'registro exige aceptar los términos y guarda la fecha de aceptación': {
    endpoints: ['POST /api/v1/public/register'],
    modulos: ['public', 'users (Prisma)', 'common (ValidationPipe)'],
    verifica: 'El registro de clientes exige aceptar los Términos y guarda la fecha de aceptación.',
    esperado:
      'Sin aceptar los términos responde 400; aceptándolos responde 201 con el rol CLIENTE y guarda termsAcceptedAt; el correo repetido responde 409.',
  },
  'el CLIENTE accede a su perfil pero no al sistema interno': {
    endpoints: [
      'POST /api/v1/auth/login',
      'GET /api/v1/auth/me',
      'GET /api/v1/animals',
      'GET /api/v1/dashboard',
      'GET /api/v1/adopters',
      'GET /api/v1/kpis',
      'GET /api/v1/users',
    ],
    modulos: ['auth', 'common (RolesGuard)', 'animals', 'dashboard', 'adopters', 'kpis', 'users'],
    verifica: 'El rol CLIENTE solo accede a su perfil.',
    esperado: 'Responde 200 en /auth/me y 403 en las cinco rutas internas.',
  },
  'contacto exige aceptar el tratamiento de datos y guarda el mensaje': {
    endpoints: ['POST /api/v1/public/contact'],
    modulos: ['public', 'contact (Prisma)', 'mail'],
    verifica: 'El formulario de contacto exige aceptar la Política de Privacidad y guarda el mensaje.',
    esperado:
      'Sin aceptar responde 400; aceptando responde 200 { ok: true } y el mensaje queda guardado con privacyAcceptedAt y el estado NUEVO.',
  },
  'el bot sin API key responde 503 y valida el historial': {
    endpoints: ['POST /api/v1/chat'],
    modulos: ['chat', 'common (ValidationPipe)'],
    verifica: 'El asistente sin clave de la API responde con un mensaje claro y valida el historial.',
    esperado: 'Responde 503 «… no está disponible …» y 400 si el historial trae un rol no permitido.',
  },
  'CU03: GESTION registra un animal con código ZOO-AAAA-NNNN en estado INGRESADO': {
    endpoints: ['POST /api/v1/animals'],
    modulos: ['animals', 'common (RolesGuard, ValidationPipe)', 'Prisma'],
    verifica: 'Alta de animal con código correlativo, permisos por rol y validación por campo.',
    esperado:
      'Gestión crea el animal (201) con código ZOO-AAAA-NNNN y estado INGRESADO; el veterinario recibe 403; un cuerpo incompleto responde 400 con el detalle del campo size.',
  },
  'RN-03: no se habilita para adopción sin consulta registrada': {
    endpoints: ['POST /api/v1/animals/:id/enable-adoption'],
    modulos: ['animals (AnimalStatusService)', 'clinical'],
    verifica: 'La regla RN-03 bloquea la habilitación sin consulta veterinaria.',
    esperado: 'Responde 409 con «No tiene ninguna consulta veterinaria registrada».',
  },
  'CU06: consulta con validaciones (temperatura 30–45 °C, peso > 0)': {
    endpoints: ['POST /api/v1/animals/:id/consultations'],
    modulos: ['clinical', 'animals', 'common (RolesGuard, ValidationPipe)'],
    verifica: 'Validación de signos vitales y permiso exclusivo del veterinario.',
    esperado: 'Temperatura 50 °C y peso 0 responden 400; Gestión recibe 403; la consulta válida responde 201.',
  },
  'CU09: cuarentena activa bloquea RN-03; un solo periodo activo; cierre pide confirmación sin controles': {
    endpoints: [
      'POST /api/v1/animals/:id/periods',
      'POST /api/v1/animals/:id/enable-adoption',
      'POST /api/v1/periods/:id/close',
      'GET /api/v1/animals/:id',
    ],
    modulos: ['clinical (periodos)', 'animals (máquina de estados)'],
    verifica: 'Cuarentena, un solo periodo activo y cierre con confirmación cuando no hay controles.',
    esperado:
      'El animal pasa a EN_CUARENTENA; un segundo periodo responde 409; la habilitación responde 409 «Tiene cuarentena activa»; el cierre responde 403 para Gestión, 409 sin confirmar y 200 confirmando; el animal vuelve a INGRESADO.',
  },
  'CU07: tratamiento activo → EN_TRATAMIENTO; al finalizarlo vuelve a INGRESADO': {
    endpoints: [
      'GET /api/v1/animals/:id/consultations',
      'POST /api/v1/consultations/:id/treatments',
      'POST /api/v1/animals/:id/enable-adoption',
      'PATCH /api/v1/treatments/:id',
    ],
    modulos: ['clinical (tratamientos)', 'animals (máquina de estados)'],
    verifica: 'Validaciones del tratamiento y su efecto en la situación del animal.',
    esperado:
      'Fin anterior al inicio y medicamento sin dosis responden 400; el tratamiento válido responde 201 y el animal pasa a EN_TRATAMIENTO; la habilitación responde 409; al finalizarlo (200) vuelve a INGRESADO.',
  },
  'CU05: la línea de tiempo del HCD está en orden cronológico inverso': {
    endpoints: ['GET /api/v1/animals/:id/timeline'],
    modulos: ['animals (timeline)', 'clinical'],
    verifica: 'El historial clínico digital se ordena del más reciente al más antiguo.',
    esperado: 'Responde 200 con al menos 2 registros en orden cronológico inverso.',
  },
  'CU21: con RN-03 cumplida el veterinario habilita para adopción': {
    endpoints: ['POST /api/v1/animals/:id/enable-adoption'],
    modulos: ['animals', 'common (RolesGuard)'],
    verifica: 'Solo el veterinario habilita para adopción cuando se cumple RN-03.',
    esperado: 'Gestión recibe 403; el veterinario recibe 200 y el animal queda DISPONIBLE_ADOPCION.',
  },
  'CU10: adoptante con CI única y horas 0–24': {
    endpoints: ['POST /api/v1/adopters'],
    modulos: ['adopters', 'common (ValidationPipe)', 'Prisma'],
    verifica: 'Validación de horas disponibles y unicidad de la CI.',
    esperado: '30 horas responde 400; el adoptante válido responde 201; la CI repetida responde 409 con existingAdopterId.',
  },
  'CU13: ranking y par incluyen puntaje, desglose y aviso RN-08': {
    endpoints: ['GET /api/v1/recommendations/adopter/:id', 'POST /api/v1/recommendations'],
    modulos: ['recommendation (modelo o reglas)', 'adopters', 'animals'],
    verifica: 'Ranking ordenado, aviso RN-08 y desglose de la compatibilidad de un par.',
    esperado:
      'El ranking trae el aviso «Resultado de apoyo…», puntajes de mayor a menor e incluye al animal; el par responde 201 con puntaje mayor que 0 y 5 criterios.',
  },
  'RN-04/05/06/07 y máquina de estados de la solicitud': {
    endpoints: [
      'GET /api/v1/animals?status=EN_OBSERVACION',
      'POST /api/v1/adoptions',
      'PATCH /api/v1/adoptions/:id/status',
      'POST /api/v1/adoptions/:id/decision',
      'POST /api/v1/adoptions/:id/followups',
      'GET /api/v1/adoptions/:id/act',
    ],
    modulos: ['adoptions', 'animals (máquina de estados)', 'adopters', 'Prisma (transacciones)'],
    verifica: 'Reglas RN-04 a RN-07 y transiciones de la solicitud hasta el acta y el seguimiento.',
    esperado:
      'Animal no disponible 409; solicitud 201 en PENDIENTE y animal EN_PROCESO_ADOPCION; duplicada 409; seguimiento antes de aprobar 409; decisión fuera de evaluación 409; notas y fecha de entrega obligatorias 400; rechazo devuelve el animal a DISPONIBLE_ADOPCION; aprobación lo deja ADOPTADO; seguimiento 201 y acta 200.',
  },
  'CU06/CU22: un animal adoptado no admite consultas; el reingreso lo vuelve a INGRESADO': {
    endpoints: [
      'POST /api/v1/animals/:id/consultations',
      'POST /api/v1/animals/:id/exit',
      'POST /api/v1/animals/:id/readmit',
      'PATCH /api/v1/animals/:id',
    ],
    modulos: ['animals (salida y reingreso)', 'clinical'],
    verifica: 'Estados finales, reingreso y salida del animal.',
    esperado:
      'La consulta de un adoptado responde 409; la salida de un adoptado 409; el reingreso 200 y el animal vuelve a INGRESADO; salida «OTRO» sin detalle 400; salida DEVUELTO 200; en estado final solo se editan notas (409 y 200).',
  },
  'CU17: el panel calcula cada indicador por separado': {
    endpoints: ['GET /api/v1/dashboard', 'GET /api/v1/alerts', 'GET /api/v1/audit', 'GET /api/v1/reports'],
    modulos: ['dashboard', 'Prisma'],
    verifica: 'Cada sección del panel se calcula aislada y las funciones retiradas no existen.',
    esperado: 'El panel responde 200 con cards.ok y byStatus.ok, sin «alerts»; /alerts, /audit y /reports responden 404.',
  },
  'KPIs: seis indicadores con comparación contra el periodo anterior': {
    endpoints: ['GET /api/v1/kpis?months=6', 'GET /api/v1/kpis?months=99'],
    modulos: ['kpis', 'Prisma'],
    verifica: 'Los seis indicadores de gestión con unidad, tendencia y dirección.',
    esperado: 'Responde 200 con 6 indicadores válidos y periodMonths 6; months=99 responde 400.',
  },
  'CU13 inverso: ranking de adoptantes compatibles con un animal': {
    endpoints: ['GET /api/v1/recommendations/animal/:id'],
    modulos: ['recommendation', 'adopters', 'animals'],
    verifica: 'Ranking inverso sin exponer la CI del adoptante.',
    esperado: 'Responde 200 con el animal, la lista de adoptantes con puntaje numérico, el aviso y sin la CI.',
  },
};
