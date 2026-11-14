"use client";

import { Fragment, useState } from "react";
import { ChevronDown } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/info";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAudit, useAuditFacets } from "@/hooks/use-admin";
import { useUsers } from "@/hooks/use-users";
import { errorMessage } from "@/lib/api";
import { cn, formatDateTime } from "@/lib/utils";

function Json({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <p className="text-xs text-slate-400">—</p>;
  return (
    <pre className="max-h-72 overflow-auto rounded-lg bg-slate-900 p-3 text-xs leading-relaxed text-slate-100">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

/** CU19: auditoría de solo lectura con filtros y detalle expandible. */
export default function AuditPage() {
  const [userId, setUserId] = useState("");
  const [action, setAction] = useState("");
  const [entityName, setEntityName] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const invalid = !!from && !!to && from > to;

  const { data, isLoading, error } = useAudit({
    userId,
    action,
    entityName,
    from: invalid ? undefined : from,
    to: invalid ? undefined : to,
    page,
    pageSize: 25,
  });
  const facets = useAuditFacets();
  const users = useUsers({ page: 1, pageSize: 100 });
  const set = (fn: () => void) => {
    fn();
    setPage(1);
  };
  const totalPages = data ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1;

  return (
    <>
      <PageHeader
        title="Auditoría de operaciones"
        description="Registro de solo lectura: no se puede editar ni borrar."
      />
      <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <Select
          aria-label="Usuario"
          value={userId}
          onChange={(e) => set(() => setUserId(e.target.value))}
        >
          <option value="">Todos los usuarios</option>
          {users.data?.data.map((u) => (
            <option key={u.id} value={u.id}>
              {u.fullName}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Acción"
          value={action}
          onChange={(e) => set(() => setAction(e.target.value))}
        >
          <option value="">Todas las acciones</option>
          {facets.data?.actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Entidad"
          value={entityName}
          onChange={(e) => set(() => setEntityName(e.target.value))}
        >
          <option value="">Todas las entidades</option>
          {facets.data?.entities.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </Select>
        <Input
          type="date"
          aria-label="Desde"
          value={from}
          onChange={(e) => set(() => setFrom(e.target.value))}
        />
        <Input
          type="date"
          aria-label="Hasta"
          value={to}
          onChange={(e) => set(() => setTo(e.target.value))}
        />
        {invalid && (
          <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-5" role="alert">
            Rango de fechas inválido.
          </p>
        )}
      </Card>

      <Card>
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={errorMessage(error)} />
        ) : !data?.data.length ? (
          <EmptyState title="Sin registros para estos filtros" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-8 px-3 py-3" />
                  <th className="px-3 py-3 font-medium">Fecha y hora</th>
                  <th className="px-3 py-3 font-medium">Usuario</th>
                  <th className="px-3 py-3 font-medium">Acción</th>
                  <th className="px-3 py-3 font-medium">Entidad</th>
                  <th className="hidden px-3 py-3 font-medium md:table-cell">ID</th>
                  <th className="hidden px-3 py-3 font-medium lg:table-cell">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.data.map((log) => {
                  const expanded = open === log.id;
                  return (
                    <Fragment key={log.id}>
                      <tr className="hover:bg-slate-50/60">
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => setOpen(expanded ? null : log.id)}
                            aria-expanded={expanded}
                            aria-label={expanded ? "Ocultar detalle" : "Ver detalle"}
                            className="rounded p-1 text-slate-500 hover:bg-slate-100"
                          >
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 transition-transform",
                                expanded && "rotate-180",
                              )}
                            />
                          </button>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          {formatDateTime(log.createdAt)}
                        </td>
                        <td className="px-3 py-2">{log.user?.fullName ?? "—"}</td>
                        <td className="px-3 py-2 font-mono text-xs">{log.action}</td>
                        <td className="px-3 py-2">{log.entityName ?? "—"}</td>
                        <td className="hidden max-w-40 truncate px-3 py-2 font-mono text-xs text-slate-500 md:table-cell">
                          {log.entityId ?? "—"}
                        </td>
                        <td className="hidden px-3 py-2 text-xs text-slate-500 lg:table-cell">
                          {log.ip ?? "—"}
                        </td>
                      </tr>
                      {expanded && (
                        <tr>
                          <td colSpan={7} className="bg-slate-50 px-4 py-4">
                            <div className="grid gap-4 lg:grid-cols-2">
                              <div>
                                <p className="mb-1 text-xs font-medium uppercase text-slate-500">
                                  Valor anterior
                                </p>
                                <Json value={log.oldValue} />
                              </div>
                              <div>
                                <p className="mb-1 text-xs font-medium uppercase text-slate-500">
                                  Valor nuevo
                                </p>
                                <Json value={log.newValue} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {data && data.meta.total > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
            <span>{data.meta.total} registros</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </Button>
              <span>
                {page} / {totalPages}
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
          </div>
        )}
      </Card>
    </>
  );
}
