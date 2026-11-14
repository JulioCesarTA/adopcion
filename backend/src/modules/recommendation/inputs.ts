/**
 * Conversión de filas de Prisma a las entradas del motor y del modelo.
 * Vive en su propio archivo para que `recommendation.service` y `ml.service`
 * puedan usarlo sin importarse mutuamente.
 */
import type { AdopterProfile, Animal } from '@prisma/client';
import type { AdopterInput, AnimalInput } from './engine';

export function toAdopterInput(p: AdopterProfile): AdopterInput {
  return {
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
