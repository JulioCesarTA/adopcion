/**
 * SOLO PARA PRUEBAS: datos sintéticos con los que las pruebas comprueban que el
 * Random Forest aprende. El sistema nunca entrena con ellos.
 *
 * Generador de un conjunto de datos SINTÉTICO de pares adoptante-animal con
 * su desenlace (adopción sostenida = 1, fallida o rechazada = 0).
 *
 * ===========================================================================
 * ADVERTENCIA METODOLÓGICA — leer antes de citar resultados
 * ===========================================================================
 * Estos datos NO son observaciones reales. Son casos generados a partir de
 * criterios de idoneidad de adopción responsable, con variabilidad aleatoria.
 * Sirven para dos cosas legítimas:
 *
 *   1. Validar que el canal completo funciona (entrenamiento, validación
 *      cruzada, serialización, inferencia) antes de tener datos reales.
 *   2. Arrancar en frío el modelo mientras la institución acumula
 *      decisiones reales.
 *
 * NO sirven para afirmar que el modelo predice adopciones reales. Cuando se
 * reporten métricas hay que declarar el origen del conjunto (`source`).
 * El servicio prefiere siempre los datos reales y marca cada modelo con su
 * procedencia: REAL, SINTETICO o MIXTO.
 *
 * ---------------------------------------------------------------------------
 * Por qué el generador NO reutiliza `engine.ts`
 * ---------------------------------------------------------------------------
 * Si las etiquetas salieran del puntaje ponderado del motor de reglas, el
 * modelo solo reaprendería esas reglas y la comparación contra el motor sería
 * circular: no habría nada que aprender y el resultado no tendría valor. Por
 * eso la propensión de abajo se construye con una forma funcional distinta,
 * dominada por INTERACCIONES que la suma ponderada no puede expresar:
 *
 *   · espacio × tamaño × especie  (un departamento es excelente para un gato
 *     y malo para un perro grande; la suma ponderada aplica la misma
 *     penalización de espacio sin importar la especie)
 *   · experiencia × exigencia del animal
 *   · energía × disponibilidad de patio
 *   · niños × nivel de energía
 *
 * Además se agrega un término aleatorio que representa los factores no
 * observados por el sistema (química en la entrevista, situación económica,
 * cambios familiares). Eso es lo que hace que el problema sea no trivial: un
 * clasificador perfecto es imposible por construcción, igual que en la
 * realidad.
 */
import type { AdopterInput, AnimalInput, Experience, HousingType, Size, Species } from '../engine';
import { toFeatures, type Sample } from './dataset';
import { Rng } from './rng';

export interface SyntheticOptions {
  /** Cantidad de casos a generar (después de descartar los que fallan filtros duros). */
  size: number;
  seed: number;
}

/** Elige con probabilidades dadas. `weights` no necesita sumar 1. */
function weighted<T>(rng: Rng, options: readonly [T, number][]): T {
  const total = options.reduce((acc, [, w]) => acc + w, 0);
  let r = rng.next() * total;
  for (const [value, w] of options) {
    r -= w;
    if (r <= 0) return value;
  }
  return options[options.length - 1][0];
}

/**
 * Perfil de adoptante con distribuciones marginales plausibles para Santa Cruz
 * de la Sierra: predominan casas con patio, la mayoría sin experiencia previa
 * avanzada, y la disponibilidad diaria se concentra entre 2 y 6 horas.
 */
function randomAdopter(rng: Rng): AdopterInput {
  const housingType = weighted<HousingType>(rng, [
    ['CASA_CON_PATIO', 45],
    ['CASA_SIN_PATIO', 32],
    ['DEPARTAMENTO', 23],
  ]);
  // Una casa con patio tiene patio casi siempre; un departamento casi nunca.
  const hasYard =
    housingType === 'CASA_CON_PATIO'
      ? rng.next() < 0.95
      : housingType === 'CASA_SIN_PATIO'
        ? rng.next() < 0.12
        : rng.next() < 0.03;

  // Horas disponibles: normal truncada centrada en 4 h.
  const hours = Math.min(14, Math.max(0.5, Math.round((4 + rng.normal() * 2.2) * 2) / 2));

  const experience = weighted<Experience>(rng, [
    ['NINGUNA', 38],
    ['BASICA', 42],
    ['AVANZADA', 20],
  ]);

  // Dos tercios de los adoptantes declaran alguna preferencia.
  const declaresSpecies = rng.next() < 0.66;
  const declaresSize = rng.next() < 0.45;

  return {
    housingType,
    hasYard,
    hasChildren: rng.next() < 0.42,
    hasOtherAnimals: rng.next() < 0.35,
    availableHoursPerDay: hours,
    experience,
    preferredSpecies: declaresSpecies
      ? weighted<Species>(rng, [
          ['PERRO', 62],
          ['GATO', 34],
          ['OTRO', 4],
        ])
      : null,
    preferredSize: declaresSize
      ? weighted<Size>(rng, [
          ['PEQUENO', 40],
          ['MEDIANO', 38],
          ['GRANDE', 22],
        ])
      : null,
  };
}

/** Animal con las proporciones típicas de un albergue municipal. */
function randomAnimal(rng: Rng): AnimalInput {
  const species = weighted<Species>(rng, [
    ['PERRO', 66],
    ['GATO', 31],
    ['OTRO', 3],
  ]);

  const size: Size =
    species === 'GATO'
      ? weighted<Size>(rng, [
          ['PEQUENO', 80],
          ['MEDIANO', 20],
        ])
      : weighted<Size>(rng, [
          ['PEQUENO', 28],
          ['MEDIANO', 44],
          ['GRANDE', 28],
        ]);

  const energyLevel = weighted<number>(rng, [
    [1, 8],
    [2, 18],
    [3, 32],
    [4, 27],
    [5, 15],
  ]);

  // Un perro grande y energético necesita patio con mucha más frecuencia.
  const needsYardProbability =
    species === 'GATO' ? 0.05 : (size === 'GRANDE' ? 0.65 : 0.3) + (energyLevel >= 4 ? 0.2 : 0);

  const specialCare = rng.next() < 0.17;

  // Horas requeridas: crecen con la energía y con los cuidados especiales.
  const base = 1 + energyLevel * 0.7 + (specialCare ? 1.5 : 0) + (species === 'GATO' ? -0.8 : 0);
  const requiredDailyHours = Math.min(10, Math.max(0.5, Math.round(base * 2) / 2));

  return {
    status: 'DISPONIBLE_ADOPCION',
    species,
    size,
    energyLevel,
    goodWithChildren: rng.next() < 0.78,
    goodWithAnimals: rng.next() < 0.7,
    needsYard: rng.next() < Math.min(needsYardProbability, 0.9),
    specialCare,
    requiredDailyHours,
  };
}

const ORD_HOUSING: Record<HousingType, number> = {
  DEPARTAMENTO: 0,
  CASA_SIN_PATIO: 1,
  CASA_CON_PATIO: 2,
};
const ORD_SIZE: Record<Size, number> = { PEQUENO: 0, MEDIANO: 1, GRANDE: 2 };
const ORD_EXPERIENCE: Record<Experience, number> = { NINGUNA: 0, BASICA: 1, AVANZADA: 2 };

/**
 * Propensión latente al éxito de la adopción. Devuelve un valor en escala
 * logit: positivo favorece el éxito, negativo el fracaso.
 *
 * Exportada para poder documentar y auditar los criterios en el documento.
 */
export function successPropensity(a: AdopterInput, n: AnimalInput, rng: Rng): number {
  const isCat = n.species === 'GATO';
  let z = 1.15; // sesgo base: deja la tasa de éxito cerca del 55 %

  // --- 1. Suficiencia de tiempo (asimétrica: el déficit pesa mucho más) ---
  const ratio = a.availableHoursPerDay / Math.max(n.requiredDailyHours, 0.5);
  if (ratio < 1) z -= 2.6 * (1 - ratio);
  else z += 0.75 * Math.min(ratio - 1, 1);

  // --- 2. Espacio × tamaño × especie (interacción) ---
  if (isCat) {
    // Al gato el tipo de vivienda casi no le afecta, salvo que necesite exterior.
    z += n.needsYard ? (a.hasYard ? 0.3 : -0.55) : 0.55;
  } else {
    const deficit = ORD_SIZE[n.size] - ORD_HOUSING[a.housingType];
    if (deficit > 0) z -= 1.15 * deficit;
    if (n.needsYard && !a.hasYard) z -= 1.25;
  }

  // --- 3. Experiencia × exigencia del animal (interacción) ---
  const demand = n.specialCare ? 2 : n.energyLevel >= 4 ? 1 : 0;
  const gap = demand - ORD_EXPERIENCE[a.experience];
  if (gap > 0) z -= 1.3 * gap;
  else z += 0.22 * Math.min(ORD_EXPERIENCE[a.experience] - demand, 1);

  // --- 4. Energía × patio (interacción; no aplica a gatos) ---
  if (!isCat && n.energyLevel >= 4 && !a.hasYard) z -= 0.85;

  // --- 5. Niños × energía ---
  if (a.hasChildren && n.energyLevel === 5) z -= 0.5;
  if (a.hasChildren && n.energyLevel <= 2) z += 0.3;

  // --- 6. Preferencias: una no coincidencia baja el compromiso del adoptante ---
  if (a.preferredSpecies && a.preferredSpecies !== n.species) z -= 0.7;
  if (a.preferredSize && a.preferredSize !== n.size) z -= 0.33;

  // --- 7. Introducir un gato en un hogar con otros animales es más difícil ---
  if (a.hasOtherAnimals && isCat) z -= 0.42;

  // --- 8. Carga general de los cuidados especiales ---
  if (n.specialCare) z -= 0.3;

  // --- 9. Factores no observados por el sistema ---
  // Entrevista, situación económica, cambios familiares. Es lo que impide que
  // exista un clasificador perfecto, igual que en la realidad.
  z += rng.normal() * 0.75;

  return z;
}

/** Los mismos vetos absolutos que aplica `engine.ts` antes del modelo. */
function passesHardFilters(a: AdopterInput, n: AnimalInput): boolean {
  if (n.status !== 'DISPONIBLE_ADOPCION') return false;
  if (!n.goodWithChildren && a.hasChildren) return false;
  if (!n.goodWithAnimals && a.hasOtherAnimals) return false;
  return true;
}

/** Caso con sus entradas crudas, para poder evaluar también el motor de reglas. */
export interface SyntheticCase {
  adopter: AdopterInput;
  animal: AnimalInput;
  label: 0 | 1;
}

export interface SyntheticDataset {
  samples: Sample[];
  /** Los mismos casos sin vectorizar, para comparar contra `engine.ts`. */
  cases: SyntheticCase[];
  /** Pares descartados por no pasar los filtros duros. */
  rejectedByHardFilters: number;
  positiveRate: number;
  seed: number;
}

/**
 * Genera `size` casos que pasan los filtros duros. Los pares que los fallan se
 * descartan, no se etiquetan como fracaso: en producción nunca llegan al
 * modelo porque los bloquea el motor de reglas antes.
 */
export function generateSyntheticDataset(opts: SyntheticOptions): SyntheticDataset {
  const rng = new Rng(opts.seed);
  const samples: Sample[] = [];
  const cases: SyntheticCase[] = [];
  let rejected = 0;
  let guard = 0;
  const maxIterations = opts.size * 100;

  while (samples.length < opts.size && guard++ < maxIterations) {
    const adopter = randomAdopter(rng);
    const animal = randomAnimal(rng);

    if (!passesHardFilters(adopter, animal)) {
      rejected++;
      continue;
    }

    const z = successPropensity(adopter, animal, rng);
    const probability = 1 / (1 + Math.exp(-z));
    // Etiqueta estocástica: el desenlace es aleatorio con esa probabilidad.
    const label: 0 | 1 = rng.next() < probability ? 1 : 0;

    samples.push({ features: toFeatures(adopter, animal), label });
    cases.push({ adopter, animal, label });
  }

  const positives = samples.filter((s) => s.label === 1).length;
  return {
    samples,
    cases,
    rejectedByHardFilters: rejected,
    positiveRate: samples.length ? positives / samples.length : 0,
    seed: opts.seed,
  };
}
