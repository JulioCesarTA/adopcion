/**
 * Generador pseudoaleatorio con semilla (mulberry32).
 *
 * El bosque usa azar en dos lugares: el remuestreo bootstrap y el submuestreo de
 * variables por nodo. Con una semilla fija el entrenamiento es REPRODUCIBLE, que
 * es un requisito para poder defender los resultados: dos corridas con los
 * mismos datos y la misma semilla dan exactamente el mismo modelo y las mismas
 * métricas.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    // Evita el estado 0, que degenera la secuencia.
    this.state = seed >>> 0 || 0x9e3779b9;
  }

  /** Flotante uniforme en [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Entero uniforme en [0, max). */
  int(max: number): number {
    return Math.floor(this.next() * max);
  }

  /** Normal estándar por el método de Box-Muller (para el generador sintético). */
  normal(): number {
    let u = 0;
    let v = 0;
    while (u === 0) u = this.next();
    while (v === 0) v = this.next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /** Elige un elemento al azar. */
  pick<T>(items: readonly T[]): T {
    return items[this.int(items.length)];
  }

  /** Mezcla una copia del arreglo (Fisher-Yates). */
  shuffle<T>(items: readonly T[]): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  /** Toma `k` índices distintos de [0, n). Usado para el submuestreo de variables. */
  sampleIndices(n: number, k: number): number[] {
    if (k >= n) return Array.from({ length: n }, (_, i) => i);
    const chosen = new Set<number>();
    while (chosen.size < k) chosen.add(this.int(n));
    return [...chosen];
  }
}
