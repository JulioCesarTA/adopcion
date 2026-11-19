"use client";

import { useQuery } from "@tanstack/react-query";
import { PawPrint } from "lucide-react";
import { AnimalPhoto } from "@/components/animals/animal-photo";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/info";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, errorMessage } from "@/lib/api";
import { animalName, formatAge, SPECIES } from "@/lib/labels";
import type { AnimalStatus, Species } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/utils";

interface MyAnimal {
  id: string;
  code: string;
  name: string | null;
  species: Species;
  breed: string | null;
  ageMonths: number | null;
  status: AnimalStatus;
  photoUrl: string | null;
  consultations: {
    id: string;
    consultationDate: string;
    reason: string;
    clinicalEvaluation: string;
    observations: string | null;
    weightKg: string | number | null;
    temperatureC: string | number | null;
    veterinarian: { fullName: string };
    diagnoses: { id: string; description: string }[];
    treatments: {
      id: string;
      description: string;
      instructions: string;
      status: string;
      medications: { id: string; name: string; dose: string; frequency: string }[];
    }[];
  }[];
  vaccinations: {
    id: string;
    applicationDate: string;
    nextDoseDate: string | null;
    vaccine: { name: string };
  }[];
  periods: {
    id: string;
    type: string;
    status: string;
    startDate: string;
    endDate: string | null;
  }[];
  bookings: { id: string; scheduledAt: string; reason: string; status: string }[];
}

const BOOKING: Record<string, string> = {
  PENDIENTE: "Pendiente",
  CONFIRMADA: "Confirmada",
  ATENDIDA: "Atendida",
  CANCELADA: "Cancelada",
};

/** El cliente ve sus animales y todo su historial: consultas, vacunas, cuarentenas y reservas. */
export default function MyAnimalsPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["my-animals"],
    queryFn: () => api<MyAnimal[]>("/bookings/my-animals"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Mis animales</h1>
        <p className="mt-1 text-sm text-slate-500">
          El historial clínico completo de tus animales.
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
      ) : !data?.length ? (
        <Card>
          <EmptyState
            icon={PawPrint}
            title="Todavía no tienes animales registrados"
            description="Pide al personal que registre tu animal a tu nombre."
          />
        </Card>
      ) : (
        data.map((a) => (
          <Card key={a.id}>
            <CardBody className="flex flex-wrap items-center gap-4">
              <AnimalPhoto
                url={a.photoUrl}
                species={a.species}
                alt={animalName(a)}
                className="h-20 w-20 shrink-0 rounded-xl"
              />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">{animalName(a)}</h2>
                  <StatusBadge kind="animal" value={a.status} />
                </div>
                <p className="text-sm text-slate-500">
                  {a.code} · {SPECIES[a.species]}
                  {a.breed && ` · ${a.breed}`} · {formatAge(a.ageMonths)}
                </p>
              </div>
            </CardBody>

            <CardHeader title={`Consultas (${a.consultations.length})`} />
            <CardBody className="space-y-3">
              {a.consultations.length === 0 && (
                <p className="text-sm text-slate-500">Sin consultas.</p>
              )}
              {a.consultations.map((c) => (
                <div key={c.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <p className="font-medium text-slate-900">
                    {formatDateTime(c.consultationDate)} · {c.reason || "Consulta"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {c.veterinarian.fullName}
                    {c.weightKg != null && ` · ${c.weightKg} kg`}
                    {c.temperatureC != null && ` · ${c.temperatureC} °C`}
                  </p>
                  {c.clinicalEvaluation && (
                    <p className="mt-2 text-slate-700">{c.clinicalEvaluation}</p>
                  )}
                  {c.observations && <p className="mt-1 text-slate-600">{c.observations}</p>}
                  {c.diagnoses.length > 0 && (
                    <p className="mt-2">
                      <span className="font-medium">Diagnósticos:</span>{" "}
                      {c.diagnoses.map((d) => d.description).join("; ")}
                    </p>
                  )}
                  {c.treatments.map((t) => (
                    <div key={t.id} className="mt-2">
                      <p>
                        <span className="font-medium">Tratamiento:</span> {t.description} (
                        {t.status.toLowerCase()})
                      </p>
                      <p className="text-slate-600">{t.instructions}</p>
                      {t.medications.length > 0 && (
                        <p className="text-slate-600">
                          Medicamentos:{" "}
                          {t.medications
                            .map((m) => `${m.name} ${m.dose}, ${m.frequency}`)
                            .join("; ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </CardBody>

            <CardHeader title={`Vacunas (${a.vaccinations.length})`} />
            <CardBody>
              {a.vaccinations.length === 0 ? (
                <p className="text-sm text-slate-500">Sin vacunas.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {a.vaccinations.map((v) => (
                    <li key={v.id}>
                      {formatDate(v.applicationDate)} · {v.vaccine.name}
                      {v.nextDoseDate && ` · próxima dosis ${formatDate(v.nextDoseDate)}`}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>

            {a.periods.length > 0 && (
              <>
                <CardHeader title="Observación y cuarentena" />
                <CardBody>
                  <ul className="space-y-1 text-sm">
                    {a.periods.map((p) => (
                      <li key={p.id}>
                        {p.type === "CUARENTENA" ? "Cuarentena" : "Observación"} desde{" "}
                        {formatDate(p.startDate)}
                        {p.endDate ? ` hasta ${formatDate(p.endDate)}` : " (activa)"}
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </>
            )}

            <CardHeader title={`Reservas de consulta (${a.bookings.length})`} />
            <CardBody>
              {a.bookings.length === 0 ? (
                <p className="text-sm text-slate-500">Sin reservas.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {a.bookings.map((b) => (
                    <li key={b.id}>
                      {formatDateTime(b.scheduledAt)} · {b.reason} · {BOOKING[b.status] ?? b.status}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        ))
      )}
    </div>
  );
}
