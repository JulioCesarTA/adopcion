"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { RoleGate } from "@/components/role-gate";
import { StatusBadge } from "@/components/status-badge";
import { AnimalPhoto } from "@/components/animals/animal-photo";
import { Input, Select } from "@/components/ui/input";
import { useAnimals } from "@/hooks/use-animals";
import { useDebounce } from "@/hooks/use-debounce";
import { errorMessage } from "@/lib/api";
import { ANIMAL_STATUS, SEX, SPECIES, animalName, formatAge, options } from "@/lib/labels";
import type { AnimalListItem } from "@/lib/types";
import { formatDate } from "@/lib/utils";

function AnimalsList() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const species = params.get("species") ?? "";
  const status = params.get("status") ?? "";
  const sex = params.get("sex") ?? "";
  const page = Number(params.get("page") ?? 1);
  const debouncedQ = useDebounce(q);

  /** Los filtros viven en la URL (compartibles y compatibles con el buscador global). */
  const setParams = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!("page" in patch)) next.delete("page");
    router.replace(`${pathname}?${next.toString()}`);
  };

  // Sincroniza el término del buscador global (topbar) con el campo local
  const urlQ = params.get("q") ?? "";
  useEffect(() => setQ(urlQ), [urlQ]);
  useEffect(() => {
    if (debouncedQ !== urlQ) setParams({ q: debouncedQ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  const { data, isLoading, error } = useAnimals({
    q: urlQ,
    species,
    status,
    sex,
    page,
    pageSize: 15,
  });

  const columns: Column<AnimalListItem>[] = [
    {
      key: "animal",
      header: "Animal",
      sortValue: (a) => a.name ?? a.code,
      cell: (a) => (
        <Link href={`/animales/${a.id}`} className="flex items-center gap-3 hover:text-teal-700">
          <AnimalPhoto
            url={a.photoUrl}
            species={a.species}
            alt=""
            className="h-10 w-10 shrink-0 rounded-lg"
          />
          <span>
            <span className="block font-medium text-slate-900">{animalName(a)}</span>
            <span className="block text-xs text-slate-500">{a.code}</span>
          </span>
        </Link>
      ),
    },
    {
      key: "species",
      header: "Especie",
      sortValue: (a) => a.species,
      cell: (a) => SPECIES[a.species],
    },
    { key: "sex", header: "Sexo", cell: (a) => SEX[a.sex], className: "hidden md:table-cell" },
    {
      key: "age",
      header: "Edad",
      sortValue: (a) => a.ageMonths ?? -1,
      cell: (a) => formatAge(a.ageMonths),
      className: "hidden lg:table-cell",
    },
    {
      key: "status",
      header: "Estado",
      sortValue: (a) => a.status,
      cell: (a) => <StatusBadge kind="animal" value={a.status} />,
    },
    {
      key: "entry",
      header: "Ingreso",
      sortValue: (a) => a.entryDate,
      cell: (a) => formatDate(a.entryDate),
      className: "hidden sm:table-cell",
    },
  ];

  return (
    <>
      <PageHeader
        title="Animales"
        description="Registro de animales de la institución y su historial clínico."
        actions={
          <RoleGate roles={["GESTION"]}>
            <Link
              href="/animales/nuevo"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-teal-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-teal-700"
            >
              <Plus className="h-4 w-4" aria-hidden /> Registrar animal
            </Link>
          </RoleGate>
        }
      />
      <DataTable
        columns={columns}
        data={data?.data}
        rowKey={(a) => a.id}
        loading={isLoading}
        error={error ? errorMessage(error) : null}
        emptyTitle="No se encontraron animales"
        emptyDescription="Prueba con otros filtros o registra un animal nuevo."
        meta={data?.meta}
        onPageChange={(p) => setParams({ page: String(p) })}
        toolbar={
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto]">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <Input
                aria-label="Buscar por código o nombre"
                placeholder="Buscar por código o nombre"
                className="pl-9"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Select
              aria-label="Especie"
              value={species}
              onChange={(e) => setParams({ species: e.target.value })}
            >
              <option value="">Todas las especies</option>
              {options(SPECIES).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Estado"
              value={status}
              onChange={(e) => setParams({ status: e.target.value })}
            >
              <option value="">Todos los estados</option>
              {options(ANIMAL_STATUS).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Sexo"
              value={sex}
              onChange={(e) => setParams({ sex: e.target.value })}
            >
              <option value="">Todos los sexos</option>
              {options(SEX).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        }
      />
    </>
  );
}

export default function AnimalsPage() {
  return (
    <Suspense fallback={null}>
      <AnimalsList />
    </Suspense>
  );
}
