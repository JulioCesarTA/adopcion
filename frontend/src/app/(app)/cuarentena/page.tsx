"use client";

import { useState } from "react";
import Link from "next/link";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/status-badge";
import { AnimalPhoto } from "@/components/animals/animal-photo";
import { ClosePeriodDialog, ControlDialog } from "@/components/clinical/period-dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { useAllPeriods } from "@/hooks/use-clinical";
import { errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { animalName } from "@/lib/labels";
import type { PeriodStatus, QuarantinePeriod } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

/** Periodos de observación/cuarentena con fecha estimada y controles (sección 10.3). */
export default function QuarantinePage() {
  const { hasRole } = useAuth();
  const [status, setStatus] = useState<PeriodStatus | "">("ACTIVO");
  const { data, isLoading, error } = useAllPeriods(status || undefined);
  const [control, setControl] = useState<QuarantinePeriod | null>(null);
  const [closing, setClosing] = useState<QuarantinePeriod | null>(null);
  const isVet = hasRole("VETERINARIO");

  const columns: Column<QuarantinePeriod>[] = [
    {
      key: "animal",
      header: "Animal",
      sortValue: (p) => p.animal?.code,
      cell: (p) =>
        p.animal && (
          <Link
            href={`/animales/${p.animal.id}`}
            className="flex items-center gap-3 hover:text-teal-700"
          >
            <AnimalPhoto
              url={p.animal.photoUrl}
              species={p.animal.species}
              alt=""
              className="h-9 w-9 rounded-lg"
            />
            <span>
              <span className="block font-medium text-slate-900">{animalName(p.animal)}</span>
              <span className="block text-xs text-slate-500">{p.animal.code}</span>
            </span>
          </Link>
        ),
    },
    {
      key: "type",
      header: "Tipo",
      sortValue: (p) => p.type,
      cell: (p) => <StatusBadge kind="period" value={p.type} />,
    },
    {
      key: "reason",
      header: "Motivo",
      cell: (p) => <span className="line-clamp-2">{p.reason}</span>,
      className: "hidden lg:table-cell",
    },
    {
      key: "start",
      header: "Inicio",
      sortValue: (p) => p.startDate,
      cell: (p) => formatDateTime(p.startDate),
    },
    {
      key: "expected",
      header: "Fin estimado",
      sortValue: (p) => p.expectedEndDate ?? "",
      cell: (p) => {
        const overdue =
          p.status === "ACTIVO" && p.expectedEndDate && new Date(p.expectedEndDate) < new Date();
        return (
          <span className="flex flex-wrap items-center gap-1">
            {p.expectedEndDate ? formatDateTime(p.expectedEndDate) : "—"}
            {overdue && <Badge tone="red">Vencido</Badge>}
          </span>
        );
      },
    },
    {
      key: "controls",
      header: "Controles",
      sortValue: (p) => p._count?.controls ?? 0,
      cell: (p) => (
        <span>
          {p._count?.controls ?? 0}
          {p.controls?.[0] && (
            <span className="block text-xs text-slate-500">
              Último: {formatDateTime(p.controls[0].controlDate)}
            </span>
          )}
        </span>
      ),
    },
    ...(isVet && status === "ACTIVO"
      ? [
          {
            key: "actions",
            header: "Acciones",
            className: "text-right",
            cell: (p: QuarantinePeriod) => (
              <div className="flex justify-end gap-1">
                <Button variant="outline" size="sm" onClick={() => setControl(p)}>
                  Control
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setClosing(p)}>
                  Cerrar
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader
        title="Cuarentena y observación"
        description="Periodos con su fecha estimada de fin y los controles registrados."
        actions={
          <Select
            aria-label="Estado del periodo"
            value={status}
            onChange={(e) => setStatus(e.target.value as PeriodStatus | "")}
          >
            <option value="ACTIVO">Activos</option>
            <option value="FINALIZADO">Finalizados</option>
            <option value="">Todos</option>
          </Select>
        }
      />
      <DataTable
        columns={columns}
        data={data}
        rowKey={(p) => p.id}
        loading={isLoading}
        error={error ? errorMessage(error) : null}
        emptyTitle={status === "ACTIVO" ? "No hay periodos activos" : "Sin periodos"}
      />
      {control?.animal && (
        <ControlDialog
          animalId={control.animal.id}
          period={control}
          onClose={() => setControl(null)}
        />
      )}
      {closing?.animal && (
        <ClosePeriodDialog
          animalId={closing.animal.id}
          period={closing}
          onClose={() => setClosing(null)}
        />
      )}
    </>
  );
}
