/**
 * Conversión de filas de Prisma a las entradas del motor y del modelo.
 * Vive en su propio archivo para que `recommendation.service` y `ml.service`
 * puedan usarlo sin importarse mutuamente.
 */
import type { AdopterProfile, Animal, PrismaClient } from '@prisma/client';
import type { AdopterInput, AnimalInput, ClinicalHistory } from './engine';
import { NO_HISTORY } from './ml/dataset';

const YEAR_MS = 365 * 86_400_000;

/**
 * Historial de la persona como cliente de la clínica en los 12 meses previos a
 * `asOf`. La persona se enlaza con su cuenta por el email. Para entrenar se usa
 * la fecha de la solicitud, así el modelo no aprende de hechos posteriores a la
 * decisión.
 */
export async function loadClinicalHistory(
  prisma: PrismaClient,
  email: string | null | undefined,
  asOf: Date = new Date(),
): Promise<ClinicalHistory> {
  if (!email) return NO_HISTORY;
  const account = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!account) return NO_HISTORY;

  const since = new Date(asOf.getTime() - YEAR_MS);
  const window = { gte: since, lte: asOf };
  const pets = await prisma.animal.findMany({
    where: { ownerId: account.id, deletedAt: null, createdAt: { lte: asOf } },
    select: {
      id: true,
      vaccinations: { where: { applicationDate: { lte: asOf } }, select: { nextDoseDate: true } },
    },
  });
  const [attendedBookings, cancelledBookings, consultations] = await Promise.all([
    prisma.consultationBooking.count({
      where: { clientId: account.id, status: 'ATENDIDA', scheduledAt: window },
    }),
    prisma.consultationBooking.count({
      where: { clientId: account.id, status: 'CANCELADA', scheduledAt: window },
    }),
    prisma.veterinaryConsultation.count({
      where: { animalId: { in: pets.map((p) => p.id) }, consultationDate: window },
    }),
  ]);
  const upToDate = pets.filter(
    (p) =>
      p.vaccinations.length > 0 &&
      !p.vaccinations.some((v) => v.nextDoseDate && v.nextDoseDate < asOf),
  ).length;

  return {
    pets: pets.length,
    attendedBookings,
    cancelledBookings,
    consultations,
    vaccinesUpToDate: pets.length ? Math.round((upToDate / pets.length) * 100) / 100 : 0,
  };
}

export function toAdopterInput(p: AdopterProfile, history?: ClinicalHistory): AdopterInput {
  return {
    history,
    housingType: p.housingType,
    hasYard: p.hasYard,
    hasChildren: p.hasChildren,
    hasOtherAnimals: p.hasOtherAnimals,
    availableHoursPerDay: p.availableHoursPerDay?.toNumber(),
    experience: p.experience,
    preferredSpecies: p.preferredSpecies,
    preferredSize: p.preferredSize,
  };
}

export function toAnimalInput(a: Animal): AnimalInput {
  return {
    status: a.status,
    species: a.species,
    size: a.size,
    energyLevel: a.energyLevel,
    goodWithChildren: a.goodWithChildren,
    goodWithAnimals: a.goodWithAnimals,
    needsYard: a.needsYard,
    specialCare: a.specialCare,
    requiredDailyHours: a.requiredDailyHours?.toNumber(),
  };
}
