"use client";

import { useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ErrorState, PageSkeleton } from "@/components/info";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { useKpis } from "@/hooks/use-admin";
import { errorMessage } from "@/lib/api";
import { axisProps, CHART, seriesColor, tooltipProps } from "@/lib/chart";
import { cn, formatDay, formatNumber } from "@/lib/utils";
import type { Kpi, KpiMonth } from "@/lib/types";

const PERIODS = [
  { value: 3, label: "Últimos 3 meses" },
  { value: 6, label: "Últimos 6 meses" },
  { value: 12, label: "Últimos 12 meses" },
];

const monthFmt = new Intl.DateTimeFormat("es-BO", { month: "short", timeZone: "UTC" });
const monthLabel = (m: string) => {
  const s = monthFmt.format(new Date(`${m}-01T00:00:00Z`)).replace(".", "");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Un indicador que sube puede ser mala noticia (días de espera): el color cruza tendencia y dirección. */
function Change({ kpi }: { kpi: Kpi }) {
  if (kpi.delta === null || kpi.previous === null) return null;
  const improves =
    kpi.trend === "estable"
      ? null
      : kpi.direction === "mas-es-mejor"
        ? kpi.trend === "sube"
        : kpi.trend === "baja";
  const Arrow = kpi.trend === "sube" ? ArrowUp : kpi.trend === "baja" ? ArrowDown : ArrowRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        improves === null
          ? "border-slate-200 bg-slate-50 text-slate-600"
          : improves
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-red-200 bg-red-50 text-red-700",
      )}
    >
      <Arrow className="h-3.5 w-3.5" aria-hidden />
      {kpi.delta > 0 ? "+" : ""}
      {formatNumber(kpi.delta, 1)} {kpi.unit === "%" ? "pts" : kpi.unit} vs. periodo anterior
    </span>
  );
}

function KpiPanel({
  kpi,
  sentence,
  children,
}: {
  kpi: Kpi;
  sentence: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col p-6">
      <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">{kpi.label}</h2>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-2">
        <span className="flex items-baseline gap-1.5">
          <span className="text-5xl font-semibold tracking-tight tabular-nums text-slate-900">
            {kpi.value === null ? "—" : formatNumber(kpi.value, kpi.unit === "%" ? 0 : 1)}
          </span>
          <span className="text-lg text-slate-500">{kpi.unit}</span>
        </span>
        <Change kpi={kpi} />
      </div>
      <p className="mt-2 text-sm text-slate-600">{sentence}</p>
      <div className="mt-5 h-56">{children}</div>
    </Card>
  );
}

const Empty = () => (
  <div className="flex h-full items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-400">
    Todavía no hay datos en este periodo
  </div>
);

export default function KpisPage() {
  const [months, setMonths] = useState(6);
  const { data, isPending, error, refetch } = useKpis(months);

  return (
    <>
      <PageHeader
        title="Indicadores de gestión"
        description="Cómo va el albergue: adopciones, tiempos y salud de los animales."
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
        <Dashboard kpis={data.kpis} monthly={data.monthly} from={data.from} to={data.to} />
      )}
    </>
  );
}

function Dashboard({
  kpis,
  monthly,
  from,
  to,
}: {
  kpis: Kpi[];
  monthly: KpiMonth[];
  from: string;
  to: string;
}) {
  const byKey = (k: string) => kpis.find((x) => x.key === k)!;
  const adoption = byKey("tasa-adopcion");
  const evaluation = byKey("tiempo-evaluacion");
  const stay = byKey("permanencia-media");
  const vaccination = byKey("cobertura-vacunacion");

  const rows = monthly.map((m) => ({ ...m, label: monthLabel(m.month) }));
  const hasDecisions = rows.some((r) => r.approved + r.rejected > 0);
  const totals = rows.reduce(
    (acc, r) => ({ approved: acc.approved + r.approved, resolved: acc.resolved + r.approved + r.rejected }),
    { approved: 0, resolved: 0 },
  );

  const [covered, present] = (vaccination.detail.match(/(\d+) de (\d+)/) ?? [])
    .slice(1)
    .map(Number);
  const pending = (present ?? 0) - (covered ?? 0);

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 1. Adopciones */}
        <KpiPanel
          kpi={adoption}
          sentence={
            <>
              De <strong>{totals.resolved}</strong> solicitudes resueltas,{" "}
              <strong>{totals.approved}</strong> terminaron en adopción.
            </>
          }
        >
          {hasDecisions ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ left: -20, right: 4, top: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis allowDecimals={false} {...axisProps} axisLine={false} />
                <Tooltip {...tooltipProps} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 13 }}
                  formatter={(v) => <span style={{ color: CHART.text }}>{v}</span>}
                />
                <Bar
                  dataKey="approved"
                  name="Adoptados"
                  stackId="r"
                  fill={seriesColor(0)}
                  stroke={CHART.surface}
                  strokeWidth={2}
                  maxBarSize={40}
                />
                <Bar
                  dataKey="rejected"
                  name="Rechazados"
                  stackId="r"
                  fill={seriesColor(1)}
                  stroke={CHART.surface}
                  strokeWidth={2}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </KpiPanel>

        {/* 2. Tiempo de respuesta */}
        <KpiPanel
          kpi={evaluation}
          sentence="Días que espera, en promedio, quien pide adoptar hasta recibir la respuesta. Menos es mejor."
        >
          {hasDecisions ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ left: -12, right: 12, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="label" padding={{ left: 16, right: 16 }} {...axisProps} />
                <YAxis allowDecimals={false} {...axisProps} axisLine={false} />
                <Tooltip
                  {...tooltipProps}
                  cursor={{ stroke: CHART.axis, strokeDasharray: "3 3" }}
                  formatter={(v) => [`${formatNumber(Number(v), 1)} días`, "Espera"]}
                />
                <Line
                  type="monotone"
                  dataKey="avgEvaluationDays"
                  name="Espera"
                  stroke={CHART.single}
                  strokeWidth={2}
                  connectNulls
                  dot={{ r: 4, strokeWidth: 2, fill: CHART.surface }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </KpiPanel>

        {/* 3. Permanencia */}
        <KpiPanel
          kpi={stay}
          sentence="Días que pasa un animal en el albergue, desde que ingresa hasta que se va con su familia."
        >
          {rows.some((r) => r.avgStayDays !== null) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ left: -20, right: 4, top: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis allowDecimals={false} {...axisProps} axisLine={false} />
                <Tooltip
                  {...tooltipProps}
                  formatter={(v) => [`${formatNumber(Number(v), 1)} días`, "En el albergue"]}
                />
                <Bar
                  dataKey="avgStayDays"
                  name="En el albergue"
                  fill={CHART.single}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </KpiPanel>

        {/* 4. Vacunación */}
        <KpiPanel
          kpi={vaccination}
          sentence={
            <>
              <strong>{covered ?? 0}</strong> de <strong>{present ?? 0}</strong> animales que están
              hoy en el albergue tienen sus vacunas al día.
            </>
          }
        >
          {present ? (
            <div className="flex h-full items-center gap-6">
              <div className="relative h-full flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip {...tooltipProps} formatter={(v, n) => [`${String(v)} animales`, n]} />
                    <Pie
                      data={[
                        { name: "Vacunas al día", value: covered },
                        { name: "Pendientes", value: pending },
                      ]}
                      dataKey="value"
                      innerRadius="68%"
                      outerRadius="92%"
                      startAngle={90}
                      endAngle={-270}
                      stroke={CHART.surface}
                      strokeWidth={2}
                      cornerRadius={4}
                    >
                      <Cell fill={CHART.single} />
                      <Cell fill="#e2e8f0" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-semibold tabular-nums text-slate-900">
                    {covered}/{present}
                  </span>
                  <span className="text-xs text-slate-500">al día</span>
                </div>
              </div>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART.single }} />
                  <span className="text-slate-700">
                    Al día: <strong className="tabular-nums">{covered}</strong>
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                  <span className="text-slate-700">
                    Pendientes: <strong className="tabular-nums">{pending}</strong>
                  </span>
                </li>
              </ul>
            </div>
          ) : (
            <Empty />
          )}
        </KpiPanel>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Periodo: {formatDay(from)} a {formatDay(to)}. Pasa el mouse sobre los gráficos para ver el
        detalle de cada mes.
      </p>
    </>
  );
}
