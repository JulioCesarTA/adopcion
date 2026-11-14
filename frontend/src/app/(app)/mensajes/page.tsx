"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, Mail, MailOpen, Search } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/info";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import { api, errorMessage } from "@/lib/api";
import type { Paginated } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";

type ContactStatus = "NUEVO" | "LEIDO" | "RESPONDIDO";
interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  privacyAcceptedAt: string;
  status: ContactStatus;
  emailSent: boolean;
  emailError: string | null;
  createdAt: string;
}

const STATUS: Record<ContactStatus, { label: string; tone: BadgeTone }> = {
  NUEVO: { label: "Nuevo", tone: "amber" },
  LEIDO: { label: "Leído", tone: "slate" },
  RESPONDIDO: { label: "Respondido", tone: "green" },
};

/** Buzón del formulario «Contáctame» del sitio público. */
export default function MessagesPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ContactStatus | "">("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const debounced = useDebounce(q);

  const { data, isLoading, error } = useQuery({
    queryKey: ["contact-messages", debounced, status, page],
    queryFn: () =>
      api<Paginated<ContactMessage> & { unread: number }>("/contact-messages", {
        query: { q: debounced, status, page, pageSize: 20 },
      }),
    placeholderData: keepPreviousData,
  });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContactStatus }) =>
      api<ContactMessage>(`/contact-messages/${id}`, { method: "PATCH", body: { status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contact-messages"] }),
    onError: (err) => toast.error(errorMessage(err)),
  });

  const toggle = (m: ContactMessage) => {
    setOpen(open === m.id ? null : m.id);
    if (m.status === "NUEVO") update.mutate({ id: m.id, status: "LEIDO" });
  };
  const totalPages = data ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1;

  return (
    <>
      <PageHeader
        title="Mensajes del sitio web"
        description={
          data ? `${data.unread} sin leer · formulario «Contáctame»` : "Formulario «Contáctame»"
        }
      />
      <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <Input
            aria-label="Buscar"
            placeholder="Nombre, correo o asunto"
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
            setStatus(e.target.value as ContactStatus | "");
            setPage(1);
          }}
        >
          <option value="">Todos</option>
          <option value="NUEVO">Nuevos</option>
          <option value="LEIDO">Leídos</option>
          <option value="RESPONDIDO">Respondidos</option>
        </Select>
      </Card>

      <Card>
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={errorMessage(error)} />
        ) : !data?.data.length ? (
          <EmptyState icon={Mail} title="Sin mensajes" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.data.map((m) => {
              const expanded = open === m.id;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => toggle(m)}
                    aria-expanded={expanded}
                    className="flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-slate-50"
                  >
                    {m.status === "NUEVO" ? (
                      <Mail className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                    ) : (
                      <MailOpen className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                    )}
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-sm text-slate-900",
                          m.status === "NUEVO" && "font-semibold",
                        )}
                      >
                        {m.subject}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {m.name} · {m.email}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <Badge tone={STATUS[m.status].tone}>{STATUS[m.status].label}</Badge>
                      <span className="text-xs text-slate-400">{formatDateTime(m.createdAt)}</span>
                    </span>
                  </button>
                  {expanded && (
                    <div className="space-y-3 bg-slate-50 px-5 py-4 text-sm">
                      <p className="whitespace-pre-line text-slate-800">{m.message}</p>
                      <dl className="grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
                        <div>Teléfono: {m.phone ?? "—"}</div>
                        <div>
                          Aceptó tratamiento de datos: {formatDateTime(m.privacyAcceptedAt)}
                        </div>
                        <div>
                          Correo a la institución:{" "}
                          {m.emailSent
                            ? "enviado"
                            : `no enviado${m.emailError ? ` (${m.emailError})` : ""}`}
                        </div>
                      </dl>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-teal-600 px-3 text-sm font-medium text-white hover:bg-teal-700"
                        >
                          <Mail className="h-4 w-4" aria-hidden /> Responder por correo
                        </a>
                        {m.status !== "RESPONDIDO" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => update.mutate({ id: m.id, status: "RESPONDIDO" })}
                          >
                            <CheckCheck className="h-4 w-4" aria-hidden /> Marcar como respondido
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {data && totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-3 text-sm">
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
        )}
      </Card>
    </>
  );
}
