/**
 * Random Forest para clasificación binaria (Breiman, 2001).
 *
 * El bosque combina `nTrees` árboles CART, cada uno entrenado con dos fuentes
 * de azar que son las que descorrelacionan los árboles:
 *
 *   1. **Bagging** (bootstrap aggregating): cada árbol ve un remuestreo de n
 *      casos tomados CON reemplazo del conjunto original. En promedio cada
 *      árbol no ve ~36,8 % de los casos (1/e); esos son sus casos
 *      *out-of-bag* (OOB).
 *   2. **Submuestreo de variables**: en cada nodo solo se evalúan `mtry`
 *      variables elegidas al azar. El valor habitual para clasificación es
 *      √(número de variables).
 *
 * La predicción es el promedio de las probabilidades de los árboles (*soft
 * voting*), que da una probabilidad calibrada mejor que el voto mayoritario.
 *
 * El **error OOB** es la gran ventaja práctica: cada caso se evalúa solo con
 * los árboles que no lo vieron, así que da una estimación honesta del error de
 * generalización sin apartar un conjunto de validación. Es gratis y no se
 * puede "hacer trampa" con él.
 *
 * Módulo puro y determinista con semilla fija: dos entrenamientos con los
 * mismos datos y la misma semilla producen el mismo modelo.
 */
import { DecisionTree, type Importances, type TreeNode, type TreeOptions } from './cart';
import type { Sample } from './dataset';
import { Rng } from './rng';

export interface ForestOptions {
  nTrees: number;
  maxDepth: number;
  minSamplesSplit: number;
  minSamplesLeaf: number;
  /** Variables por nodo. `null` → √(nFeatures), el valor estándar. */
  mtry: number | null;
  seed: number;
}

export const DEFAULT_FOREST_OPTIONS: ForestOptions = {
  nTrees: 150,
  maxDepth: 10,
  minSamplesSplit: 4,
  minSamplesLeaf: 2,
  mtry: null,
  seed: 42,
};

/** Modelo serializado: es lo que se guarda en la base como JSON. */
export interface SerializedForest {
  algorithm: 'random-forest';
  formatVersion: 1;
  nFeatures: number;
  featureNames: readonly string[];
  options: ForestOptions;
  trees: TreeNode[];
  importances: number[];
  /** Mediana de cada variable en el entrenamiento, para la explicación local. */
  featureMedians: number[];
  oobScore: number | null;
  trainedSamples: number;
  positiveRate: number;
}

/** Aporte de una variable a una predicción concreta. */
export interface LocalContribution {
  feature: string;
  index: number;
  value: number;
  /** Diferencia de probabilidad respecto a reemplazar la variable por su mediana. */
  contribution: number;
  direction: 'favorece' | 'perjudica' | 'neutro';
}

export interface TrainedForest {
  model: RandomForest;
  oobScore: number | null;
}

export class RandomForest {
  private constructor(
    private readonly trees: DecisionTree[] | null,
    private readonly nodes: TreeNode[],
    readonly nFeatures: number,
    readonly featureNames: readonly string[],
    readonly options: ForestOptions,
    /** Importancia de Gini normalizada: suma 1. */
    readonly importances: number[],
    readonly featureMedians: number[],
    readonly oobScore: number | null,
    readonly trainedSamples: number,
    readonly positiveRate: number,
  ) {}

  // ------------------------------------------------------------- entrenamiento

  static train(
    samples: Sample[],
    featureNames: readonly string[],
    partial: Partial<ForestOptions> = {},
  ): RandomForest {
    const options: ForestOptions = { ...DEFAULT_FOREST_OPTIONS, ...partial };
    const nFeatures = featureNames.length;

    if (samples.length < 2) {
      throw new Error('Se necesitan al menos 2 casos para entrenar el bosque');
    }
    const positives = samples.filter((s) => s.label === 1).length;
    if (positives === 0 || positives === samples.length) {
      throw new Error(
        'El conjunto de entrenamiento tiene una sola clase: hacen falta casos aprobados y rechazados',
      );
    }

    const mtry = options.mtry ?? Math.max(1, Math.round(Math.sqrt(nFeatures)));
    const treeOptions: TreeOptions = {
      maxDepth: options.maxDepth,
      minSamplesSplit: options.minSamplesSplit,
      minSamplesLeaf: options.minSamplesLeaf,
      mtry,
    };

    const rng = new Rng(options.seed);
    const trees: DecisionTree[] = [];
    const importances: Importances = Array.from({ length: nFeatures }, () => 0);

    // Para el error OOB: suma de probabilidades y conteo por caso.
    const oobSum = Array.from({ length: samples.length }, () => 0);
    const oobCount = Array.from({ length: samples.length }, () => 0);

    for (let t = 0; t < options.nTrees; t++) {
      // --- Bagging: n índices con reemplazo ---
      const inBag = new Set<number>();
      const bootstrap: Sample[] = [];
      for (let i = 0; i < samples.length; i++) {
        const idx = rng.int(samples.length);
        inBag.add(idx);
        bootstrap.push(samples[idx]);
      }

      // Un remuestreo puede quedar con una sola clase; ese árbol no aporta
      // división posible, así que se descarta y se sigue.
      const bagPositives = bootstrap.filter((s) => s.label === 1).length;
      if (bagPositives === 0 || bagPositives === bootstrap.length) continue;

      const tree = DecisionTree.train(bootstrap, nFeatures, treeOptions, rng);
      trees.push(tree);

      for (let f = 0; f < nFeatures; f++) importances[f] += tree.importances[f];

      // --- Predicción out-of-bag ---
      for (let i = 0; i < samples.length; i++) {
        if (inBag.has(i)) continue;
        oobSum[i] += tree.predictProba(samples[i].features);
        oobCount[i]++;
      }
    }

    if (trees.length === 0) {
      throw new Error('No se pudo entrenar ningún árbol: revisa el conjunto de datos');
    }

    // Normalizar la importancia para que sume 1 (porcentaje de contribución).
    const totalImportance = importances.reduce((a, b) => a + b, 0);
    const normalized =
      totalImportance > 0
        ? importances.map((v) => v / totalImportance)
        : Array.from({ length: nFeatures }, () => 0);

    // Exactitud OOB sobre los casos que quedaron fuera de bolsa al menos una vez.
    let evaluated = 0;
    let correct = 0;
    for (let i = 0; i < samples.length; i++) {
      if (oobCount[i] === 0) continue;
      evaluated++;
      const predicted = oobSum[i] / oobCount[i] >= 0.5 ? 1 : 0;
      if (predicted === samples[i].label) correct++;
    }
    const oobScore = evaluated > 0 ? correct / evaluated : null;

    // Medianas por variable: valor de referencia para la explicación local.
    const featureMedians: number[] = [];
    for (let f = 0; f < nFeatures; f++) {
      const column = samples.map((s) => s.features[f]).sort((a, b) => a - b);
      const mid = Math.floor(column.length / 2);
      featureMedians.push(
        column.length % 2 === 0 ? (column[mid - 1] + column[mid]) / 2 : column[mid],
      );
    }

    return new RandomForest(
      trees,
      trees.map((t) => t.root),
      nFeatures,
      featureNames,
      { ...options, mtry },
      normalized,
      featureMedians,
      oobScore,
      samples.length,
      positives / samples.length,
    );
  }

  // ----------------------------------------------------------------- inferencia

  /** Probabilidad promedio de la clase positiva (*soft voting*). */
  predictProba(features: number[]): number {
    if (features.length !== this.nFeatures) {
      throw new Error(
        `El vector tiene ${features.length} variables y el modelo espera ${this.nFeatures}`,
      );
    }
    let sum = 0;
    for (const root of this.nodes) sum += walk(root, features);
    return sum / this.nodes.length;
  }

  /** Clase predicha con un umbral de decisión (0,5 por omisión). */
  predict(features: number[], threshold = 0.5): 0 | 1 {
    return this.predictProba(features) >= threshold ? 1 : 0;
  }

  /**
   * Acuerdo entre árboles: fracción de árboles que vota la clase mayoritaria.
   * Sirve como medida de confianza y se muestra en la interfaz: un 0,55 con
   * árboles muy divididos no es lo mismo que un 0,55 con acuerdo alto.
   */
  agreement(features: number[]): number {
    let positives = 0;
    for (const root of this.nodes) if (walk(root, features) >= 0.5) positives++;
    const fraction = positives / this.nodes.length;
    return Math.max(fraction, 1 - fraction);
  }

  /**
   * Explicación LOCAL de una predicción por ablación de variables: para cada
   * variable se vuelve a predecir reemplazándola por su mediana de
   * entrenamiento, y la diferencia es su aporte a este caso concreto.
   *
   *     aporte_j = p(x) - p(x con x_j := mediana_j)
   *
   * Un aporte positivo significa que el valor que tiene esa variable en este
   * caso EMPUJA la probabilidad hacia arriba respecto de un caso típico. Es un
   * método de oclusión, más simple que SHAP pero del mismo espíritu y
   * calculable en el navegador del servidor sin dependencias: cuesta
   * `nFeatures` predicciones extra, que para 16 variables es imperceptible.
   *
   * Se usa para conservar el desglose explicable que exige RN-08.
   */
  explain(features: number[], topK = 6): LocalContribution[] {
    const base = this.predictProba(features);
    const out: LocalContribution[] = [];

    for (let j = 0; j < this.nFeatures; j++) {
      const counterfactual = [...features];
      counterfactual[j] = this.featureMedians[j];
      const contribution = base - this.predictProba(counterfactual);
      out.push({
        feature: this.featureNames[j],
        index: j,
        value: features[j],
        contribution: Math.round(contribution * 10000) / 10000,
        direction:
          Math.abs(contribution) < 0.005 ? 'neutro' : contribution > 0 ? 'favorece' : 'perjudica',
      });
    }

    return out.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)).slice(0, topK);
  }

  /** Importancia ordenada de mayor a menor, lista para mostrar. */
  rankedImportances(): { feature: string; index: number; importance: number }[] {
    return this.importances
      .map((importance, index) => ({ feature: this.featureNames[index], index, importance }))
      .sort((a, b) => b.importance - a.importance);
  }

  get treeCount(): number {
    return this.nodes.length;
  }

  /** Estadísticas de tamaño del modelo, para el documento. */
  structure(): { trees: number; avgDepth: number; avgLeaves: number } {
    if (!this.trees) return { trees: this.nodes.length, avgDepth: 0, avgLeaves: 0 };
    const depths = this.trees.map((t) => t.depth());
    const leaves = this.trees.map((t) => t.leaves());
    const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    return {
      trees: this.trees.length,
      avgDepth: Math.round(mean(depths) * 100) / 100,
      avgLeaves: Math.round(mean(leaves) * 100) / 100,
    };
  }

  // -------------------------------------------------------------- persistencia

  toJSON(): SerializedForest {
    return {
      algorithm: 'random-forest',
      formatVersion: 1,
      nFeatures: this.nFeatures,
      featureNames: this.featureNames,
      options: this.options,
      trees: this.nodes,
      importances: this.importances,
      featureMedians: this.featureMedians,
      oobScore: this.oobScore,
      trainedSamples: this.trainedSamples,
      positiveRate: this.positiveRate,
    };
  }

  static fromJSON(data: SerializedForest): RandomForest {
    if (data.algorithm !== 'random-forest' || data.formatVersion !== 1) {
      throw new Error('Formato de modelo no reconocido');
    }
    return new RandomForest(
      null,
      data.trees,
      data.nFeatures,
      data.featureNames,
      data.options,
      data.importances,
      // Los modelos de la primera versión del formato no traían medianas.
      data.featureMedians ?? Array.from({ length: data.nFeatures }, () => 0),
      data.oobScore,
      data.trainedSamples,
      data.positiveRate,
    );
  }
}

/** Recorre un árbol serializado hasta la hoja. */
function walk(node: TreeNode, features: number[]): number {
  let current = node;
  while (current.kind === 'split') {
    current = features[current.feature] <= current.threshold ? current.left : current.right;
  }
  return current.probability;
}
