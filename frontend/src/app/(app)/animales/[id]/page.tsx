"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Heart,
  HeartOff,
  Pencil,
  RotateCcw,
  ShieldAlert,
  Stethoscope,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { ErrorState, InfoGrid, InfoItem, PageSkeleton, YesNo } from "@/components/info";
import { StatusBadge } from "@/components/status-badge";
import { AnimalPhoto } from "@/components/animals/animal-photo";
import { ReadmitDialog } from "@/components/animals/animal-dialogs";
import { PeriodsPanel } from "@/components/clinical/periods-panel";
import { StartPeriodDialog } from "@/components/clinical/period-dialogs";
import { Timeline } from "@/components/clinical/timeline";
import { VaccinationsPanel } from "@/components/clinical/vaccinations-panel";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { TabPanel, Tabs } from "@/components/ui/tabs";
import { useAnimal, useAnimalMutations } from "@/hooks/use-animals";
import { errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { animalName, formatAge, SEX, SIZE, SPECIES } from "@/lib/labels";
import type { AnimalDetail } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/utils";

const NO_RECORDS = ["ADOPTADO", "FALLECIDO", "DEVUELTO"];
const CAN_START_PERIOD = ["INGRESADO", "EN_TRATAMIENTO", "DISPONIBLE_ADOPCION"];

const linkBtn =
  "inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors";

export default function AnimalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: animal, isLoading, error, refetch } = useAnimal(id);
  const [tab, setTab] = useState("resumen");

  if (isLoading) return <PageSkeleton />;
  if (error || !animal)
    return <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />;

  const tabs = [
    { id: "resumen", label: "Resumen" },
    { id: "historial", label: "Historial clínico", count: animal._count.consultations },
    { id: "vacunas", label: "Vacunas", count: animal._count.vaccinations },
    { id: "cuarentena", label: "Cuarentena" },
    { id: "adopcion", label: "Adopción", count: animal.adoptionRequests.length },
  ];

  return (
    <>
      <Header animal={animal} />
      <Tabs tabs={tabs} value={tab} onChange={setTab} idPrefix="animal" />
      <TabPanel id="resumen" active={tab === "resumen"} idPrefix="animal">
        <Summary animal={animal} />
      </TabPanel>
      <TabPanel id="historial" active={tab === "historial"} idPrefix="animal">
        <Timeline animalId={animal.id} />
      </TabPanel>
      <TabPanel id="vacunas" active={tab === "vacunas"} idPrefix="animal">
        <VaccinationsPanel
          animalId={animal.id}
          species={animal.species}
          canRecord={!NO_RECORDS.includes(animal.status)}
        />
      </TabPanel>
      <TabPanel id="cuarentena" active={tab === "cuarentena"} idPrefix="animal">
        <PeriodsPanel animalId={animal.id} />
      </TabPanel>
      <TabPanel id="adopcion" active={tab === "adopcion"} idPrefix="animal">
        <AdoptionTab animal={animal} />
      </TabPanel>
    </>
  );
}

function Header({ animal }: { animal: AnimalDetail }) {
  const { hasRole } = useAuth();
  const { enableAdoption, disableAdoption } = useAnimalMutations(animal.id);
  const [dialog, setDialog] = useState<null | "enable" | "disable" | "readmit" | "period">(null);
  const name = animalName(animal);
  const s = animal.status;
  const isVet = hasRole("VETERINARIO");
  const isGestion = hasRole("ADMIN");

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
      setDialog(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-start">
      <AnimalPhoto
        url={animal.photoUrl}
        species={animal.species}
        alt={name}
        className="h-32 w-32 shrink-0 rounded-xl"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{name}</h1>
          <StatusBadge kind="animal" value={s} />
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {animal.code} · {SPECIES[animal.species]} · {SEX[animal.sex]} · {SIZE[animal.size]} ·{" "}
          {formatAge(animal.ageMonths)}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 no-print">
          {(isVet || hasRole("ADMIN")) && !NO_RECORDS.includes(s) && (
            <Link
              href={`/animales/${animal.id}/consultas/nueva`}
              className={`${linkBtn} bg-teal-600 text-white hover:bg-teal-700`}
            >
              <Stethoscope className="h-4 w-4" aria-hidden /> Nueva consulta
            </Link>
          )}
          {(isVet || isGestion) && CAN_START_PERIOD.includes(s) && !animal.activePeriod && (
            <Button variant="outline" onClick={() => setDialog("period")}>
              <ShieldAlert className="h-4 w-4" aria-hidden /> Iniciar cuarentena
            </Button>
          )}
          {(isVet || hasRole("ADMIN")) && s === "INGRESADO" && (
            <Button variant="outline" onClick={() => setDialog("enable")}>
              <Heart className="h-4 w-4" aria-hidden /> Habilitar para adopción
            </Button>
          )}
          {(isVet || hasRole("ADMIN")) && s === "DISPONIBLE_ADOPCION" && (
            <Button variant="outline" onClick={() => setDialog("disable")}>
              <HeartOff className="h-4 w-4" aria-hidden /> Retirar de adopción
            </Button>
          )}
          {isGestion && (
            <Link
              href={`/animales/${animal.id}/editar`}
              className={`${linkBtn} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
            >
              <Pencil className="h-4 w-4" aria-hidden /> Editar
            </Link>
          )}
          {isGestion && s === "ADOPTADO" && (
            <Button variant="outline" onClick={() => setDialog("readmit")}>
              <RotateCcw className="h-4 w-4" aria-hidden /> Reingreso
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={dialog === "enable"}
        title="Habilitar para adopción"
        message={
          animal.adoptionBlockers?.length ? (
            <div>
              <p>El animal todavía no cumple los requisitos (RN-03):</p>
              <ul className="mt-2 list-disc pl-5 text-red-700">
                {animal.adoptionBlockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          ) : (
            "El animal aparecerá en el catálogo de adoptables y en las recomendaciones."
          )
        }
        confirmLabel="Habilitar"
        loading={enableAdoption.isPending}
        onConfirm={() =>
          void run(() => enableAdoption.mutateAsync(), "Animal habilitado para adopción")
        }
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === "disable"}
        title="Retirar de adopción"
        message="El animal volverá al estado «Ingresado» y dejará de aparecer en el catálogo."
        confirmLabel="Retirar"
        tone="danger"
        loading={disableAdoption.isPending}
        onConfirm={() =>
          void run(() => disableAdoption.mutateAsync(), "Animal retirado de adopción")
        }
        onCancel={() => setDialog(null)}
      />
      {dialog === "readmit" && (
        <ReadmitDialog animalId={animal.id} onClose={() => setDialog(null)} />
      )}
      {dialog === "period" && (
        <StartPeriodDialog animalId={animal.id} onClose={() => setDialog(null)} />
      )}
    </div>
  );
}

function Summary({ animal }: { animal: AnimalDetail }) {
  const blockers = animal.adoptionBlockers;
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader title="Datos del animal" />
        <CardBody>
          <InfoGrid>
            <InfoItem label="Código">{animal.code}</InfoItem>
            <InfoItem label="Raza">{animal.breed ?? "—"}</InfoItem>
            <InfoItem label="Color">{animal.color ?? "—"}</InfoItem>
            <InfoItem label="Fecha de ingreso">{formatDate(animal.entryDate)}</InfoItem>
            <InfoItem label="Motivo de ingreso">{animal.entryReason}</InfoItem>
            <InfoItem label="Registrado por">{animal.createdBy.fullName}</InfoItem>
            <InfoItem label="Nivel de energía">{animal.energyLevel} / 5</InfoItem>
            <InfoItem label="Horas diarias de atención">{animal.requiredDailyHours} h</InfoItem>
            <InfoItem label="Se lleva bien con niños">
              <YesNo value={animal.goodWithChildren} />
            </InfoItem>
            <InfoItem label="Se lleva bien con otros animales">
              <YesNo value={animal.goodWithAnimals} />
            </InfoItem>
            <InfoItem label="Necesita patio">
              <YesNo value={animal.needsYard} />
            </InfoItem>
            <InfoItem label="Cuidados especiales">
              {animal.specialCare ? animal.specialCareNotes || "Sí" : "No"}
            </InfoItem>
            <InfoItem label="Temperamento" className="sm:col-span-2 lg:col-span-3">
              {animal.temperament ?? "—"}
            </InfoItem>
            {animal.physicalDescription && (
              <InfoItem label="Descripción física / notas" className="sm:col-span-2 lg:col-span-3">
                {animal.physicalDescription}
              </InfoItem>
            )}
            {animal.exitDate && (
              <>
                <InfoItem label="Fecha de salida">{formatDateTime(animal.exitDate)}</InfoItem>
                <InfoItem label="Motivo de salida">{animal.exitReason}</InfoItem>
                <InfoItem label="Notas de salida">{animal.exitNotes ?? "—"}</InfoItem>
              </>
            )}
          </InfoGrid>
        </CardBody>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader title="Situación sanitaria" />
          <CardBody className="space-y-3 text-sm">
            {animal.activePeriod ? (
              <p className="flex items-start gap-2 text-red-700">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {animal.activePeriod.type === "CUARENTENA" ? "Cuarentena" : "Observación"} activa
                desde {formatDate(animal.activePeriod.startDate)}
              </p>
            ) : (
              <p className="text-slate-600">Sin periodos de observación o cuarentena activos.</p>
            )}
            <p className="text-slate-600">
              Tratamientos activos:{" "}
              <span className="font-medium text-slate-900">{animal.activeTreatments}</span>
            </p>
            <p className="text-slate-600">
              Consultas registradas:{" "}
              <span className="font-medium text-slate-900">{animal._count.consultations}</span>
            </p>
          </CardBody>
        </Card>

        {blockers && (
          <Card>
            <CardHeader title="Requisitos para adopción (RN-03)" />
            <CardBody>
              {blockers.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle2 className="h-4 w-4" aria-hidden /> Cumple todos los requisitos.
                </p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {blockers.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-amber-800">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {b}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}

function AdoptionTab({ animal }: { animal: AnimalDetail }) {
  const { hasRole } = useAuth();
  const canSee = hasRole("ADMIN");
  return (
    <div className="space-y-4">
      <Card>
        {animal.adoptionRequests.length === 0 ? (
          <EmptyState title="Sin solicitudes de adopción" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {animal.adoptionRequests.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {r.adopterProfile.person.firstName} {r.adopterProfile.person.lastName}
                  </p>
                  <p className="text-sm text-slate-500">
                    Solicitud del {formatDate(r.requestDate)}
                    {r.decisionDate && ` · decisión ${formatDate(r.decisionDate)}`}
                    {r.deliveryDate && ` · entregado ${formatDate(r.deliveryDate)}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge kind="request" value={r.status} />
                  {canSee && (
                    <Link
                      href={`/solicitudes/${r.id}`}
                      className="text-sm font-medium text-teal-700 hover:underline"
                    >
                      Ver solicitud
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {animal.adoptionRequests
        .filter((r) => r.status === "APROBADA")
        .map((r) => (
          <Card key={`f-${r.id}`}>
            <CardHeader
              title="Seguimiento posterior a la adopción"
              description={`Adoptante: ${r.adopterProfile.person.firstName} ${r.adopterProfile.person.lastName}`}
            />
            {r.followups.length === 0 ? (
              <EmptyState
                title="Sin seguimientos registrados"
                description="Se registran desde la solicitud aprobada."
              />
            ) : (
              <ul className="divide-y divide-slate-100">
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
              </ul>
            )}
          </Card>
        ))}
    </div>
  );
}
