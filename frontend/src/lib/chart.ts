/**
 * Paleta y estilos de gráficos. Orden categórico FIJO (nunca cíclico): el color
 * sigue a la entidad, no a su posición. Paleta validada (CVD y contraste) de la
 * guía de visualización; los tonos con contraste < 3:1 se acompañan de leyenda y tabla.
 */
export const SERIES_COLORS = [
  "#2a78d6", // azul
  "#eb6834", // naranja
  "#1baf7a", // aqua
  "#eda100", // amarillo
  "#e87ba4", // magenta
  "#008300", // verde
  "#6250d6", // violeta
  "#e34948", // rojo
] as const;

export const CHART = {
  surface: "#ffffff",
  grid: "#e2e8f0",
  axis: "#64748b",
  text: "#334155",
  single: "#2a78d6",
  fontSize: 12,
};

export function seriesColor(i: number): string {
  return SERIES_COLORS[i] ?? "#94a3b8"; // más allá de 8 → gris "Otros"
}

export const axisProps = {
  stroke: CHART.grid,
  tick: { fill: CHART.axis, fontSize: CHART.fontSize },
  tickLine: false,
} as const;

export const tooltipProps = {
  cursor: { fill: "rgba(148,163,184,0.12)" },
  contentStyle: {
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
    fontSize: 13,
    color: CHART.text,
  },
  labelStyle: { color: "#0f172a", fontWeight: 600 },
} as const;
