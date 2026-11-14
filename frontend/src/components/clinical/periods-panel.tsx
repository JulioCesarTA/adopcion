"use client";

import { useState } from "react";
import { ClipboardCheck, Lock } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/info";
import { RoleGate } from "@/components/role-gate";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePeriods } from "@/hooks/use-clinical";
import { errorMessage } from "@/lib/api";
import type { QuarantinePeriod } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { ClosePeriodDialog, ControlDialog } from "./period-dialogs";

/** Pestaña «Cuarentena» de la ficha: periodos con sus controles (CU09). */
export function PeriodsPanel({ animalId }: { animalId: string }) {
  const { data, isLoading, error, refetch } = usePeriods(animalId);
  const [control, setControl] = useState<QuarantinePeriod | null>(null);
  const [closing, setClosing] = useState<QuarantinePeriod | null>(null);

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (error) return <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />;
  if (!data?.length) {
    return (
      <Card>
        <EmptyState title="Sin periodos de observación o cuarentena" />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((p) => {
        const overdue =
          p.status === "ACTIVO" && p.expectedEndDate && new Date(p.expectedEndDate) < new Date();
        return (
          <Card key={p.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge kind="period" value={p.type} />
                  <Badge tone={p.status === "ACTIVO" ? "amber" : "slate"}>
                    {p.status === "ACTIVO" ? "Activo" : "Finalizado"}
                  </Badge>
                  {overdue && <Badge tone="red">Superó la fecha estimada</Badge>}
                </div>
                <p className="mt-2 font-medium text-slate-900">{p.reason}</p>
                <p className="mt-1 text-sm text-slate-500">
                  Inicio {formatDateTime(p.startDate)}
                  {p.startedBy && ` por ${p.startedBy.fullName}`} · Fin estimado{" "}
                  {p.expectedEndDate ? formatDateTime(p.expectedEndDate) : "sin definir"}
                </p>
                {p.status === "FINALIZADO" && (
                  <p className="mt-1 text-sm text-slate-500">
                    Cerrado {formatDateTime(p.endDate)}
                    {p.closedBy && ` por ${p.closedBy.fullName}`}
                  </p>
                )}
              </div>
              {p.status === "ACTIVO" && (
                <RoleGate roles={["VETERINARIO"]}>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setControl(p)}>
                      <ClipboardCheck className="h-4 w-4" aria-hidden /> Registrar control
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setClosing(p)}>
                      <Lock className="h-4 w-4" aria-hidden /> Cerrar periodo
                    </Button>
                  </div>
                </RoleGate>
              )}
            </div>

            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Controles ({p.controls?.length ?? 0})
              </p>
              {p.controls?.length ? (
                <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-100">
                  {p.controls.map((c) => (
                    <li key={c.id} className="p-3 text-sm">
                      <div className="flex flex-wrap justify-between gap-2">
                        <span className="font-medium text-slate-800">{c.animalCondition}</span>
                        <span className="text-xs text-slate-500">
                          {formatDateTime(c.controlDate)}
                          {c.createdBy && ` · ${c.createdBy.fullName}`}
                        </span>
                      </div>
                      {c.observations && <p className="mt-1 text-slate-600">{c.observations}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-slate-500">Sin controles registrados.</p>
              )}
            </div>
            {p.finalObservations && (
              <p className="mt-3 text-sm text-slate-600">
                <span className="font-medium">Observaciones finales:</span> {p.finalObservations}
              </p>
            )}
          </Card>
        );
      })}
      {control && (
        <ControlDialog animalId={animalId} period={control} onClose={() => setControl(null)} />
      )}
      {closing && (
        <ClosePeriodDialog animalId={animalId} period={closing} onClose={() => setClosing(null)} />
      )}
    </div>
  );
}
