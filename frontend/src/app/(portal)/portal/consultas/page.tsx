"use client";

import { BookingPanel } from "@/components/bookings/booking-panel";

/** Registrar consulta desde el portal: el cliente reserva día y hora para un animal registrado. */
export default function PortalConsultasPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Registrar consulta</h1>
        <p className="mt-1 text-sm text-slate-500">
          Reserva el día y la hora de una consulta para tu animal.
        </p>
      </div>
      <BookingPanel staff={false} />
    </div>
  );
}
