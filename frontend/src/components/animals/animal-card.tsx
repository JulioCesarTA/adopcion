import Link from "next/link";
import { Baby, Home, PawPrint, Zap } from "lucide-react";
import { animalName, formatAge, SEX, SIZE, SPECIES } from "@/lib/labels";
import type { AnimalListItem } from "@/lib/types";
import { Card } from "../ui/card";
import { StatusBadge } from "../status-badge";
import { AnimalPhoto } from "./animal-photo";

function MaybeLink({
  href,
  className,
  children,
}: {
  href: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  return href ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <span className={className}>{children}</span>
  );
}

/** Tarjeta con foto para el catálogo de adoptables (CU24). */
export function AnimalCard({
  animal,
  actions,
  href,
}: {
  animal: Omit<AnimalListItem, "status"> & { status?: AnimalListItem["status"] };
  actions?: React.ReactNode;
  /** Destino del enlace; por defecto la ficha interna. null = sin enlace. */
  href?: string | null;
}) {
  const name = animalName(animal);
  const target = href === undefined ? `/animales/${animal.id}` : href;
  return (
    <Card className="flex flex-col overflow-hidden">
      <MaybeLink href={target} className="block">
        <AnimalPhoto
          url={animal.photoUrl}
          species={animal.species}
          alt={name}
          className="aspect-[4/3] w-full"
        />
      </MaybeLink>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <MaybeLink href={target} className="font-semibold text-slate-900 hover:text-teal-700">
              {name}
            </MaybeLink>
            <span className="text-xs text-slate-400">{animal.code}</span>
          </div>
          <p className="text-sm text-slate-500">
            {SPECIES[animal.species]} · {SEX[animal.sex]} · {SIZE[animal.size]} ·{" "}
            {formatAge(animal.ageMonths)}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">
            <Zap className="h-3 w-3" aria-hidden /> Energía {animal.energyLevel}/5
          </span>
          {animal.goodWithChildren && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">
              <Baby className="h-3 w-3" aria-hidden /> Con niños
            </span>
          )}
          {animal.goodWithAnimals && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">
              <PawPrint className="h-3 w-3" aria-hidden /> Con animales
            </span>
          )}
          {animal.needsYard && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">
              <Home className="h-3 w-3" aria-hidden /> Necesita patio
            </span>
          )}
        </div>
        {animal.temperament && (
          <p className="line-clamp-2 text-sm text-slate-600">{animal.temperament}</p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2">
          {animal.status && <StatusBadge kind="animal" value={animal.status} />}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </Card>
  );
}
