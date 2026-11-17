/**
 * Seed de PRUEBAS del Sprint 1 (HU1, HU2, HU3, HU4 y HU8).
 *
 * Se ejecuta solo contra la base de prueba aislada (.env.test, puerto 5433):
 *
 *   cd backend
 *   set -a; . ../.env.test; set +a
 *   npx tsx ../test/sprint1/seed-sprint1.ts
 *
 * Borra el contenido de la base de prueba y lo vuelve a crear, para que cada
 * corrida de las pruebas parta del mismo estado. La contraseña de los usuarios
 * de prueba se lee de SPRINT1_PASSWORD (definida en .env.test, sin versionar).
 */
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

// Las dependencias viven en backend/node_modules; este archivo está fuera de backend/.
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
/** Fecha calendario (sin hora) desplazada n días desde hoy. */
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
  const gestion = await mk('gestion.prueba@zoonosis.test', 'Gestion de Prueba', 'GESTION');
  await mk('directivo.prueba@zoonosis.test', 'Directivo de Prueba', 'DIRECTIVO');

  // ---------- Catálogo de vacunas: perros, gatos y una dada de baja ----------
  const vacPerro = await prisma.vaccine.create({
    data: { name: 'Quintuple canina', species: ['PERRO'], isRabies: false, isActive: true },
  });
  await prisma.vaccine.create({
    data: { name: 'Triple felina', species: ['GATO'], isRabies: false, isActive: true },
  });
  const vacRabia = await prisma.vaccine.create({
    data: { name: 'Antirrabica', species: ['PERRO', 'GATO'], isRabies: true, isActive: true },
  });
  await prisma.vaccine.create({
    data: { name: 'Vacuna discontinuada', species: ['PERRO'], isRabies: false, isActive: false },
  });

  // ---------- Animales ----------
  const year = new Date().getFullYear();
  const base = {
    sex: 'MACHO',
    size: 'MEDIANO',
    energyLevel: 3,
    entryReason: 'Rescate en via publica',
    createdById: gestion.id,
  };
  const animal = (n: number, extra: Record<string, unknown>) =>
    prisma.animal.create({
      data: { ...base, code: `ZOO-${year}-${String(n).padStart(4, '0')}`, ...extra },
    });

  // Ingresado, sin historial (HU2: recibe la consulta de la prueba)
  await animal(1, { name: 'Toby', species: 'PERRO', entryDate: daysAgo(20), status: 'INGRESADO' });

  // Disponible para adopción
  await animal(2, {
    name: 'Luna',
    species: 'GATO',
    sex: 'HEMBRA',
    size: 'PEQUENO',
    entryDate: daysAgo(60),
    status: 'DISPONIBLE_ADOPCION',
  });

  // Adoptado (salió de la institución)
  await animal(3, {
    name: 'Rocky',
    species: 'PERRO',
    size: 'GRANDE',
    entryDate: daysAgo(120),
    status: 'ADOPTADO',
    exitDate: daysAgo(10),
    exitReason: 'ADOPCION',
  });

  // HU3: consultas, vacunas y un tratamiento en fechas distintas
  const max = await animal(4, {
    name: 'Max',
    species: 'PERRO',
    entryDate: daysAgo(90),
    status: 'INGRESADO',
  });
  await prisma.veterinaryConsultation.create({
    data: {
      animalId: max.id,
      veterinarianId: vet.id,
      consultationDate: daysAgo(80),
      reason: 'Revision de ingreso',
      weightKg: 14.2,
      temperatureC: 38.5,
      clinicalEvaluation: 'Animal en buen estado general, sin lesiones visibles.',
    },
  });
  const consulta2 = await prisma.veterinaryConsultation.create({
    data: {
      animalId: max.id,
      veterinarianId: vet.id,
      consultationDate: daysAgo(30),
      reason: 'Tos persistente',
      weightKg: 14.8,
      temperatureC: 39.4,
      clinicalEvaluation: 'Tos seca, sin secrecion nasal. Auscultacion con leves estertores.',
    },
  });
  await prisma.diagnosis.create({
    data: { consultationId: consulta2.id, description: 'Traqueobronquitis infecciosa canina' },
  });
  await prisma.treatment.create({
    data: {
      consultationId: consulta2.id,
      description: 'Antibioticoterapia',
      instructions: 'Administrar con alimento. Reposo y aislamiento del resto de los animales.',
      startDate: dateOnly(-30),
      endDate: dateOnly(-20),
      status: 'FINALIZADO',
      medications: {
        create: [
          {
            name: 'Doxiciclina',
            dose: '5 mg/kg',
            administrationRoute: 'Oral',
            frequency: 'Cada 12 horas',
            duration: '10 dias',
          },
        ],
      },
    },
  });
  await prisma.vaccination.create({
    data: {
      animalId: max.id,
      vaccineId: vacPerro.id,
      applicationDate: dateOnly(-70),
      dose: 'Primera dosis',
      batchNumber: 'QC-2291',
      nextDoseDate: dateOnly(-49),
      appliedById: vet.id,
    },
  });
  await prisma.vaccination.create({
    data: {
      animalId: max.id,
      vaccineId: vacPerro.id,
      applicationDate: dateOnly(-49),
      dose: 'Refuerzo',
      batchNumber: 'QC-2304',
      appliedById: vet.id,
    },
  });

  // HU4: animal con la próxima dosis dentro de los próximos 7 días
  const nala = await animal(5, {
    name: 'Nala',
    species: 'PERRO',
    sex: 'HEMBRA',
    entryDate: daysAgo(45),
    status: 'INGRESADO',
  });
  await prisma.vaccination.create({
    data: {
      animalId: nala.id,
      vaccineId: vacRabia.id,
      applicationDate: dateOnly(-360),
      dose: 'Dosis anual',
      batchNumber: 'AR-1180',
      nextDoseDate: dateOnly(5),
      appliedById: vet.id,
    },
  });

  // HU4: animal que recibe la vacuna de la prueba
  await animal(6, {
    name: 'Canela',
    species: 'PERRO',
    sex: 'HEMBRA',
    size: 'PEQUENO',
    entryDate: daysAgo(15),
    status: 'INGRESADO',
  });

  const counts = {
    usuarios: await prisma.user.count(),
    vacunas: await prisma.vaccine.count(),
    animales: await prisma.animal.count(),
    consultas: await prisma.veterinaryConsultation.count(),
    vacunaciones: await prisma.vaccination.count(),
    tratamientos: await prisma.treatment.count(),
  };
  console.log('Seed de pruebas del Sprint 1 aplicado:', JSON.stringify(counts));
  void admin;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
