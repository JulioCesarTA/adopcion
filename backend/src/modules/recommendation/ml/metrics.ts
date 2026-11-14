/**
 * Métricas de evaluación para clasificación binaria y validación cruzada
 * estratificada. Módulo puro: es lo que produce la tabla comparativa del
 * documento (reglas vs regresión logística vs Random Forest).
 */
import { stratifiedFolds, type Sample } from './dataset';
import { Rng } from './rng';

export interface ConfusionMatrix {
  /** Predijo positivo y era positivo. */
  truePositives: number;
  /** Predijo positivo y era negativo. */
  falsePositives: number;
  /** Predijo negativo y era negativo. */
  trueNegatives: number;
  /** Predijo negativo y era positivo. */
  falseNegatives: number;
}

export interface Metrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  /** Exhaustividad de la clase negativa. */
  specificity: number;
  rocAuc: number;
  /**
   * Puntaje de Brier: error cuadrático medio de la probabilidad predicha.
   * Mide CALIBRACIÓN, no solo orden. Menor es mejor; 0 es perfecto y 0,25
   * equivale a predecir siempre 0,5. Es la métrica que separa un modelo que
   * ordena bien de uno cuyas probabilidades se pueden interpretar.
   */
  brier: number;
  /** Umbral que maximiza la exactitud, y la exactitud que alcanza con él. */
  bestThreshold: number;
  bestAccuracy: number;
  confusion: ConfusionMatrix;
  samples: number;
}

const r4 = (n: number) => Math.round(n * 10000) / 10000;
const safeDiv = (a: number, b: number) => (b === 0 ? 0 : a / b);

export function confusionMatrix(
  labels: readonly (0 | 1)[],
  predictions: readonly (0 | 1)[],
): ConfusionMatrix {
  const m: ConfusionMatrix = {
    truePositives: 0,
    falsePositives: 0,
    trueNegatives: 0,
    falseNegatives: 0,
  };
  for (let i = 0; i < labels.length; i++) {
    if (predictions[i] === 1) {
      if (labels[i] === 1) m.truePositives++;
      else m.falsePositives++;
    } else {
      if (labels[i] === 0) m.trueNegatives++;
      else m.falseNegatives++;
    }
  }
  return m;
}

/**
 * Área bajo la curva ROC, calculada con el estadístico de Mann-Whitney U
 * sobre los rangos de las probabilidades. Maneja empates con rangos promedio.
 *
 * AUC = P(puntaje de un positivo al azar > puntaje de un negativo al azar).
 * 0,5 equivale a azar; 1,0 a separación perfecta.
 */
export function rocAuc(labels: readonly (0 | 1)[], scores: readonly number[]): number {
  const positives = labels.filter((l) => l === 1).length;
  const negatives = labels.length - positives;
  // Sin las dos clases presentes el AUC no está definido; se informa 0,5 (azar).
  if (positives === 0 || negatives === 0) return 0.5;

  const indexed = scores.map((score, i) => ({ score, label: labels[i] }));
  indexed.sort((a, b) => a.score - b.score);

  // Rangos promedio para los empates.
  const ranks = Array.from({ length: indexed.length }, () => 0);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j + 1 < indexed.length && indexed[j + 1].score === indexed[i].score) j++;
    const averageRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[k] = averageRank;
    i = j + 1;
  }

  let rankSumPositives = 0;
  for (let k = 0; k < indexed.length; k++) {
    if (indexed[k].label === 1) rankSumPositives += ranks[k];
  }

  const u = rankSumPositives - (positives * (positives + 1)) / 2;
  return r4(u / (positives * negatives));
}

/** Puntaje de Brier: media de (p - y)². Mide calibración; menor es mejor. */
export function brierScore(labels: readonly (0 | 1)[], probabilities: readonly number[]): number {
  if (labels.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < labels.length; i++) sum += (probabilities[i] - labels[i]) ** 2;
  return r4(sum / labels.length);
}

/**
 * Busca el umbral que maximiza la exactitud. Necesario para comparar de forma
 * JUSTA un modelo probabilístico contra un puntaje que no es una probabilidad
 * (el motor de reglas devuelve 0-100 y su 0,5 no significa "50 % de éxito").
 */
export function bestThresholdFor(
  labels: readonly (0 | 1)[],
  probabilities: readonly number[],
): { threshold: number; accuracy: number } {
  const candidates = [...new Set(probabilities)].sort((a, b) => a - b);
  let best = { threshold: 0.5, accuracy: 0 };
  for (const t of candidates) {
    let correct = 0;
    for (let i = 0; i < labels.length; i++) {
      if ((probabilities[i] >= t ? 1 : 0) === labels[i]) correct++;
    }
    const accuracy = correct / labels.length;
    if (accuracy > best.accuracy) best = { threshold: t, accuracy };
  }
  return { threshold: r4(best.threshold), accuracy: r4(best.accuracy) };
}

export function evaluate(
  labels: readonly (0 | 1)[],
  probabilities: readonly number[],
  threshold = 0.5,
): Metrics {
  const predictions = probabilities.map((p): 0 | 1 => (p >= threshold ? 1 : 0));
  const c = confusionMatrix(labels, predictions);

  const precision = safeDiv(c.truePositives, c.truePositives + c.falsePositives);
  const recall = safeDiv(c.truePositives, c.truePositives + c.falseNegatives);
  const best = bestThresholdFor(labels, probabilities);

  return {
    accuracy: r4(safeDiv(c.truePositives + c.trueNegatives, labels.length)),
    precision: r4(precision),
    recall: r4(recall),
    f1: r4(safeDiv(2 * precision * recall, precision + recall)),
    specificity: r4(safeDiv(c.trueNegatives, c.trueNegatives + c.falsePositives)),
    rocAuc: rocAuc(labels, probabilities),
    brier: brierScore(labels, probabilities),
    bestThreshold: best.threshold,
    bestAccuracy: best.accuracy,
    confusion: c,
    samples: labels.length,
  };
}

/** Un modelo evaluable: se entrena con un conjunto y devuelve probabilidades. */
export interface Learner {
  name: string;
  fit(train: Sample[]): (features: number[]) => number;
}

export interface CrossValidationResult {
  model: string;
  folds: number;
  /** Métricas sobre la unión de las predicciones de todos los pliegues. */
  pooled: Metrics;
  /** Promedio y desviación estándar de la exactitud entre pliegues. */
  accuracyMean: number;
  accuracyStd: number;
  rocAucMean: number;
  perFold: { fold: number; accuracy: number; rocAuc: number; samples: number }[];
}

/**
 * Validación cruzada estratificada de k pliegues. Cada pliegue se usa una vez
 * como prueba mientras el modelo se entrena con los k-1 restantes, así que
 * cada caso se predice exactamente una vez con un modelo que no lo vio.
 */
export function crossValidate(
  learner: Learner,
  samples: Sample[],
  k = 5,
  seed = 42,
): CrossValidationResult {
  if (samples.length < k) {
    throw new Error(`Hacen falta al menos ${k} casos para una validación cruzada de ${k} pliegues`);
  }

  const folds = stratifiedFolds(samples, k, new Rng(seed));
  const pooledLabels: (0 | 1)[] = [];
  const pooledScores: number[] = [];
  const perFold: CrossValidationResult['perFold'] = [];

  for (let f = 0; f < k; f++) {
    const test = folds[f];
    const train = folds.filter((_, i) => i !== f).flat();
    if (test.length === 0) continue;

    const predict = learner.fit(train);
    const labels = test.map((s) => s.label);
    const scores = test.map((s) => predict(s.features));

    pooledLabels.push(...labels);
    pooledScores.push(...scores);

    const m = evaluate(labels, scores);
    perFold.push({ fold: f + 1, accuracy: m.accuracy, rocAuc: m.rocAuc, samples: test.length });
  }

  const accuracies = perFold.map((p) => p.accuracy);
  const mean = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
  const variance = accuracies.reduce((a, b) => a + (b - mean) ** 2, 0) / accuracies.length;
  const aucs = perFold.map((p) => p.rocAuc);

  return {
    model: learner.name,
    folds: perFold.length,
    pooled: evaluate(pooledLabels, pooledScores),
    accuracyMean: r4(mean),
    accuracyStd: r4(Math.sqrt(variance)),
    rocAucMean: r4(aucs.reduce((a, b) => a + b, 0) / aucs.length),
    perFold,
  };
}
