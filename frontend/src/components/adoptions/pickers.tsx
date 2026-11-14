"use client";

import { useState } from "react";
import { Check, Search } from "lucide-react";
import { AnimalPhoto } from "@/components/animals/animal-photo";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdoptable } from "@/hooks/use-animals";
import { useAdopters } from "@/hooks/use-adoptions";
import { useDebounce } from "@/hooks/use-debounce";
import { animalName, HOUSING, SIZE, SPECIES } from "@/lib/labels";
import type { Adopter, AnimalListItem } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Buscador de adoptantes por CI o nombre. */
export function AdopterPicker({
  value,
  onChange,
}: {
  value: Adopter | null;
  onChange: (a: Adopter) => void;
}) {
  const [q, setQ] = useState("");
  const debounced = useDebounce(q);
  const { data, isLoading } = useAdopters({ q: debounced, pageSize: 6 });
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <Input
          aria-label="Buscar adoptante por CI o nombre"
          placeholder="Buscar adoptante por CI o nombre"
          className="pl-9"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <ul
        className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200"
        role="listbox"
        aria-label="Adoptantes"
      >
        {isLoading && (
          <li className="p-3">
            <Skeleton className="h-8 w-full" />
          </li>
        )}
        {data?.data.map((a) => {
          const selected = value?.id === a.id;
          return (
            <li key={a.id} role="option" aria-selected={selected}>
              <button
                type="button"
                onClick={() => onChange(a)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50",
                  selected && "bg-teal-50",
                )}
              >
                <span>
                  <span className="block font-medium text-slate-900">
                    {a.person.firstName} {a.person.lastName}
                  </span>
                  <span className="block text-xs text-slate-500">
                    CI {a.person.ci} · {HOUSING[a.housingType]} · {a.availableHoursPerDay} h/día
                  </span>
                </span>
                {selected && <Check className="h-4 w-4 text-teal-600" aria-hidden />}
              </button>
            </li>
          );
        })}
        {data && !data.data.length && (
          <li className="p-3 text-sm text-slate-500">Sin resultados.</li>
        )}
      </ul>
    </div>
  );
}

/** Selector de animales disponibles para adopción (RN-04). */
export function AdoptableAnimalPicker({
  value,
  onChange,
}: {
  value: AnimalListItem | null;
  onChange: (a: AnimalListItem) => void;
}) {
  const { data, isLoading } = useAdoptable({ pageSize: 100 });
  return (
    <ul
      className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200"
      role="listbox"
      aria-label="Animales disponibles"
    >
      {isLoading && (
        <li className="p-3">
          <Skeleton className="h-8 w-full" />
        </li>
      )}
      {data?.data.map((a) => {
        const selected = value?.id === a.id;
        return (
          <li key={a.id} role="option" aria-selected={selected}>
            <button
              type="button"
              onClick={() => onChange(a)}
              className={cn(
                "flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50",
                selected && "bg-teal-50",
              )}
            >
              <AnimalPhoto
                url={a.photoUrl}
                species={a.species}
                alt=""
                className="h-9 w-9 rounded-md"
              />
              <span className="flex-1">
                <span className="block font-medium text-slate-900">{animalName(a)}</span>
                <span className="block text-xs text-slate-500">
                  {a.code} · {SPECIES[a.species]} · {SIZE[a.size]}
                </span>
              </span>
              {selected && <Check className="h-4 w-4 text-teal-600" aria-hidden />}
            </button>
          </li>
        );
      })}
      {data && !data.data.length && (
        <li className="p-3 text-sm text-slate-500">No hay animales disponibles para adopción.</li>
      )}
    </ul>
  );
}
