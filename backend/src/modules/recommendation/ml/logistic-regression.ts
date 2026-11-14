/**
 * Regresión logística binaria con descenso de gradiente por lotes y
 * regularización L2. Se usa como **línea base** para comparar contra el Random
 * Forest en la tabla de resultados.
 *
 *     z = b + Σ wᵢ·xᵢ
 *     p = σ(z) = 1 / (1 + e^{-z})
 *
 * Minimiza la entropía cruzada con penalización L2:
 *
 *     J(w) = -(1/n)·Σ [ y·log(p) + (1-y)·log(1-p) ] + (λ/2n)·Σ wᵢ²
 *
 * El gradiente de la entropía cruzada respecto de los pesos se reduce a
 * Xᵀ(p - y)/n, que es lo que hace el bucle de abajo.
 *
 * Importante: a diferencia de los árboles, este modelo SÍ necesita que las
 * variables estén escaladas, porque el gradiente es sensible a la magnitud.
 * Se estandariza con la media y la desviación del conjunto de entrenamiento
 * (z-score) y los parámetros del escalado quedan guardados en el modelo.
 */
import type { Sample } from './dataset';

export interface LogisticOptions {
  learningRate: number;
  epochs: number;
  /** Fuerza de la regularización L2. 0 = sin regularización. */
  l2: number;
}

export const DEFAULT_LOGISTIC_OPTIONS: LogisticOptions = {
  learningRate: 0.1,
  epochs: 2000,
  l2: 0.01,
};

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

export class LogisticRegression {
  private constructor(
    readonly weights: number[],
    readonly bias: number,
    readonly means: number[],
    readonly stds: number[],
    readonly featureNames: readonly string[],
    readonly finalLoss: number,
  ) {}

  static train(
    samples: Sample[],
    featureNames: readonly string[],
    partial: Partial<LogisticOptions> = {},
  ): LogisticRegression {
    const opts = { ...DEFAULT_LOGISTIC_OPTIONS, ...partial };
    const n = samples.length;
    const d = featureNames.length;
    if (n === 0) throw new Error('No se puede entrenar sin datos');

    // --- Estandarización (z-score) ---
    const means = Array.from({ length: d }, () => 0);
    for (const s of samples) for (let j = 0; j < d; j++) means[j] += s.features[j] / n;

    const stds = Array.from({ length: d }, () => 0);
    for (const s of samples) {
      for (let j = 0; j < d; j++) stds[j] += (s.features[j] - means[j]) ** 2 / n;
    }
    // Una variable constante tendría desviación 0: se fuerza a 1 para no dividir por cero.
    for (let j = 0; j < d; j++) stds[j] = Math.sqrt(stds[j]) || 1;

    const x = samples.map((s) => s.features.map((v, j) => (v - means[j]) / stds[j]));
    const y = samples.map((s) => s.label);

    // --- Descenso de gradiente ---
    const weights = Array.from({ length: d }, () => 0);
    let bias = 0;
    let loss = 0;

    for (let epoch = 0; epoch < opts.epochs; epoch++) {
      const gradW = Array.from({ length: d }, () => 0);
      let gradB = 0;
      loss = 0;

      for (let i = 0; i < n; i++) {
        let z = bias;
        for (let j = 0; j < d; j++) z += weights[j] * x[i][j];
        const p = sigmoid(z);
        const error = p - y[i];

        for (let j = 0; j < d; j++) gradW[j] += (error * x[i][j]) / n;
        gradB += error / n;

        // Acotado para que log(0) no produzca -Infinity.
        const clamped = Math.min(Math.max(p, 1e-12), 1 - 1e-12);
        loss -= (y[i] * Math.log(clamped) + (1 - y[i]) * Math.log(1 - clamped)) / n;
      }

      for (let j = 0; j < d; j++) {
        gradW[j] += (opts.l2 * weights[j]) / n;
        loss += (opts.l2 * weights[j] ** 2) / (2 * n);
        weights[j] -= opts.learningRate * gradW[j];
      }
      bias -= opts.learningRate * gradB;
    }

    return new LogisticRegression(weights, bias, means, stds, featureNames, loss);
  }

  predictProba(features: number[]): number {
    let z = this.bias;
    for (let j = 0; j < this.weights.length; j++) {
      z += this.weights[j] * ((features[j] - this.means[j]) / this.stds[j]);
    }
    return sigmoid(z);
  }

  /**
   * Coeficientes ordenados por magnitud. Al estar sobre variables
   * estandarizadas son comparables entre sí, así que se pueden contrastar
   * contra los pesos manuales del motor de reglas.
   */
  rankedCoefficients(): { feature: string; coefficient: number; odds: number }[] {
    return this.weights
      .map((coefficient, index) => ({
        feature: this.featureNames[index],
        coefficient: Math.round(coefficient * 10000) / 10000,
        // e^β: cuánto multiplica las probabilidades un aumento de una desviación estándar.
        odds: Math.round(Math.exp(coefficient) * 10000) / 10000,
      }))
      .sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient));
  }
}
