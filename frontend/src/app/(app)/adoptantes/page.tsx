"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { useAdopters } from "@/hooks/use-adoptions";
import { useDebounce } from "@/hooks/use-debounce";
import { errorMessage } from "@/lib/api";
import { EXPERIENCE, HOUSING } from "@/lib/labels";
import type { Adopter } from "@/lib/types";
import { formatDate } from "@/lib/utils";

/** CU10: listado de potenciales adoptantes. */
export default function AdoptersPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounce(q);
  const { data, isLoading, error } = useAdopters({ q: debounced, page, pageSize: 15 });

  const columns: Column<Adopter>[] = [
    {
      key: "name",
      header: "Adoptante",
      sortValue: (a) => `${a.person.lastName} ${a.person.firstName}`,
      cell: (a) => (
        <Link href={`/adoptantes/${a.id}`} className="hover:text-teal-700">
          <span className="block font-medium text-slate-900">
            {a.person.firstName} {a.person.lastName}
          </span>
          <span className="block text-xs text-slate-500">CI {a.person.ci}</span>
        </Link>
      ),
    },
    {
      key: "phone",
      header: "Teléfono",
      cell: (a) => a.person.phone,
      className: "hidden sm:table-cell",
    },
    {
      key: "housing",
      header: "Vivienda",
      sortValue: (a) => a.housingType,
      cell: (a) => HOUSING[a.housingType],
    },
    {
      key: "hours",
      header: "Horas/día",
      sortValue: (a) => a.availableHoursPerDay,
      cell: (a) => `${a.availableHoursPerDay} h`,
      className: "hidden md:table-cell",
    },
    {
      key: "exp",
      header: "Experiencia",
      cell: (a) => EXPERIENCE[a.experience],
      className: "hidden md:table-cell",
    },
    {
      key: "requests",
      header: "Solicitudes",
      sortValue: (a) => a._count?.adoptionRequests ?? 0,
      cell: (a) => a._count?.adoptionRequests ?? 0,
    },
    {
      key: "created",
      header: "Registro",
      sortValue: (a) => a.createdAt,
      cell: (a) => formatDate(a.createdAt),
      className: "hidden lg:table-cell",
    },
  ];

  return (
    <>
      <PageHeader
        title="Adoptantes"
        description="Personas interesadas en adoptar y su perfil de evaluación."
        actions={
          <Link
            href="/adoptantes/nuevo"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-teal-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" aria-hidden /> Nuevo adoptante
          </Link>
        }
      />
      <DataTable
        columns={columns}
        data={data?.data}
        rowKey={(a) => a.id}
        loading={isLoading}
        error={error ? errorMessage(error) : null}
        emptyTitle="No se encontraron adoptantes"
        meta={data?.meta}
        onPageChange={setPage}
        toolbar={
          <div className="relative max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <Input
              aria-label="Buscar por CI, nombres o apellidos"
              placeholder="Buscar por CI, nombres o apellidos"
              className="pl-9"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
        }
      />
    </>
  );
}
