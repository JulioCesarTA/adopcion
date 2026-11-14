/**
 * Comparación de los tres modelos de recomendación con validación cruzada
 * estratificada. Produce la tabla de resultados del documento.
 *
 *   npm run ml:benchmark
 *   npm run ml:benchmark -- --size 2000 --folds 10 --seed 7
 *
 * Los tres modelos comparados:
 *   1. Motor de reglas (suma ponderada, `engine.ts`) — línea base, no aprende.
 *   2. Regresión logística — línea base que sí aprende.
 *   3. Random Forest — el modelo propuesto.
 */
import { computeCompatibility, type AlgorithmSettings } from '../src/modules/recommendation/engine';
import { FEATURE_NAMES, type Sample } from '../src/modules/recommendation/ml/dataset';
import { crossValidate, evaluate, type Metrics } from '../src/modules/recommendation/ml/metrics';
import { LogisticRegression } from '../src/modules/recommendation/ml/logistic-regression';
import { RandomForest } from '../src/modules/recommendation/ml/random-forest';
import {
  generateSyntheticDataset,
  type SyntheticCase,
} from '../src/modules/recommendation/ml/synthetic';
import { FEATURE_LABELS, type FeatureName } from '../src/modules/recommendation/ml/dataset';

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = Number(process.argv[i + 1]);
  return Number.isFinite(v) ? v : fallback;
}

const SIZE = arg('size', 1200);
const FOLDS = arg('folds', 5);
const SEED = arg('seed', 2026);

const pct = (n: number) => `${(n * 100).toFixed(2)} %`;
const num = (n: number) => n.toFixed(4);

/** Configuración vigente del motor de reglas (la que crea el seed). */
const RULE_SETTINGS: AlgorithmSettings = {
  version: 1,
  weights: { time: 30, space: 25, experience: 20, energy: 15, preferences: 10 },
  thresholdHigh: 80,
  thresholdMedium: 60,
};

/**
 * El motor de reglas no se entrena, así que se evalúa directo sobre todos los
 * casos. Su puntaje 0-100 se normaliza a [0,1] para poder calcular el AUC y
 * compararlo con las probabilidades de los otros dos modelos.
 */
function evaluateRuleEngine(cases: SyntheticCase[]): Metrics {
  const labels: (0 | 1)[] = [];
  const scores: number[] = [];
  for (const c of cases) {
    const result = computeCompatibility(c.adopter, c.animal, RULE_SETTINGS);
    labels.push(c.label);
    scores.push(result.score / 100);
  }
  return evaluate(labels, scores);
}

function table(rows: Record<string, string>[]): void {
  const columns = Object.keys(rows[0]);
  const width = (c: string) => Math.max(c.length, ...rows.map((r) => r[c].length));
  const widths = Object.fromEntries(columns.map((c) => [c, width(c)]));
  const line = (cells: string[]) =>
    '| ' + cells.map((cell, i) => cell.padEnd(widths[columns[i]])).join(' | ') + ' |';

  console.log(line(columns));
  console.log('|' + columns.map((c) => '-'.repeat(widths[c] + 2)).join('|') + '|');
  for (const row of rows) console.log(line(columns.map((c) => row[c])));
}

function main(): void {
  console.log('='.repeat(78));
  console.log('COMPARACIÓN DE MODELOS DE RECOMENDACIÓN ADOPTANTE-ANIMAL');
  console.log('='.repeat(78));

  const dataset = generateSyntheticDataset({ size: SIZE, seed: SEED });
  console.log(`
Conjunto de datos: SINTÉTICO (generado a partir de criterios de idoneidad)
  Casos .......................... ${dataset.samples.length}
  Variables ...................... ${FEATURE_NAMES.length}
  Tasa de la clase positiva ...... ${pct(dataset.positiveRate)}
  Descartados por filtros duros .. ${dataset.rejectedByHardFilters}
  Semilla ........................ ${SEED}
  Validación cruzada ............. ${FOLDS} pliegues estratificados
`);

  // ------------------------------------------------------------- 1. Reglas
  const rules = evaluateRuleEngine(dataset.cases);

  // -------------------------------------------- 2. Regresión logística (CV)
  const logistic = crossValidate(
    {
      name: 'Regresión logística',
      fit: (train: Sample[]) => {
        const model = LogisticRegression.train(train, FEATURE_NAMES, { epochs: 1500 });
        return (f: number[]) => model.predictProba(f);
      },
    },
    dataset.samples,
    FOLDS,
    SEED,
  );

  // -------------------------------------------------- 3. Random Forest (CV)
  const forest = crossValidate(
    {
      name: 'Random Forest',
      fit: (train: Sample[]) => {
        const model = RandomForest.train(train, FEATURE_NAMES, { nTrees: 150, seed: SEED });
        return (f: number[]) => model.predictProba(f);
      },
    },
    dataset.samples,
    FOLDS,
    SEED,
  );

  const row = (name: string, m: Metrics) => ({
    Modelo: name,
    Exactitud: num(m.accuracy),
    'ROC-AUC': num(m.rocAuc),
    Precisión: num(m.precision),
    Exhaustividad: num(m.recall),
    F1: num(m.f1),
    Especificidad: num(m.specificity),
  });

  console.log('RESULTADOS — umbral de decisión 0,5\n');
  table([
    row('Motor de reglas (base)', rules),
    row('Regresión logística', logistic.pooled),
    row('Random Forest', forest.pooled),
  ]);

  console.log(`
CAPACIDAD DE ORDENAMIENTO vs CALIBRACIÓN

  El motor de reglas devuelve un puntaje 0-100 que NO es una probabilidad: su
  0,5 no significa "50 % de éxito". Juzgarlo con el umbral fijo de 0,5 lo
  castiga por una razón ajena a su capacidad de ordenar. Las dos columnas de
  abajo separan ambas cosas:

    · ROC-AUC y exactitud en el mejor umbral → qué tan bien ORDENA.
    · Brier → qué tan interpretable es la probabilidad que devuelve
      (menor es mejor; 0,25 equivale a predecir siempre 0,5).
`);
  table([
    {
      Modelo: 'Motor de reglas (base)',
      'ROC-AUC': num(rules.rocAuc),
      'Mejor umbral': num(rules.bestThreshold),
      'Exactitud en ese umbral': num(rules.bestAccuracy),
      'Brier (calibración)': num(rules.brier),
    },
    {
      Modelo: 'Regresión logística',
      'ROC-AUC': num(logistic.pooled.rocAuc),
      'Mejor umbral': num(logistic.pooled.bestThreshold),
      'Exactitud en ese umbral': num(logistic.pooled.bestAccuracy),
      'Brier (calibración)': num(logistic.pooled.brier),
    },
    {
      Modelo: 'Random Forest',
      'ROC-AUC': num(forest.pooled.rocAuc),
      'Mejor umbral': num(forest.pooled.bestThreshold),
      'Exactitud en ese umbral': num(forest.pooled.bestAccuracy),
      'Brier (calibración)': num(forest.pooled.brier),
    },
  ]);

  console.log('\nESTABILIDAD ENTRE PLIEGUES (media ± desviación estándar)\n');
  table([
    {
      Modelo: 'Regresión logística',
      'Exactitud media': `${num(logistic.accuracyMean)} ± ${num(logistic.accuracyStd)}`,
      'ROC-AUC medio': num(logistic.rocAucMean),
    },
    {
      Modelo: 'Random Forest',
      'Exactitud media': `${num(forest.accuracyMean)} ± ${num(forest.accuracyStd)}`,
      'ROC-AUC medio': num(forest.rocAucMean),
    },
  ]);

  console.log('\nMATRICES DE CONFUSIÓN\n');
  for (const [name, m] of [
    ['Motor de reglas', rules],
    ['Regresión logística', logistic.pooled],
    ['Random Forest', forest.pooled],
  ] as const) {
    const c = m.confusion;
    console.log(`${name}:`);
    console.log(`                   Predijo éxito   Predijo fracaso`);
    console.log(
      `  Éxito real       ${String(c.truePositives).padStart(13)}   ${String(c.falseNegatives).padStart(15)}`,
    );
    console.log(
      `  Fracaso real     ${String(c.falsePositives).padStart(13)}   ${String(c.trueNegatives).padStart(15)}\n`,
    );
  }

  // ------------------------------- Modelo final sobre todo el conjunto
  const full = RandomForest.train(dataset.samples, FEATURE_NAMES, { nTrees: 150, seed: SEED });
  const structure = full.structure();

  console.log('MODELO FINAL (Random Forest entrenado con el conjunto completo)\n');
  console.log(`  Árboles ........................ ${structure.trees}`);
  console.log(`  Variables por nodo (mtry) ...... ${full.options.mtry} de ${full.nFeatures}`);
  console.log(`  Profundidad media .............. ${structure.avgDepth}`);
  console.log(`  Hojas por árbol (media) ........ ${structure.avgLeaves}`);
  console.log(
    `  Exactitud out-of-bag ........... ${full.oobScore === null ? 'n/d' : num(full.oobScore)}`,
  );

  console.log('\nIMPORTANCIA DE VARIABLES (reducción media de impureza de Gini)\n');
  table(
    full
      .rankedImportances()
      .slice(0, 10)
      .map((r, i) => ({
        '#': String(i + 1),
        Variable: FEATURE_LABELS[r.feature as FeatureName] ?? r.feature,
        Importancia: pct(r.importance),
        Barra: '#'.repeat(Math.max(1, Math.round(r.importance * 120))),
      })),
  );

  console.log('\nCOEFICIENTES DE LA REGRESIÓN LOGÍSTICA (variables estandarizadas)\n');
  const lr = LogisticRegression.train(dataset.samples, FEATURE_NAMES, { epochs: 1500 });
  table(
    lr
      .rankedCoefficients()
      .slice(0, 8)
      .map((c, i) => ({
        '#': String(i + 1),
        Variable: FEATURE_LABELS[c.feature as FeatureName] ?? c.feature,
        Coeficiente: num(c.coefficient),
        'e^β': num(c.odds),
        Efecto: c.coefficient > 0 ? 'favorece' : 'perjudica',
      })),
  );

  console.log(`
${'='.repeat(78)}
ADVERTENCIA: el conjunto es SINTÉTICO, generado a partir de criterios de
idoneidad de adopción responsable con un término aleatorio que representa los
factores no observados. Estos números validan que el canal de aprendizaje
funciona; NO son evidencia de capacidad predictiva sobre adopciones reales.
Hay que reentrenar con datos reales cuando la institución los acumule.
${'='.repeat(78)}`);
}

main();
