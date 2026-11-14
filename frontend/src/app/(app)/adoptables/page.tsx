"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { AnimalCard } from "@/components/animals/animal-card";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/info";
import { PageHeader } from "@/components/layout/page-header";
import { RecommendationDialog } from "@/components/adoptions/recommendation-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdoptable } from "@/hooks/use-animals";
import { errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { SIZE, SPECIES, options } from "@/lib/labels";
import type { AnimalListItem } from "@/lib/types";

const AGE_RANGES = {
  "": { label: "Todas las edades" },
  cachorro: { label: "Cachorro (< 1 año)", min: 0, max: 11 },
  joven: { label: "Joven (1–3 años)", min: 12, max: 47 },
  adulto: { label: "Adulto (4–7 años)", min: 48, max: 95 },
  senior: { label: "Senior (8+ años)", min: 96, max: undefined },
} as const;

/** CU24: catálogo de animales adoptables en tarjetas con foto. */
export default function AdoptablePage() {
  const { hasRole } = useAuth();
  const isGestion = hasRole("GESTION");
  const [species, setSpecies] = useState("");
  const [size, setSize] = useState("");
  const [age, setAge] = useState<keyof typeof AGE_RANGES>("");
  const [maxEnergy, setMaxEnergy] = useState("");
  const [page, setPage] = useState(1);
  const [recoFor, setRecoFor] = useState<AnimalListItem | null>(null);
  const range = AGE_RANGES[age] as { min?: number; max?: number };

  const { data, isLoading, error, refetch } = useAdoptable({
    species,
    size,
    minAge: range.min,
    maxAge: range.max,
    maxEnergy,
    page,
    pageSize: 12,
  });
  const set = (fn: () => void) => {
    fn();
    setPage(1);
  };
  const totalPages = data ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1;

  return (
    <>
      <PageHeader
        title="Animales adoptables"
        description="Animales habilitados por el veterinario para adopción."
      />
      <Card className="mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          aria-label="Especie"
          value={species}
          onChange={(e) => set(() => setSpecies(e.target.value))}
        >
          <option value="">Todas las especies</option>
          {options(SPECIES).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Tamaño"
          value={size}
          onChange={(e) => set(() => setSize(e.target.value))}
        >
          <option value="">Todos los tamaños</option>
          {options(SIZE).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Edad"
          value={age}
          onChange={(e) => set(() => setAge(e.target.value as keyof typeof AGE_RANGES))}
        >
          {Object.entries(AGE_RANGES).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Energía máxima"
          value={maxEnergy}
          onChange={(e) => set(() => setMaxEnergy(e.target.value))}
        >
          <option value="">Cualquier energía</option>
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>
              Energía hasta {n}/5
            </option>
          ))}
        </Select>
      </Card>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
      ) : !data?.data.length ? (
        <Card>
          <EmptyState icon={Heart} title="No hay animales disponibles con estos filtros" />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.data.map((a) => (
              <AnimalCard
                key={a.id}
                animal={a}
                actions={
                  isGestion && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setRecoFor(a)}>
                        Ver recomendación
                      </Button>
                      <Link
                        href={`/solicitudes/nueva?animalId=${a.id}`}
                        className="inline-flex h-8 items-center rounded-lg bg-teal-600 px-3 text-sm font-medium text-white hover:bg-teal-700"
                      >
                        Solicitar adopción
                      </Link>
                    </>
                  )
                }
              />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3 text-sm">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </Button>
              <span>
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
      {recoFor && <RecommendationDialog animal={recoFor} onClose={() => setRecoFor(null)} />}
    </>
  );
}
