/**
 * Tercera parte del generador: capturas, pendientes y escritura de datos-cap9.json.
 */
const fs = require('node:fs');
const path = require('node:path');
const p1 = require('./generar-datos.js');
const p2 = require('./generar-datos-2.js');
const { existe, DOCS } = p1;

const CAPTURAS = [
  ['SIS-paso-01.png', 'Prueba de sistema, paso 1: ficha del animal recién registrado por Gestión, con su código y la situación «Ingresado».'],
  ['SIS-paso-02.png', 'Paso 2: consulta veterinaria guardada, con el veterinario autor.'],
  ['SIS-paso-03.png', 'Paso 4: cuarentena abierta; el animal figura «En cuarentena».'],
  ['SIS-paso-04.png', 'Paso 6: animal habilitado, «Disponible para adopción».'],
  ['SIS-paso-05.png', 'Paso 7: ficha del adoptante registrado, con su perfil de evaluación.'],
  ['SIS-paso-06.png', 'Paso 8: ranking de animales recomendados con puntaje, nivel y aviso de apoyo.'],
  ['SIS-paso-07.png', 'Paso 9: solicitud creada en «Pendiente»; el animal pasa a «En proceso de adopción».'],
  ['SIS-paso-08.png', 'Paso 11: solicitud aprobada; el animal pasa a «Adoptado».'],
  ['SIS-paso-09.png', 'Paso 12: acta de adopción responsable con los datos del animal y del adoptante.'],
  ['SIS-paso-10.png', 'Paso 13: seguimiento post-adopción registrado en la solicitud.'],
  ['SIS-paso-11.png', 'Paso 14: panel de indicadores visto por el Personal Directivo.'],
  ['SIS-paso-12.png', 'Paso 15: sitio público con la confirmación del formulario de contacto.'],
  ['jest-cobertura.png', 'Terminal: resumen de las pruebas unitarias del backend y de la cobertura total (Jest).'],
  ['playwright-resumen.png', 'Informe HTML de Playwright con las pruebas de los sprints y del Capítulo IX.'],
  ['zap-resumen.png', 'Resumen de alertas por riesgo de los reportes de ZAP (frontend y API).'],
  ['k6-50-usuarios.png', 'Terminal: resumen de k6 del escenario de 50 usuarios virtuales.'],
  ['lighthouse-inicio-movil.png', 'Reporte de Lighthouse del inicio público en móvil: puntajes y métricas.'],
  ['axe-resumen.png', 'Terminal: violaciones de accesibilidad por pantalla (axe-core).'],
].map(([archivo, muestra]) => ({
  archivo: `capturas/${archivo}`,
  muestra,
  existe: existe(path.join(DOCS, 'capturas', archivo)),
}));

const pendientes = [
  'Prisma bloqueó «prisma migrate reset» por ser una acción destructiva iniciada por un agente sin autorización explícita; no se forzó. Las pruebas de integración se ejecutaron después de «npm run db:setup» sobre la base de prueba existente (con los datos del seed del Sprint 3), no sobre una base vacía como en el CI.',
  'Prueba de usabilidad con personas (cuestionario SUS): no se automatiza; requiere al menos 5 participantes.',
  'Aceptación del cliente (Zoonosis): requiere el cargo, la fecha, lo aprobado y las observaciones de la persona que revisó el sistema, o el acta firmada.',
  'PageSpeed del sitio publicado: no se ejecutó, porque las reglas prohíben pruebas contra el servidor de AWS. Lo debe correr el equipo en pagespeed.web.dev.',
  'HTTPS y HSTS de producción: la plantilla con TLS (templates-ip-tls) necesita un certificado real y no se reprodujo en local; se revisó solo el código.',
  'Asistente con IA (HU9): sin clave de la API de Anthropic, solo se probó la respuesta 503 del servicio no disponible.',
  'Envío de correo del formulario de contacto: sin servidor SMTP en el entorno de prueba; se comprobó que el mensaje se guarda, no que se envía.',
  'Lighthouse se ejecutó una vez por página y modo; sus valores varían entre ejecuciones.',
  'La prueba de carga se generó desde la misma máquina que aloja el sistema (k6 y los contenedores comparten CPU y memoria).',
  'El escaneo activo de ZAP sobre la API se hizo con un usuario de Gestión: las rutas exclusivas de otros roles respondieron 403 y no se probaron a fondo. Tuvo un límite de 30 minutos.',
  'Accesibilidad: axe-core revisa solo lo automatizable; no se hizo una revisión manual con lector de pantalla ni navegación completa con teclado.',
  'Correcciones de las pruebas (no del sistema): la primera ejecución de SEG-08 escribió el nombre antes de que el formulario terminara de cargar, y en la de seguridad los correos de prueba tenían mayúsculas y SEG-13 exigía el valor exacto «nosniff». Se corrigieron las pruebas y se volvieron a ejecutar.',
];

const datos = {
  fecha: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(new Date()),
  entorno: p1.entorno,
  implementacion: p1.implementacion,
  inventario: p1.inventario,
  unidad: p1.unidad,
  complejidad: p1.complejidad,
  integracion: p1.integracion,
  playwright: p2.playwright,
  regresion: p2.regresion,
  sistema: p2.sistema,
  rendimiento: p2.rendimiento,
  seguridad: p2.seguridad,
  accesibilidad: p2.accesibilidad,
  grafos_sprint3: p2.grafos_sprint3,
  defectos_nuevos: p2.defectos,
  capturas: CAPTURAS,
  pendientes,
};

fs.mkdirSync(DOCS, { recursive: true });
fs.writeFileSync(path.join(DOCS, 'datos-cap9.json'), JSON.stringify(datos, null, 2) + '\n', 'utf8');
console.log('docs/pruebas-cap9/datos-cap9.json generado');
console.log(
  `unidad ${datos.unidad.aprobadas}/${datos.unidad.total} · integración ${datos.integracion.aprobadas}/${datos.integracion.total} · playwright ${datos.playwright.aprobadas}/${datos.playwright.total} · sistema ${datos.sistema.estado} · seguridad ${datos.seguridad.manuales_resumen.aprobadas}/${datos.seguridad.manuales_resumen.total} · defectos ${datos.defectos_nuevos.length} · nuevas fallas ${datos.regresion.nuevas_fallas.length}`,
);
for (const c of datos.capturas) if (!c.existe) console.log(`falta la captura ${c.archivo}`);
