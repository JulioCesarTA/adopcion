import { DecisionTree, gini, DEFAULT_TREE_OPTIONS } from './cart';
import { RandomForest, type SerializedForest } from './random-forest';
import { LogisticRegression } from './logistic-regression';
import { confusionMatrix, crossValidate, evaluate, rocAuc } from './metrics';
import { FEATURE_NAMES, N_FEATURES, stratifiedFolds, toFeatures, type Sample } from './dataset';
import { generateSyntheticDataset } from './synthetic.fixture';
import { Rng } from './rng';
import type { AdopterInput, AnimalInput } from '../engine';

const rng = () => new Rng(7);

describe('Rng — reproducibilidad', () => {
  it('la misma semilla produce la misma secuencia', () => {
    const a = Array.from({ length: 5 }, () => new Rng(123).next());
    expect(new Set(a).size).toBe(1); // cada Rng(123) nuevo arranca igual
    const s1 = new Rng(99);
    const s2 = new Rng(99);
    expect([s1.next(), s1.next(), s1.next()]).toEqual([s2.next(), s2.next(), s2.next()]);
  });

  it('semillas distintas producen secuencias distintas', () => {
    expect(new Rng(1).next()).not.toBe(new Rng(2).next());
  });

  it('sampleIndices devuelve k índices distintos dentro del rango', () => {
    const idx = new Rng(5).sampleIndices(10, 4);
    expect(idx).toHaveLength(4);
    expect(new Set(idx).size).toBe(4);
    expect(idx.every((i) => i >= 0 && i < 10)).toBe(true);
  });
});

describe('Gini', () => {
  it('es 0 en un nodo puro', () => {
    expect(gini(0, 10)).toBe(0);
    expect(gini(10, 10)).toBe(0);
  });

  it('es máximo (0,5) con las clases equilibradas', () => {
    expect(gini(5, 10)).toBe(0.5);
  });

  it('crece al acercarse al equilibrio', () => {
    expect(gini(1, 10)).toBeLessThan(gini(3, 10));
    expect(gini(3, 10)).toBeLessThan(gini(5, 10));
  });

  it('es 0 en un nodo vacío', () => {
    expect(gini(0, 0)).toBe(0);
  });
});

/** Patrón separable con un solo corte: variable 0 por encima de 5 → clase 1. */
function linearlySeparable(): Sample[] {
  const out: Sample[] = [];
  for (let v = 0; v <= 10; v++) {
    for (let r = 0; r < 4; r++) {
      out.push({ features: [v, r], label: v > 5 ? 1 : 0 });
    }
  }
  return out;
}

describe('DecisionTree (CART)', () => {
  it('aprende un umbral de una sola variable', () => {
    const tree = DecisionTree.train(linearlySeparable(), 2, DEFAULT_TREE_OPTIONS, rng());
    expect(tree.predictProba([9, 0])).toBeGreaterThan(0.9);
    expect(tree.predictProba([1, 0])).toBeLessThan(0.1);
  });

  it('atribuye la importancia a la variable que sí informa', () => {
    const tree = DecisionTree.train(linearlySeparable(), 2, DEFAULT_TREE_OPTIONS, rng());
    expect(tree.importances[0]).toBeGreaterThan(tree.importances[1]);
  });

  it('un nodo puro se convierte en hoja sin dividir', () => {
    const pure: Sample[] = Array.from({ length: 8 }, (_, i) => ({
      features: [i, 0],
      label: 1 as const,
    }));
    const tree = DecisionTree.train(pure, 2, DEFAULT_TREE_OPTIONS, rng());
    expect(tree.root.kind).toBe('leaf');
    expect(tree.predictProba([3, 0])).toBe(1);
  });

  it('respeta la profundidad máxima', () => {
    const tree = DecisionTree.train(
      linearlySeparable(),
      2,
      { ...DEFAULT_TREE_OPTIONS, maxDepth: 1 },
      rng(),
    );
    expect(tree.depth()).toBeLessThanOrEqual(1);
  });

  it('aprende el XOR, que un modelo lineal no puede', () => {
    const xor: Sample[] = [];
    for (let i = 0; i < 40; i++) {
      for (const [a, b] of [
        [0, 0],
        [0, 1],
        [1, 0],
        [1, 1],
      ]) {
        xor.push({ features: [a, b], label: (a ^ b) as 0 | 1 });
      }
    }
    const tree = DecisionTree.train(xor, 2, DEFAULT_TREE_OPTIONS, rng());
    expect(tree.predictProba([0, 1])).toBeGreaterThan(0.9);
    expect(tree.predictProba([1, 1])).toBeLessThan(0.1);
  });
});

describe('RandomForest', () => {
  const data = linearlySeparable();

  it('clasifica correctamente un patrón separable', () => {
    const f = RandomForest.train(data, ['v', 'ruido'], { nTrees: 30, seed: 1 });
    expect(f.predict([9, 0])).toBe(1);
    expect(f.predict([1, 0])).toBe(0);
  });

  it('devuelve probabilidades en [0, 1]', () => {
    const f = RandomForest.train(data, ['v', 'ruido'], { nTrees: 20, seed: 1 });
    for (let v = 0; v <= 10; v++) {
      const p = f.predictProba([v, 0]);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });

  it('es determinista con la misma semilla', () => {
    const a = RandomForest.train(data, ['v', 'ruido'], { nTrees: 25, seed: 77 });
    const b = RandomForest.train(data, ['v', 'ruido'], { nTrees: 25, seed: 77 });
    expect(a.predictProba([7, 1])).toBe(b.predictProba([7, 1]));
    expect(a.importances).toEqual(b.importances);
  });

  it('cambia con una semilla distinta', () => {
    const a = RandomForest.train(data, ['v', 'ruido'], { nTrees: 25, seed: 1 });
    const b = RandomForest.train(data, ['v', 'ruido'], { nTrees: 25, seed: 2 });
    expect(a.importances).not.toEqual(b.importances);
  });

  it('calcula un puntaje out-of-bag', () => {
    const f = RandomForest.train(data, ['v', 'ruido'], { nTrees: 40, seed: 1 });
    expect(f.oobScore).not.toBeNull();
    expect(f.oobScore!).toBeGreaterThan(0.8);
  });

  it('la importancia normalizada suma 1', () => {
    const f = RandomForest.train(data, ['v', 'ruido'], { nTrees: 30, seed: 1 });
    expect(f.importances.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });

  it('mtry por omisión es la raíz del número de variables', () => {
    const names = FEATURE_NAMES.slice(0, 16);
    const samples: Sample[] = Array.from({ length: 40 }, (_, i) => ({
      features: new Array(16).fill(0).map((_, j) => (j === 0 ? i : 0)),
      label: i > 20 ? 1 : 0,
    }));
    const f = RandomForest.train(samples, names, { nTrees: 10, seed: 1 });
    expect(f.options.mtry).toBe(4); // √16
  });

  it('sobrevive la ida y vuelta a JSON', () => {
    const f = RandomForest.train(data, ['v', 'ruido'], { nTrees: 20, seed: 3 });
    const roundTripped = JSON.parse(JSON.stringify(f.toJSON())) as SerializedForest;
    const restored = RandomForest.fromJSON(roundTripped);
    expect(restored.predictProba([8, 0])).toBe(f.predictProba([8, 0]));
    expect(restored.nFeatures).toBe(f.nFeatures);
    expect(restored.oobScore).toBe(f.oobScore);
  });

  it('rechaza un formato de modelo desconocido', () => {
    expect(() => RandomForest.fromJSON({ algorithm: 'otro' } as never)).toThrow(
      /Formato de modelo no reconocido/,
    );
  });

  it('rechaza entrenar con una sola clase', () => {
    const single: Sample[] = Array.from({ length: 10 }, (_, i) => ({
      features: [i, 0],
      label: 1 as const,
    }));
    expect(() => RandomForest.train(single, ['v', 'r'])).toThrow(/una sola clase/);
  });

  it('rechaza un vector con el número de variables equivocado', () => {
    const f = RandomForest.train(data, ['v', 'ruido'], { nTrees: 5, seed: 1 });
    expect(() => f.predictProba([1])).toThrow(/espera 2/);
  });

  it('informa acuerdo alto en casos claros y menor en la frontera', () => {
    // mtry: 2 (todas las variables por nodo) para medir el acuerdo en sí. Con el
    // mtry por omisión aquí sería √2 ≈ 1, y la mitad de los árboles quedaría
    // forzada a dividir por la variable de ruido, bajando el acuerdo por una
    // razón ajena a lo que este test verifica.
    const f = RandomForest.train(data, ['v', 'ruido'], { nTrees: 50, seed: 1, mtry: 2 });
    expect(f.agreement([10, 0])).toBeGreaterThan(0.9);
    expect(f.agreement([10, 0])).toBeGreaterThanOrEqual(f.agreement([5.5, 0]));
  });

  it('con mtry = 1 de 2 variables el acuerdo baja: la mitad de los árboles queda ciega', () => {
    const blind = RandomForest.train(data, ['v', 'ruido'], { nTrees: 50, seed: 1, mtry: 1 });
    const full = RandomForest.train(data, ['v', 'ruido'], { nTrees: 50, seed: 1, mtry: 2 });
    expect(blind.agreement([10, 0])).toBeLessThan(full.agreement([10, 0]));
  });
});

describe('Métricas', () => {
  it('construye la matriz de confusión', () => {
    const labels: (0 | 1)[] = [1, 1, 0, 0, 1, 0];
    const preds: (0 | 1)[] = [1, 0, 0, 1, 1, 0];
    expect(confusionMatrix(labels, preds)).toEqual({
      truePositives: 2,
      falseNegatives: 1,
      trueNegatives: 2,
      falsePositives: 1,
    });
  });

  it('AUC = 1 con separación perfecta', () => {
    expect(rocAuc([0, 0, 1, 1], [0.1, 0.2, 0.8, 0.9])).toBe(1);
  });

  it('AUC = 0 con el orden invertido', () => {
    expect(rocAuc([1, 1, 0, 0], [0.1, 0.2, 0.8, 0.9])).toBe(0);
  });

  it('AUC = 0,5 si todas las predicciones empatan', () => {
    expect(rocAuc([0, 1, 0, 1], [0.5, 0.5, 0.5, 0.5])).toBe(0.5);
  });

  it('AUC = 0,5 (indefinido) si hay una sola clase', () => {
    expect(rocAuc([1, 1, 1], [0.2, 0.5, 0.9])).toBe(0.5);
  });

  it('calcula precisión, exhaustividad y F1 coherentes', () => {
    const m = evaluate([1, 1, 0, 0], [0.9, 0.4, 0.6, 0.1]);
    expect(m.confusion).toEqual({
      truePositives: 1,
      falseNegatives: 1,
      falsePositives: 1,
      trueNegatives: 1,
    });
    expect(m.precision).toBe(0.5);
    expect(m.recall).toBe(0.5);
    expect(m.f1).toBe(0.5);
    expect(m.accuracy).toBe(0.5);
  });

  it('los pliegues estratificados conservan la proporción de clases', () => {
    const samples: Sample[] = [
      ...Array.from({ length: 50 }, (_, i) => ({ features: [i], label: 1 as const })),
      ...Array.from({ length: 25 }, (_, i) => ({ features: [i], label: 0 as const })),
    ];
    const folds = stratifiedFolds(samples, 5, new Rng(1));
    expect(folds).toHaveLength(5);
    expect(folds.reduce((a, f) => a + f.length, 0)).toBe(75);
    for (const fold of folds) {
      const positives = fold.filter((s) => s.label === 1).length;
      // Cada pliegue debería tener ~10 positivos y ~5 negativos.
      expect(positives / fold.length).toBeCloseTo(2 / 3, 1);
    }
  });
});

describe('Aprendizaje sobre el conjunto sintético', () => {
  const ds = generateSyntheticDataset({ size: 900, seed: 2026 });

  it('el bosque supera claramente al azar en validación cruzada', () => {
    const cv = crossValidate(
      {
        name: 'random-forest',
        fit: (train) => {
          const model = RandomForest.train(train, FEATURE_NAMES, { nTrees: 80, seed: 11 });
          return (f) => model.predictProba(f);
        },
      },
      ds.samples,
      5,
    );
    expect(cv.pooled.rocAuc).toBeGreaterThan(0.72);
    expect(cv.pooled.accuracy).toBeGreaterThan(0.65);
    expect(cv.folds).toBe(5);
  });

  it('no alcanza una exactitud perfecta: el problema tiene ruido irreducible', () => {
    const cv = crossValidate(
      {
        name: 'random-forest',
        fit: (train) => {
          const model = RandomForest.train(train, FEATURE_NAMES, { nTrees: 60, seed: 11 });
          return (f) => model.predictProba(f);
        },
      },
      ds.samples,
      5,
    );
    // Un 1,0 indicaría fuga de información entre entrenamiento y prueba.
    expect(cv.pooled.accuracy).toBeLessThan(0.95);
  });

  it('la regresión logística también aprende, como línea base', () => {
    const cv = crossValidate(
      {
        name: 'logistic',
        fit: (train) => {
          const model = LogisticRegression.train(train, FEATURE_NAMES, { epochs: 400 });
          return (f) => model.predictProba(f);
        },
      },
      ds.samples,
      5,
    );
    expect(cv.pooled.rocAuc).toBeGreaterThan(0.65);
  });

  it('la razón horas/requeridas queda entre las variables más importantes', () => {
    const model = RandomForest.train(ds.samples, FEATURE_NAMES, { nTrees: 120, seed: 11 });
    const top = model
      .rankedImportances()
      .slice(0, 5)
      .map((r) => r.feature);
    expect(top).toContain('razon_horas');
  });
});

describe('toFeatures', () => {
  const adopter: AdopterInput = {
    housingType: 'CASA_CON_PATIO',
    hasYard: true,
    hasChildren: false,
    hasOtherAnimals: false,
    availableHoursPerDay: 6,
    experience: 'BASICA',
    preferredSpecies: 'PERRO',
    preferredSize: 'MEDIANO',
  };
  const animal: AnimalInput = {
    status: 'DISPONIBLE_ADOPCION',
    species: 'PERRO',
    size: 'MEDIANO',
    energyLevel: 3,
    goodWithChildren: true,
    goodWithAnimals: true,
    needsYard: false,
    specialCare: false,
    requiredDailyHours: 3,
  };

  it('produce un vector del largo esperado', () => {
    expect(toFeatures(adopter, animal)).toHaveLength(N_FEATURES);
  });

  it('calcula la razón de horas y la acota a 3', () => {
    const f = toFeatures(adopter, animal);
    expect(f[FEATURE_NAMES.indexOf('razon_horas')]).toBe(2); // 6 / 3
    const extreme = toFeatures(
      { ...adopter, availableHoursPerDay: 14 },
      { ...animal, requiredDailyHours: 0.5 },
    );
    expect(extreme[FEATURE_NAMES.indexOf('razon_horas')]).toBe(3);
  });

  it('marca coincidencia cuando no hay preferencia declarada', () => {
    const f = toFeatures(
      { ...adopter, preferredSpecies: null, preferredSize: null },
      { ...animal, species: 'GATO', size: 'GRANDE' },
    );
    expect(f[FEATURE_NAMES.indexOf('coincide_especie_preferida')]).toBe(1);
    expect(f[FEATURE_NAMES.indexOf('coincide_tamano_preferido')]).toBe(1);
  });

  it('marca la no coincidencia de especie', () => {
    const f = toFeatures(adopter, { ...animal, species: 'GATO' });
    expect(f[FEATURE_NAMES.indexOf('coincide_especie_preferida')]).toBe(0);
  });
});
