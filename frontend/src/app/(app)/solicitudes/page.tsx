"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Input, Select } from "@/components/ui/input";
import { useAdoptions } from "@/hooks/use-adoptions";
import { useDebounce } from "@/hooks/use-debounce";
import { errorMessage } from "@/lib/api";
import { animalName, REQUEST_STATUS, options } from "@/lib/labels";
import type { AdoptionRequest } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function RequestsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounce(q);
  const { data, isLoading, error } = useAdoptions({ q: debounced, status, page, pageSize: 15 });

  const columns: Column<AdoptionRequest>[] = [
    {
      key: "animal",
      header: "Animal",
      sortValue: (r) => r.animal.code,
      cell: (r) => (
        <Link href={`/solicitudes/${r.id}`} className="hover:text-teal-700">
          <span className="block font-medium text-slate-900">{animalName(r.animal)}</span>
          <span className="block text-xs text-slate-500">{r.animal.code}</span>
        </Link>
      ),
    },
    {
      key: "adopter",
      header: "Adoptante",
      sortValue: (r) => r.adopterProfile.person.lastName,
      cell: (r) => (
        <span>
          <span className="block text-slate-900">
            {r.adopterProfile.person.firstName} {r.adopterProfile.person.lastName}
          </span>
          <span className="block text-xs text-slate-500">CI {r.adopterProfile.person.ci}</span>
        </span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      sortValue: (r) => r.status,
      cell: (r) => <StatusBadge kind="request" value={r.status} />,
    },
    {
      key: "date",
      header: "Solicitud",
      sortValue: (r) => r.requestDate,
      cell: (r) => formatDate(r.requestDate),
    },
    {
      key: "decision",
      header: "Decisión",
      sortValue: (r) => r.decisionDate ?? "",
      cell: (r) => formatDate(r.decisionDate),
      className: "hidden md:table-cell",
    },
    {
      key: "resp",
      header: "Responsable",
      cell: (r) => r.responsibleUser.fullName,
      className: "hidden lg:table-cell",
    },
  ];

  return (
    <>
      <PageHeader
        title="Solicitudes de adopción"
      />
      <DataTable
        columns={columns}
        data={data?.data}
        rowKey={(r) => r.id}
        loading={isLoading}
        error={error ? errorMessage(error) : null}
        emptyTitle="No hay solicitudes"
        meta={data?.meta}
        onPageChange={setPage}
        toolbar={
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <Input
                aria-label="Buscar"
                placeholder="Animal (código o nombre) o adoptante (nombre o CI)"
                className="pl-9"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Select
              aria-label="Estado"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos los estados</option>
              {options(REQUEST_STATUS).map((o) => (
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
