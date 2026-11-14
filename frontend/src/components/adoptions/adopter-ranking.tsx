"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Home, Users } from "lucide-react";
import { BreakdownDetail, Disclaimer, ScoreBar } from "@/components/score-bar";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/info";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdopterRanking } from "@/hooks/use-adoptions";
import { errorMessage } from "@/lib/api";
import { EXPERIENCE, HOUSING } from "@/lib/labels";
import { cn, formatNumber } from "@/lib/utils";
import type { AdopterRankingItem } from "@/lib/types";

function AdopterRow({ item }: { item: AdopterRankingItem }) {
  const [open, setOpen] = useState(false);
  const a = item.adopter;

  return (
    <li className="border-b border-slate-100 py-4 last:border-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <Link
            href={`/adoptantes/${a.id}`}
            className="font-medium text-slate-900 hover:text-teal-700"
          >
            {a.name}
          </Link>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Home className="h-3.5 w-3.5" aria-hidden />
              {HOUSING[a.housingType]}
              {a.hasYard && " · con patio"}
            </span>
            <span>{formatNumber(a.availableHoursPerDay, 1)} h/día</span>
            <span>Experiencia {EXPERIENCE[a.experience].toLowerCase()}</span>
            {a.hasChildren && <Badge tone="slate">Niños</Badge>}
            {a.hasOtherAnimals && <Badge tone="slate">Otros animales</Badge>}
          </p>
        </div>
        <ScoreBar score={item.score} level={item.level} className="w-full sm:w-72" />
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline"
      >
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        {open ? "Ocultar el detalle" : "Ver por qué"}
      </button>

      {open && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3">
          <BreakdownDetail breakdown={item.breakdown} />
        </div>
      )}
    </li>
  );
}

/**
 * CU13 en sentido inverso: para el animal abierto, qué adoptantes registrados
 * son los más compatibles. Solo considera adoptantes sin solicitud activa.
 */
export function AdopterRanking({ animalId }: { animalId: string }) {
  const [enabled, setEnabled] = useState(false);
  const { data, isFetching, error, refetch } = useAdopterRanking(animalId, enabled);

  if (!enabled) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
        <Users className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
        <p className="mt-3 text-sm text-slate-600">
          Calcula qué adoptantes registrados son los más compatibles con este animal.
        </p>
        <Button className="mt-4" onClick={() => setEnabled(true)}>
          Buscar adoptantes compatibles
        </Button>
      </div>
    );
  }

  if (isFetching && !data) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (error) return <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <Disclaimer />

      {data.data.length === 0 ? (
        <EmptyState
          title="No hay adoptantes compatibles"
          description="No hay adoptantes registrados sin una solicitud activa, o ninguno pasa los filtros obligatorios de este animal."
        />
      ) : (
        <ul className="rounded-xl border border-slate-200 bg-white px-5">
          {data.data.map((item) => (
            <AdopterRow key={item.adopter.id} item={item} />
          ))}
        </ul>
      )}

      {data.skipped.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">
            {data.skipped.length} adoptante(s) quedaron fuera por datos incompletos:
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
            {data.skipped.map((s) => (
              <li key={s.adopter.id}>
                <Link href={`/adoptantes/${s.adopter.id}`} className="underline">
                  {s.adopter.name}
                </Link>{" "}
                — falta: {s.missing.join(", ")}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">
          Evaluados {data.data.length} adoptantes · versión del modelo {data.modelVersion}
        </p>
        <Button variant="outline" size="sm" loading={isFetching} onClick={() => void refetch()}>
          Recalcular
        </Button>
      </div>
    </div>
  );
}
