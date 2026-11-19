"use client";

import { use } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { ErrorState, InfoGrid, InfoItem, PageSkeleton, YesNo } from "@/components/info";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { useAdopter } from "@/hooks/use-adoptions";
import { errorMessage } from "@/lib/api";
import { animalName, EXPERIENCE, HOUSING, SIZE, SPECIES } from "@/lib/labels";
import { formatDate } from "@/lib/utils";

export default function AdopterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: a, isLoading, error, refetch } = useAdopter(id);

  if (isLoading) return <PageSkeleton />;
  if (error || !a)
    return <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />;

  const p = a.person;
  return (
    <>
      <PageHeader
        title={`${p.firstName} ${p.lastName}`}
        description={`CI ${p.ci} · registrado el ${formatDate(a.createdAt)}`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Perfil de evaluación" />
          <CardBody>
            <InfoGrid>
              <InfoItem label="Vivienda">{HOUSING[a.housingType]}</InfoItem>
              <InfoItem label="Tiene patio">
                <YesNo value={a.hasYard} />
              </InfoItem>
              <InfoItem label="Horas diarias disponibles">{a.availableHoursPerDay} h</InfoItem>
              <InfoItem label="Niños en el hogar">
                <YesNo value={a.hasChildren} />
              </InfoItem>
              <InfoItem label="Otros animales">
                <YesNo value={a.hasOtherAnimals} />
              </InfoItem>
              <InfoItem label="Experiencia">{EXPERIENCE[a.experience]}</InfoItem>
              <InfoItem label="Especie preferida">
                {a.preferredSpecies ? SPECIES[a.preferredSpecies] : "Sin preferencia"}
              </InfoItem>
              <InfoItem label="Tamaño preferido">
                {a.preferredSize ? SIZE[a.preferredSize] : "Sin preferencia"}
              </InfoItem>
              {a.observations && (
                <InfoItem label="Observaciones" className="sm:col-span-2 lg:col-span-3">
                  {a.observations}
                </InfoItem>
              )}
            </InfoGrid>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Contacto" />
          <CardBody>
            <dl className="space-y-3">
              <InfoItem label="Teléfono">{p.phone}</InfoItem>
              <InfoItem label="Correo">{p.email ?? "—"}</InfoItem>
              <InfoItem label="Dirección">{p.address ?? "—"}</InfoItem>
            </dl>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Solicitudes de adopción" />
        {!a.adoptionRequests?.length ? (
          <EmptyState title="Sin solicitudes" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {a.adoptionRequests.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
              >
                <div>
                  <Link
                    href={`/animales/${r.animal.id}`}
                    className="font-medium text-slate-900 hover:text-teal-700"
                  >
                    {animalName(r.animal)}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {r.animal.code} · solicitud del {formatDate(r.requestDate)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge kind="request" value={r.status} />
                  <Link
                    href={`/solicitudes/${r.id}`}
                    className="text-sm font-medium text-teal-700 hover:underline"
                  >
                    Ver
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
