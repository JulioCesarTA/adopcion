"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input, Select, Textarea } from "@/components/ui/input";
import {
  type BookingStatus,
  useBookingMutations,
  useBookingOptions,
  useBookings,
} from "@/hooks/use-bookings";
import { errorMessage } from "@/lib/api";
import { cn, dateTimeInputToIso, formatDateTime, nowInput } from "@/lib/utils";

const STATUS: Record<BookingStatus, { label: string; className: string }> = {
  PENDIENTE: { label: "Pendiente", className: "bg-amber-50 text-amber-800 border-amber-200" },
  CONFIRMADA: { label: "Confirmada", className: "bg-blue-50 text-blue-800 border-blue-200" },
  ATENDIDA: { label: "Atendida", className: "bg-green-50 text-green-800 border-green-200" },
  CANCELADA: { label: "Cancelada", className: "bg-slate-100 text-slate-600 border-slate-200" },
};

const label = (a: { code: string; name: string | null }) =>
  a.name ? `${a.name} · ${a.code}` : a.code;

/**
 * Reserva de consultas. El personal elige el cliente; el cliente reserva para sí mismo.
 * El cliente y el animal tienen que estar registrados en el sistema.
 */
export function BookingPanel({ staff }: { staff: boolean }) {
  const options = useBookingOptions();
  const bookings = useBookings();
  const { create, setStatus } = useBookingMutations();
  const [clientId, setClientId] = useState("");
  const [animalId, setAnimalId] = useState("");
  const [scheduledAt, setScheduledAt] = useState(nowInput());
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((staff && !clientId) || !animalId || !scheduledAt || !reason.trim()) {
      toast.error("Completa cliente, animal, día y hora, y motivo");
      return;
    }
    try {
      await create.mutateAsync({
        animalId,
        clientId: staff ? clientId : undefined,
        scheduledAt: dateTimeInputToIso(scheduledAt),
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      });
      toast.success("Consulta reservada");
      setReason("");
      setNotes("");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const change = async (id: string, status: BookingStatus) => {
    try {
      await setStatus.mutateAsync({ id, status });
      toast.success(`Reserva ${STATUS[status].label.toLowerCase()}`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const animals = options.data?.animals ?? [];
  const clients = options.data?.clients ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Nueva reserva" />
        <CardBody>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
            {staff && (
              <FormField
                label="Cliente"
                required
                hint={clients.length ? undefined : "No hay clientes registrados todavía"}
              >
                <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                  <option value="">Selecciona…</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} · {c.email}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}
            <FormField label="Animal" required>
              <Select value={animalId} onChange={(e) => setAnimalId(e.target.value)}>
                <option value="">Selecciona…</option>
                {animals.map((a) => (
                  <option key={a.id} value={a.id}>
                    {label(a)}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Día y hora" required>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </FormField>
            <FormField label="Motivo" required>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={255} />
            </FormField>
            <FormField label="Notas" className="sm:col-span-2">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </FormField>
            <div className="flex justify-end sm:col-span-2">
              <Button type="submit" loading={create.isPending}>
                Reservar consulta
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={staff ? "Reservas" : "Mis reservas"} />
        <CardBody>
          {bookings.error ? (
            <p className="text-sm text-red-600">{errorMessage(bookings.error)}</p>
          ) : !bookings.data?.length ? (
            <p className="text-sm text-slate-500">
              {bookings.isLoading ? "Cargando…" : "No hay reservas."}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {bookings.data.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">
                      {formatDateTime(b.scheduledAt)} · {label(b.animal)}
                    </p>
                    <p className="text-sm text-slate-600">
                      {staff && `${b.client.fullName} · `}
                      {b.reason}
                      {b.notes && ` · ${b.notes}`}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs font-medium",
                      STATUS[b.status].className,
                    )}
                  >
                    {STATUS[b.status].label}
                  </span>
                  {staff && b.status === "PENDIENTE" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void change(b.id, "CONFIRMADA")}
                    >
                      Confirmar
                    </Button>
                  )}
                  {staff && (b.status === "PENDIENTE" || b.status === "CONFIRMADA") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void change(b.id, "ATENDIDA")}
                    >
                      Atendida
                    </Button>
                  )}
                  {(b.status === "PENDIENTE" || b.status === "CONFIRMADA") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      onClick={() => void change(b.id, "CANCELADA")}
                    >
                      Cancelar
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
