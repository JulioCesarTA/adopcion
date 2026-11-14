import Link from "next/link";
import { Pill, ShieldAlert, Syringe } from "lucide-react";
import { Badge } from "./ui/badge";
import { EmptyState } from "./empty-state";
import { animalName } from "@/lib/labels";
import type { Alerts } from "@/lib/types";
import { formatDateTime, formatDay } from "@/lib/utils";

const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

/** Lista de alertas (CU23): vacunas, periodos vencidos y tratamientos vencidos. */
export function AlertsList({ alerts, limit }: { alerts: Alerts; limit?: number }) {
  const items = [
    ...alerts.vaccines.map((v) => ({
      key: `v-${v.vaccinationId}`,
      icon: Syringe,
      tone: v.overdue ? ("red" as const) : ("amber" as const),
      title: `${v.vaccine.name} — ${animalName(v.animal)}`,
      detail: `Próxima dosis: ${formatDay(v.nextDoseDate)}`,
      badge: v.overdue
        ? `Vencida hace ${plural(-v.daysLeft, "día", "días")}`
        : v.daysLeft === 0
          ? "Vence hoy"
          : `Vence en ${plural(v.daysLeft, "día", "días")}`,
      href: `/animales/${v.animal.id}`,
      order: v.daysLeft,
    })),
    ...alerts.periods.map((p) => ({
      key: `p-${p.periodId}`,
      icon: ShieldAlert,
      tone: "red" as const,
      title: `${p.type === "CUARENTENA" ? "Cuarentena" : "Observación"} vencida — ${animalName(p.animal)}`,
      detail: `Fin estimado: ${formatDateTime(p.expectedEndDate)}`,
      badge: `Excedida ${plural(p.daysOverdue, "día", "días")}`,
      href: `/animales/${p.animal.id}`,
      order: -p.daysOverdue,
    })),
    ...alerts.treatments.map((t) => ({
      key: `t-${t.treatmentId}`,
      icon: Pill,
      tone: "amber" as const,
      title: `Tratamiento activo vencido — ${animalName(t.animal)}`,
      detail: `${t.description} · fin previsto ${formatDay(t.endDate)}`,
      badge: `Hace ${plural(t.daysOverdue, "día", "días")}`,
      href: `/animales/${t.animal.id}/consultas/${t.consultationId}`,
      order: -t.daysOverdue,
    })),
  ].sort((a, b) => a.order - b.order);

  if (!items.length)
    return (
      <EmptyState
        title="Sin alertas"
        description="No hay vacunas, periodos ni tratamientos vencidos."
      />
    );

  return (
    <ul className="divide-y divide-slate-100">
      {items.slice(0, limit).map((i) => {
        const Icon = i.icon;
        return (
          <li key={i.key}>
            <Link href={i.href} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50">
              <span className={i.tone === "red" ? "mt-0.5 text-red-600" : "mt-0.5 text-amber-600"}>
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-900">{i.title}</span>
                <span className="block text-xs text-slate-500">{i.detail}</span>
              </span>
              <Badge tone={i.tone}>{i.badge}</Badge>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
