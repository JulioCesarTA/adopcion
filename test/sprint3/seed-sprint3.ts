/**
 * Seed de PRUEBAS del Sprint 3 (HU7, HU9 y HU12).
 *
 * Se ejecuta solo contra la base de prueba aislada (.env.test, puerto 5433):
 *
 *   cd backend
 *   set -a; . ../.env.test; set +a
 *   npx tsx ../test/sprint3/seed-sprint3.ts
 *
 * Borra el contenido de la base de prueba y lo vuelve a crear. Todas las fechas
 * son relativas a la fecha de ejecución:
 *   - período actual (pantalla de indicadores, «Últimos 3 meses»): este mes y el anterior;
 *   - período anterior: hace 4 meses.
 * La contraseña de los usuarios de prueba se lee de SPRINT1_PASSWORD (.env.test,
 * sin versionar). Correos, teléfonos y carnets son ficticios.
 */
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const req = createRequire(resolve(__dirname, '../../backend/package.json'));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = req('@prisma/client');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = req('bcryptjs');

const url = process.env.DATABASE_URL ?? '';
if (!url.includes(':5433/') || !url.includes('zoonosis_test')) {
  throw new Error(
    'Seed de pruebas cancelado: DATABASE_URL no apunta a la base de prueba (puerto 5433, zoonosis_test).',
  );
}
const password = process.env.SPRINT1_PASSWORD;
if (!password) throw new Error('Falta SPRINT1_PASSWORD en .env.test');

const prisma = new PrismaClient();
const H = 3_600_000;
const D = 24 * H;
const now = Date.now();
/** Hace `h` horas (eventos del mes en curso, sin salir del mes). */
const horasAtras = (h: number) => new Date(now - h * H);
/** Día `dia` del mes que está `k` meses atrás, a las 11:00 de Bolivia (15:00 UTC). */
function mesAtras(k: number, dia: number): Date {
  const hoy = new Date(now - 4 * H); // fecha calendario de Bolivia
  return new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - k, dia, 15));
}
const masDias = (d: Date, n: number) => new Date(d.getTime() + n * D);
const soloFecha = (d: Date) => new Date(d.toISOString().slice(0, 10));

async function main() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE adoption_followups, compatibility_recommendations, adoption_requests,
      adopter_profiles, persons, quarantine_controls, quarantine_periods, medications,
      treatments, diagnoses, veterinary_consultations, vaccinations, vaccines, animals,
      contact_messages, ml_models, algorithm_settings, users RESTART IDENTITY CASCADE`);

  // ---------- Un usuario por rol interno y un cliente registrado ----------
  const passwordHash = await bcrypt.hash(password, 10);
  const mk = (email: string, fullName: string, role: string, extra: object = {}) =>
    prisma.user.create({ data: { email, fullName, role, passwordHash, ...extra } });
  const admin = await mk('admin.prueba@zoonosis.test', 'Administrador de Prueba', 'ADMIN');
  const vet = await mk('veterinario.prueba@zoonosis.test', 'Veterinario de Prueba', 'VETERINARIO');
  const gestion = await mk('adopciones.prueba@zoonosis.test', 'Gestion de Adopciones de Prueba', 'GESTION');
  await mk('directivo.prueba@zoonosis.test', 'Directivo de Prueba', 'DIRECTIVO');
  await mk('adoptante.prueba@zoonosis.test', 'Adoptante de Prueba', 'ADOPTANTE');
  await mk('cliente.prueba@zoonosis.test', 'Cliente de Prueba', 'CLIENTE', {
    phone: '70000099',
    termsAcceptedAt: horasAtras(48),
  });

  await prisma.algorithmSetting.create({
    data: {
      version: 1,
      weights: { time: 30, space: 25, experience: 20, energy: 15, preferences: 10 },
      thresholdHigh: 80,
      thresholdMedium: 60,
      createdById: admin.id,
    },
  });
  const rabia = await prisma.vaccine.create({
    data: { name: 'Antirrabica', species: ['PERRO', 'GATO'], isRabies: true, isActive: true },
  });

  // ---------- Animales ----------
  const year = new Date().getFullYear();
  let n = 0;
  const animal = (extra: Record<string, unknown>) =>
    prisma.animal.create({
      data: {
        sex: 'MACHO',
        size: 'MEDIANO',
        energyLevel: 3,
        entryReason: 'Rescate en via publica',
        createdById: gestion.id,
        goodWithChildren: true,
        goodWithAnimals: true,
        code: `ZOO-${year}-${String(++n).padStart(4, '0')}`,
        ...extra,
      },
    });

  // Disponibles para adopción (HU9 los usa como información real)
  const bruno = await animal({ name: 'Bruno', species: 'PERRO', size: 'GRANDE', energyLevel: 5, ageMonths: 30, entryDate: horasAtras(30), status: 'DISPONIBLE_ADOPCION' });
  const mishi = await animal({ name: 'Mishi', species: 'GATO', sex: 'HEMBRA', size: 'PEQUENO', energyLevel: 1, ageMonths: 18, entryDate: mesAtras(1, 8), status: 'DISPONIBLE_ADOPCION' });
  const kira = await animal({ name: 'Kira', species: 'PERRO', sex: 'HEMBRA', ageMonths: 24, entryDate: mesAtras(1, 12), status: 'DISPONIBLE_ADOPCION' });

  // En cuarentena y en observación, con su período activo
  const simba = await animal({ name: 'Simba', species: 'PERRO', ageMonths: 12, entryDate: horasAtras(20), status: 'EN_CUARENTENA' });
  const toby = await animal({ name: 'Toby', species: 'PERRO', ageMonths: 40, entryDate: mesAtras(1, 20), status: 'EN_OBSERVACION' });
  for (const [a, type] of [[simba, 'CUARENTENA'], [toby, 'OBSERVACION']] as const) {
    await prisma.quarantinePeriod.create({
      data: { animalId: a.id, type, reason: 'Control sanitario de ingreso', startDate: horasAtras(10), status: 'ACTIVO', startedById: vet.id },
    });
  }
  const canela = await animal({ name: 'Canela', species: 'PERRO', sex: 'HEMBRA', size: 'PEQUENO', entryDate: horasAtras(5), status: 'INGRESADO' });

  // HU12: adopción aprobada este mes (animal Adoptado) y otra en evaluación
  const lola = await animal({ name: 'Lola', species: 'PERRO', sex: 'HEMBRA', breed: 'Mestiza', ageMonths: 20, entryDate: mesAtras(1, 5), status: 'ADOPTADO', exitDate: horasAtras(40), exitReason: 'ADOPCION' });
  const rocky = await animal({ name: 'Rocky', species: 'PERRO', size: 'GRANDE', ageMonths: 50, entryDate: mesAtras(1, 3), status: 'EN_PROCESO_ADOPCION' });

  // Período actual: otra adopción el mes anterior y una devolución
  const max = await animal({ name: 'Max', species: 'PERRO', entryDate: mesAtras(2, 1), status: 'ADOPTADO', exitDate: mesAtras(1, 15), exitReason: 'ADOPCION' });
  await animal({ name: 'Nala', species: 'PERRO', sex: 'HEMBRA', entryDate: mesAtras(2, 2), status: 'DEVUELTO', exitDate: mesAtras(1, 25), exitReason: 'DEVUELTO' });

  // Período anterior (hace 4 meses): una adopción y dos rechazos
  const thor = await animal({ name: 'Thor', species: 'PERRO', size: 'GRANDE', entryDate: mesAtras(6, 1), status: 'ADOPTADO', exitDate: mesAtras(4, 20), exitReason: 'ADOPCION' });

  // Vacunas: 3 animales presentes al día y uno con la próxima dosis vencida
  for (const a of [bruno, mishi, kira]) {
    await prisma.vaccination.create({
      data: { animalId: a.id, vaccineId: rabia.id, applicationDate: soloFecha(horasAtras(72)), dose: '1 ml', batchNumber: 'AR-4410', nextDoseDate: soloFecha(masDias(new Date(now), 300)), appliedById: vet.id },
    });
  }
  await prisma.vaccination.create({
    data: { animalId: toby.id, vaccineId: rabia.id, applicationDate: soloFecha(mesAtras(13, 1)), dose: '1 ml', batchNumber: 'AR-2208', nextDoseDate: soloFecha(mesAtras(1, 1)), appliedById: vet.id },
  });
  void canela;

  // ---------- Adoptantes (CI ficticias) ----------
  const adoptante = (ci: string, firstName: string, lastName: string, phone: string) =>
    prisma.adopterProfile.create({
      data: {
        housingType: 'CASA_CON_PATIO', hasYard: true, hasChildren: false, hasOtherAnimals: false,
        availableHoursPerDay: 5, experience: 'BASICA',
        person: { create: { ci, firstName, lastName, phone } },
      },
    });
  const rosa = await adoptante('9000005 SC', 'Rosa', 'Quiroga Leon', '70000005');
  const jorge = await adoptante('9000002 LP', 'Jorge', 'Vargas Pinto', '70000002');
  const carla = await adoptante('9000001 SC', 'Carla', 'Mendoza Rojas', '70000001');
  const luis = await adoptante('9000004 SC', 'Luis', 'Fernandez Paz', '70000004');

  // ---------- Solicitudes ----------
  const solicitud = (data: Record<string, unknown>) =>
    prisma.adoptionRequest.create({ data: { responsibleUserId: gestion.id, ...data } });

  // HU12: aprobada este mes, con un seguimiento anterior
  const aprobada = await solicitud({
    adopterProfileId: rosa.id, animalId: lola.id, status: 'APROBADA',
    requestDate: horasAtras(150), decisionDate: horasAtras(48), deliveryDate: horasAtras(40),
  });
  await prisma.adoptionFollowup.create({
    data: {
      adoptionRequestId: aprobada.id, followupDate: horasAtras(20),
      animalCondition: 'Adaptándose bien al hogar',
      observations: 'Llamada telefónica. Come con normalidad y duerme dentro de la casa.',
      createdById: gestion.id,
    },
  });
  // HU12: en evaluación
  await solicitud({ adopterProfileId: luis.id, animalId: rocky.id, status: 'EN_EVALUACION', requestDate: horasAtras(30) });

  // Período actual: aprobada el mes anterior y un rechazo
  await solicitud({ adopterProfileId: jorge.id, animalId: max.id, status: 'APROBADA', requestDate: mesAtras(1, 8), decisionDate: mesAtras(1, 14), deliveryDate: mesAtras(1, 15) });
  await solicitud({ adopterProfileId: carla.id, animalId: kira.id, status: 'RECHAZADA', requestDate: mesAtras(1, 16), decisionDate: mesAtras(1, 19) });

  // Período anterior: una aprobada y dos rechazadas
  await solicitud({ adopterProfileId: jorge.id, animalId: thor.id, status: 'APROBADA', requestDate: mesAtras(4, 5), decisionDate: mesAtras(4, 18), deliveryDate: mesAtras(4, 20) });
  await solicitud({ adopterProfileId: carla.id, animalId: bruno.id, status: 'RECHAZADA', requestDate: mesAtras(4, 2), decisionDate: mesAtras(4, 12) });
  await solicitud({ adopterProfileId: luis.id, animalId: mishi.id, status: 'RECHAZADA', requestDate: mesAtras(4, 6), decisionDate: mesAtras(4, 16) });

  const counts = {
    usuarios: await prisma.user.count(),
    animales: await prisma.animal.count(),
    solicitudes: await prisma.adoptionRequest.count(),
    seguimientos: await prisma.adoptionFollowup.count(),
    vacunaciones: await prisma.vaccination.count(),
  };
  console.log('Seed de pruebas del Sprint 3 aplicado:', JSON.stringify(counts));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
