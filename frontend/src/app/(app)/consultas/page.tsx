"use client";

import { BookingPanel } from "@/components/bookings/booking-panel";
import { PageHeader } from "@/components/layout/page-header";

/** Registrar consulta: el personal reserva día y hora para un cliente y su animal registrados. */
export default function ConsultasPage() {
  return (
    <>
      <PageHeader
        title="Registrar consulta"
        description="Reserva el día y la hora de una consulta para un cliente y un animal registrados."
      />
      <BookingPanel staff />
    </>
  );
}
