"use client";

import { useState } from "react";
import Link from "next/link";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { useUpcomingVaccinations, type UpcomingVaccination } from "@/hooks/use-clinical";
import { errorMessage } from "@/lib/api";
import { SPECIES } from "@/lib/labels";
import type { Species } from "@/lib/types";
import { formatDay, todayInput } from "@/lib/utils";

function daysUntil(dateOnly: string): number {
  const today = new Date(`${todayInput()}T00:00:00Z`).getTime();
  return Math.round(
    (new Date(`${dateOnly.slice(0, 10)}T00:00:00Z`).getTime() - today) / 86_400_000,
  );
}

/** Vacunas próximas a vencer (última dosis de cada vacuna por animal). */
export default function UpcomingVaccinesPage() {
  const [days, setDays] = useState(30);
  const { data, isLoading, error } = useUpcomingVaccinations(days);

  const columns: Column<UpcomingVaccination>[] = [
    {
      key: "animal",
      header: "Animal",
      sortValue: (v) => v.animal_code,
      cell: (v) => (
        <Link href={`/animales/${v.animal_id}`} className="hover:text-teal-700">
          <span className="block font-medium text-slate-900">{v.animal_name || "Sin nombre"}</span>
          <span className="block text-xs text-slate-500">
            {v.animal_code} · {SPECIES[v.species as Species]}
          </span>
        </Link>
      ),
    },
    {
      key: "vaccine",
      header: "Vacuna",
      sortValue: (v) => v.vaccine_name,
      cell: (v) => v.vaccine_name,
    },
    {
      key: "applied",
      header: "Última aplicación",
      sortValue: (v) => v.application_date,
      cell: (v) => formatDay(v.application_date),
    },
    {
      key: "next",
      header: "Próxima dosis",
      sortValue: (v) => v.next_dose_date,
      cell: (v) => formatDay(v.next_dose_date),
    },
    {
      key: "status",
      header: "Situación",
      sortValue: (v) => daysUntil(v.next_dose_date),
      cell: (v) => {
        const d = daysUntil(v.next_dose_date);
        if (d < 0)
          return (
            <Badge tone="red">
              Vencida hace {-d} {-d === 1 ? "día" : "días"}
            </Badge>
          );
        if (d <= 7)
          return (
            <Badge tone="amber">
              {d === 0 ? "Vence hoy" : `Vence en ${d} ${d === 1 ? "día" : "días"}`}
            </Badge>
          );
        return <Badge tone="slate">En {d} días</Badge>;
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Vacunas próximas a vencer"
        description="Se considera la última dosis aplicada de cada vacuna en animales que siguen en la institución."
        actions={
          <Select
            aria-label="Horizonte"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>Próximos 7 días</option>
            <option value={30}>Próximos 30 días</option>
            <option value={90}>Próximos 90 días</option>
          </Select>
        }
      />
      <DataTable
        columns={columns}
        data={data}
        rowKey={(v) => v.id}
        loading={isLoading}
        error={error ? errorMessage(error) : null}
        emptyTitle="No hay vacunas por vencer en este periodo"
      />
    </>
  );
}
