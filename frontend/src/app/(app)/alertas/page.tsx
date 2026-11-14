"use client";

import { Pill, ShieldAlert, Syringe } from "lucide-react";
import { AlertsList } from "@/components/alerts-list";
import { ErrorState, PageSkeleton } from "@/components/info";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/stat-card";
import { Card } from "@/components/ui/card";
import { useAlerts } from "@/hooks/use-admin";
import { errorMessage } from "@/lib/api";

/** CU23: alertas calculadas al consultar. */
export default function AlertsPage() {
  const { data, isLoading, error, refetch } = useAlerts();

  if (isLoading) return <PageSkeleton />;
  if (error || !data)
    return <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />;

  return (
    <>
      <PageHeader
        title="Alertas"
        description="Vacunas con próxima dosis vencida o a 7 días o menos, periodos que superaron su fecha estimada y tratamientos activos con fecha de fin pasada."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Vacunas" value={data.vaccines.length} icon={Syringe} tone="amber" />
        <StatCard
          label="Periodos vencidos"
          value={data.periods.length}
          icon={ShieldAlert}
          tone="red"
        />
        <StatCard
          label="Tratamientos vencidos"
          value={data.treatments.length}
          icon={Pill}
          tone="blue"
        />
      </div>
      <Card>
        <AlertsList alerts={data} />
      </Card>
    </>
  );
}
