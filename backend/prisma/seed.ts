/**
 * Seed de desarrollo (sección 7). Es idempotente: se puede ejecutar varias veces.
 * Contraseña de todos los usuarios de prueba: Zoo12345 (SOLO DESARROLLO).
 * Los datos de ejemplo (animales, HCD, adoptantes, solicitudes) solo se crean si la BD no tiene animales.
 */
import { AnimalSize, AnimalStatus, PrismaClient, Sex, Species, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DEV_PASSWORD = 'Zoo12345';

async function seedUsers() {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);
  const users: { email: string; fullName: string; role: UserRole }[] = [
    {
      email: 'admin@zoonosis.test',
      fullName: 'Administrador del Sistema',
      role: UserRole.ADMIN,
    },
    {
      email: 'vet@zoonosis.test',
      fullName: 'Dra. Carla Veterinaria',
      role: UserRole.VETERINARIO,
    },
  ];
  const result: Record<UserRole, string> = {} as Record<UserRole, string>;
  for (const u of users) {
    const row = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash },
    });
    result[u.role] = row.id;
  }
  return result;
}

async function seedVaccines() {
  const vaccines: { name: string; species: Species[]; isRabies: boolean }[] = [
    {
      name: 'Antirrábica',
      species: [Species.PERRO, Species.GATO],
      isRabies: true,
    },
    {
      name: 'Quíntuple / Parvovirus',
      species: [Species.PERRO],
      isRabies: false,
    },
    { name: 'Triple felina', species: [Species.GATO], isRabies: false },
    {
      name: 'Desparasitación interna',
      species: [Species.PERRO, Species.GATO],
      isRabies: false,
    },
  ];
  for (const v of vaccines) {
    await prisma.vaccine.upsert({
      where: { name: v.name },
      update: {},
      create: v,
    });
  }
}

async function seedAlgorithmSettings(adminId: string) {
  await prisma.algorithmSetting.upsert({
    where: { version: 1 },
    update: {},
    create: {
      version: 1,
      weights: {
        time: 30,
        space: 25,
        experience: 20,
        energy: 15,
        preferences: 10,
      },
      thresholdHigh: 80,
      thresholdMedium: 60,
      createdById: adminId,
    },
  });
}

// ---------------------------------------------------------------------------
// Datos de ejemplo (animales, HCD, adoptantes y solicitudes)
// ---------------------------------------------------------------------------

const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
const dateOnly = (d: Date) => new Date(`${d.toISOString().slice(0, 10)}T00:00:00.000Z`);

type AnimalSeed = {
  name: string;
  species: Species;
  breed?: string;
  sex: Sex;
  ageMonths: number;
  color: string;
  size: AnimalSize;
  energyLevel: number;
  temperament: string;
  goodWithChildren: boolean;
  goodWithAnimals: boolean;
  needsYard: boolean;
  specialCare?: boolean;
  specialCareNotes?: string;
  requiredDailyHours: number;
  entryDaysAgo: number;
  entryReason: string;
  status: AnimalStatus;
};

const ANIMALS: AnimalSeed[] = [
  {
    name: 'Firulais',
    species: 'PERRO',
    breed: 'Mestizo',
    sex: 'MACHO',
    ageMonths: 36,
    color: 'Café',
    size: 'GRANDE',
    energyLevel: 4,
    temperament: 'Juguetón y sociable',
    goodWithChildren: true,
    goodWithAnimals: true,
    needsYard: false,
    requiredDailyHours: 4,
    entryDaysAgo: 160,
    entryReason: 'Rescate en vía pública',
    status: 'DISPONIBLE_ADOPCION',
  },
  {
    name: 'Luna',
    species: 'GATO',
    breed: 'Doméstico',
    sex: 'HEMBRA',
    ageMonths: 18,
    color: 'Gris atigrado',
    size: 'PEQUENO',
    energyLevel: 2,
    temperament: 'Tranquila y cariñosa',
    goodWithChildren: true,
    goodWithAnimals: true,
    needsYard: false,
    requiredDailyHours: 1.5,
    entryDaysAgo: 140,
    entryReason: 'Entrega voluntaria',
    status: 'DISPONIBLE_ADOPCION',
  },
  {
    name: 'Rocky',
    species: 'PERRO',
    breed: 'Pitbull mestizo',
    sex: 'MACHO',
    ageMonths: 48,
    color: 'Atigrado',
    size: 'GRANDE',
    energyLevel: 5,
    temperament: 'Muy activo, desconfía de otros perros',
    goodWithChildren: true,
    goodWithAnimals: false,
    needsYard: true,
    requiredDailyHours: 5,
    entryDaysAgo: 120,
    entryReason: 'Denuncia de abandono',
    status: 'DISPONIBLE_ADOPCION',
  },
  {
    name: 'Canela',
    species: 'PERRO',
    breed: 'Mestizo',
    sex: 'HEMBRA',
    ageMonths: 8,
    color: 'Canela',
    size: 'MEDIANO',
    energyLevel: 3,
    temperament: 'Curiosa',
    goodWithChildren: true,
    goodWithAnimals: true,
    needsYard: false,
    requiredDailyHours: 3,
    entryDaysAgo: 95,
    entryReason: 'Rescate en mercado',
    status: 'DISPONIBLE_ADOPCION',
  },
  {
    name: 'Michi',
    species: 'GATO',
    breed: 'Siamés mestizo',
    sex: 'MACHO',
    ageMonths: 60,
    color: 'Crema',
    size: 'PEQUENO',
    energyLevel: 1,
    temperament: 'Independiente',
    goodWithChildren: false,
    goodWithAnimals: true,
    needsYard: false,
    specialCare: true,
    specialCareNotes: 'Dieta renal',
    requiredDailyHours: 2,
    entryDaysAgo: 80,
    entryReason: 'Fallecimiento del dueño',
    status: 'DISPONIBLE_ADOPCION',
  },
  {
    name: 'Toby',
    species: 'PERRO',
    breed: 'Beagle mestizo',
    sex: 'MACHO',
    ageMonths: 24,
    color: 'Tricolor',
    size: 'MEDIANO',
    energyLevel: 4,
    temperament: 'Sociable',
    goodWithChildren: true,
    goodWithAnimals: true,
    needsYard: true,
    requiredDailyHours: 3,
    entryDaysAgo: 70,
    entryReason: 'Rescate en vía pública',
    status: 'EN_PROCESO_ADOPCION',
  },
  {
    name: 'Nala',
    species: 'PERRO',
    breed: 'Labrador mestizo',
    sex: 'HEMBRA',
    ageMonths: 30,
    color: 'Negro',
    size: 'GRANDE',
    energyLevel: 3,
    temperament: 'Dócil',
    goodWithChildren: true,
    goodWithAnimals: true,
    needsYard: false,
    requiredDailyHours: 3,
    entryDaysAgo: 150,
    entryReason: 'Entrega voluntaria',
    status: 'ADOPTADO',
  },
  {
    name: 'Max',
    species: 'PERRO',
    breed: 'Mestizo',
    sex: 'MACHO',
    ageMonths: 12,
    color: 'Blanco con manchas',
    size: 'MEDIANO',
    energyLevel: 4,
    temperament: 'Nervioso',
    goodWithChildren: false,
    goodWithAnimals: false,
    needsYard: false,
    requiredDailyHours: 3,
    entryDaysAgo: 20,
    entryReason: 'Mordedura reportada (control antirrábico)',
    status: 'EN_CUARENTENA',
  },
  {
    name: 'Pelusa',
    species: 'GATO',
    breed: 'Angora mestizo',
    sex: 'HEMBRA',
    ageMonths: 6,
    color: 'Blanco',
    size: 'PEQUENO',
    energyLevel: 3,
    temperament: 'Asustadiza',
    goodWithChildren: true,
    goodWithAnimals: true,
    needsYard: false,
    requiredDailyHours: 2,
    entryDaysAgo: 30,
    entryReason: 'Rescate en vía pública',
    status: 'EN_TRATAMIENTO',
  },
  {
    name: 'Bruno',
    species: 'PERRO',
    breed: 'Pastor alemán mestizo',
    sex: 'MACHO',
    ageMonths: 72,
    color: 'Negro y fuego',
    size: 'GRANDE',
    energyLevel: 2,
    temperament: 'Tranquilo',
    goodWithChildren: true,
    goodWithAnimals: true,
    needsYard: true,
    requiredDailyHours: 2,
    entryDaysAgo: 10,
    entryReason: 'Entrega voluntaria',
    status: 'EN_OBSERVACION',
  },
  {
    name: '',
    species: 'OTRO',
    breed: 'Conejo',
    sex: 'DESCONOCIDO',
    ageMonths: 10,
    color: 'Gris',
    size: 'PEQUENO',
    energyLevel: 2,
    temperament: 'Tímido',
    goodWithChildren: true,
    goodWithAnimals: false,
    needsYard: false,
    requiredDailyHours: 1,
    entryDaysAgo: 5,
    entryReason: 'Hallazgo en parque',
    status: 'INGRESADO',
  },
  {
    name: 'Sombra',
    species: 'GATO',
    breed: 'Doméstico',
    sex: 'MACHO',
    ageMonths: 120,
    color: 'Negro',
    size: 'MEDIANO',
    energyLevel: 1,
    temperament: 'Tranquilo',
    goodWithChildren: true,
    goodWithAnimals: true,
    needsYard: false,
    specialCare: true,
    specialCareNotes: 'Insuficiencia renal avanzada',
    requiredDailyHours: 2,
    entryDaysAgo: 110,
    entryReason: 'Rescate en vía pública',
    status: 'FALLECIDO',
  },
];

async function seedDemoData(ids: Record<UserRole, string>) {
  if ((await prisma.animal.count()) > 0) {
    console.log('Ya existen animales: se omiten los datos de ejemplo.');
    return;
  }
  const vaccines = await prisma.vaccine.findMany();
  const vac = (name: string) => vaccines.find((v) => v.name.startsWith(name))!.id;
  const year = new Date(Date.now() - 4 * 3_600_000).getUTCFullYear();

  const created: Record<string, string> = {};
  for (const [i, a] of ANIMALS.entries()) {
    const { entryDaysAgo, status, name, ...rest } = a;
    const row = await prisma.animal.create({
      data: {
        ...rest,
        name: name || null,
        code: `ZOO-${year}-${String(i + 1).padStart(4, '0')}`,
        entryDate: daysAgo(entryDaysAgo),
        status,
        createdById: ids.ADMIN,
        ...(status === 'FALLECIDO'
          ? { exitDate: daysAgo(15), exitReason: 'FALLECIDO', exitNotes: 'Complicación renal' }
          : {}),
      },
    });
    created[a.name || 'Conejo'] = row.id;

    // Consulta de ingreso para todos menos el recién llegado (RN-03 exige al menos una)
    if (status !== 'INGRESADO') {
      await prisma.veterinaryConsultation.create({
        data: {
          animalId: row.id,
          veterinarianId: ids.VETERINARIO,
          consultationDate: daysAgo(entryDaysAgo - 1),
          reason: 'Evaluación de ingreso',
          weightKg: a.size === 'GRANDE' ? 28.5 : a.size === 'MEDIANO' ? 14.2 : 4.1,
          temperatureC: 38.6,
          clinicalEvaluation: 'Estado general bueno. Mucosas rosadas, hidratación adecuada.',
          diagnoses: { create: [{ description: 'Animal clínicamente sano' }] },
        },
      });
      // Antirrábica: la próxima dosis de algunos vence pronto o ya venció (alertas RN-12)
      if (a.species !== 'OTRO') {
        await prisma.vaccination.create({
          data: {
            animalId: row.id,
            vaccineId: vac('Antirrábica'),
            applicationDate: dateOnly(daysAgo(entryDaysAgo - 2)),
            dose: '1 ml',
            batchNumber: `AR-${2400 + i}`,
            nextDoseDate: dateOnly(daysAgo(entryDaysAgo - 2 - 365)),
            appliedById: ids.VETERINARIO,
          },
        });
      }
    }
  }

  // Alertas: Firulais con quíntuple vencida y Canela a 3 días
  await prisma.vaccination.createMany({
    data: [
      {
        animalId: created.Firulais,
        vaccineId: vac('Quíntuple'),
        applicationDate: dateOnly(daysAgo(40)),
        dose: '1 ml',
        nextDoseDate: dateOnly(daysAgo(2)),
        appliedById: ids.VETERINARIO,
      },
      {
        animalId: created.Canela,
        vaccineId: vac('Quíntuple'),
        applicationDate: dateOnly(daysAgo(18)),
        dose: '1 ml',
        nextDoseDate: dateOnly(daysAgo(-3)),
        appliedById: ids.VETERINARIO,
      },
      {
        animalId: created.Luna,
        vaccineId: vac('Triple felina'),
        applicationDate: dateOnly(daysAgo(100)),
        dose: '1 ml',
        nextDoseDate: dateOnly(daysAgo(-20)),
        appliedById: ids.VETERINARIO,
      },
    ],
  });

  // Cuarentena activa (Max), observación activa (Bruno, vencida) y tratamiento activo (Pelusa)
  const quarantine = await prisma.quarantinePeriod.create({
    data: {
      animalId: created.Max,
      type: 'CUARENTENA',
      reason: 'Observación antirrábica por mordedura',
      startDate: daysAgo(19),
      expectedEndDate: daysAgo(-11),
      startedById: ids.VETERINARIO,
    },
  });
  await prisma.quarantineControl.create({
    data: {
      quarantinePeriodId: quarantine.id,
      controlDate: daysAgo(12),
      animalCondition: 'Estable, sin signos neurológicos',
      createdById: ids.VETERINARIO,
    },
  });
  await prisma.quarantinePeriod.create({
    data: {
      animalId: created.Bruno,
      type: 'OBSERVACION',
      reason: 'Tos leve al ingreso',
      startDate: daysAgo(9),
      expectedEndDate: daysAgo(2),
      startedById: ids.ADMIN,
    },
  });
  const pelusaConsult = await prisma.veterinaryConsultation.findFirstOrThrow({
    where: { animalId: created.Pelusa },
  });
  await prisma.treatment.create({
    data: {
      consultationId: pelusaConsult.id,
      description: 'Tratamiento de otitis externa',
      instructions: 'Limpieza diaria y gotas óticas',
      startDate: dateOnly(daysAgo(10)),
      endDate: dateOnly(daysAgo(1)),
      medications: {
        create: [
          {
            name: 'Otomax',
            dose: '3 gotas',
            administrationRoute: 'Ótica',
            frequency: 'Cada 12 h',
            duration: '10 días',
          },
        ],
      },
    },
  });

  // Adoptantes
  const adopters = [
    {
      ci: '7845123 SC',
      firstName: 'María',
      lastName: 'Rojas Vaca',
      phone: '70012345',
      email: 'maria.rojas@example.com',
      address: 'Barrio Equipetrol, calle 3',
      housingType: 'CASA_CON_PATIO',
      hasYard: true,
      hasChildren: true,
      hasOtherAnimals: false,
      availableHoursPerDay: 4,
      experience: 'BASICA',
      preferredSpecies: 'PERRO',
      preferredSize: null,
    },
    {
      ci: '6543210 SC',
      firstName: 'Jorge',
      lastName: 'Suárez Pinto',
      phone: '76543210',
      email: null,
      address: 'Plan 3000, UV 150',
      housingType: 'DEPARTAMENTO',
      hasYard: false,
      hasChildren: false,
      hasOtherAnimals: true,
      availableHoursPerDay: 2,
      experience: 'NINGUNA',
      preferredSpecies: 'GATO',
      preferredSize: 'PEQUENO',
    },
    {
      ci: '9123456 CB',
      firstName: 'Lucía',
      lastName: 'Fernández Arce',
      phone: '71234567',
      email: 'lucia.fa@example.com',
      address: 'Av. Banzer, 6.º anillo',
      housingType: 'CASA_CON_PATIO',
      hasYard: true,
      hasChildren: false,
      hasOtherAnimals: false,
      availableHoursPerDay: 6,
      experience: 'AVANZADA',
      preferredSpecies: null,
      preferredSize: 'GRANDE',
    },
    {
      ci: '5566778 SC',
      firstName: 'Carlos',
      lastName: 'Méndez Ortiz',
      phone: '78899001',
      email: null,
      address: 'Villa 1.º de Mayo',
      housingType: 'CASA_SIN_PATIO',
      hasYard: false,
      hasChildren: true,
      hasOtherAnimals: true,
      availableHoursPerDay: 3,
      experience: 'BASICA',
      preferredSpecies: null,
      preferredSize: null,
    },
    {
      ci: '4433221 LP',
      firstName: 'Ana',
      lastName: 'Gutiérrez Soliz',
      phone: '69988776',
      email: 'ana.gs@example.com',
      address: 'Urubó, condominio Las Palmas',
      housingType: 'CASA_CON_PATIO',
      hasYard: true,
      hasChildren: true,
      hasOtherAnimals: true,
      availableHoursPerDay: 5,
      experience: 'AVANZADA',
      preferredSpecies: 'PERRO',
      preferredSize: 'MEDIANO',
    },
  ] as const;
  const profileIds: string[] = [];
  for (const a of adopters) {
    const { ci, firstName, lastName, phone, email, address, ...profile } = a;
    const p = await prisma.adopterProfile.create({
      data: {
        ...profile,
        person: { create: { ci, firstName, lastName, phone, email, address } },
      },
    });
    profileIds.push(p.id);
  }

  // Solicitudes: aprobada (Nala), pendiente (Toby) y rechazada (Rocky, vuelve a disponible)
  const approved = await prisma.adoptionRequest.create({
    data: {
      adopterProfileId: profileIds[2],
      animalId: created.Nala,
      responsibleUserId: ids.ADMIN,
      status: 'APROBADA',
      requestDate: daysAgo(50),
      decisionDate: daysAgo(40),
      deliveryDate: daysAgo(38),
      evaluationNotes: 'Visita domiciliaria favorable. Hogar amplio con patio.',
    },
  });
  await prisma.adoptionFollowup.create({
    data: {
      adoptionRequestId: approved.id,
      followupDate: daysAgo(10),
      animalCondition: 'Excelente, adaptada al hogar',
      observations: 'Se recomienda continuar con el calendario de vacunas.',
      createdById: ids.ADMIN,
    },
  });
  await prisma.adoptionRequest.create({
    data: {
      adopterProfileId: profileIds[4],
      animalId: created.Toby,
      responsibleUserId: ids.ADMIN,
      status: 'PENDIENTE',
      requestDate: daysAgo(3),
    },
  });
  await prisma.adoptionRequest.create({
    data: {
      adopterProfileId: profileIds[1],
      animalId: created.Rocky,
      responsibleUserId: ids.ADMIN,
      status: 'RECHAZADA',
      requestDate: daysAgo(30),
      decisionDate: daysAgo(25),
      evaluationNotes: 'Departamento sin patio y con otros animales: no compatible con Rocky.',
    },
  });
  console.log(
    `Datos de ejemplo: ${ANIMALS.length} animales, ${adopters.length} adoptantes, 3 solicitudes.`,
  );
}

async function main() {
  const userIds = await seedUsers();
  await seedVaccines();
  await seedAlgorithmSettings(userIds.ADMIN);
  await seedDemoData(userIds);
  console.log('Seed completado. Usuarios de prueba con contraseña', DEV_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
