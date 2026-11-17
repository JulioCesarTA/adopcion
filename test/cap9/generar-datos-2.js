/**
 * Segunda parte del generador de datos-cap9.json (la ejecuta generar-datos.js).
 */
const fs = require('node:fs');
const path = require('node:path');
const p1 = require('./generar-datos.js');
const { leer, existe, rel, r2, pct, EV, DOCS, RAIZ, especsPw, pw } = p1;
const soluciones = require('./zap-soluciones.js');

// --------------------------------------------------------------- Playwright
const intento1 = pw('sprint2-intento1.json');
const estadoIntento1 = Object.fromEntries(
  especsPw(intento1).map((e) => [e.titulo, e.tests[0].results.map((r) => r.status)]),
);
const casosPw = [];
for (const [s, nombre] of [
  [1, 'sprint1.json'],
  [2, 'sprint2.json'],
  [3, 'sprint3.json'],
]) {
  for (const e of especsPw(pw(nombre))) {
    const res = e.tests[0].results[e.tests[0].results.length - 1];
    const caso = {
      sprint: s,
      archivo: `test/sprint${s}/e2e/${path.basename(e.archivo)}`,
      nombre: e.titulo,
      hu: (/^(HU\d+)/.exec(e.titulo) || [])[1] ?? null,
      estado: res.status === 'passed' ? 'Aprobada' : 'Fallida',
      tiempo_ms: res.duration,
    };
    if (s === 2) {
      const prev = estadoIntento1[e.titulo];
      caso.primer_intento = prev?.[0] === 'passed' ? 'Aprobada' : 'Fallida';
      if (caso.primer_intento === 'Fallida')
        caso.observacion =
          'En el primer intento falló porque el inicio de sesión recibió 429 «Demasiados intentos. Espera un momento e inténtalo de nuevo.»: los sprints 1 y 2 se ejecutaron seguidos desde la misma IP y fue el undécimo inicio de sesión dentro del mismo minuto (límite de 10 por minuto). Se repitió el Sprint 2 después de 65 s, sin cambiar código ni datos.';
    }
    casosPw.push(caso);
  }
}
const playwright = {
  comando:
    'sh test/cap9/ejecutar-sprints.sh (seed del sprint + npx playwright test en test/sprint1, test/sprint2 y test/sprint3)',
  sistema: 'Imágenes de producción detrás de nginx (http://localhost:3000)',
  total: casosPw.length,
  aprobadas: casosPw.filter((c) => c.estado === 'Aprobada').length,
  fallidas: casosPw.filter((c) => c.estado === 'Fallida').length,
  casos: casosPw,
  observaciones: [
    'Las 13 pruebas son las 12 de caja negra de los sprints más la preparación del Sprint 2 (el administrador entrena el modelo de recomendación antes de HU6).',
    'Primer intento del Sprint 2: 4 aprobadas y 1 fallida (HU6), por el límite de 10 inicios de sesión por minuto al ejecutar los sprints 1 y 2 seguidos. El límite está documentado y lo comprueba SEG-10; no es un defecto. El script espera ahora 65 s antes de cada sprint.',
    'Las capturas y la evidencia que estas pruebas escriben en docs/pruebas-sprintN y test/sprintN/evidencia se restauraron desde git al terminar; lo observado en esta ejecución quedó en test/cap9/evidencia/playwright/observado-sprintN.',
  ],
};

// ---------------------------------------------------------------- regresión
const unidadJson = leer(path.join(EV, 'jest-unidad.json'));
const actual = {};
for (const t of unidadJson.testResults)
  for (const a of t.assertionResults) {
    const id = (/^(PU-HU\d+-\d+|CB-HU\d+-[A-Z]-C\d+)/.exec(a.title) || [])[1];
    if (id) actual[id] = a.status === 'passed' ? 'Aprobada' : 'Fallida';
  }
const comparacion = [];
const normal = (e) => (/^aprob/i.test(e) || /^correcto$/i.test(e) ? 'Aprobada' : 'Fallida');
for (const s of [1, 2, 3]) {
  const u = leer(path.join(RAIZ, `docs/pruebas-sprint${s}/unitarias/unitarias.json`));
  for (const p of u.pruebas)
    comparacion.push({
      prueba: p.id,
      tipo: 'Unitaria',
      sprint: s,
      antes: normal(p.estado),
      ahora: actual[p.id] ?? 'No encontrada',
    });
  const r = leer(path.join(RAIZ, `docs/pruebas-sprint${s}/resultados.json`));
  for (const cb of r.caja_blanca)
    for (const c of cb.caminos)
      comparacion.push({
        prueba: c.test,
        tipo: `Caja blanca (${cb.id} ${cb.metodo})`,
        sprint: s,
        antes: normal(c.resultado),
        ahora: actual[c.test] ?? 'No encontrada',
      });
  for (const cn of r.caja_negra) {
    const caso = casosPw.find((c) => c.hu === cn.hu && c.sprint === s);
    comparacion.push({
      prueba: `${cn.hu} (caja negra)`,
      tipo: 'Caja negra',
      sprint: s,
      antes: normal(cn.resultado_prueba),
      ahora: caso ? caso.estado : 'No encontrada',
      ...(caso?.observacion ? { observacion: 'En el primer intento falló por el límite de inicios de sesión (ver playwright.casos).' } : {}),
    });
  }
}
const resumenRegresion = {};
for (const c of comparacion) {
  const k = `Sprint ${c.sprint} · ${c.tipo.startsWith('Caja blanca') ? 'Caja blanca (caminos)' : c.tipo}`;
  resumenRegresion[k] ??= { antes_aprobadas: 0, ahora_aprobadas: 0, total: 0 };
  resumenRegresion[k].total++;
  if (c.antes === 'Aprobada') resumenRegresion[k].antes_aprobadas++;
  if (c.ahora === 'Aprobada') resumenRegresion[k].ahora_aprobadas++;
}
// En observado-sprintN quedaron solo los archivos de evidencia que difieren de los versionados.
const difieren = [];
for (const carpeta of ['observado-sprint1', 'observado-sprint2', 'observado-sprint3']) {
  const dir = path.join(EV, 'playwright', carpeta, 'caja-negra');
  if (existe(dir)) for (const f of fs.readdirSync(dir)) difieren.push(f.replace('.json', ''));
}
const esperadas = ['HU12', 'HU2', 'HU3', 'HU7'];
const observacionCajaNegra =
  JSON.stringify([...difieren].sort()) === JSON.stringify(esperadas)
    ? `Lo que observaron las pruebas de caja negra fue idéntico a la evidencia original de su sprint en ${12 - difieren.length} de las 12 historias. En HU2, HU3 y HU12 solo cambió la hora de los registros, que es la del momento de la ejecución. En HU7, el indicador «Permanencia hasta la adopción» pasó de 42,5 a 42,6 días, porque el seed calcula las fechas en relación con el momento en que se ejecuta.`
    : `Historias cuya evidencia observada difiere de la original: ${difieren.join(', ') || 'ninguna'} (ver test/cap9/evidencia/playwright/observado-sprintN).`;
const regresion = {
  criterio:
    'Cada prueba de los sprints se compara con su resultado registrado en docs/pruebas-sprintN (unitarias.json y resultados.json) y con su resultado en esta ejecución.',
  observaciones: [
    observacionCajaNegra,
    'Las dos pruebas unitarias que fallan (PU-HU1-06 y PU-HU2-06) ya fallaban en el Sprint 1: son los defectos de ese sprint, todavía abiertos.',
  ],
  resumen: resumenRegresion,
  comparacion,
  nuevas_fallas: comparacion.filter((c) => c.antes === 'Aprobada' && c.ahora !== 'Aprobada'),
  siguen_fallando: comparacion.filter((c) => c.antes !== 'Aprobada' && c.ahora !== 'Aprobada'),
  corregidas: comparacion.filter((c) => c.antes !== 'Aprobada' && c.ahora === 'Aprobada'),
};

// ------------------------------------------------------------------ sistema
const flujo = leer(path.join(EV, 'sistema-flujo.json'));
const flujoPw = pw('cap9-flujo.json');
const sistema = {
  archivo: 'test/cap9/flujo-completo.spec.ts',
  herramienta: 'Playwright 1.65.1, Chromium, ventana de 1280 × 800',
  datos: 'Seed del Sprint 3; el animal y el adoptante se crearon durante la prueba con datos ficticios.',
  tiempo_s: r2(especsPw(flujoPw)[0].tests[0].results[0].duration / 1000),
  flujo_real: [
    'La vacuna, la cuarentena y la habilitación las registra el Personal Veterinario desde la ficha del animal; la cuarentena se cierra desde la pestaña «Cuarentena» después de registrar un control.',
    'El adoptante no crea la solicitud desde el sitio público: la crea Gestión desde «Solicitudes → Nueva solicitud» (decisión 62 de DECISIONS.md).',
    'La solicitud pasa por «Pendiente» y «En evaluación» antes de registrar el resultado; el acta se genera desde la solicitud aprobada.',
    'El sistema no admite un seguimiento con fecha anterior a la entrega del animal; por eso la entrega se registró 5 minutos antes del seguimiento.',
    'El Personal Directivo ve el «Panel» (descripción «Panel de indicadores») y la pantalla «Indicadores de gestión» del menú «KPIs».',
  ],
  pasos: flujo.pasos,
  estado: flujo.estado,
};

// -------------------------------------------------------------- rendimiento
const SERVICIOS = {
  listado_animales: 'Listado de animales · GET /api/v1/animals?page=1&pageSize=20',
  ficha_animal: 'Ficha de un animal · GET /api/v1/animals/:id',
  historial_clinico: 'Historial clínico · GET /api/v1/animals/:id/timeline',
  panel_indicadores: 'Panel de indicadores · GET /api/v1/dashboard',
  ranking_recomendacion: 'Ranking de recomendación · GET /api/v1/recommendations/adopter/:id',
  catalogo_publico: 'Servicio público · GET /api/v1/public/animals (sin sesión)',
};
const escenarios = [];
const recursos = [];
const mib = (s) => {
  const m = /([\d.]+)\s*([KMG]i?B)/.exec(s);
  if (!m) return null;
  const f = { KiB: 1 / 1024, KB: 1 / 1024, MiB: 1, MB: 1, GiB: 1024, GB: 1024 }[m[2]];
  return Number(m[1]) * f;
};
for (const n of [10, 25, 50]) {
  const archivo = path.join(DOCS, 'reportes', `k6-${n}-usuarios.json`);
  if (!existe(archivo)) continue;
  const d = leer(archivo);
  const m = d.metrics;
  const servicios = Object.entries(SERVICIOS).map(([k, nombre]) => {
    const t = m[`http_req_duration{servicio:${k}}`].values;
    const c = m[`http_reqs{servicio:${k}}`].values;
    const f = m[`http_req_failed{servicio:${k}}`].values;
    const codigos = Object.fromEntries(
      Object.keys(m)
        .filter((x) => x.startsWith(`http_reqs{servicio:${k},status:`) && m[x].values.count > 0)
        .map((x) => [/status:(\d+)/.exec(x)[1], m[x].values.count]),
    );
    return {
      servicio: nombre,
      solicitudes: c.count,
      solicitudes_por_segundo: r2(c.rate),
      p50_ms: r2(t.med),
      p95_ms: r2(t['p(95)']),
      p99_ms: r2(t['p(99)']),
      maximo_ms: r2(t.max),
      promedio_ms: r2(t.avg),
      errores_pct: r2(f.rate * 100),
      codigos_estado: codigos,
    };
  });
  escenarios.push({
    usuarios_virtuales: n,
    configuracion:
      'ramping-vus: subida de 0 a N usuarios en 30 s y carga sostenida 1 min 30 s (2 minutos); cada iteración llama a los 6 servicios en orden y espera 1 s',
    duracion_s: r2(d.state.testRunDurationMs / 1000),
    iteraciones: m.iterations.values.count,
    solicitudes_totales: m.http_reqs.values.count,
    solicitudes_por_segundo: r2(m.http_reqs.values.rate),
    errores_pct: r2(m.http_req_failed.values.rate * 100),
    p95_global_ms: r2(m.http_req_duration.values['p(95)']),
    reporte: `reportes/k6-${n}-usuarios.json`,
    servicios,
  });
  const stats = path.join(EV, 'k6', `stats-${n}.jsonl`);
  const max = {};
  for (const linea of fs.readFileSync(stats, 'utf8').split('\n').filter(Boolean)) {
    const s = JSON.parse(linea);
    const nombre = s.Name.startsWith('k6-cap9') ? 'k6 (generador de carga)' : s.Name;
    const cpu = Number(s.CPUPerc.replace('%', ''));
    const mem = mib(s.MemUsage.split('/')[0]);
    max[nombre] ??= { cpu: 0, mem: 0, muestras: 0, memInicial: mem ?? 0 };
    max[nombre].cpu = Math.max(max[nombre].cpu, cpu);
    max[nombre].mem = Math.max(max[nombre].mem, mem ?? 0);
    max[nombre].muestras++;
  }
  for (const [contenedor, v] of Object.entries(max))
    recursos.push({
      usuarios_virtuales: n,
      contenedor,
      cpu_max_pct: r2(v.cpu),
      memoria_inicial_mb: r2(v.memInicial),
      memoria_max_mb: r2(v.mem),
      muestras: v.muestras,
    });
}
const lighthouse = existe(path.join(EV, 'lighthouse/lighthouse-resumen.json'))
  ? leer(path.join(EV, 'lighthouse/lighthouse-resumen.json')).map((r) => ({
      pagina: r.pagina,
      ruta: r.ruta,
      modo: r.modo,
      rendimiento: r.puntajes.rendimiento,
      accesibilidad: r.puntajes.accesibilidad,
      buenas_practicas: r.puntajes.buenas_practicas,
      seo: r.puntajes.seo,
      fcp_s: r.metricas.fcp_s,
      lcp_s: r.metricas.lcp_s,
      tbt_ms: r.metricas.tbt_ms,
      cls: r.metricas.cls,
      reporte: r.reporte,
    }))
  : [];
const rendimiento = {
  limitador:
    'No hizo falta reemplazar el limitador. En el código, ThrottlerModule.forRoot (10 solicitudes por minuto) solo define la configuración: no está registrado como guardia global (APP_GUARD). ThrottlerGuard se aplica únicamente con @UseGuards en cuatro rutas: POST /auth/login (10 por minuto), POST /chat (15 por minuto) y POST /public/register y POST /public/contact (5 por minuto). Ninguno de los seis servicios de la prueba de carga tiene limitador, y el inicio de sesión se hace una sola vez por escenario en setup(). No se cambió ninguna variable ni se levantó una instancia con overrideGuard. Los resultados lo confirman: ninguna respuesta fue 429.',
  herramienta: 'k6 v2.4.0 (grafana/k6), en un contenedor dentro de la red de Docker del sistema; destino http://backend:4000',
  usuario: 'Gestión Animal y Adopciones (usuario del seed del Sprint 3), un inicio de sesión por escenario',
  datos: 'Animal «Lola» (adoptada, con historial) y la adoptante «Rosa Quiroga Leon» del seed del Sprint 3',
  escenarios,
  recursos,
  recursos_nota:
    'Valores de docker stats tomados cada 1 a 2 s mientras duró cada escenario: memoria_inicial_mb es la primera muestra (al empezar la subida) y los máximos son los mayores valores observados. CPU en porcentaje de un núcleo (100 % = un núcleo completo; el equipo tiene 16 hilos). zoonosis-db-test es la base de prueba. k6 llama directo al backend: el frontend y nginx no reciben solicitudes de la prueba de carga, así que sus valores no dependen de ella.',
  lighthouse,
  lighthouse_nota:
    'Una ejecución por página y modo, contra la compilación de producción detrás de nginx en http://localhost:3000; móvil con la limitación simulada por defecto de Lighthouse y escritorio con --preset=desktop.',
};

// ---------------------------------------------------------------- seguridad
const zapDe = (archivo) => {
  if (!existe(archivo)) return null;
  const r = leer(archivo);
  const riesgos = { 0: 'Informativo', 1: 'Bajo', 2: 'Medio', 3: 'Alto' };
  const confianzas = { 0: 'Falso positivo', 1: 'Baja', 2: 'Media', 3: 'Alta', 4: 'Confirmada' };
  const alertas = [];
  for (const site of r.site || [])
    for (const a of site.alerts || [])
      alertas.push({
        nombre: a.name || a.alert,
        id_regla: Number(a.pluginid),
        riesgo: riesgos[a.riskcode] ?? a.riskdesc,
        confianza: confianzas[a.confidence] ?? a.confidence,
        instancias: Number(a.count ?? (a.instances || []).length),
        cwe: a.cweid && a.cweid !== '-1' ? `CWE-${a.cweid}` : null,
        solucion: soluciones[Number(a.pluginid)] ?? null,
        // El spider de ZAP llena los formularios con valores ficticios («ZAP»); si la URL trae
        // un campo de contraseña, se deja solo la ruta.
        ejemplos: (a.instances || [])
          .slice(0, 3)
          .map((i) => `${i.method} ${/password=/i.test(i.uri) ? i.uri.split('?')[0] + '?…' : i.uri}`),
      });
  const orden = { Alto: 0, Medio: 1, Bajo: 2, Informativo: 3 };
  alertas.sort((x, y) => orden[x.riesgo] - orden[y.riesgo] || x.nombre.localeCompare(y.nombre));
  return { version: r['@version'] ?? null, generado: r['@generated'] ?? null, alertas };
};
const zapF = zapDe(path.join(EV, 'zap/zap-frontend.json'));
const zapA = zapDe(path.join(EV, 'zap/zap-api.json'));
const resumenZap = (z) => {
  const c = { Alto: 0, Medio: 0, Bajo: 0, Informativo: 0 };
  for (const a of z?.alertas ?? []) c[a.riesgo]++;
  return c;
};
if (zapF?.version || zapA?.version) p1.entorno.zap = `${zapF?.version ?? zapA?.version} (imagen ghcr.io/zaproxy/zaproxy:stable)`;

const manuales = [
  ...leer(path.join(EV, 'seguridad-manuales.json')),
  leer(path.join(EV, 'seguridad-seg08.json')),
].sort((a, b) => a.id.localeCompare(b.id));
const seg = (id) => manuales.find((m) => m.id === id);
const ok = (...ids) => ids.every((id) => seg(id)?.estado === 'Aprobada');

const SEVERIDAD = { critical: 'crítica', high: 'alta', moderate: 'moderada', low: 'baja', info: 'informativa' };
const auditDe = (lado) => {
  const a = leer(path.join(EV, `npm-audit-${lado}.json`));
  const m = a.metadata.vulnerabilities;
  const pkg = leer(path.join(RAIZ, `${lado}/package.json`));
  const directas = new Set(Object.keys(pkg.dependencies || {}));
  const filas = [];
  for (const [nombre, v] of Object.entries(a.vulnerabilities)) {
    const fix =
      v.fixAvailable === true
        ? 'Sí (npm audit fix)'
        : v.fixAvailable && typeof v.fixAvailable === 'object'
          ? `Sí: ${v.fixAvailable.name} ${v.fixAvailable.version}${v.fixAvailable.isSemVerMajor ? ' (cambio de versión mayor)' : ''}`
          : 'No';
    const avisos = v.via.filter((x) => typeof x === 'object');
    if (avisos.length)
      for (const x of avisos)
        filas.push({
          paquete: nombre,
          severidad: SEVERIDAD[x.severity] ?? x.severity,
          identificador: (x.url || '').split('/').pop() || null,
          titulo: x.title,
          rango_afectado: x.range,
          dependencia_directa: directas.has(nombre),
          version_corregida: fix,
        });
    else
      filas.push({
        paquete: nombre,
        severidad: SEVERIDAD[v.severity] ?? v.severity,
        identificador: null,
        titulo: `Vulnerable a través de ${v.via.join(', ')}`,
        rango_afectado: v.range,
        dependencia_directa: directas.has(nombre),
        version_corregida: fix,
      });
  }
  return {
    resumen: {
      criticas: m.critical,
      altas: m.high,
      moderadas: m.moderate,
      bajas: m.low,
      informativas: m.info,
      total: m.total,
    },
    vulnerabilidades: filas,
  };
};
const auditB = auditDe('backend');
const auditF = auditDe('frontend');
const altas = (x) => x.resumen.altas + x.resumen.criticas;

const owasp = [
  {
    id: 'A01:2021',
    nombre: 'Pérdida de control de acceso',
    control:
      'JwtAuthGuard global (toda ruta exige token salvo @Public), RolesGuard que niega por defecto, regla RN-02 (solo el autor corrige un registro clínico) y ValidationPipe con whitelist y forbidNonWhitelisted.',
    comprobacion: 'SEG-01, SEG-04, SEG-05 y SEG-07; pruebas de integración de permisos (401 y 403); escaneo de la API con ZAP.',
    estado: ok('SEG-01', 'SEG-04', 'SEG-05', 'SEG-07') ? 'Cumple' : 'Parcial',
  },
  {
    id: 'A02:2021',
    nombre: 'Fallas criptográficas',
    control:
      'Contraseñas con bcrypt (costo 10), tokens JWT firmados con claves del entorno, refresh token guardado como hash SHA-256 en cookie HttpOnly, HTTPS en producción con nginx (templates-ip-tls).',
    comprobacion:
      'SEG-02 y SEG-03; revisión del código (auth.service.ts, password-policy.ts, deploy/nginx). La plantilla de producción con HTTPS por IP no envía Strict-Transport-Security, y el TLS no se pudo reproducir en local.',
    estado: 'Parcial',
  },
  {
    id: 'A03:2021',
    nombre: 'Inyección',
    control:
      'Prisma con consultas parametrizadas (las consultas SQL directas usan plantillas $queryRaw/$executeRaw, sin variantes Unsafe), validación de entrada con class-validator y React escapa el contenido al mostrarlo.',
    comprobacion: 'SEG-06 (inyección SQL), SEG-08 (XSS almacenado), reglas activas de inyección del escaneo de la API con ZAP.',
    estado: ok('SEG-06', 'SEG-08') ? 'Cumple' : 'No cumple',
  },
  {
    id: 'A04:2021',
    nombre: 'Diseño inseguro',
    control:
      'Reglas de negocio validadas en el backend (máquina de estados del animal y de la solicitud, RN-03 a RN-07), bloqueo de cuenta tras 5 intentos y límites de solicitudes en el inicio de sesión y el portal público.',
    comprobacion: 'Pruebas de integración de reglas de negocio, SEG-09, SEG-10 y SEG-19.',
    estado: ok('SEG-09', 'SEG-10', 'SEG-19') ? 'Cumple' : 'Parcial',
  },
  {
    id: 'A05:2021',
    nombre: 'Configuración de seguridad incorrecta',
    control:
      'helmet en la API, CORS limitado al origen del frontend, errores normalizados sin traza (AllExceptionsFilter) y cabeceras nosniff y Referrer-Policy en nginx.',
    comprobacion: `SEG-13 (${seg('SEG-13')?.estado}), SEG-14 (${seg('SEG-14')?.estado}), SEG-15 (${seg('SEG-15')?.estado}), SEG-18 (${seg('SEG-18')?.estado}) y escaneo base del frontend con ZAP.`,
    estado: ok('SEG-13', 'SEG-14', 'SEG-15', 'SEG-18') ? 'Cumple' : 'Parcial',
  },
  {
    id: 'A06:2021',
    nombre: 'Componentes vulnerables y desactualizados',
    control: 'Archivos package-lock.json y npm ci en el CI; no hay una revisión automática de vulnerabilidades (npm audit o Dependabot) en el CI.',
    comprobacion: `npm audit --omit=dev: backend ${altas(auditB)} altas/críticas, frontend ${altas(auditF)} altas/críticas.`,
    estado: altas(auditB) + altas(auditF) > 0 ? 'No cumple' : 'Cumple',
  },
  {
    id: 'A07:2021',
    nombre: 'Fallas de identificación y autenticación',
    control:
      'Política de contraseñas (8 caracteres con letra y número), bloqueo de 10 minutos tras 5 intentos, limitador de inicio de sesión, token de acceso de 15 minutos, rotación del refresh token y efecto inmediato de la desactivación (RN-10).',
    comprobacion: 'SEG-03, SEG-09, SEG-10, SEG-16 y SEG-17; pruebas de integración de autenticación.',
    estado: ok('SEG-03', 'SEG-09', 'SEG-10', 'SEG-16', 'SEG-17') ? 'Cumple' : 'Parcial',
  },
  {
    id: 'A08:2021',
    nombre: 'Fallas en la integridad del software y de los datos',
    control:
      'Instalación con npm ci y package-lock.json, despliegue por OIDC sin claves guardadas, imágenes etiquetadas con el SHA del commit y validación de las fotos por su contenido (magic bytes).',
    comprobacion:
      'SEG-11 y revisión de .github/workflows: las acciones se fijan por versión mayor (no por SHA) y las imágenes no se firman.',
    estado: 'Parcial',
  },
  {
    id: 'A09:2021',
    nombre: 'Fallas en el registro y el monitoreo de seguridad',
    control:
      'Solo se registran en la salida estándar los errores no controlados (AllExceptionsFilter). La auditoría salió del alcance (/audit responde 404) y DEPLOY.md indica que no hay monitoreo ni alertas.',
    comprobacion: 'Revisión del código y de DEPLOY.md; prueba de integración CU17 (/audit, /alerts y /reports responden 404).',
    estado: 'No cumple',
  },
  {
    id: 'A10:2021',
    nombre: 'Falsificación de solicitudes del lado del servidor (SSRF)',
    control:
      'El backend no pide recursos a URL enviadas por el usuario: solo usa los SDK de S3 y de Anthropic con destinos fijos y SMTP configurado por variables.',
    comprobacion: 'Revisión del código: no hay fetch, axios ni http.request en backend/src.',
    estado: 'No aplica',
  },
];

const seguridad = {
  zap: {
    frontend: zapF?.alertas ?? [],
    api: zapA?.alertas ?? [],
    resumen: {
      frontend: resumenZap(zapF),
      api: resumenZap(zapA),
      configuracion: {
        frontend: 'zap-baseline.py -t http://nginx (escaneo pasivo con spider de 1 minuto)',
        api: 'zap-api-scan.py -t http://backend-zap:4000/api/docs-json -f openapi, autenticado como Gestión Animal y Adopciones; duración máxima del escaneo activo 30 min y 3 min por regla',
      },
      reportes: ['reportes/zap-frontend.html', 'reportes/zap-api.html'],
    },
  },
  manuales,
  manuales_resumen: {
    total: manuales.length,
    aprobadas: manuales.filter((m) => m.estado === 'Aprobada').length,
    fallidas: manuales.filter((m) => m.estado === 'Fallida').length,
    archivos: ['test/cap9/seguridad.e2e-spec.ts (Supertest)', 'test/cap9/seg08-xss.spec.ts (Playwright)'],
  },
  owasp_top10: owasp,
  npm_audit: {
    backend: auditB.vulnerabilidades,
    frontend: auditF.vulnerabilidades,
    resumen: { backend: auditB.resumen, frontend: auditF.resumen },
  },
};

// ------------------------------------------------------------ accesibilidad
const reglasEs = {
  'color-contrast': 'El contraste entre el texto y el fondo no alcanza la relación mínima de WCAG 2 AA.',
  'landmark-one-main': 'La página no tiene una región principal (main).',
  region: 'Hay contenido fuera de las regiones (landmarks) de la página.',
  'role-img-alt': 'Hay elementos con role="img" sin texto alternativo.',
  'heading-order': 'Los niveles de los encabezados no siguen un orden lógico.',
  'button-name': 'Hay botones sin un nombre accesible.',
  'link-name': 'Hay enlaces sin un nombre accesible.',
  label: 'Hay campos de formulario sin etiqueta.',
  'image-alt': 'Hay imágenes sin texto alternativo.',
  'aria-allowed-attr': 'Hay atributos ARIA no permitidos para el rol del elemento.',
  'page-has-heading-one': 'La página no tiene un encabezado de nivel 1.',
};
const accesibilidad = leer(path.join(EV, 'accesibilidad.json')).map((p) => ({
  pagina: p.pagina,
  ruta: p.ruta.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/, ':id'),
  rol: p.rol,
  total_violaciones: p.violaciones.length,
  elementos_afectados: p.violaciones.reduce((s, v) => s + v.elementos, 0),
  violaciones: p.violaciones.map((v) => ({
    regla: v.regla,
    impacto: { critical: 'crítico', serious: 'grave', moderate: 'moderado', minor: 'menor' }[v.impacto] ?? v.impacto,
    impacto_axe: v.impacto,
    elementos: v.elementos,
    descripcion: reglasEs[v.regla] ?? v.descripcion,
    criterios: v.etiquetas,
  })),
  reglas_aprobadas: p.reglas_aprobadas,
}));

// -------------------------------------------------------------- grafos S3
const s3 = leer(path.join(RAIZ, 'docs/pruebas-sprint3/resultados.json'));
const grafos_sprint3 = ['CB-HU9-B', 'CB-HU12-A'].map((id) => s3.caja_blanca.find((c) => c.id === id));

// ---------------------------------------------------------------- defectos
const defectos = [];
let n = 0;
const nuevoDefecto = (d) => defectos.push({ id: `DEF-CAP9-${String(++n).padStart(2, '0')}`, estado: 'Abierto', ...d });
if (seg('SEG-18')?.estado === 'Fallida')
  nuevoDefecto({
    titulo: 'La documentación Swagger de la API es pública con la configuración de producción',
    severidad: 'Media',
    origen: 'SEG-18',
    descripcion: seg('SEG-18').obtenido,
    ubicacion:
      'backend/src/main.ts (SwaggerModule.setup se ejecuta siempre) y deploy/nginx (la ruta /api/ se envía completa al backend)',
    recomendacion:
      'Publicar Swagger solo fuera de producción (por ejemplo, con una variable de entorno) o protegerlo con autenticación.',
  });
if (seg('SEG-13')?.estado === 'Fallida')
  nuevoDefecto({
    titulo: 'El frontend no envía protección contra el encuadre (clickjacking) ni Content-Security-Policy',
    severidad: 'Media',
    origen: 'SEG-13 y escaneo base de ZAP',
    descripcion: seg('SEG-13').obtenido,
    ubicacion: 'frontend/next.config.ts (sin headers()) y deploy/nginx/templates-*/app.conf.template',
    recomendacion:
      'Agregar X-Frame-Options: DENY (o CSP frame-ancestors) y una Content-Security-Policy para las páginas del frontend.',
  });
const axeGraves = {};
for (const p of accesibilidad)
  for (const v of p.violaciones)
    if (['critical', 'serious'].includes(v.impacto_axe)) {
      axeGraves[v.regla] ??= {
        impacto: v.impacto,
        impactoAxe: v.impacto_axe,
        paginas: [],
        elementos: 0,
        descripcion: v.descripcion,
      };
      axeGraves[v.regla].paginas.push(p.pagina);
      axeGraves[v.regla].elementos += v.elementos;
    }
for (const [regla, v] of Object.entries(axeGraves))
  nuevoDefecto({
    titulo: `Accesibilidad: ${v.descripcion.charAt(0).toLowerCase()}${v.descripcion.slice(1).replace(/\.$/, '')} (regla ${regla})`,
    severidad: v.impactoAxe === 'critical' ? 'Alta' : 'Media',
    origen: 'axe-core',
    descripcion: `Impacto ${v.impacto} («${v.impactoAxe}» en axe) en ${v.paginas.length} de 7 pantallas (${v.paginas.join(', ')}); ${v.elementos} elementos afectados.`,
    ubicacion: 'frontend/src (estilos y componentes de esas pantallas)',
    recomendacion:
      regla === 'color-contrast'
        ? 'Oscurecer los colores de texto afectados hasta alcanzar 4,5:1 (texto normal) o 3:1 (texto grande).'
        : 'Agregar aria-label (o el texto alternativo que corresponda) a los elementos con role="img".',
  });
if (altas(auditB) > 0 || altas(auditF) > 0)
  nuevoDefecto({
    titulo: 'Dependencias de producción con vulnerabilidades de severidad alta',
    severidad: 'Alta',
    origen: 'npm audit --omit=dev',
    descripcion: `Backend: ${auditB.resumen.altas} altas (prisma → @prisma/config → deepmerge-ts). Frontend: ${auditF.resumen.altas} altas y ${auditF.resumen.moderadas} moderada (postcss a través de next, y zod). Todas tienen versión corregida, con cambio de versión mayor.`,
    ubicacion: 'backend/package.json y frontend/package.json',
    recomendacion: 'Planificar la actualización de prisma, next y zod a las versiones corregidas y volver a ejecutar las pruebas.',
    nota: 'Ya figuraba en datos-sqap.json; se confirma con el detalle por aviso.',
  });
const alertaZap = (z, id) => (z?.alertas ?? []).find((a) => a.id_regla === id);
if (alertaZap(zapF, 10021))
  nuevoDefecto({
    titulo: 'Los archivos de /_next/static/ se sirven sin X-Content-Type-Options ni Referrer-Policy',
    severidad: 'Baja',
    origen: 'Escaneo base de ZAP (regla 10021)',
    descripcion: `${alertaZap(zapF, 10021).instancias} respuestas de /_next/static/ sin X-Content-Type-Options. En nginx, el location /_next/static/ define su propio add_header (Cache-Control) y por eso no hereda los add_header del bloque server.`,
    ubicacion: 'deploy/nginx/templates*/app.conf.template (location /_next/static/)',
    recomendacion: 'Repetir los add_header de seguridad dentro de ese location o moverlos a un archivo incluido en cada location.',
  });
if (alertaZap(zapA, 100000))
  nuevoDefecto({
    titulo: 'Entradas con el carácter nulo o identificadores fuera de rango provocan errores 500',
    severidad: 'Baja',
    origen: 'Escaneo de la API con ZAP (regla 100000)',
    descripcion:
      'El escaneo activo obtuvo 500 en GET /animals, /adopters, /adoptions y /contact-messages con q=%00, en PATCH /auth/me y en GET /ml/models/816432691334276512 (además del 503 esperado del asistente sin clave de la API). Se reprodujo a mano con test/cap9/reproducir-500.js (evidencia/zap/reproduccion-500.txt): las búsquedas normales responden 200 y una versión inexistente dentro del rango responde 404. El registro del backend muestra la causa: PostgreSQL rechaza el carácter nulo con el error 22021 «invalid byte sequence for encoding UTF8: 0x00». La respuesta es genérica y no expone detalles internos, pero el error no se controla como una validación (400 o 404).',
    ubicacion:
      'DTO de búsqueda y de perfil (el carácter nulo llega a PostgreSQL) y ml.controller.ts (ParseIntPipe acepta valores fuera del rango de Int)',
    recomendacion:
      'Rechazar el carácter nulo en la validación de texto y limitar los identificadores numéricos al rango de la base, respondiendo 400.',
  });
if (alertaZap(zapF, 10024))
  nuevoDefecto({
    titulo: 'Los formularios públicos no declaran method="post": sin JavaScript, los datos viajan en la URL',
    severidad: 'Baja',
    origen: 'Escaneo base de ZAP (regla 10024)',
    descripcion:
      'El spider de ZAP envió los formularios de registro y de contacto sin ejecutar JavaScript y los datos quedaron en la URL, incluido el campo de contraseña del registro. Ocurre si el formulario se envía antes de que cargue la aplicación.',
    ubicacion: 'frontend/src (formularios de /registro, /login y contacto)',
    recomendacion: 'Declarar method="post" en los formularios para que, sin JavaScript, los datos no vayan en la URL.',
  });
if (alertaZap(zapF, 10036) || alertaZap(zapF, 10063) || alertaZap(zapF, 90004))
  nuevoDefecto({
    titulo: 'nginx revela su versión y faltan cabeceras de endurecimiento',
    severidad: 'Baja',
    origen: 'Escaneo base de ZAP (reglas 10036, 10063 y 90004)',
    descripcion:
      'La cabecera Server muestra «nginx/1.29.8» y las páginas no envían Permissions-Policy ni Cross-Origin-Embedder-Policy.',
    ubicacion: 'deploy/nginx/templates*/app.conf.template',
    recomendacion: 'Agregar server_tokens off y las cabeceras Permissions-Policy y Cross-Origin-Embedder-Policy que correspondan.',
  });
for (const a of [...(zapF?.alertas ?? []), ...(zapA?.alertas ?? [])].filter((x) => x.riesgo === 'Alto'))
  nuevoDefecto({
    titulo: `ZAP: ${a.nombre}`,
    severidad: 'Alta',
    origen: 'OWASP ZAP',
    descripcion: `${a.instancias} instancias; ejemplos: ${a.ejemplos.join('; ')}`,
    ubicacion: 'Ver el reporte de ZAP',
    recomendacion: a.solucion,
  });

module.exports = {
  playwright,
  regresion,
  sistema,
  rendimiento,
  seguridad,
  accesibilidad,
  grafos_sprint3,
  defectos,
  manuales,
  zapF,
  zapA,
  auditB,
  auditF,
};

require('./generar-datos-3.js');
