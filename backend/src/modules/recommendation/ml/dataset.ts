/**
 * Representación de un par adoptante-animal como vector de variables para el
 * modelo. Función PURA: no toca la base de datos, igual que `engine.ts`.
 *
 * Decisión de diseño: `goodWithChildren` y `goodWithAnimals` NO son variables
 * del modelo. Los conflictos que generan (animal que no tolera niños en un
 * hogar con niños, animal que no tolera otros animales donde ya hay otros) son
 * vetos absolutos de seguridad y se resuelven con los filtros duros de
 * `engine.ts` ANTES de llegar al modelo. Dentro del conjunto de pares que pasan
 * esos filtros, ambas variables quedan determinadas y no aportan información.
 */
import type { AdopterInput, AnimalInput, Experience, HousingType, Size } from '../engine';

export const HOUSING_ORDINAL: Record<HousingType, number> = {
  DEPARTAMENTO: 0,
  CASA_SIN_PATIO: 1,
  CASA_CON_PATIO: 2,
};

export const SIZE_ORDINAL: Record<Size, number> = {
  PEQUENO: 0,
  MEDIANO: 1,
  GRANDE: 2,
};

export const EXPERIENCE_ORDINAL: Record<Experience, number> = {
  NINGUNA: 0,
  BASICA: 1,
  AVANZADA: 2,
};

/** Nombres de las variables, en el mismo orden que devuelve `toFeatures`. */
export const FEATURE_NAMES = [
  'vivienda',
  'tiene_patio',
  'tiene_ninos',
  'tiene_otros_animales',
  'horas_disponibles',
  'experiencia',
  'animal_es_perro',
  'animal_es_gato',
  'tamano_animal',
  'nivel_energia',
  'necesita_patio',
  'cuidados_especiales',
  'horas_requeridas',
  'razon_horas',
  'coincide_especie_preferida',
  'coincide_tamano_preferido',
] as const;

export type FeatureName = (typeof FEATURE_NAMES)[number];

/** Etiquetas legibles para mostrar la importancia de variables en la interfaz. */
export const FEATURE_LABELS: Record<FeatureName, string> = {
  vivienda: 'Tipo de vivienda',
  tiene_patio: 'Tiene patio',
  tiene_ninos: 'Hay niños en el hogar',
  tiene_otros_animales: 'Tiene otros animales',
  horas_disponibles: 'Horas disponibles por día',
  experiencia: 'Experiencia del adoptante',
  animal_es_perro: 'El animal es perro',
  animal_es_gato: 'El animal es gato',
  tamano_animal: 'Tamaño del animal',
  nivel_energia: 'Nivel de energía del animal',
  necesita_patio: 'El animal necesita patio',
  cuidados_especiales: 'Requiere cuidados especiales',
  horas_requeridas: 'Horas de atención que requiere',
  razon_horas: 'Razón horas disponibles / requeridas',
  coincide_especie_preferida: 'Coincide con la especie preferida',
  coincide_tamano_preferido: 'Coincide con el tamaño preferido',
};

export const N_FEATURES = FEATURE_NAMES.length;

const bin = (v: boolean) => (v ? 1 : 0);

/**
 * Convierte un par adoptante-animal en el vector de variables.
 * `razon_horas` es la única variable derivada: la razón entre lo que el
 * adoptante ofrece y lo que el animal necesita, acotada a 3 para que un caso
 * extremo no domine los cortes del árbol.
 */
export function toFeatures(adopter: AdopterInput, animal: AnimalInput): number[] {
  const required = animal.requiredDailyHours;
  const ratio = Math.min(adopter.availableHoursPerDay / Math.max(required, 0.5), 3);

  return [
    HOUSING_ORDINAL[adopter.housingType],
    bin(adopter.hasYard),
    bin(adopter.hasChildren),
    bin(adopter.hasOtherAnimals),
    adopter.availableHoursPerDay,
    EXPERIENCE_ORDINAL[adopter.experience],
    bin(animal.species === 'PERRO'),
    bin(animal.species === 'GATO'),
    SIZE_ORDINAL[animal.size],
    animal.energyLevel,
    bin(animal.needsYard),
    bin(animal.specialCare),
    required,
    ratio,
    // Sin preferencia declarada cuenta como coincidencia: no es una penalización.
    bin(!adopter.preferredSpecies || adopter.preferredSpecies === animal.species),
    bin(!adopter.preferredSize || adopter.preferredSize === animal.size),
  ];
}

/** Un caso de entrenamiento: vector de variables y etiqueta binaria. */
export interface Sample {
  features: number[];
  label: 0 | 1;
}

/** Divide en `k` pliegues conservando la proporción de clases en cada uno. */
export function stratifiedFolds(
  samples: Sample[],
  k: number,
  rng: { shuffle<T>(a: readonly T[]): T[] },
): Sample[][] {
  const folds: Sample[][] = Array.from({ length: k }, () => []);
  for (const label of [1, 0] as const) {
    const group = rng.shuffle(samples.filter((s) => s.label === label));
    group.forEach((sample, i) => folds[i % k].push(sample));
  }
  return folds.map((f) => rng.shuffle(f));
}
