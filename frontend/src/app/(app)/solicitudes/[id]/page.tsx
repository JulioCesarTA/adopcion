"use client";

import { use, useState } from "react";
import Link from "next/link";
import { CheckCheck, FileText, PlayCircle, Plus, XCircle } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ErrorState, InfoGrid, InfoItem, PageSkeleton, YesNo } from "@/components/info";
import { AnimalPhoto } from "@/components/animals/animal-photo";
import {
  DecisionDialog,
  FollowupDialog,
  StatusChangeDialog,
} from "@/components/adoptions/request-dialogs";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { useAdoption } from "@/hooks/use-adoptions";
import { errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { animalName, EXPERIENCE, formatAge, HOUSING, SIZE, SPECIES } from "@/lib/labels";
import { formatDate, formatDateTime } from "@/lib/utils";

type DialogKind = null | "evaluate" | "cancel" | "decide" | "followup";

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { hasRole } = useAuth();
  const isGestion = hasRole("GESTION", "ADMIN");
  const { data: r, isLoading, error, refetch } = useAdoption(id);
  const [dialog, setDialog] = useState<DialogKind>(null);

  if (isLoading) return <PageSkeleton />;
  if (error || !r)
    return <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />;

  const person = r.adopterProfile.person;
  const active = r.status === "PENDIENTE" || r.status === "EN_EVALUACION";

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Solicitud: {animalName(r.animal)} → {person.firstName} {person.lastName}
            </h1>
            <StatusBadge kind="request" value={r.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Creada el {formatDateTime(r.requestDate)} por {r.responsibleUser.fullName}
            {r.decisionDate && ` · decisión ${formatDate(r.decisionDate)}`}
            {r.deliveryDate && ` · entrega ${formatDateTime(r.deliveryDate)}`}
          </p>
        </div>
        {isGestion && (
          <div className="flex flex-wrap gap-2">
            {r.status === "PENDIENTE" && (
              <Button onClick={() => setDialog("evaluate")}>
                <PlayCircle className="h-4 w-4" aria-hidden /> Pasar a evaluación
              </Button>
            )}
            {r.status === "EN_EVALUACION" && (
              <Button onClick={() => setDialog("decide")}>
                <CheckCheck className="h-4 w-4" aria-hidden /> Registrar resultado
              </Button>
            )}
            {active && (
              <>
                <Button
                  variant="ghost"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => setDialog("cancel")}
                >
                  <XCircle className="h-4 w-4" aria-hidden /> Cancelar
                </Button>
              </>
            )}
            {r.status === "APROBADA" && (
              <Link
                href={`/solicitudes/${r.id}/acta`}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-teal-600 px-4 text-sm font-medium text-white hover:bg-teal-700"
              >
                <FileText className="h-4 w-4" aria-hidden /> Generar acta
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Adoptante"
            actions={
              <Link
                href={`/adoptantes/${r.adopterProfileId}`}
                className="text-sm font-medium text-teal-700 hover:underline"
              >
                Ver perfil
              </Link>
            }
          />
          <CardBody>
            <InfoGrid className="lg:grid-cols-2">
              <InfoItem label="Nombre">
                {person.firstName} {person.lastName}
              </InfoItem>
              <InfoItem label="CI">{person.ci}</InfoItem>
              <InfoItem label="Teléfono">{person.phone}</InfoItem>
              <InfoItem label="Vivienda">{HOUSING[r.adopterProfile.housingType]}</InfoItem>
              <InfoItem label="Horas disponibles">
                {r.adopterProfile.availableHoursPerDay} h/día
              </InfoItem>
              <InfoItem label="Experiencia">{EXPERIENCE[r.adopterProfile.experience]}</InfoItem>
              <InfoItem label="Niños">
                <YesNo value={r.adopterProfile.hasChildren} />
              </InfoItem>
              <InfoItem label="Otros animales">
                <YesNo value={r.adopterProfile.hasOtherAnimals} />
              </InfoItem>
            </InfoGrid>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Animal"
            actions={
              <Link
                href={`/animales/${r.animalId}`}
                className="text-sm font-medium text-teal-700 hover:underline"
              >
                Ver ficha
              </Link>
            }
          />
          <CardBody className="flex gap-4">
            <AnimalPhoto
              url={r.animal.photoUrl}
              species={r.animal.species}
              alt={animalName(r.animal)}
              className="h-24 w-24 shrink-0 rounded-lg"
            />
            <InfoGrid className="flex-1 lg:grid-cols-2">
              <InfoItem label="Código">{r.animal.code}</InfoItem>
              <InfoItem label="Estado">
                <StatusBadge kind="animal" value={r.animal.status} />
              </InfoItem>
              <InfoItem label="Especie / tamaño">
                {SPECIES[r.animal.species]} · {SIZE[r.animal.size]}
              </InfoItem>
              <InfoItem label="Edad">{formatAge(r.animal.ageMonths)}</InfoItem>
              <InfoItem label="Energía">{r.animal.energyLevel}/5</InfoItem>
              <InfoItem label="Horas de atención">{r.animal.requiredDailyHours} h/día</InfoItem>
            </InfoGrid>
          </CardBody>
        </Card>
      </div>

      {r.status === "APROBADA" && (
        <Card className="mt-6">
          <CardHeader
            title="Seguimiento posterior a la adopción"
            actions={
              isGestion && (
                <Button variant="outline" size="sm" onClick={() => setDialog("followup")}>
                  <Plus className="h-4 w-4" aria-hidden /> Nuevo seguimiento
                </Button>
              )
            }
          />
          {r.followups.length === 0 ? (
            <EmptyState title="Sin seguimientos registrados" />
          ) : (
            <ol className="divide-y divide-slate-100">
              {r.followups.map((f) => (
                <li key={f.id} className="px-5 py-3 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="font-medium text-slate-900">{f.animalCondition}</span>
                    <span className="text-xs text-slate-500">
                      {formatDateTime(f.followupDate)} · {f.createdBy.fullName}
                    </span>
                  </div>
                  {f.observations && <p className="mt-1 text-slate-600">{f.observations}</p>}
                </li>
              ))}
            </ol>
          )}
        </Card>
      )}

      {dialog === "evaluate" && (
        <StatusChangeDialog
          requestId={r.id}
          target="EN_EVALUACION"
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "cancel" && (
        <StatusChangeDialog requestId={r.id} target="CANCELADA" onClose={() => setDialog(null)} />
      )}
      {dialog === "decide" && <DecisionDialog requestId={r.id} onClose={() => setDialog(null)} />}
      {dialog === "followup" && <FollowupDialog requestId={r.id} onClose={() => setDialog(null)} />}
    </>
  );
}
