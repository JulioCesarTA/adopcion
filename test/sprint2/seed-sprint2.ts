/**
 * Seed de PRUEBAS del Sprint 2 (HU5, HU6, HU10 y HU11).
 *
 * Se ejecuta solo contra la base de prueba aislada (.env.test, puerto 5433):
 *
 *   cd backend
 *   set -a; . ../.env.test; set +a
 *   npx tsx ../test/sprint2/seed-sprint2.ts
 *
 * Borra el contenido de la base de prueba y lo vuelve a crear, para que cada
 * corrida parta del mismo estado. La contraseña de los usuarios de prueba se lee
 * de SPRINT1_PASSWORD (definida en .env.test, sin versionar). Los carnets de
 * identidad de los adoptantes son ficticios.
 *
 * El Random Forest NO se entrena aquí: lo entrena el administrador con el
 * mecanismo real del sistema (pantalla «Modelo de recomendación»), en
 * test/sprint2/e2e/00-modelo.spec.ts.
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
const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
const dateOnly = (n: number) => new Date(new Date(Date.now() + n * DAY).toISOString().slice(0, 10));

async function main() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE adoption_followups, compatibility_recommendations, adoption_requests,
      adopter_profiles, persons, quarantine_controls, quarantine_periods, medications,
      treatments, diagnoses, veterinary_consultations, vaccinations, vaccines, animals,
      contact_messages, ml_models, algorithm_settings, users RESTART IDENTITY CASCADE`);

  // ---------- Un usuario por rol (correos ficticios) ----------
  const passwordHash = await bcrypt.hash(password, 10);
  const mk = (email: string, fullName: string, role: string) =>
    prisma.user.create({ data: { email, fullName, role, passwordHash } });
  const admin = await mk('admin.prueba@zoonosis.test', 'Administrador de Prueba', 'ADMIN');
  const vet = await mk('veterinario.prueba@zoonosis.test', 'Veterinario de Prueba', 'VETERINARIO');
  const gestion = await mk(
    'adopciones.prueba@zoonosis.test',
    'Gestion de Adopciones de Prueba',
    'GESTION',
  );
  await mk('directivo.prueba@zoonosis.test', 'Directivo de Prueba', 'DIRECTIVO');

  // ---------- Configuración del motor de reglas (pesos y umbrales del sistema) ----------
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
  const base = {
    sex: 'MACHO',
    entryReason: 'Rescate en via publica',
    createdById: gestion.id,
    goodWithChildren: true,
    goodWithAnimals: true,
  };
  const animal = (n: number, extra: Record<string, unknown>) =>
    prisma.animal.create({
      data: { ...base, code: `ZOO-${year}-${String(n).padStart(4, '0')}`, ...extra },
    });

  // Disponibles para adopción, de distintas especies, tamaños y energía
  const bruno = await animal(1, {
    name: 'Bruno', species: 'PERRO', breed: 'Mestizo', size: 'GRANDE', energyLevel: 5,
    needsYard: true, requiredDailyHours: 4, ageMonths: 30, color: 'Negro',
    entryDate: daysAgo(70), status: 'DISPONIBLE_ADOPCION',
  });
  const mishi = await animal(2, {
    name: 'Mishi', species: 'GATO', sex: 'HEMBRA', size: 'PEQUENO', energyLevel: 1,
    requiredDailyHours: 1, ageMonths: 18, color: 'Gris atigrado',
    entryDate: daysAgo(50), status: 'DISPONIBLE_ADOPCION',
  });
  await animal(3, {
    name: 'Kira', species: 'PERRO', sex: 'HEMBRA', breed: 'Mestiza', size: 'MEDIANO',
    energyLevel: 3, requiredDailyHours: 2, ageMonths: 24, color: 'Cafe claro',
    entryDate: daysAgo(40), status: 'DISPONIBLE_ADOPCION',
  });

  // HU10: ingresado sin períodos
  await animal(4, {
    name: 'Simba', species: 'PERRO', size: 'MEDIANO', energyLevel: 3, ageMonths: 12,
    color: 'Dorado', entryDate: daysAgo(5), status: 'INGRESADO',
  });

  // HU5 / HU10: animal con una solicitud en curso (pendiente)
  const coco = await animal(5, {
    name: 'Coco', species: 'PERRO', size: 'PEQUENO', energyLevel: 2, ageMonths: 36,
    color: 'Blanco', entryDate: daysAgo(60), status: 'EN_PROCESO_ADOPCION',
  });

  // HU11: animal con una solicitud en evaluación
  const lola = await animal(6, {
    name: 'Lola', species: 'PERRO', sex: 'HEMBRA', breed: 'Mestiza', size: 'MEDIANO',
    energyLevel: 3, ageMonths: 20, color: 'Atigrado', requiredDailyHours: 2,
    entryDate: daysAgo(80), status: 'EN_PROCESO_ADOPCION',
  });
  await prisma.vaccination.create({
    data: {
      animalId: lola.id, vaccineId: rabia.id, applicationDate: dateOnly(-30),
      dose: '1 ml', batchNumber: 'AR-3310', appliedById: vet.id,
    },
  });

  // Casos ya resueltos (datos reales de prueba para el Random Forest)
  const thor = await animal(7, {
    name: 'Thor', species: 'PERRO', size: 'GRANDE', energyLevel: 4, needsYard: true,
    requiredDailyHours: 3, entryDate: daysAgo(150), status: 'ADOPTADO',
    exitDate: daysAgo(100), exitReason: 'ADOPCION',
  });
  const nina = await animal(8, {
    name: 'Nina', species: 'GATO', sex: 'HEMBRA', size: 'PEQUENO', energyLevel: 2,
    requiredDailyHours: 1, entryDate: daysAgo(140), status: 'ADOPTADO',
    exitDate: daysAgo(90), exitReason: 'ADOPCION',
  });

  // ---------- Adoptantes (CI ficticias) ----------
  const adoptante = (ci: string, firstName: string, lastName: string, phone: string, p: Record<string, unknown>) =>
    prisma.adopterProfile.create({
      data: { ...p, person: { create: { ci, firstName, lastName, phone } } },
    });
  const carla = await adoptante('9000001 SC', 'Carla', 'Mendoza Rojas', '70000001', {
    housingType: 'DEPARTAMENTO', hasYard: false, hasChildren: false, hasOtherAnimals: false,
    availableHoursPerDay: 3, experience: 'BASICA', preferredSpecies: 'GATO', preferredSize: 'PEQUENO',
  });
  const jorge = await adoptante('9000002 LP', 'Jorge', 'Vargas Pinto', '70000002', {
    housingType: 'CASA_CON_PATIO', hasYard: true, hasChildren: true, hasOtherAnimals: false,
    availableHoursPerDay: 6, experience: 'AVANZADA', preferredSpecies: 'PERRO', preferredSize: 'GRANDE',
  });
  await adoptante('9000003 CB', 'Ana Lucia', 'Torres Suarez', '70000003', {
    housingType: 'CASA_SIN_PATIO', hasYard: false, hasChildren: false, hasOtherAnimals: false,
    availableHoursPerDay: 4, experience: 'BASICA',
  });
  const luis = await adoptante('9000004 SC', 'Luis', 'Fernandez Paz', '70000004', {
    housingType: 'CASA_CON_PATIO', hasYard: true, hasChildren: false, hasOtherAnimals: true,
    availableHoursPerDay: 5, experience: 'BASICA',
  });
  const rosa = await adoptante('9000005 SC', 'Rosa', 'Quiroga Leon', '70000005', {
    housingType: 'CASA_CON_PATIO', hasYard: true, hasChildren: true, hasOtherAnimals: false,
    availableHoursPerDay: 5, experience: 'BASICA', preferredSpecies: 'PERRO',
  });

  // ---------- Solicitudes ----------
  const nota = (fecha: Date, quien: string, estado: string, texto: string) =>
    `[${new Intl.DateTimeFormat('es-BO', { timeZone: 'America/La_Paz', dateStyle: 'short', timeStyle: 'short', hour12: false }).format(fecha)} · ${quien} · ${estado}] ${texto}`;

  await prisma.adoptionRequest.create({
    data: {
      adopterProfileId: luis.id, animalId: coco.id, responsibleUserId: gestion.id,
      status: 'PENDIENTE', requestDate: daysAgo(2),
    },
  });
  await prisma.adoptionRequest.create({
    data: {
      adopterProfileId: rosa.id, animalId: lola.id, responsibleUserId: gestion.id,
      status: 'EN_EVALUACION', requestDate: daysAgo(6),
      evaluationNotes: nota(daysAgo(4), gestion.fullName, 'En evaluación',
        'Entrevista realizada. La familia cuenta con patio cerrado y experiencia previa con perros.'),
    },
  });
  // Resueltas: 2 aprobadas y 2 rechazadas
  const resuelta = (adopterProfileId: string, animalId: string, status: string, dias: number) =>
    prisma.adoptionRequest.create({
      data: {
        adopterProfileId, animalId, responsibleUserId: gestion.id, status,
        requestDate: daysAgo(dias + 7), decisionDate: daysAgo(dias),
        deliveryDate: status === 'APROBADA' ? daysAgo(dias) : null,
      },
    });
  await resuelta(jorge.id, thor.id, 'APROBADA', 100);
  await resuelta(carla.id, nina.id, 'APROBADA', 90);
  await resuelta(carla.id, bruno.id, 'RECHAZADA', 30);
  await resuelta(jorge.id, mishi.id, 'RECHAZADA', 20);

  const counts = {
    usuarios: await prisma.user.count(),
    animales: await prisma.animal.count(),
    adoptantes: await prisma.adopterProfile.count(),
    solicitudes: await prisma.adoptionRequest.count(),
    resueltas: await prisma.adoptionRequest.count({ where: { status: { in: ['APROBADA', 'RECHAZADA'] } } }),
  };
  console.log('Seed de pruebas del Sprint 2 aplicado:', JSON.stringify(counts));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
