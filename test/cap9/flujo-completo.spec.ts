import { expect, test, type Page } from '@playwright/test';
import {
  captura,
  fecha,
  fechaHora,
  guardarEvidencia,
  login,
  nuevaPagina,
  USUARIOS,
} from './helpers';

/**
 * Prueba de sistema: ciclo completo de un animal, cada paso con el usuario de su rol y por la
 * interfaz real (http://localhost:3000, imágenes de producción detrás de nginx).
 *
 * Datos: seed del Sprint 3 (test/sprint3/seed-sprint3.ts). El animal y el adoptante se crean
 * durante la prueba con datos ficticios.
 */

type Estado = 'Correcto' | 'Fallido' | 'No ejecutado';

interface Paso {
  paso: string;
  rol: string;
  accion: string;
  esperado: string;
  obtenido: string;
  estado: Estado;
  captura: string | null;
}

const PLAN: Omit<Paso, 'obtenido' | 'estado'>[] = [
  {
    paso: '01',
    rol: 'Gestión Animal y Adopciones',
    accion: 'Registrar el animal desde «Animales → Registrar animal».',
    esperado:
      'El sistema guarda el animal, le asigna un código ZOO-AAAA-NNNN y lo deja en la situación «Ingresado».',
    captura: 'SIS-paso-01.png',
  },
  {
    paso: '02',
    rol: 'Personal Veterinario',
    accion: 'Registrar una consulta veterinaria del animal («Nueva consulta»).',
    esperado: 'El sistema guarda la consulta con el veterinario autor y muestra sus datos.',
    captura: 'SIS-paso-02.png',
  },
  {
    paso: '03',
    rol: 'Personal Veterinario',
    accion: 'Registrar una vacuna antirrábica con lote y próxima dosis (pestaña «Vacunas»).',
    esperado: 'El sistema registra la vacuna y la muestra en la pestaña con su lote.',
    captura: null,
  },
  {
    paso: '04',
    rol: 'Personal Veterinario',
    accion: 'Abrir un periodo de cuarentena («Iniciar cuarentena»).',
    esperado: 'El sistema abre el periodo y el animal pasa a «En cuarentena».',
    captura: 'SIS-paso-03.png',
  },
  {
    paso: '05',
    rol: 'Personal Veterinario',
    accion: 'Registrar un control y cerrar la cuarentena («Cerrar periodo»).',
    esperado: 'El sistema cierra el periodo y el animal vuelve a «Ingresado».',
    captura: null,
  },
  {
    paso: '06',
    rol: 'Personal Veterinario',
    accion: 'Habilitar el animal para adopción.',
    esperado:
      'El sistema comprueba los requisitos (consulta registrada, sin cuarentena ni tratamiento activos) y el animal pasa a «Disponible para adopción».',
    captura: 'SIS-paso-04.png',
  },
  {
    paso: '07',
    rol: 'Gestión Animal y Adopciones',
    accion: 'Registrar al adoptante («Adoptantes → Nuevo adoptante»).',
    esperado: 'El sistema guarda al adoptante y muestra su ficha con el perfil de evaluación.',
    captura: 'SIS-paso-05.png',
  },
  {
    paso: '08',
    rol: 'Gestión Animal y Adopciones',
    accion: 'Ver la recomendación («Ver animales recomendados»).',
    esperado:
      'El sistema muestra un ranking de animales disponibles con puntaje de 0 a 100, ordenado de mayor a menor, que incluye al animal habilitado.',
    captura: 'SIS-paso-06.png',
  },
  {
    paso: '09',
    rol: 'Gestión Animal y Adopciones',
    accion: 'Crear la solicitud de adopción del adoptante para el animal.',
    esperado:
      'El sistema crea la solicitud en «Pendiente» y el animal pasa a «En proceso de adopción».',
    captura: 'SIS-paso-07.png',
  },
  {
    paso: '10',
    rol: 'Gestión Animal y Adopciones',
    accion: 'Evaluar la solicitud («Pasar a evaluación»).',
    esperado: 'La solicitud pasa a «En evaluación».',
    captura: null,
  },
  {
    paso: '11',
    rol: 'Gestión Animal y Adopciones',
    accion: 'Aprobar la solicitud con la fecha de entrega («Registrar resultado»).',
    esperado: 'La solicitud queda «Aprobada» y el animal pasa a «Adoptado».',
    captura: 'SIS-paso-08.png',
  },
  {
    paso: '12',
    rol: 'Gestión Animal y Adopciones',
    accion: 'Ver el acta de entrega («Generar acta»).',
    esperado:
      'El sistema muestra el acta de adopción responsable con los datos del animal (código) y del adoptante.',
    captura: 'SIS-paso-09.png',
  },
  {
    paso: '13',
    rol: 'Gestión Animal y Adopciones',
    accion: 'Registrar un seguimiento post-adopción («Nuevo seguimiento»).',
    esperado: 'El sistema guarda el seguimiento y lo muestra en la lista de la solicitud.',
    captura: 'SIS-paso-10.png',
  },
  {
    paso: '14',
    rol: 'Personal Directivo',
    accion: 'Ver el panel de indicadores («Panel») y los indicadores de gestión.',
    esperado:
      'El sistema muestra el panel con sus tarjetas y gráficos, y los seis indicadores de gestión.',
    captura: 'SIS-paso-11.png',
  },
  {
    paso: '15',
    rol: 'Visitante (sin iniciar sesión)',
    accion: 'Ver el sitio público y enviar el formulario de contacto.',
    esperado:
      'El sitio público se muestra sin iniciar sesión y el formulario confirma «¡Gracias! Recibimos tu mensaje.».',
    captura: 'SIS-paso-12.png',
  },
];

const resultados = new Map<string, Pick<Paso, 'obtenido' | 'estado'>>();

async function paso(id: string, fn: () => Promise<string>) {
  try {
    const obtenido = await fn();
    resultados.set(id, { obtenido, estado: 'Correcto' });
  } catch (err) {
    const msg = (err instanceof Error ? err.message : String(err)).split('\n')[0].slice(0, 300);
    resultados.set(id, { obtenido: `No se completó: ${msg}`, estado: 'Fallido' });
    throw err;
  }
}

function texto(page: Page) {
  return page.getByRole('main').innerText();
}

test.afterAll(() => {
  const pasos: Paso[] = PLAN.map((p) => ({
    ...p,
    ...(resultados.get(p.paso) ?? {
      obtenido: 'No se ejecutó porque falló un paso anterior.',
      estado: 'No ejecutado' as Estado,
    }),
  }));
  guardarEvidencia('sistema-flujo.json', {
    estado: pasos.every((p) => p.estado === 'Correcto') ? 'Correcto' : 'Fallido',
    pasos,
  });
});

test('Sistema: ciclo completo de un animal, del ingreso al seguimiento post-adopción', async ({
  browser,
}) => {
  test.setTimeout(600_000);
  const sufijo = Date.now().toString().slice(-5);
  const nombreAnimal = `Nube ${sufijo}`;
  const ci = `CAP9-${sufijo}`;
  const adoptante = 'Mariela Prueba Sistema';
  let animalPath = '';
  let codigo = '';
  let solicitudPath = '';

  // ---------------------------------------------------------------- Gestión
  const pg = await nuevaPagina(browser);
  await login(pg, USUARIOS.gestion);

  await paso('01', async () => {
    await pg.getByRole('link', { name: 'Animales' }).click();
    await pg.getByRole('link', { name: 'Registrar animal' }).click();
    const m = pg.getByRole('main');
    await expect(m.getByRole('heading', { name: 'Registrar animal' })).toBeVisible();
    await m.getByLabel('Nombre').fill(nombreAnimal);
    await m.getByLabel('Especie').selectOption({ label: 'Perro' });
    await m.getByLabel('Sexo').selectOption({ label: 'Hembra' });
    await m.getByLabel('Edad aproximada (meses)').fill('18');
    await m.getByLabel('Color').fill('Blanco');
    await m.getByLabel('Tamaño').selectOption({ label: 'Mediano' });
    await m.getByLabel('Fecha de ingreso').fill(fecha(0));
    await m.getByLabel('Motivo de ingreso').fill('Rescate en vía pública (prueba de sistema)');
    await m.getByLabel('Nivel de energía (1–5)').selectOption('3');
    await m.getByLabel('Horas diarias de atención requeridas').fill('2');
    await m.getByLabel('Se lleva bien con niños').check();
    await pg.getByRole('button', { name: 'Registrar animal' }).click();
    await pg.waitForURL(/\/animales\/[0-9a-f-]{36}$/);
    await expect(pg.getByText('Datos del animal')).toBeVisible();
    animalPath = new URL(pg.url()).pathname;
    codigo = /ZOO-\d{4}-\d{4}/.exec(await texto(pg))?.[0] ?? '';
    await expect(pg.getByRole('main').getByText('Ingresado', { exact: true }).first()).toBeVisible();
    await captura(pg, 'SIS-paso-01.png');
    expect(codigo).toMatch(/^ZOO-\d{4}-\d{4}$/);
    return `Se registró «${nombreAnimal}» con el código ${codigo} en la situación «Ingresado».`;
  });

  // ------------------------------------------------------------ Veterinario
  const pv = await nuevaPagina(browser);
  await login(pv, USUARIOS.veterinario);
  const mv = pv.getByRole('main');

  await paso('02', async () => {
    await pv.getByRole('link', { name: 'Animales' }).click();
    await pv.getByPlaceholder('Buscar por código o nombre').fill(nombreAnimal);
    await pv.getByRole('link', { name: new RegExp(nombreAnimal) }).first().click();
    await pv.getByRole('link', { name: 'Nueva consulta' }).click();
    await expect(mv.getByRole('heading', { name: 'Nueva consulta veterinaria' })).toBeVisible();
    await mv.getByLabel('Motivo').fill('Control de ingreso');
    await mv.getByLabel('Peso (kg)').fill('14.2');
    await mv.getByLabel('Temperatura (°C)').fill('38.6');
    await pv.getByLabel('Evaluación clínica').fill('Buen estado general, mucosas rosadas, sin dolor.');
    await pv.getByRole('button', { name: 'Guardar consulta' }).click();
    await pv.waitForURL(/\/consultas\/[0-9a-f-]{36}$/);
    await expect(pv.getByText('Datos de la consulta')).toBeVisible();
    const t = await texto(pv);
    await captura(pv, 'SIS-paso-02.png');
    expect(t).toContain('Veterinario de Prueba');
    return 'Se guardó la consulta «Control de ingreso» (14.2 kg, 38.6 °C) con el veterinario autor visible.';
  });

  await paso('03', async () => {
    await pv.goto(animalPath);
    await pv.getByRole('tab', { name: /Vacunas/ }).click();
    await pv.getByRole('button', { name: 'Nueva vacuna' }).click();
    const d = pv.getByRole('dialog');
    const opciones = await d.getByLabel('Vacuna').locator('option').allInnerTexts();
    const antirrabica = opciones.find((o) => /rr[aá]bica/i.test(o)) ?? opciones[1];
    await d.getByLabel('Vacuna').selectOption({ label: antirrabica });
    await d.getByLabel('Fecha de aplicación').fill(fecha(0));
    await d.getByLabel('Dosis', { exact: false }).first().fill('1 ml');
    await d.getByLabel('Lote').fill('CAP9-0001');
    await d.getByLabel('Próxima dosis').fill(fecha(365));
    await d.getByRole('button', { name: 'Registrar' }).click();
    await expect(pv.getByText('Vacuna registrada')).toBeVisible();
    await expect(pv.locator('#animal-panel-vacunas').getByText('CAP9-0001')).toBeVisible();
    return `Se registró la vacuna «${antirrabica}» con el lote CAP9-0001 y aparece en la pestaña «Vacunas».`;
  });

  await paso('04', async () => {
    await pv.getByRole('button', { name: 'Iniciar cuarentena' }).click();
    const d = pv.getByRole('dialog');
    await expect(d.getByText('Iniciar observación / cuarentena')).toBeVisible();
    await d.getByLabel('Tipo').selectOption({ label: 'Cuarentena' });
    await d.getByLabel('Fin estimado').fill(`${fecha(14)}T09:00`);
    await d.getByLabel('Motivo').fill('Aislamiento preventivo de ingreso (prueba de sistema).');
    await d.getByRole('button', { name: 'Iniciar', exact: true }).click();
    await expect(pv.getByText('Periodo iniciado')).toBeVisible();
    await expect(mv.getByText('En cuarentena', { exact: true }).first()).toBeVisible();
    await captura(pv, 'SIS-paso-03.png');
    return 'Se abrió el periodo de cuarentena y la situación del animal cambió a «En cuarentena».';
  });

  await paso('05', async () => {
    await pv.getByRole('tab', { name: /Cuarentena/ }).click();
    const panel = pv.locator('#animal-panel-cuarentena');
    await panel.getByRole('button', { name: 'Registrar control' }).click();
    const c = pv.getByRole('dialog');
    await c.getByLabel('Condición del animal').fill('Estable, sin síntomas');
    await c.getByLabel('Observaciones').fill('Control diario sin novedades.');
    await c.getByRole('button', { name: 'Guardar' }).click();
    await expect(pv.getByText('Control registrado')).toBeVisible();
    await panel.getByRole('button', { name: 'Cerrar periodo' }).click();
    const cierre = pv.getByRole('dialog');
    await cierre.getByLabel('Observaciones finales').fill('Sin signos de enfermedad durante el aislamiento.');
    await cierre.getByRole('button', { name: 'Cerrar periodo' }).click();
    await expect(pv.getByText('Periodo cerrado')).toBeVisible();
    await expect(mv.getByText('Ingresado', { exact: true }).first()).toBeVisible();
    return 'Se registró un control, se cerró la cuarentena y el animal volvió a «Ingresado».';
  });

  await paso('06', async () => {
    await pv.getByRole('button', { name: 'Habilitar para adopción' }).click();
    await pv.getByRole('button', { name: 'Habilitar', exact: true }).click();
    await expect(pv.getByText('Animal habilitado para adopción')).toBeVisible();
    await expect(mv.getByText('Disponible para adopción', { exact: true }).first()).toBeVisible();
    await captura(pv, 'SIS-paso-04.png');
    return 'El sistema aceptó la habilitación y el animal quedó «Disponible para adopción».';
  });

  // ---------------------------------------------------------------- Gestión
  const mg = pg.getByRole('main');

  await paso('07', async () => {
    await pg.getByRole('link', { name: 'Adoptantes' }).click();
    await pg.getByRole('link', { name: 'Nuevo adoptante' }).click();
    await mg.getByLabel('Cédula de identidad (CI)').fill(ci);
    await mg.getByLabel('Nombres').fill('Mariela');
    await mg.getByLabel('Apellidos').fill('Prueba Sistema');
    await mg.getByLabel('Teléfono').fill('70000001');
    await mg.getByLabel('Tipo de vivienda').selectOption({ label: 'Casa con patio' });
    await mg.getByLabel('Horas diarias disponibles').fill('4');
    await mg.getByLabel('Experiencia con animales').selectOption({ label: 'Básica' });
    await mg.getByLabel('Especie preferida').selectOption({ label: 'Perro' });
    await mg.getByLabel('Tamaño preferido').selectOption({ label: 'Mediano' });
    await mg.getByLabel('Tiene patio').check();
    await pg.getByRole('button', { name: 'Registrar adoptante' }).click();
    await pg.waitForURL(/\/adoptantes\/[0-9a-f-]{36}$/);
    await expect(pg.getByText('Adoptante registrado')).toBeVisible();
    await expect(pg.getByRole('heading', { name: adoptante })).toBeVisible();
    await expect(pg.getByText('Perfil de evaluación')).toBeVisible();
    await captura(pg, 'SIS-paso-05.png');
    return `Se registró a ${adoptante} (CI ${ci}, ficticia) y se mostró su ficha con el perfil de evaluación.`;
  });

  await paso('08', async () => {
    await pg.getByRole('button', { name: 'Ver animales recomendados' }).click();
    const tarjeta = pg
      .locator('div.mb-6', { has: pg.getByText('Animales recomendados', { exact: true }) })
      .last();
    await expect(tarjeta.getByRole('meter').first()).toBeVisible({ timeout: 30_000 });
    const medidores = tarjeta.getByRole('meter');
    const puntajes: number[] = [];
    for (let i = 0; i < (await medidores.count()); i++) {
      puntajes.push(Number(await medidores.nth(i).getAttribute('aria-valuenow')));
    }
    const nombres = (await tarjeta.locator('ol > li a[href^="/animales/"]').allInnerTexts()).map(
      (n) => n.trim(),
    );
    const posicion = nombres.findIndex((n) => n.includes(nombreAnimal));
    await tarjeta.scrollIntoViewIfNeeded();
    await captura(pg, 'SIS-paso-06.png');
    const ordenado = puntajes.every((p, i) => i === 0 || puntajes[i - 1] >= p);
    expect(posicion).toBeGreaterThanOrEqual(0);
    expect(ordenado).toBe(true);
    expect(puntajes.every((p) => p >= 0 && p <= 100)).toBe(true);
    return `El ranking mostró ${nombres.length} animales ordenados de mayor a menor (${nombres
      .map((n, i) => `${n}: ${puntajes[i]}`)
      .join('; ')}); «${nombreAnimal}» quedó en la posición ${posicion + 1}.`;
  });

  await paso('09', async () => {
    await pg.getByRole('link', { name: 'Solicitudes' }).click();
    await pg.getByRole('link', { name: 'Nueva solicitud' }).click();
    await expect(pg.getByRole('heading', { name: 'Nueva solicitud de adopción' })).toBeVisible();
    await pg.getByLabel('Buscar adoptante por CI o nombre').fill(ci);
    await pg
      .getByRole('listbox', { name: 'Adoptantes' })
      .getByRole('button', { name: new RegExp(adoptante) })
      .click();
    await pg
      .getByRole('listbox', { name: 'Animales disponibles' })
      .getByRole('button', { name: new RegExp(nombreAnimal) })
      .click();
    await expect(pg.getByText('3. Revisión')).toBeVisible();
    await pg.getByLabel('Notas iniciales').fill('Solicitud de la prueba de sistema completo.');
    await pg.getByRole('button', { name: 'Crear solicitud' }).click();
    await pg.waitForURL(/\/solicitudes\/[0-9a-f-]{36}$/);
    solicitudPath = new URL(pg.url()).pathname;
    await expect(
      pg.getByText('Solicitud creada. El animal pasó a «En proceso de adopción».'),
    ).toBeVisible();
    await expect(mg.getByText('Pendiente', { exact: true }).first()).toBeVisible();
    await expect(mg.getByText('En proceso de adopción', { exact: true }).first()).toBeVisible();
    await captura(pg, 'SIS-paso-07.png');
    return 'Se creó la solicitud en «Pendiente» y el animal pasó a «En proceso de adopción».';
  });

  await paso('10', async () => {
    await pg.getByRole('button', { name: 'Pasar a evaluación' }).click();
    const d = pg.getByRole('dialog');
    await d.getByLabel('Nota de evaluación').fill('Entrevista realizada; se inicia la evaluación.');
    await d.getByRole('button', { name: 'Confirmar' }).click();
    await expect(mg.getByText('En evaluación', { exact: true }).first()).toBeVisible();
    return 'La solicitud pasó a «En evaluación».';
  });

  await paso('11', async () => {
    await pg.getByRole('button', { name: 'Registrar resultado' }).click();
    const d = pg.getByRole('dialog');
    await expect(d.getByText('Registrar resultado de adopción')).toBeVisible();
    await d.getByLabel('Resultado').selectOption({ label: 'Aprobada' });
    // La entrega se registra en el momento: el seguimiento no puede ser anterior a la entrega.
    await d.getByLabel('Fecha y hora de entrega del animal').fill(fechaHora(-5));
    await d.getByLabel('Nota / fundamento').fill('Cumple las condiciones de vivienda y tiempo disponible.');
    await d.getByRole('button', { name: 'Registrar resultado' }).click();
    await expect(pg.getByText('Adopción aprobada. El animal pasó a «Adoptado».')).toBeVisible();
    await expect(mg.getByText('Aprobada', { exact: true }).first()).toBeVisible();
    await captura(pg, 'SIS-paso-08.png');
    return 'La solicitud quedó «Aprobada» y el sistema informó que el animal pasó a «Adoptado».';
  });

  await paso('12', async () => {
    await pg.getByRole('link', { name: 'Generar acta' }).click();
    await expect(pg.getByRole('heading', { name: 'Acta de adopción responsable' })).toBeVisible();
    const acta = await pg.locator('article.act').innerText();
    await captura(pg, 'SIS-paso-09.png');
    expect(acta).toContain(codigo);
    expect(acta).toContain(adoptante);
    return `Se mostró el acta de adopción responsable con el código ${codigo} y los datos de ${adoptante}.`;
  });

  await paso('13', async () => {
    await pg.goto(solicitudPath);
    await expect(mg.getByText('Seguimiento posterior a la adopción')).toBeVisible();
    await mg.getByRole('button', { name: 'Nuevo seguimiento' }).click();
    const d = pg.getByRole('dialog');
    await d.getByLabel('Estado general del animal').fill('Sano y adaptado a su nuevo hogar');
    await d.getByLabel('Observaciones').fill('Primera visita de seguimiento de la prueba de sistema.');
    await d.getByRole('button', { name: 'Guardar' }).click();
    await expect(pg.getByText('Seguimiento registrado')).toBeVisible();
    const items = mg.locator('ol > li');
    await expect(items).toHaveCount(1);
    const primero = (await items.first().innerText()).replace(/\s+/g, ' ').trim();
    await items.first().scrollIntoViewIfNeeded();
    await captura(pg, 'SIS-paso-10.png');
    expect(primero).toContain('Sano y adaptado a su nuevo hogar');
    return `Se guardó el seguimiento y la lista mostró: «${primero.slice(0, 160)}».`;
  });

  // -------------------------------------------------------------- Directivo
  await paso('14', async () => {
    const pd = await nuevaPagina(browser);
    await login(pd, USUARIOS.directivo);
    const md = pd.getByRole('main');
    await expect(md.getByText(/Panel de indicadores/)).toBeVisible();
    await expect(md.locator('canvas, svg').first()).toBeVisible({ timeout: 30_000 });
    await captura(pd, 'SIS-paso-11.png');
    const panel = (await md.innerText()).replace(/\s+/g, ' ');
    await pd.getByRole('link', { name: 'KPIs' }).click();
    await expect(md.getByRole('heading', { name: 'Indicadores de gestión' })).toBeVisible();
    // Cada indicador es una tarjeta con su título en un <h3> (igual que en la prueba HU7).
    const tarjetas = md.locator('h3').filter({ hasText: /./ });
    await expect(tarjetas).toHaveCount(6, { timeout: 30_000 });
    const titulos = (await tarjetas.allInnerTexts()).map((t) => t.trim());
    await pd.context().close();
    expect(panel).toContain('Panel de indicadores');
    return `El panel se mostró con la descripción «Panel de indicadores · Personal Directivo» y sus gráficos; «Indicadores de gestión» mostró 6 indicadores: ${titulos.join('; ')}.`;
  });

  // -------------------------------------------------------------- Visitante
  await paso('15', async () => {
    const pp = await nuevaPagina(browser);
    await pp.goto('/');
    const solo = pp.getByRole('button', { name: 'Solo necesarias' });
    if (await solo.isVisible().catch(() => false)) await solo.click();
    await expect(pp.getByRole('heading', { level: 1 }).first()).toBeVisible();
    const contacto = pp.locator('#contacto');
    await contacto.scrollIntoViewIfNeeded();
    await contacto.getByLabel('Nombre completo').fill('Visitante de Prueba');
    await contacto.getByLabel('Correo electrónico').fill('visitante.sistema@example.com');
    await contacto.getByLabel('Asunto').fill('Consulta de la prueba de sistema');
    await contacto.getByLabel('Mensaje').fill('Quisiera conocer los requisitos para adoptar un perro.');
    await contacto.getByRole('checkbox').check();
    await contacto.getByRole('button', { name: 'Enviar mensaje' }).click();
    await expect(pp.getByText('¡Gracias! Recibimos tu mensaje.')).toBeVisible();
    await captura(pp, 'SIS-paso-12.png');
    await pp.context().close();
    return 'Se mostró el sitio público sin iniciar sesión y el formulario respondió «¡Gracias! Recibimos tu mensaje.».';
  });

  await pv.context().close();
  await pg.context().close();
});
