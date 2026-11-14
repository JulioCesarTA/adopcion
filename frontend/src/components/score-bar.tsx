import { Info } from "lucide-react";
import { DISCLAIMER } from "@/lib/labels";
import type { Breakdown, Level } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";
import { StatusBadge } from "./status-badge";

const barColor: Record<Level, string> = {
  ALTA: "bg-green-500",
  MEDIA: "bg-amber-500",
  BAJA: "bg-red-500",
  INCOMPATIBLE: "bg-slate-400",
};

/** Barra de compatibilidad con color por nivel (sección 10.4). */
export function ScoreBar({
  score,
  level,
  className,
}: {
  score: number;
  level: Level;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        aria-label={`Compatibilidad ${score} de 100`}
      >
        <div
          className={cn("h-full rounded-full", barColor[level])}
          style={{ width: `${Math.max(2, score)}%` }}
        />
      </div>
      <span className="w-14 text-right text-sm font-semibold tabular-nums text-slate-900">
        {formatNumber(score, 2)}
      </span>
      <StatusBadge kind="level" value={level} />
    </div>
  );
}

/** RN-08: aviso obligatorio junto a toda recomendación. */
export function Disclaimer({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900",
        className,
      )}
      role="note"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      {DISCLAIMER}
    </p>
  );
}

/** Desglose por criterio con explicación en texto (CU13). */
export function BreakdownDetail({ breakdown }: { breakdown: Breakdown }) {
  if (!breakdown.hardFilters.passed) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
        <p className="font-medium text-slate-800">Incompatible por filtro obligatorio:</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-600">
          {breakdown.hardFilters.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>
    );
  }
  const ml = breakdown.ml;

  return (
    <div className="space-y-3">
      {ml && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="text-sm font-medium text-indigo-900">
              Probabilidad estimada de adopción sostenida
            </span>
            <span className="text-sm font-semibold tabular-nums text-indigo-900">
              {formatNumber(ml.probability * 100, 1)} %
            </span>
          </div>
          <p className="mt-1 text-xs text-indigo-700">
            Random Forest v{ml.modelVersion} · acuerdo entre árboles{" "}
            {formatNumber(ml.agreement * 100, 0)} %
            {breakdown.ruleScore !== undefined && (
              <> · motor de reglas: {formatNumber(breakdown.ruleScore, 2)}</>
            )}
          </p>

          <p className="mt-3 text-xs font-medium text-indigo-900">
            Qué pesa más en este caso concreto
          </p>
          <ul className="mt-1 space-y-1">
            {ml.factors.map((f) => (
              <li key={f.feature} className="flex items-baseline justify-between gap-2 text-xs">
                <span className="text-slate-700">{f.label}</span>
                <span
                  className={cn(
                    "shrink-0 tabular-nums",
                    f.direction === "favorece"
                      ? "text-green-700"
                      : f.direction === "perjudica"
                        ? "text-red-700"
                        : "text-slate-400",
                  )}
                >
                  {f.contribution > 0 ? "+" : ""}
                  {formatNumber(f.contribution * 100, 1)} pts
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-indigo-600">
            El aporte compara este caso contra uno típico, reemplazando la variable por su mediana.
          </p>
        </div>
      )}

      {ml && (
        <p className="text-xs font-medium text-slate-500">
          Análisis por criterio del motor de reglas (referencia)
        </p>
      )}

      {breakdown.criteria.map((c) => (
        <div key={c.key}>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="font-medium text-slate-800">{c.label}</span>
            <span className="tabular-nums text-slate-600">
              {formatNumber(c.points, 2)} / {c.weight} pts
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-teal-500" style={{ width: `${c.fit * 100}%` }} />
          </div>
          <p className="mt-1 text-xs text-slate-500">{c.explanation}</p>
        </div>
      ))}
      <p className="text-xs text-slate-400">Versión del modelo: {breakdown.modelVersion}</p>
    </div>
  );
}
