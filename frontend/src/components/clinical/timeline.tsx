"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldAlert, Stethoscope, Syringe } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/info";
import { StatusBadge } from "@/components/status-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useTimeline } from "@/hooks/use-animals";
import { errorMessage } from "@/lib/api";
import type { TimelineItem } from "@/lib/types";
import { cn, formatDateTime, formatDay } from "@/lib/utils";

const TYPES = [
  { id: "CONSULTA", label: "Consultas", icon: Stethoscope, color: "bg-teal-600" },
  { id: "VACUNA", label: "Vacunas", icon: Syringe, color: "bg-blue-600" },
  { id: "PERIODO", label: "Observación / cuarentena", icon: ShieldAlert, color: "bg-red-600" },
] as const;

/** CU05: línea de tiempo cronológica inversa del HCD con filtros por tipo y fecha. */
export function Timeline({ animalId }: { animalId: string }) {
  const [types, setTypes] = useState<string[]>(TYPES.map((t) => t.id));
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const invalidRange = !!from && !!to && from > to;

  const { data, isLoading, error, refetch } = useTimeline(animalId, {
    types: types.join(","),
    from: invalidRange ? undefined : from,
    to: invalidRange ? undefined : to,
  });

  const toggle = (id: string) =>
    setTypes((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <fieldset className="flex flex-wrap gap-4">
          <legend className="sr-only">Tipos de registro</legend>
          {TYPES.map((t) => (
            <Checkbox
              key={t.id}
              label={t.label}
              checked={types.includes(t.id)}
              onChange={() => toggle(t.id)}
            />
          ))}
        </fieldset>
        <div className="ml-auto flex flex-wrap items-end gap-2">
          <label className="text-sm text-slate-600">
            Desde
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 h-9"
            />
          </label>
          <label className="text-sm text-slate-600">
            Hasta
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 h-9"
            />
          </label>
        </div>
        {invalidRange && (
          <p className="w-full text-sm text-red-600" role="alert">
            La fecha «desde» no puede ser posterior a «hasta».
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
      ) : !data?.data.length ? (
        <EmptyState
          title="Aún no hay registros clínicos"
          description="Las consultas, vacunas y periodos aparecerán aquí."
        />
      ) : (
        <ol className="relative space-y-6 border-l-2 border-slate-200 pl-6">
          {data.data.map((item) => (
            <TimelineEntry key={`${item.type}-${item.id}`} item={item} animalId={animalId} />
          ))}
        </ol>
      )}
    </div>
  );
}

function TimelineEntry({ item, animalId }: { item: TimelineItem; animalId: string }) {
  const meta = TYPES.find((t) => t.id === item.type)!;
  const Icon = meta.icon;
  return (
    <li className="relative">
      <span
        className={cn(
          "absolute -left-[37px] flex h-7 w-7 items-center justify-center rounded-full text-white ring-4 ring-slate-50",
          meta.color,
        )}
        aria-hidden
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {item.type === "CONSULTA" && <ConsultationEntry item={item} animalId={animalId} />}
        {item.type === "VACUNA" && <VaccinationEntry item={item} />}
        {item.type === "PERIODO" && <PeriodEntry item={item} />}
      </div>
    </li>
  );
}

function ConsultationEntry({
  item,
  animalId,
}: {
  item: Extract<TimelineItem, { type: "CONSULTA" }>;
  animalId: string;
}) {
  const c = item.data;
  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Link
          href={`/animales/${animalId}/consultas/${c.id}`}
          className="font-semibold text-slate-900 hover:text-teal-700"
        >
          Consulta: {c.reason}
        </Link>
        <time className="text-xs text-slate-500">{formatDateTime(c.consultationDate)}</time>
      </div>
      <p className="mt-0.5 text-xs text-slate-500">
        {c.veterinarian.fullName}
        {c.weightKg !== null && ` · ${c.weightKg} kg`}
        {c.temperatureC !== null && ` · ${c.temperatureC} °C`}
      </p>
      <p className="mt-2 text-sm text-slate-700">{c.clinicalEvaluation}</p>
      {!!c.diagnoses?.length && (
        <div className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Diagnósticos</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
            {c.diagnoses.map((d) => (
              <li key={d.id}>{d.description}</li>
            ))}
          </ul>
        </div>
      )}
      {!!c.treatments?.length && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Tratamientos</p>
          {c.treatments.map((t) => (
            <div key={t.id} className="rounded-lg bg-slate-50 p-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-slate-800">{t.description}</span>
                <StatusBadge kind="treatment" value={t.status} />
                <span className="text-xs text-slate-500">
                  {formatDay(t.startDate)} → {t.endDate ? formatDay(t.endDate) : "sin fecha de fin"}
                </span>
              </div>
              {!!t.medications.length && (
                <p className="mt-1 text-xs text-slate-600">
                  {t.medications.map((m) => `${m.name} ${m.dose} (${m.frequency})`).join(" · ")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function VaccinationEntry({ item }: { item: Extract<TimelineItem, { type: "VACUNA" }> }) {
  const v = item.data;
  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold text-slate-900">
          Vacuna: {v.vaccine.name}
          {v.vaccine.isRabies && (
            <span className="ml-2 text-xs font-normal text-red-600">Antirrábica</span>
          )}
        </p>
        <time className="text-xs text-slate-500">{formatDay(v.applicationDate)}</time>
      </div>
      <p className="mt-0.5 text-xs text-slate-500">
        Dosis {v.dose}
        {v.batchNumber && ` · Lote ${v.batchNumber}`}
        {v.appliedBy && ` · ${v.appliedBy.fullName}`}
      </p>
      {v.nextDoseDate && (
        <p className="mt-2 text-sm text-slate-700">Próxima dosis: {formatDay(v.nextDoseDate)}</p>
      )}
      {v.observations && <p className="mt-1 text-sm text-slate-600">{v.observations}</p>}
    </>
  );
}

function PeriodEntry({ item }: { item: Extract<TimelineItem, { type: "PERIODO" }> }) {
  const p = item.data;
  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="flex items-center gap-2 font-semibold text-slate-900">
          <StatusBadge kind="period" value={p.type} />
          {p.reason}
        </p>
        <time className="text-xs text-slate-500">{formatDateTime(p.startDate)}</time>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        {p.status === "ACTIVO"
          ? `Activo · fin estimado ${p.expectedEndDate ? formatDateTime(p.expectedEndDate) : "sin definir"}`
          : `Finalizado el ${formatDateTime(p.endDate)}${p.closedBy ? ` por ${p.closedBy.fullName}` : ""}`}
      </p>
      {!!p.controls?.length && (
        <ul className="mt-2 space-y-1 text-sm text-slate-700">
          {p.controls.map((c) => (
            <li key={c.id}>
              <span className="text-xs text-slate-500">{formatDateTime(c.controlDate)}:</span>{" "}
              {c.animalCondition}
            </li>
          ))}
        </ul>
      )}
      {p.finalObservations && <p className="mt-2 text-sm text-slate-600">{p.finalObservations}</p>}
    </>
  );
}
