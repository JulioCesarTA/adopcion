/**
 * Árbol de decisión de clasificación (CART, Breiman et al. 1984).
 *
 * Criterio de división: índice de Gini. Para clasificación binaria con una
 * proporción p de la clase positiva, la impureza es:
 *
 *     Gini(p) = 1 - p² - (1-p)² = 2p(1-p)
 *
 * En cada nodo se busca el par (variable, umbral) que maximiza la reducción
 * ponderada de impureza:
 *
 *     ΔGini = Gini(padre) - (n_izq/n)·Gini(izq) - (n_der/n)·Gini(der)
 *
 * Si `mtry` es menor que el total de variables, en cada nodo solo se evalúa un
 * subconjunto aleatorio de variables: eso es lo que convierte un árbol en el
 * árbol *descorrelacionado* que necesita Random Forest.
 *
 * Función pura: sin acceso a base de datos ni estado global.
 */
import type { Rng } from './rng';
import type { Sample } from './dataset';

export interface TreeOptions {
  /** Profundidad máxima. Limita el sobreajuste. */
  maxDepth: number;
  /** Mínimo de casos en un nodo para intentar dividirlo. */
  minSamplesSplit: number;
  /** Mínimo de casos que debe quedar en cada hoja. */
  minSamplesLeaf: number;
  /** Variables evaluadas por nodo. `null` = todas (árbol clásico, sin azar). */
  mtry: number | null;
}

export const DEFAULT_TREE_OPTIONS: TreeOptions = {
  maxDepth: 8,
  minSamplesSplit: 4,
  minSamplesLeaf: 2,
  mtry: null,
};

/** Nodo interno: compara una variable con un umbral. */
interface SplitNode {
  kind: 'split';
  feature: number;
  threshold: number;
  left: TreeNode;
  right: TreeNode;
}

/** Hoja: guarda la probabilidad de la clase positiva y cuántos casos la respaldan. */
interface LeafNode {
  kind: 'leaf';
  probability: number;
  samples: number;
}

export type TreeNode = SplitNode | LeafNode;

/** Impureza de Gini binaria a partir del conteo de positivos. */
export function gini(positives: number, total: number): number {
  if (total === 0) return 0;
  const p = positives / total;
  return 2 * p * (1 - p);
}

function countPositives(samples: Sample[]): number {
  let n = 0;
  for (const s of samples) if (s.label === 1) n++;
  return n;
}

function leaf(samples: Sample[]): LeafNode {
  return {
    kind: 'leaf',
    probability: samples.length === 0 ? 0 : countPositives(samples) / samples.length,
    samples: samples.length,
  };
}

interface BestSplit {
  feature: number;
  threshold: number;
  left: Sample[];
  right: Sample[];
  gain: number;
}

/**
 * Busca la mejor división del nodo. Los umbrales candidatos son los puntos
 * medios entre valores consecutivos distintos de la variable, que es la forma
 * estándar de tratar variables continuas en CART.
 */
function findBestSplit(
  samples: Sample[],
  nFeatures: number,
  opts: TreeOptions,
  rng: Rng,
): BestSplit | null {
  const total = samples.length;
  const parentGini = gini(countPositives(samples), total);
  if (parentGini === 0) return null;

  const candidates =
    opts.mtry === null || opts.mtry >= nFeatures
      ? Array.from({ length: nFeatures }, (_, i) => i)
      : rng.sampleIndices(nFeatures, opts.mtry);

  // Se arranca en -Infinity, no en 0, para aceptar divisiones con ganancia
  // CERO. Es necesario para aprender interacciones tipo XOR: en el nodo raíz
  // ninguna variable sola reduce la impureza, y si se exigiera ganancia
  // positiva el árbol se detendría ahí y nunca llegaría al segundo nivel donde
  // la interacción sí es separable. Es el mismo criterio que usa scikit-learn
  // (`min_impurity_decrease = 0`). Una división de ganancia nula aporta 0 a la
  // importancia de variables, así que no distorsiona ese cálculo.
  let best: BestSplit | null = null;

  for (const feature of candidates) {
    // Ordenar por la variable permite evaluar todos los cortes en una pasada,
    // llevando los conteos de forma incremental.
    const sorted = [...samples].sort((a, b) => a.features[feature] - b.features[feature]);

    let leftCount = 0;
    let leftPositives = 0;
    const totalPositives = countPositives(sorted);

    for (let i = 0; i < sorted.length - 1; i++) {
      leftCount++;
      if (sorted[i].label === 1) leftPositives++;

      const current = sorted[i].features[feature];
      const nextValue = sorted[i + 1].features[feature];
      // Solo tiene sentido cortar entre dos valores distintos.
      if (current === nextValue) continue;

      const rightCount = total - leftCount;
      if (leftCount < opts.minSamplesLeaf || rightCount < opts.minSamplesLeaf) continue;

      const rightPositives = totalPositives - leftPositives;
      const weighted =
        (leftCount / total) * gini(leftPositives, leftCount) +
        (rightCount / total) * gini(rightPositives, rightCount);
      const gain = parentGini - weighted;

      if (gain > (best?.gain ?? -Infinity) + 1e-12) {
        best = {
          feature,
          threshold: (current + nextValue) / 2,
          left: sorted.slice(0, leftCount),
          right: sorted.slice(leftCount),
          gain,
        };
      }
    }
  }

  return best;
}

/**
 * Importancia de variables: suma de la reducción de impureza que aporta cada
 * variable, ponderada por la fracción de casos que pasa por el nodo. Es la
 * "importancia de Gini" (o MDI, *mean decrease in impurity*).
 */
export type Importances = number[];

function build(
  samples: Sample[],
  depth: number,
  nFeatures: number,
  opts: TreeOptions,
  rng: Rng,
  importances: Importances,
  rootSize: number,
): TreeNode {
  if (depth >= opts.maxDepth || samples.length < opts.minSamplesSplit) return leaf(samples);

  const split = findBestSplit(samples, nFeatures, opts, rng);
  if (!split) return leaf(samples);

  importances[split.feature] += (samples.length / rootSize) * split.gain;

  return {
    kind: 'split',
    feature: split.feature,
    threshold: split.threshold,
    left: build(split.left, depth + 1, nFeatures, opts, rng, importances, rootSize),
    right: build(split.right, depth + 1, nFeatures, opts, rng, importances, rootSize),
  };
}

export class DecisionTree {
  constructor(
    readonly root: TreeNode,
    readonly importances: Importances,
  ) {}

  static train(samples: Sample[], nFeatures: number, opts: TreeOptions, rng: Rng): DecisionTree {
    if (samples.length === 0) throw new Error('No se puede entrenar un árbol sin datos');
    const importances: Importances = Array.from({ length: nFeatures }, () => 0);
    const root = build(samples, 0, nFeatures, opts, rng, importances, samples.length);
    return new DecisionTree(root, importances);
  }

  /** Probabilidad de la clase positiva para un vector de variables. */
  predictProba(features: number[]): number {
    let node = this.root;
    while (node.kind === 'split') {
      node = features[node.feature] <= node.threshold ? node.left : node.right;
    }
    return node.probability;
  }

  /** Profundidad alcanzada, para reportar en las métricas. */
  depth(): number {
    const walk = (node: TreeNode): number =>
      node.kind === 'leaf' ? 0 : 1 + Math.max(walk(node.left), walk(node.right));
    return walk(this.root);
  }

  /** Cantidad de hojas, indicador del tamaño del modelo. */
  leaves(): number {
    const walk = (node: TreeNode): number =>
      node.kind === 'leaf' ? 1 : walk(node.left) + walk(node.right);
    return walk(this.root);
  }
}
