"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { AnimalPhoto } from "@/components/animals/animal-photo";
import { EmptyState } from "@/components/empty-state";
import { BreakdownDetail, ScoreBar } from "@/components/score-bar";
import { animalName, formatAge, SIZE, SPECIES } from "@/lib/labels";
import type { RankingItem } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Ranking de animales por puntaje con desglose desplegable (CU13 modo 1). */
export function RankingList({ items, adopterId }: { items: RankingItem[]; adopterId: string }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!items.length) {
    return <EmptyState title="No hay animales disponibles para adopción" />;
  }
  return (
    <ol className="divide-y divide-slate-100">
      {items.map((item, i) => {
        const a = item.animal;
        const expanded = open === a.id;
        return (
          <li key={a.id} className="px-5 py-4">
            <div className="flex flex-wrap items-center gap-4">
              <span className="w-6 text-sm font-semibold text-slate-400">{i + 1}</span>
              <AnimalPhoto
                url={a.photoUrl}
                species={a.species}
                alt=""
                className="h-12 w-12 rounded-lg"
              />
              <div className="min-w-40 flex-1">
                <Link
                  href={`/animales/${a.id}`}
                  className="font-medium text-slate-900 hover:text-teal-700"
                >
                  {animalName(a)}
                </Link>
                <p className="text-xs text-slate-500">
                  {a.code} · {SPECIES[a.species]} · {SIZE[a.size]} · {formatAge(a.ageMonths)} ·
                  energía {a.energyLevel}/5
                </p>
              </div>
              <ScoreBar score={item.score} level={item.level} className="w-full sm:w-72" />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : a.id)}
                  aria-expanded={expanded}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
                >
                  Desglose{" "}
                  <ChevronDown
                    className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
                    aria-hidden
                  />
                </button>
                {item.level !== "INCOMPATIBLE" && (
                  <Link
                    href={`/solicitudes/nueva?adopterId=${adopterId}&animalId=${a.id}`}
                    className="rounded-md bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700"
                  >
                    Solicitar
                  </Link>
                )}
              </div>
            </div>
            {expanded && (
              <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/60 p-4 sm:ml-10">
                <BreakdownDetail breakdown={item.breakdown} />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
