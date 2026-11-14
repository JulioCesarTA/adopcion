"use client";

import { useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, Info } from "lucide-react";
import { ErrorState, PageSkeleton } from "@/components/info";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { useKpis } from "@/hooks/use-admin";
import { errorMessage } from "@/lib/api";
import { cn, formatDay, formatNumber } from "@/lib/utils";
import type { Kpi } from "@/lib/types";

const PERIODS = [
  { value: 3, label: "Últimos 3 meses" },
  { value: 6, label: "Últimos 6 meses" },
  { value: 12, label: "Últimos 12 meses" },
];

/**
 * Un indicador puede subir y ser una mala noticia (devoluciones) o bajar y ser
 * buena (días de permanencia). El color sale de cruzar la tendencia con la
 * dirección deseada, nunca del signo solo.
 */
function toneFor(kpi: Kpi): "good" | "bad" | "neutral" {
  if (kpi.trend === "estable" || kpi.delta === null) return "neutral";
  const improves =
    kpi.direction === "mas-es-mejor" ? kpi.trend === "sube" : kpi.trend === "baja";
  return improves ? "good" : "bad";
}

const TONE_CLASS = {
  good: "text-green-700 bg-green-50 border-green-200",
  bad: "text-red-700 bg-red-50 border-red-200",
  neutral: "text-slate-600 bg-slate-50 border-slate-200",
} as const;

function KpiCard({ kpi }: { kpi: Kpi }) {
  const tone = toneFor(kpi);
  const Arrow = kpi.trend === "sube" ? ArrowUp : kpi.trend === "baja" ? ArrowDown : ArrowRight;

  return (
    <Card>
      <CardBody className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-medium text-slate-700">{kpi.label}</h3>
          <span
            className="group relative shrink-0 text-slate-300 hover:text-slate-500"
            tabIndex={0}
            role="note"
            aria-label={kpi.help}
          >
            <Info className="h-4 w-4" aria-hidden />
            <span className="pointer-events-none absolute right-0 top-6 z-10 hidden w-60 rounded-lg bg-slate-900 px-3 py-2 text-xs font-normal text-white group-hover:block group-focus:block">
              {kpi.help}
            </span>
          </span>
        </div>

        <p className="mt-3 flex items-baseline gap-1.5">
          {kpi.value === null ? (
            <span className="text-2xl font-semibold text-slate-300">Sin datos</span>
          ) : (
            <>
              <span className="text-3xl font-semibold tabular-nums text-slate-900">
                {formatNumber(kpi.value, kpi.unit === "animales" || kpi.unit === "solicitudes" ? 0 : 1)}
              </span>
              <span className="text-sm text-slate-500">{kpi.unit}</span>
            </>
          )}
        </p>

        {kpi.delta !== null && kpi.previous !== null ? (
          <p
            className={cn(
              "mt-2 inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
              TONE_CLASS[tone],
            )}
          >
            <Arrow className="h-3.5 w-3.5" aria-hidden />
            {kpi.delta > 0 ? "+" : ""}
            {formatNumber(kpi.delta, 1)} {kpi.unit === "%" ? "pts" : kpi.unit}
            <span className="font-normal opacity-75">vs. periodo anterior</span>
          </p>
        ) : (
          <p className="mt-2 text-xs text-slate-400">Sin periodo anterior para comparar</p>
        )}

        <p className="mt-auto pt-3 text-xs text-slate-500">{kpi.detail}</p>
      </CardBody>
    </Card>
  );
}

export default function KpisPage() {
  const [months, setMonths] = useState(6);
  const { data, isPending, error, refetch } = useKpis(months);

  return (
    <>
      <PageHeader
        title="Indicadores de gestión"
        description="Seis métricas del albergue, cada una comparada contra el periodo anterior de la misma duración."
        actions={
          <Select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            aria-label="Periodo de análisis"
            className="w-48"
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
        }
      />

      {isPending ? (
        <PageSkeleton />
      ) : error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.kpis.map((kpi) => (
              <KpiCard key={kpi.key} kpi={kpi} />
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Periodo analizado: {formatDay(data.from)} a {formatDay(data.to)}. La comparación usa
            los {data.periodMonths} meses inmediatamente anteriores.
          </p>
        </>
      )}
    </>
  );
}
