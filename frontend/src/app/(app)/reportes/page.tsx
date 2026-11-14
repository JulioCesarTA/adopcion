"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/info";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useReport, useReportList } from "@/hooks/use-admin";
import { downloadFile, errorMessage } from "@/lib/api";
import { CHART, axisProps, seriesColor, tooltipProps } from "@/lib/chart";
import { ANIMAL_STATUS, SPECIES, options } from "@/lib/labels";
import type { ReportResult } from "@/lib/types";
import { formatDateTime, formatDay, formatNumber, todayInput } from "@/lib/utils";

const CATEGORY_LABEL = {
  GENERAL: "Generales",
  SANITARIO: "Sanitarios",
  ADOPCIONES: "Adopciones",
} as const;

function defaultFrom(): string {
  const d = new Date(`${todayInput()}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() - 1);
  return `${d.toISOString().slice(0, 7)}-01`;
}

/** CU17: reportes con filtros, gráfico, tabla, CSV e impresión. */
export default function ReportsPage() {
  const { data: list, isLoading: loadingList, error: listError } = useReportList();
  const [type, setType] = useState<string | null>(null);
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(todayInput());
  const [species, setSpecies] = useState("");
  const [status, setStatus] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!type && list?.length) setType(list[0].type);
  }, [list, type]);

  const info = list?.find((r) => r.type === type);
  const uses = (f: "dates" | "species" | "status") => info?.filters.includes(f) ?? false;
  const invalidRange = uses("dates") && from > to;
  const filters = {
    ...(uses("dates") && !invalidRange ? { from, to } : {}),
    ...(uses("species") ? { species } : {}),
    ...(uses("status") ? { status } : {}),
  };
  const {
    data: report,
    isLoading,
    isFetching,
    error,
  } = useReport(invalidRange ? null : type, filters);

  const exportCsv = async () => {
    if (!type) return;
    setDownloading(true);
    try {
      await downloadFile(`/reports/${type}/csv`, filters, `${type}.csv`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  if (listError) return <ErrorState message={errorMessage(listError)} />;

  return (
    <>
      <PageHeader
        title="Reportes y estadísticas"
        actions={
          <div className="flex gap-2 no-print">
            <Button
              variant="outline"
              onClick={() => void exportCsv()}
              loading={downloading}
              disabled={!report}
            >
              <Download className="h-4 w-4" aria-hidden /> Exportar CSV
            </Button>
            <Button variant="outline" onClick={() => window.print()} disabled={!report}>
              <Printer className="h-4 w-4" aria-hidden /> Imprimir
            </Button>
          </div>
        }
      />

      <Card className="mb-6 p-4 no-print">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-64 flex-1 text-sm text-slate-600">
            Reporte
            {loadingList ? (
              <Skeleton className="mt-1 h-10 w-full" />
            ) : (
              <Select className="mt-1" value={type ?? ""} onChange={(e) => setType(e.target.value)}>
                {(["GENERAL", "SANITARIO", "ADOPCIONES"] as const).map((cat) => {
                  const items = list?.filter((r) => r.category === cat) ?? [];
                  return items.length ? (
                    <optgroup key={cat} label={CATEGORY_LABEL[cat]}>
                      {items.map((r) => (
                        <option key={r.type} value={r.type}>
                          {r.title}
                        </option>
                      ))}
                    </optgroup>
                  ) : null;
                })}
              </Select>
            )}
          </label>
          {uses("dates") && (
            <>
              <label className="text-sm text-slate-600">
                Desde
                <Input
                  type="date"
                  className="mt-1"
                  value={from}
                  max={to}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </label>
              <label className="text-sm text-slate-600">
                Hasta
                <Input
                  type="date"
                  className="mt-1"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </label>
            </>
          )}
          {uses("species") && (
            <label className="text-sm text-slate-600">
              Especie
              <Select className="mt-1" value={species} onChange={(e) => setSpecies(e.target.value)}>
                <option value="">Todas</option>
                {options(SPECIES).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </label>
          )}
          {uses("status") && (
            <label className="text-sm text-slate-600">
              Estado
              <Select className="mt-1" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Todos</option>
                {options(ANIMAL_STATUS).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </label>
          )}
        </div>
        {info && <p className="mt-3 text-sm text-slate-500">{info.description}</p>}
        {invalidRange && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            Rango de fechas inválido: «desde» es posterior a «hasta».
          </p>
        )}
      </Card>

      {isLoading || (!report && isFetching) ? (
        <Skeleton className="h-96 w-full" />
      ) : error ? (
        <ErrorState message={errorMessage(error)} />
      ) : report ? (
        <ReportView report={report} />
      ) : null}
    </>
  );
}

function formatCell(v: string | number | null | undefined, type?: string) {
  if (v === null || v === undefined || v === "") return "—";
  if (type === "date") return formatDay(String(v));
  if (type === "number" && typeof v === "number")
    return formatNumber(v, Number.isInteger(v) ? 0 : 1);
  return String(v);
}

function ReportView({ report }: { report: ReportResult }) {
  const empty =
    report.rows.length === 0 ||
    report.rows.every((r) =>
      report.columns.filter((c) => c.type === "number").every((c) => !r[c.key]),
    );

  return (
    <div className="space-y-6">
      <div className="hidden print:block">
        <h2 className="text-xl font-semibold">{report.title}</h2>
        <p className="text-sm text-slate-600">
          {report.filters.from} a {report.filters.to}
          {report.filters.species && ` · ${SPECIES[report.filters.species]}`} · generado{" "}
          {formatDateTime(report.generatedAt)}
        </p>
      </div>

      {report.chart && !empty && (
        <Card className="print-plain">
          <CardHeader title={report.title} />
          <CardBody>
            <ReportChart report={report} />
          </CardBody>
        </Card>
      )}

      <Card className="print-plain">
        <CardHeader
          title="Datos"
          description={`${report.rows.length} filas · generado ${formatDateTime(report.generatedAt)}`}
        />
        {empty ? (
          <EmptyState title="Sin datos para los filtros seleccionados" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {report.columns.map((c) => (
                    <th
                      key={c.key}
                      scope="col"
                      className={`px-4 py-3 font-medium ${c.type === "number" ? "text-right" : ""}`}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.rows.map((row, i) => (
                  <tr key={i}>
                    {report.columns.map((c) => (
                      <td
                        key={c.key}
                        className={`px-4 py-2.5 ${c.type === "number" ? "text-right tabular-nums" : ""}`}
                      >
                        {formatCell(row[c.key], c.type)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function ReportChart({ report }: { report: ReportResult }) {
  const chart = report.chart!;
  const multi = chart.series.length > 1;
  const common = (
    <>
      <CartesianGrid vertical={false} stroke={CHART.grid} />
      <XAxis dataKey={chart.xKey} {...axisProps} interval="preserveStartEnd" />
      <YAxis allowDecimals={false} {...axisProps} axisLine={false} />
      <Tooltip {...tooltipProps} />
      {multi && <Legend wrapperStyle={{ fontSize: 13, color: CHART.text }} />}
    </>
  );

  return (
    <ResponsiveContainer width="100%" height={320}>
      {chart.kind === "line" ? (
        <LineChart data={report.rows} margin={{ left: -16, right: 16, top: 8 }}>
          {common}
          {chart.series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={multi ? seriesColor(i) : CHART.single}
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2, fill: CHART.surface }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      ) : (
        <BarChart data={report.rows} margin={{ left: -16, right: 16, top: 8 }} barGap={2}>
          {common}
          {chart.series.map((s, i) => {
            const last = i === chart.series.length - 1;
            return (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                stackId={chart.stacked ? "a" : undefined}
                fill={multi ? seriesColor(i) : CHART.single}
                // 2px de superficie entre segmentos; extremos redondeados solo en el tope
                stroke={CHART.surface}
                strokeWidth={chart.stacked ? 2 : 0}
                radius={!chart.stacked || last ? [4, 4, 0, 0] : 0}
                maxBarSize={36}
              />
            );
          })}
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}
