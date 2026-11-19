"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Pause, Pencil, Pill, Plus } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ErrorState, InfoGrid, InfoItem, PageSkeleton } from "@/components/info";
import { StatusBadge } from "@/components/status-badge";
import { MedicationFields } from "@/components/clinical/medication-fields";
import {
  consultationSchema,
  diagnosisSchema,
  medicationSchema,
  treatmentSchema,
} from "@/components/clinical/clinical-schemas";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input, Textarea } from "@/components/ui/input";
import { useClinicalMutations, useConsultation } from "@/hooks/use-clinical";
import { errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { animalName } from "@/lib/labels";
import type { Consultation, Treatment, TreatmentStatus } from "@/lib/types";
import {
  dateTimeInputToIso,
  formatDateTime,
  formatDay,
  isoToDateTimeInput,
  todayInput,
} from "@/lib/utils";

const NO_RECORDS = ["ADOPTADO", "FALLECIDO", "DEVUELTO"];

export default function ConsultationPage({
  params,
}: {
  params: Promise<{ id: string; consultaId: string }>;
}) {
  const { id: animalId, consultaId } = use(params);
  const { user, hasRole } = useAuth();
  const { data: c, isLoading, error, refetch } = useConsultation(consultaId);
  const [dialog, setDialog] = useState<null | "edit" | "diagnosis" | "treatment">(null);
  const [medFor, setMedFor] = useState<Treatment | null>(null);
  const [statusChange, setStatusChange] = useState<{
    t: Treatment;
    status: TreatmentStatus;
  } | null>(null);
  const { updateTreatment } = useClinicalMutations(animalId);

  if (isLoading) return <PageSkeleton />;
  if (error || !c)
    return <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />;

  const isVet = hasRole("VETERINARIO", "ADMIN");
  // RN-02: corrige el veterinario autor o un ADMIN
  const canEdit = hasRole("ADMIN") || (isVet && user?.id === c.veterinarianId);
  const canAdd = isVet && !!c.animal && !NO_RECORDS.includes(c.animal.status);

  const changeStatus = async () => {
    if (!statusChange) return;
    try {
      await updateTreatment.mutateAsync({ id: statusChange.t.id, status: statusChange.status });
      toast.success(
        statusChange.status === "FINALIZADO" ? "Tratamiento finalizado" : "Tratamiento suspendido",
      );
      setStatusChange(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <Link
        href={`/animales/${animalId}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Volver a la ficha
      </Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Consulta: {c.reason}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {c.animal && `${animalName(c.animal)} · ${c.animal.code} · `}
            {formatDateTime(c.consultationDate)} · {c.veterinarian.fullName}
          </p>
        </div>
        {canEdit && (
          <Button variant="outline" onClick={() => setDialog("edit")}>
            <Pencil className="h-4 w-4" aria-hidden /> Corregir consulta
          </Button>
        )}
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader title="Datos de la consulta" />
          <CardBody>
            <InfoGrid>
              <InfoItem label="Peso">{c.weightKg !== null ? `${c.weightKg} kg` : "—"}</InfoItem>
              <InfoItem label="Temperatura">
                {c.temperatureC !== null ? `${c.temperatureC} °C` : "—"}
              </InfoItem>
              <InfoItem label="Última modificación">{formatDateTime(c.updatedAt)}</InfoItem>
              <InfoItem label="Evaluación clínica" className="sm:col-span-2 lg:col-span-3">
                <span className="whitespace-pre-line">{c.clinicalEvaluation}</span>
              </InfoItem>
              {c.observations && (
                <InfoItem label="Observaciones" className="sm:col-span-2 lg:col-span-3">
                  <span className="whitespace-pre-line">{c.observations}</span>
                </InfoItem>
              )}
            </InfoGrid>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Diagnósticos"
            actions={
              canAdd && (
                <Button variant="outline" size="sm" onClick={() => setDialog("diagnosis")}>
                  <Plus className="h-4 w-4" aria-hidden /> Agregar
                </Button>
              )
            }
          />
          <CardBody>
            {c.diagnoses?.length ? (
              <ul className="space-y-2">
                {c.diagnoses.map((d) => (
                  <li key={d.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                    <p className="font-medium text-slate-800">{d.description}</p>
                    {d.observations && <p className="mt-1 text-slate-600">{d.observations}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Sin diagnósticos registrados.</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Tratamientos"
            actions={
              canAdd && (
                <Button variant="outline" size="sm" onClick={() => setDialog("treatment")}>
                  <Plus className="h-4 w-4" aria-hidden /> Agregar
                </Button>
              )
            }
          />
          <CardBody className="space-y-4">
            {!c.treatments?.length && (
              <p className="text-sm text-slate-500">Sin tratamientos registrados.</p>
            )}
            {c.treatments?.map((t) => (
              <div key={t.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900">{t.description}</p>
                      <StatusBadge kind="treatment" value={t.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatDay(t.startDate)} →{" "}
                      {t.endDate ? formatDay(t.endDate) : "sin fecha de fin"}
                    </p>
                    <p className="mt-2 whitespace-pre-line text-sm text-slate-700">
                      {t.instructions}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canAdd && (
                      <Button variant="outline" size="sm" onClick={() => setMedFor(t)}>
                        <Pill className="h-4 w-4" aria-hidden /> Medicamento
                      </Button>
                    )}
                    {canEdit && t.status === "ACTIVO" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => setStatusChange({ t, status: "FINALIZADO" })}
                        >
                          <CheckCircle2 className="h-4 w-4" aria-hidden /> Finalizar
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setStatusChange({ t, status: "SUSPENDIDO" })}
                        >
                          <Pause className="h-4 w-4" aria-hidden /> Suspender
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {t.medications.length > 0 && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-xs uppercase text-slate-500">
                        <tr>
                          <th className="py-1 pr-4 font-medium">Medicamento</th>
                          <th className="py-1 pr-4 font-medium">Dosis</th>
                          <th className="py-1 pr-4 font-medium">Vía</th>
                          <th className="py-1 pr-4 font-medium">Frecuencia</th>
                          <th className="py-1 font-medium">Duración</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {t.medications.map((m) => (
                          <tr key={m.id}>
                            <td className="py-1.5 pr-4 text-slate-800">{m.name}</td>
                            <td className="py-1.5 pr-4">{m.dose}</td>
                            <td className="py-1.5 pr-4">{m.administrationRoute}</td>
                            <td className="py-1.5 pr-4">{m.frequency}</td>
                            <td className="py-1.5">{m.duration}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {dialog === "edit" && (
        <EditConsultationDialog c={c} animalId={animalId} onClose={() => setDialog(null)} />
      )}
      {dialog === "diagnosis" && (
        <DiagnosisDialog
          consultationId={c.id}
          animalId={animalId}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "treatment" && (
        <TreatmentDialog
          consultationId={c.id}
          animalId={animalId}
          onClose={() => setDialog(null)}
        />
      )}
      {medFor && (
        <MedicationDialog treatment={medFor} animalId={animalId} onClose={() => setMedFor(null)} />
      )}
      <ConfirmDialog
        open={!!statusChange}
        title={
          statusChange?.status === "FINALIZADO" ? "Finalizar tratamiento" : "Suspender tratamiento"
        }
        message="Si no quedan tratamientos activos, el animal vuelve a «Ingresado»."
        confirmLabel={statusChange?.status === "FINALIZADO" ? "Finalizar" : "Suspender"}
        loading={updateTreatment.isPending}
        onConfirm={() => void changeStatus()}
        onCancel={() => setStatusChange(null)}
      />
    </>
  );
}

function DialogFooter({
  formId,
  onClose,
  loading,
  label,
}: {
  formId: string;
  onClose: () => void;
  loading: boolean;
  label: string;
}) {
  return (
    <>
      <Button variant="outline" onClick={onClose} disabled={loading}>
        Cancelar
      </Button>
      <Button type="submit" form={formId} loading={loading}>
        {label}
      </Button>
    </>
  );
}

function EditConsultationDialog({
  c,
  animalId,
  onClose,
}: {
  c: Consultation;
  animalId: string;
  onClose: () => void;
}) {
  const { updateConsultation } = useClinicalMutations(animalId);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof consultationSchema>, unknown, z.output<typeof consultationSchema>>({
    resolver: zodResolver(consultationSchema),
    defaultValues: {
      consultationDate: isoToDateTimeInput(c.consultationDate),
      reason: c.reason,
      weightKg: c.weightKg ?? "",
      temperatureC: c.temperatureC ?? "",
      clinicalEvaluation: c.clinicalEvaluation,
      observations: c.observations ?? "",
    },
  });
  const onSubmit = handleSubmit(async (v) => {
    try {
      await updateConsultation.mutateAsync({
        id: c.id,
        ...v,
        consultationDate: dateTimeInputToIso(v.consultationDate),
      });
      toast.success("Consulta corregida (el cambio queda en auditoría)");
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });
  return (
    <Dialog
      open
      onClose={onClose}
      title="Corregir consulta"
      description="Los registros clínicos no se borran: cada corrección queda en la auditoría con su valor anterior."
      size="lg"
      footer={
        <DialogFooter
          formId="edit-cons"
          onClose={onClose}
          loading={isSubmitting}
          label="Guardar corrección"
        />
      }
    >
      <form id="edit-cons" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <FormField label="Fecha y hora" required error={errors.consultationDate?.message}>
          <Input type="datetime-local" {...register("consultationDate")} />
        </FormField>
        <FormField label="Motivo" required error={errors.reason?.message}>
          <Input {...register("reason")} />
        </FormField>
        <FormField label="Peso (kg)" error={errors.weightKg?.message}>
          <Input type="number" step="0.01" {...register("weightKg")} />
        </FormField>
        <FormField label="Temperatura (°C)" error={errors.temperatureC?.message}>
          <Input type="number" step="0.1" {...register("temperatureC")} />
        </FormField>
        <FormField
          label="Evaluación clínica"
          required
          error={errors.clinicalEvaluation?.message}
          className="sm:col-span-2"
        >
          <Textarea rows={4} {...register("clinicalEvaluation")} />
        </FormField>
        <FormField
          label="Observaciones"
          error={errors.observations?.message}
          className="sm:col-span-2"
        >
          <Textarea {...register("observations")} />
        </FormField>
      </form>
    </Dialog>
  );
}

function DiagnosisDialog({
  consultationId,
  animalId,
  onClose,
}: {
  consultationId: string;
  animalId: string;
  onClose: () => void;
}) {
  const { addDiagnosis } = useClinicalMutations(animalId);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof diagnosisSchema>, unknown, z.output<typeof diagnosisSchema>>({
    resolver: zodResolver(diagnosisSchema),
    defaultValues: { description: "" },
  });
  const onSubmit = handleSubmit(async (v) => {
    try {
      await addDiagnosis.mutateAsync({ consultationId, ...v });
      toast.success("Diagnóstico agregado");
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });
  return (
    <Dialog
      open
      onClose={onClose}
      title="Agregar diagnóstico"
      footer={<DialogFooter formId="dx" onClose={onClose} loading={isSubmitting} label="Agregar" />}
    >
      <form id="dx" onSubmit={onSubmit} noValidate className="space-y-4">
        <FormField label="Descripción" required error={errors.description?.message}>
          <Textarea {...register("description")} />
        </FormField>
        <FormField label="Observaciones" error={errors.observations?.message}>
          <Textarea {...register("observations")} />
        </FormField>
      </form>
    </Dialog>
  );
}

function TreatmentDialog({
  consultationId,
  animalId,
  onClose,
}: {
  consultationId: string;
  animalId: string;
  onClose: () => void;
}) {
  const { addTreatment } = useClinicalMutations(animalId);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof treatmentSchema>, unknown, z.output<typeof treatmentSchema>>({
    resolver: zodResolver(treatmentSchema),
    defaultValues: {
      description: "",
      instructions: "",
      startDate: todayInput(),
      endDate: "",
      medications: [],
    },
  });
  const onSubmit = handleSubmit(async (v) => {
    try {
      await addTreatment.mutateAsync({ consultationId, ...v });
      toast.success("Tratamiento agregado");
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });
  return (
    <Dialog
      open
      onClose={onClose}
      title="Agregar tratamiento"
      size="lg"
      footer={<DialogFooter formId="tx" onClose={onClose} loading={isSubmitting} label="Agregar" />}
    >
      <form id="tx" onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Descripción"
            required
            error={errors.description?.message}
            className="sm:col-span-2"
          >
            <Input {...register("description")} />
          </FormField>
          <FormField label="Fecha de inicio" required error={errors.startDate?.message}>
            <Input type="date" {...register("startDate")} />
          </FormField>
          <FormField label="Fecha de fin" error={errors.endDate?.message}>
            <Input type="date" {...register("endDate")} />
          </FormField>
          <FormField
            label="Instrucciones"
            required
            error={errors.instructions?.message}
            className="sm:col-span-2"
          >
            <Textarea {...register("instructions")} />
          </FormField>
        </div>
        <MedicationFields
          control={control}
          register={register}
          prefix="medications"
          errors={errors.medications as never}
        />
      </form>
    </Dialog>
  );
}

function MedicationDialog({
  treatment,
  animalId,
  onClose,
}: {
  treatment: Treatment;
  animalId: string;
  onClose: () => void;
}) {
  const { addMedication } = useClinicalMutations(animalId);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof medicationSchema>, unknown, z.output<typeof medicationSchema>>({
    resolver: zodResolver(medicationSchema),
    defaultValues: { name: "", dose: "", administrationRoute: "", frequency: "", duration: "" },
  });
  const onSubmit = handleSubmit(async (v) => {
    try {
      await addMedication.mutateAsync({
        treatmentId: treatment.id,
        consultationId: treatment.consultationId,
        ...v,
      });
      toast.success("Medicamento agregado");
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });
  return (
    <Dialog
      open
      onClose={onClose}
      title="Agregar medicamento"
      description={treatment.description}
      footer={
        <DialogFooter formId="med" onClose={onClose} loading={isSubmitting} label="Agregar" />
      }
    >
      <form id="med" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nombre" required error={errors.name?.message}>
          <Input {...register("name")} />
        </FormField>
        <FormField label="Dosis" required error={errors.dose?.message}>
          <Input {...register("dose")} />
        </FormField>
        <FormField
          label="Vía de administración"
          required
          error={errors.administrationRoute?.message}
        >
          <Input {...register("administrationRoute")} />
        </FormField>
        <FormField label="Frecuencia" required error={errors.frequency?.message}>
          <Input {...register("frequency")} />
        </FormField>
        <FormField label="Duración" required error={errors.duration?.message}>
          <Input {...register("duration")} />
        </FormField>
        <FormField label="Observaciones" error={errors.observations?.message}>
          <Input {...register("observations")} />
        </FormField>
      </form>
    </Dialog>
  );
}
