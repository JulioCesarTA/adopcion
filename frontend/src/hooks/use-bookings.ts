import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Species } from "@/lib/types";

export type BookingStatus = "PENDIENTE" | "CONFIRMADA" | "ATENDIDA" | "CANCELADA";

export interface Booking {
  id: string;
  scheduledAt: string;
  reason: string;
  notes: string | null;
  status: BookingStatus;
  animal: { id: string; code: string; name: string | null; species: Species };
  client: { id: string; fullName: string; email: string; phone: string | null };
  createdBy: { id: string; fullName: string };
}

export interface BookingOptions {
  animals: { id: string; code: string; name: string | null; species: Species }[];
  clients: { id: string; fullName: string; email: string }[];
}

export interface BookingInput {
  animalId: string;
  clientId?: string;
  scheduledAt: string;
  reason: string;
  notes?: string;
}

export function useBookings() {
  return useQuery({ queryKey: ["bookings"], queryFn: () => api<Booking[]>("/bookings") });
}

export function useBookingOptions() {
  return useQuery({
    queryKey: ["booking-options"],
    queryFn: () => api<BookingOptions>("/bookings/options"),
  });
}

export function useBookingMutations() {
  const qc = useQueryClient();
  const done = () => void qc.invalidateQueries({ queryKey: ["bookings"] });
  return {
    create: useMutation({
      mutationFn: (input: BookingInput) =>
        api<Booking>("/bookings", { method: "POST", body: input }),
      onSuccess: done,
    }),
    setStatus: useMutation({
      mutationFn: ({ id, status }: { id: string; status: BookingStatus }) =>
        api<Booking>(`/bookings/${id}/status`, { method: "PATCH", body: { status } }),
      onSuccess: done,
    }),
  };
}
