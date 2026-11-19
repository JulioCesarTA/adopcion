import { expect, test, type Page } from '@playwright/test';
import {
  captura,
  fecha,
  fechaHora,
  guardarEvidencia,
  login,
  loginPortal,
  nuevaPagina,
  password,
  USUARIOS,
} from './helpers';

/**
 * Prueba de sistema: ciclo completo de un animal y de los dos servicios de Adopet, la adopción
 * y la consulta clínica, cada paso con el usuario de su rol y por la interfaz real
 * (http://localhost:3000, imágenes de producción detrás de nginx).
 *
 * Actores: los del Product Backlog (administrador, veterinario, adoptante, cliente y visitante).
 * Datos: seed del Sprint 3 (test/sprint3/seed-sprint3.ts). El animal y la cuenta del adoptante
 * se crean durante la prueba con datos ficticios.
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
    rol: 'Administrador',
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
    esperado: 'El animal pasa a «Disponible para adopción».',
    captura: 'SIS-paso-04.png',
  },
  {
    paso: '07',
    rol: 'Visitante que se registra como adoptante',
    accion: 'Crear una cuenta de tipo «Adoptante» en «Registrarse».',
    esperado: 'El sistema crea la cuenta, inicia la sesión y muestra el portal con los animales en adopción.',
    captura: 'SIS-paso-05.png',
  },
  {
    paso: '08',
    rol: 'Adoptante',
    accion: 'Solicitar la adopción del animal desde el portal («Solicitar adopción»).',
    esperado:
      'El sistema envía la solicitud al personal y el animal queda marcado como «Solicitud en progreso».',
    captura: 'SIS-paso-06.png',
  },
  {
    paso: '09',
    rol: 'Administrador',
    accion: 'Abrir la solicitud recibida y calcular la recomendación de compatibilidad.',
    esperado:
      'La solicitud aparece en «Pendiente» con los datos del adoptante, y el sistema muestra el puntaje de compatibilidad de 0 a 100 con el aviso de apoyo.',
    captura: 'SIS-paso-07.png',
  },
  {
    paso: '10',
    rol: 'Administrador',
    accion: 'Evaluar la solicitud («Pasar a evaluación»).',
    esperado: 'La solicitud pasa a «En evaluación».',
    captura: null,
  },
  {
    paso: '11',
    rol: 'Administrador',
    accion: 'Aprobar la solicitud con la fecha de entrega («Registrar resultado»).',
    esperado: 'La solicitud queda «Aprobada» y el animal pasa a «Adoptado».',
    captura: 'SIS-paso-08.png',
  },
  {
    paso: '12',
    rol: 'Administrador',
    accion: 'Ver el acta de entrega («Generar acta»).',
    esperado:
      'El sistema muestra el acta de adopción responsable con los datos del animal (código) y del adoptante.',
    captura: 'SIS-paso-09.png',
  },
  {
    paso: '13',
    rol: 'Administrador',
    accion: 'Registrar un seguimiento post-adopción («Nuevo seguimiento»).',
    esperado: 'El sistema guarda el seguimiento y lo muestra en la lista de la solicitud.',
    captura: 'SIS-paso-10.png',
  },
  {
    paso: '14',
    rol: 'Administrador',
    accion: 'Ver el panel de indicadores («Panel») y los indicadores de gestión («KPIs»).',
    esperado:
      'El sistema muestra el panel con sus tarjetas y gráficos, y los seis indicadores de gestión.',
    captura: 'SIS-paso-11.png',
  },
  {
    paso: '15',
    rol: 'Administrador',
    accion: 'Reservar una consulta clínica para un cliente en «Registrar consulta».',
    esperado: 'El sistema guarda la reserva en «Pendiente» y la muestra en la lista de reservas.',
    captura: 'SIS-paso-12.png',
  },
  {
    paso: '16',
    rol: 'Cliente',
    accion: 'Ver la reserva desde el portal («Registrar consulta»).',
    esperado: 'El cliente ve en «Mis reservas» la consulta con su día, hora, motivo y estado.',
    captura: 'SIS-paso-13.png',
  },
  {
    paso: '17',
    rol: 'Visitante (sin iniciar sesión)',
    accion: 'Ver el sitio público y enviar el formulario de contacto.',
    esperado:
      'El sitio público se muestra sin iniciar sesión y el formulario confirma «¡Gracias! Recibimos tu mensaje.».',
    captura: 'SIS-paso-14.png',
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

test('Sistema: ciclo completo de un animal y de los servicios de adopción y consulta clínica', async ({
  browser,
}) => {
  test.setTimeout(600_000);
  const sufijo = Date.now().toString().slice(-5);
  const nombreAnimal = `Nube ${sufijo}`;
  const adoptante = `Mariela Sistema ${sufijo}`;
  const correoAdoptante = `adoptante.sistema.${sufijo}@example.com`;
  const motivoReserva = `Control anual ${sufijo}`;
  let animalPath = '';
  let codigo = '';
  let solicitudPath = '';

  // ---------------------------------------------------------- Administrador
  const pg = await nuevaPagina(browser);
  await login(pg, USUARIOS.admin);
  const mg = pg.getByRole('main');

  await paso('01', async () => {
    await pg.getByRole('link', { name: 'Animales' }).click();
    await pg.getByRole('link', { name: 'Registrar animal' }).click();
    await expect(mg.getByRole('heading', { name: 'Registrar animal' })).toBeVisible();
    await mg.getByLabel('Nombre').fill(nombreAnimal);
    await mg.getByLabel('Especie').selectOption({ label: 'Perro' });
    await mg.getByLabel('Sexo').selectOption({ label: 'Hembra' });
    await mg.getByLabel('Edad aproximada (meses)').fill('18');
    await mg.getByLabel('Color').fill('Blanco');
    await mg.getByLabel('Tamaño').selectOption({ label: 'Mediano' });
    await mg.getByLabel('Fecha de ingreso').fill(fecha(0));
    await mg.getByLabel('Motivo de ingreso').fill('Rescate en vía pública (prueba de sistema)');
    await mg.getByLabel('Nivel de energía (1–5)').selectOption('3');
    await mg.getByLabel('Horas diarias de atención requeridas').fill('2');
    await mg.getByLabel('Se lleva bien con niños').check();
    await pg.getByRole('button', { name: 'Registrar animal' }).click();
    await pg.waitForURL(/\/animales\/[0-9a-f-]{36}$/);
    await expect(pg.getByText('Datos del animal')).toBeVisible();
    animalPath = new URL(pg.url()).pathname;
    codigo = /ZOO-\d{4}-\d{4}/.exec(await texto(pg))?.[0] ?? '';
    await expect(mg.getByText('Ingresado', { exact: true }).first()).toBeVisible();
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
    await d.getByLabel('Lote').fill('SIS-0001');
    await d.getByLabel('Próxima dosis').fill(fecha(365));
    await d.getByRole('button', { name: 'Registrar' }).click();
    await expect(pv.getByText('Vacuna registrada')).toBeVisible();
    await expect(pv.locator('#animal-panel-vacunas').getByText('SIS-0001')).toBeVisible();
    return `Se registró la vacuna «${antirrabica}» con el lote SIS-0001 y aparece en la pestaña «Vacunas».`;
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
    return 'El animal quedó «Disponible para adopción».';
  });

  // ----------------------------------------------------------------- Adoptante
  const pa = await nuevaPagina(browser);

  await paso('07', async () => {
    await pa.goto('/registro');
    const solo = pa.getByRole('button', { name: 'Solo necesarias' });
    if (await solo.isVisible().catch(() => false)) await solo.click();
    await pa.getByLabel('Tipo de cuenta').selectOption('ADOPTANTE');
    await pa.getByLabel('Nombre completo').fill(adoptante);
    await pa.getByLabel('Correo electrónico').fill(correoAdoptante);
    // La etiqueta lleva la marca de obligatorio; «Confirmar contraseña» no empieza igual.
    await pa.getByLabel(/^Contraseña/).fill(password());
    await pa.getByLabel('Confirmar contraseña').fill(password());
    await pa.getByRole('checkbox').check();
    await pa.getByRole('button', { name: 'Crear cuenta' }).click();
    await pa.waitForURL('**/portal');
    await expect(pa.getByRole('heading', { name: 'Animales en adopción' })).toBeVisible();
    await captura(pa, 'SIS-paso-05.png');
    return `Se creó la cuenta de adoptante de ${adoptante} y el sistema mostró el portal «Animales en adopción».`;
  });

  await paso('08', async () => {
    const tarjeta = pa.locator('div.flex-col.overflow-hidden').filter({ hasText: codigo });
    const boton = tarjeta.getByRole('button', { name: 'Solicitar adopción' });
    await boton.scrollIntoViewIfNeeded();
    await boton.click();
    await expect(
      pa.getByText(`Solicitud enviada para ${nombreAnimal}. El personal la revisará.`),
    ).toBeVisible();
    await expect(tarjeta.getByText('Solicitud en progreso')).toBeVisible();
    await captura(pa, 'SIS-paso-06.png');
    return `El sistema confirmó «Solicitud enviada para ${nombreAnimal}» y el animal quedó marcado como «Solicitud en progreso».`;
  });

  // ---------------------------------------------------------- Administrador
  await paso('09', async () => {
    await pg.getByRole('link', { name: 'Solicitudes' }).click();
    await pg.getByRole('link', { name: new RegExp(nombreAnimal) }).first().click();
    await pg.waitForURL(/\/solicitudes\/[0-9a-f-]{36}$/);
    solicitudPath = new URL(pg.url()).pathname;
    await expect(mg.getByRole('heading', { level: 1 })).toContainText(adoptante.split(' ')[0]);
    await expect(mg.getByText('Pendiente', { exact: true }).first()).toBeVisible();
    await expect(mg.getByText('Solicitud en progreso', { exact: true }).first()).toBeVisible();
    await mg.getByRole('button', { name: /Calcular/ }).click();
    const medidor = mg.getByRole('meter').first();
    await expect(medidor).toBeVisible({ timeout: 30_000 });
    const puntaje = Number(await medidor.getAttribute('aria-valuenow'));
    await expect(mg.getByText(/La decisión final es del personal responsable/)).toBeVisible();
    await captura(pg, 'SIS-paso-07.png');
    expect(puntaje).toBeGreaterThanOrEqual(0);
    expect(puntaje).toBeLessThanOrEqual(100);
    return `La solicitud de ${adoptante} apareció en «Pendiente» con el animal en «Solicitud en progreso», y la compatibilidad calculada fue de ${puntaje} sobre 100, con el aviso de apoyo.`;
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
    expect(acta).toContain(adoptante.split(' ')[0]);
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

  await paso('14', async () => {
    await pg.getByRole('link', { name: 'Panel' }).click();
    await expect(mg.getByText(/Panel de indicadores/)).toBeVisible();
    await expect(mg.locator('canvas, svg').first()).toBeVisible({ timeout: 30_000 });
    await captura(pg, 'SIS-paso-11.png');
    await pg.getByRole('link', { name: 'KPIs' }).click();
    await expect(mg.getByRole('heading', { name: 'Indicadores de gestión' })).toBeVisible();
    // Cada indicador es una tarjeta con su título en un <h3> (igual que en la prueba HU7).
    const tarjetas = mg.locator('h3').filter({ hasText: /./ });
    await expect(tarjetas).toHaveCount(6, { timeout: 30_000 });
    const titulos = (await tarjetas.allInnerTexts()).map((t) => t.trim());
    return `El panel se mostró con sus tarjetas y gráficos; «Indicadores de gestión» mostró 6 indicadores: ${titulos.join('; ')}.`;
  });

  await paso('15', async () => {
    await pg.getByRole('link', { name: 'Registrar consulta' }).click();
    await expect(mg.getByRole('heading', { name: 'Registrar consulta' })).toBeVisible();
    const clientes = await mg.getByLabel('Cliente').locator('option').allInnerTexts();
    await mg.getByLabel('Cliente').selectOption({
      label: clientes.find((c) => c.includes(USUARIOS.cliente)) ?? '',
    });
    const animales = await mg.getByLabel('Animal').locator('option').allInnerTexts();
    await mg.getByLabel('Animal').selectOption({
      label: animales.find((a) => a.includes(codigo)) ?? '',
    });
    await mg.getByLabel('Día y hora').fill(`${fecha(1)}T10:00`);
    await mg.getByLabel('Motivo').fill(motivoReserva);
    await mg.getByRole('button', { name: 'Reservar consulta' }).click();
    await expect(pg.getByText('Consulta reservada')).toBeVisible();
    const fila = mg.locator('li').filter({ hasText: motivoReserva });
    await expect(fila.getByText('Pendiente', { exact: true })).toBeVisible();
    await fila.scrollIntoViewIfNeeded();
    await captura(pg, 'SIS-paso-12.png');
    return `Se reservó la consulta «${motivoReserva}» del ${fecha(1)} a las 10:00 para el Cliente de Prueba y quedó «Pendiente» en la lista de reservas.`;
  });

  // ------------------------------------------------------------------ Cliente
  await paso('16', async () => {
    const pc = await nuevaPagina(browser);
    await loginPortal(pc, USUARIOS.cliente);
    await pc.getByRole('navigation', { name: 'Portal' }).first().getByRole('link', { name: 'Registrar consulta' }).click();
    const mc = pc.getByRole('main');
    await expect(mc.getByText('Mis reservas')).toBeVisible();
    const fila = mc.locator('li').filter({ hasText: motivoReserva });
    await expect(fila).toBeVisible();
    const detalle = (await fila.innerText()).replace(/\s+/g, ' ').trim();
    await fila.scrollIntoViewIfNeeded();
    await captura(pc, 'SIS-paso-13.png');
    await pc.context().close();
    expect(detalle).toContain('Pendiente');
    expect(detalle).toContain(codigo);
    return `El cliente vio en «Mis reservas»: «${detalle}».`;
  });

  // -------------------------------------------------------------- Visitante
  await paso('17', async () => {
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
    await captura(pp, 'SIS-paso-14.png');
    await pp.context().close();
    return 'Se mostró el sitio público sin iniciar sesión y el formulario respondió «¡Gracias! Recibimos tu mensaje.».';
  });

  await pa.context().close();
  await pv.context().close();
  await pg.context().close();
});
