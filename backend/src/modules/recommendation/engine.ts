/**
 * Motor de compatibilidad adoptante ↔ animal (sección 8).
 * Función PURA: sin acceso a BD ni efectos secundarios, para poder testearla aislada.
 */

export type CriterionKey = 'time' | 'space' | 'experience' | 'energy' | 'preferences';
export type Weights = Record<CriterionKey, number>;
export type Level = 'ALTA' | 'MEDIA' | 'BAJA' | 'INCOMPATIBLE';

export type HousingType = 'DEPARTAMENTO' | 'CASA_SIN_PATIO' | 'CASA_CON_PATIO';
export type Experience = 'NINGUNA' | 'BASICA' | 'AVANZADA';
export type Species = 'PERRO' | 'GATO' | 'OTRO';
export type Size = 'PEQUENO' | 'MEDIANO' | 'GRANDE';

export interface AdopterInput {
  housingType: HousingType;
  hasYard: boolean;
  hasChildren: boolean;
  hasOtherAnimals: boolean;
  availableHoursPerDay: number;
  experience: Experience;
  preferredSpecies?: Species | null;
  preferredSize?: Size | null;
}

export interface AnimalInput {
  status: string;
  species: Species;
  size: Size;
  energyLevel: number;
  goodWithChildren: boolean;
  goodWithAnimals: boolean;
  needsYard: boolean;
  specialCare: boolean;
  requiredDailyHours: number;
}

export interface AlgorithmSettings {
  version: number;
  weights: Weights;
  thresholdHigh: number;
  thresholdMedium: number;
}

export interface CriterionResult {
  key: CriterionKey;
  label: string;
  weight: number;
  fit: number;
  points: number;
  explanation: string;
}

export interface CompatibilityResult {
  hardFilters: { passed: boolean; reasons: string[] };
  criteria: CriterionResult[];
  score: number;
  level: Level;
  modelVersion: number;
  disclaimer: string;
}

export const DISCLAIMER = 'Resultado de apoyo. La decisión final es del personal responsable.';

export const CRITERIA_LABELS: Record<CriterionKey, string> = {
  time: 'Tiempo disponible',
  space: 'Espacio del hogar',
  experience: 'Experiencia',
  energy: 'Energía / estilo de vida',
  preferences: 'Preferencias',
};

/** Error de perfil incompleto (se traduce a 422 en el servicio). */
export class IncompleteProfileError extends Error {
  constructor(public readonly missing: string[]) {
    super(`No se puede generar una recomendación confiable. Faltan datos: ${missing.join(', ')}`);
    this.name = 'IncompleteProfileError';
  }
}

export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

const HOUSING_CAPACITY: Record<HousingType, number> = {
  DEPARTAMENTO: 0,
  CASA_SIN_PATIO: 1,
  CASA_CON_PATIO: 2,
};
const SIZE_NEED: Record<Size, number> = { PEQUENO: 0, MEDIANO: 1, GRANDE: 2 };
const EXPERIENCE_LEVEL: Record<Experience, number> = {
  NINGUNA: 0,
  BASICA: 1,
  AVANZADA: 2,
};

const HOUSING_LABEL: Record<HousingType, string> = {
  DEPARTAMENTO: 'Departamento',
  CASA_SIN_PATIO: 'Casa sin patio',
  CASA_CON_PATIO: 'Casa con patio',
};
const SIZE_LABEL: Record<Size, string> = {
  PEQUENO: 'pequeño',
  MEDIANO: 'mediano',
  GRANDE: 'grande',
};
const SPECIES_LABEL: Record<Species, string> = {
  PERRO: 'perro',
  GATO: 'gato',
  OTRO: 'otra especie',
};
const EXPERIENCE_LABEL = ['ninguna', 'básica', 'avanzada'];

const fmtH = (h: number) => `${Number.isInteger(h) ? h : h.toFixed(1)} h/día`;

/** Valida que los perfiles tengan todos los datos que usa el algoritmo. */
export function validateInputs(adopter: Partial<AdopterInput>, animal: Partial<AnimalInput>): void {
  const missing: string[] = [];
  const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
  const isBool = (v: unknown) => typeof v === 'boolean';

  if (!adopter.housingType || !(adopter.housingType in HOUSING_CAPACITY))
    missing.push('adoptante: tipo de vivienda');
  if (!isBool(adopter.hasYard)) missing.push('adoptante: tiene patio');
  if (!isBool(adopter.hasChildren)) missing.push('adoptante: tiene niños');
  if (!isBool(adopter.hasOtherAnimals)) missing.push('adoptante: tiene otros animales');
  if (!isNum(adopter.availableHoursPerDay)) missing.push('adoptante: horas diarias disponibles');
  if (!adopter.experience || !(adopter.experience in EXPERIENCE_LEVEL))
    missing.push('adoptante: experiencia');

  if (!animal.species) missing.push('animal: especie');
  if (!animal.size || !(animal.size in SIZE_NEED)) missing.push('animal: tamaño');
  if (!isNum(animal.energyLevel)) missing.push('animal: nivel de energía');
  if (!isBool(animal.goodWithChildren)) missing.push('animal: se lleva bien con niños');
  if (!isBool(animal.goodWithAnimals)) missing.push('animal: se lleva bien con otros animales');
  if (!isBool(animal.needsYard)) missing.push('animal: necesita patio');
  if (!isBool(animal.specialCare)) missing.push('animal: cuidados especiales');
  if (!isNum(animal.requiredDailyHours)) missing.push('animal: horas diarias de atención');

  if (missing.length) throw new IncompleteProfileError(missing);
}

function timeCriterion(a: AdopterInput, n: AnimalInput): [number, string] {
  const fit =
    n.requiredDailyHours <= 0 ? 1 : Math.min(a.availableHoursPerDay / n.requiredDailyHours, 1);
  const text =
    fit >= 1
      ? `Dispone de ${fmtH(a.availableHoursPerDay)} y el animal requiere ${fmtH(n.requiredDailyHours)}: tiempo suficiente.`
      : `Dispone de ${fmtH(a.availableHoursPerDay)} y el animal requiere ${fmtH(n.requiredDailyHours)}.`;
  return [fit, text];
}

function spaceCriterion(a: AdopterInput, n: AnimalInput): [number, string] {
  const capacity = HOUSING_CAPACITY[a.housingType];
  const need = n.needsYard ? Math.min(SIZE_NEED[n.size] + 1, 2) : SIZE_NEED[n.size];
  const home = HOUSING_LABEL[a.housingType];
  const size = SIZE_LABEL[n.size];
  const yard = n.needsYard ? ' que necesita patio' : '';

  if (n.species === 'GATO' && !n.needsYard) {
    return [1, `${home}: el espacio es adecuado para un gato.`];
  }
  const gap = need - capacity;
  if (gap <= 0) return [1, `${home} es adecuado para un animal de tamaño ${size}${yard}.`];
  if (gap === 1) return [0.5, `${home} es algo reducido para un animal de tamaño ${size}${yard}.`];
  return [0, `${home} no es adecuado para un animal de tamaño ${size}${yard}.`];
}

function experienceCriterion(a: AdopterInput, n: AnimalInput): [number, string] {
  const needed = n.specialCare ? 2 : n.energyLevel >= 4 ? 1 : 0;
  const has = EXPERIENCE_LEVEL[a.experience];
  const fit = Math.min(1, Math.max(0, 1 - 0.5 * (needed - has)));
  const why = n.specialCare
    ? 'requiere cuidados especiales'
    : n.energyLevel >= 4
      ? 'tiene energía alta'
      : 'no tiene requisitos especiales';
  const text =
    fit >= 1
      ? `Experiencia ${EXPERIENCE_LABEL[has]}: suficiente (el animal ${why}).`
      : `Experiencia ${EXPERIENCE_LABEL[has]}; se recomienda ${EXPERIENCE_LABEL[needed]} porque el animal ${why}.`;
  return [fit, text];
}

function energyCriterion(a: AdopterInput, n: AnimalInput): [number, string] {
  const capacity = 0.6 * Math.min(a.availableHoursPerDay / 8, 1) + 0.4 * (a.hasYard ? 1 : 0);
  const energy = (n.energyLevel - 1) / 4;
  const fit = 1 - Math.max(0, energy - capacity);
  const text =
    fit >= 1
      ? `El estilo de vida del hogar cubre la energía del animal (nivel ${n.energyLevel}/5).`
      : `El animal tiene energía ${n.energyLevel}/5 y el hogar ofrece una capacidad de actividad de ${Math.round(capacity * 100)} %${a.hasYard ? '' : ' (sin patio)'}.`;
  return [fit, text];
}

function preferencesCriterion(a: AdopterInput, n: AnimalInput): [number, string] {
  const speciesOk = !a.preferredSpecies || a.preferredSpecies === n.species;
  const sizeOk = !a.preferredSize || a.preferredSize === n.size;
  const fit = 0.5 * (speciesOk ? 1 : 0) + 0.5 * (sizeOk ? 1 : 0);
  const parts: string[] = [];
  parts.push(
    !a.preferredSpecies
      ? 'sin preferencia de especie'
      : speciesOk
        ? `prefiere ${SPECIES_LABEL[a.preferredSpecies]} (coincide)`
        : `prefiere ${SPECIES_LABEL[a.preferredSpecies]} (no coincide)`,
  );
  parts.push(
    !a.preferredSize
      ? 'sin preferencia de tamaño'
      : sizeOk
        ? `prefiere tamaño ${SIZE_LABEL[a.preferredSize]} (coincide)`
        : `prefiere tamaño ${SIZE_LABEL[a.preferredSize]} (no coincide)`,
  );
  const text = parts.join('; ');
  return [fit, text.charAt(0).toUpperCase() + text.slice(1) + '.'];
}

const CRITERIA: Record<CriterionKey, (a: AdopterInput, n: AnimalInput) => [number, string]> = {
  time: timeCriterion,
  space: spaceCriterion,
  experience: experienceCriterion,
  energy: energyCriterion,
  preferences: preferencesCriterion,
};

export function levelFor(
  score: number,
  s: Pick<AlgorithmSettings, 'thresholdHigh' | 'thresholdMedium'>,
): Level {
  if (score >= s.thresholdHigh) return 'ALTA';
  if (score >= s.thresholdMedium) return 'MEDIA';
  return 'BAJA';
}

/** Calcula el puntaje (0–100), el nivel y el desglose explicable. */
export function computeCompatibility(
  adopter: AdopterInput,
  animal: AnimalInput,
  settings: AlgorithmSettings,
): CompatibilityResult {
  validateInputs(adopter, animal);

  const reasons: string[] = [];
  if (animal.status !== 'DISPONIBLE_ADOPCION')
    reasons.push('El animal no está disponible para adopción.');
  if (!animal.goodWithChildren && adopter.hasChildren)
    reasons.push('El animal no se lleva bien con niños y en el hogar hay niños.');
  if (!animal.goodWithAnimals && adopter.hasOtherAnimals)
    reasons.push(
      'El animal no se lleva bien con otros animales y el adoptante tiene otros animales.',
    );

  const base = {
    modelVersion: settings.version,
    disclaimer: DISCLAIMER,
  };

  if (reasons.length) {
    return {
      ...base,
      hardFilters: { passed: false, reasons },
      criteria: [],
      score: 0,
      level: 'INCOMPATIBLE',
    };
  }

  const keys = Object.keys(CRITERIA) as CriterionKey[];
  let total = 0;
  const criteria = keys.map((key): CriterionResult => {
    const weight = settings.weights[key] ?? 0;
    const [rawFit, explanation] = CRITERIA[key](adopter, animal);
    const fit = Math.min(1, Math.max(0, rawFit));
    const points = weight * fit;
    total += points;
    return {
      key,
      label: CRITERIA_LABELS[key],
      weight,
      fit: Math.round(fit * 10000) / 10000,
      points: round2(points),
      explanation,
    };
  });

  const score = round2(Math.min(100, Math.max(0, total)));
  return {
    ...base,
    hardFilters: { passed: true, reasons: [] },
    criteria,
    score,
    level: levelFor(score, settings),
  };
}

/** Ordena resultados de ranking: mayor puntaje primero; empate por código del animal. */
export function sortRanking<T extends { result: CompatibilityResult; code: string }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => b.result.score - a.result.score || a.code.localeCompare(b.code));
}
