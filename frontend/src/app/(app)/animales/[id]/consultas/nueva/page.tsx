"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { ErrorState, PageSkeleton } from "@/components/info";
import { PageHeader } from "@/components/layout/page-header";
import { MedicationFields } from "@/components/clinical/medication-fields";
import {
  consultationSchema,
  diagnosisSchema,
  treatmentSchema,
} from "@/components/clinical/clinical-schemas";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input, Textarea } from "@/components/ui/input";
import { useAnimal } from "@/hooks/use-animals";
import { useClinicalMutations } from "@/hooks/use-clinical";
import { errorMessage } from "@/lib/api";
import { animalName } from "@/lib/labels";
import { dateTimeInputToIso, nowInput, todayInput } from "@/lib/utils";

const schema = consultationSchema.extend({
  diagnoses: z.array(diagnosisSchema),
  treatments: z.array(treatmentSchema),
});
type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

/** CU06 + CU07: nueva consulta con diagnósticos y tratamientos (con medicamentos). */
export default function NewConsultationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: animal, isLoading, error } = useAnimal(id);
  const { createConsultation, addDiagnosis, addTreatment } = useClinicalMutations(id);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      consultationDate: nowInput(),
      reason: "",
      clinicalEvaluation: "",
      diagnoses: [],
      treatments: [],
    },
  });
  const diagnoses = useFieldArray({ control, name: "diagnoses" });
  const treatments = useFieldArray({ control, name: "treatments" });

  if (isLoading) return <PageSkeleton />;
  if (error || !animal) return <ErrorState message={errorMessage(error)} />;

  const onSubmit = handleSubmit(async (v) => {
    const { diagnoses: dx, treatments: tx, ...c } = v;
    let consultationId: string;
    try {
      const created = await createConsultation.mutateAsync({
        ...c,
        consultationDate: dateTimeInputToIso(c.consultationDate),
      });
      consultationId = created.id;
    } catch (err) {
      toast.error(errorMessage(err));
      return;
    }
    // La consulta ya existe; si algo de lo anidado falla se informa y se continúa en el detalle.
    try {
      for (const d of dx) await addDiagnosis.mutateAsync({ consultationId, ...d });
      for (const t of tx) await addTreatment.mutateAsync({ consultationId, ...t });
      toast.success("Consulta registrada");
    } catch (err) {
      toast.error(
        `La consulta se guardó, pero hubo un error en diagnósticos/tratamientos: ${errorMessage(err)}`,
      );
    }
    router.push(`/animales/${id}/consultas/${consultationId}`);
  });

  return (
    <>
      <PageHeader
        title="Nueva consulta veterinaria"
        description={`${animalName(animal)} · ${animal.code}`}
      />
      <form onSubmit={onSubmit} noValidate className="space-y-6">
        <Card>
          <CardHeader title="Consulta" />
          <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FormField label="Fecha y hora" required error={errors.consultationDate?.message}>
              <Input type="datetime-local" {...register("consultationDate")} />
            </FormField>
            <FormField
              label="Motivo"
              required
              error={errors.reason?.message}
              className="lg:col-span-3"
            >
              <Input {...register("reason")} />
            </FormField>
            <FormField label="Peso (kg)" error={errors.weightKg?.message}>
              <Input
                type="number"
                step="0.01"
                min={0}
                inputMode="decimal"
                {...register("weightKg")}
              />
            </FormField>
            <FormField
              label="Temperatura (°C)"
              error={errors.temperatureC?.message}
              hint="Entre 30 y 45 °C"
            >
              <Input type="number" step="0.1" inputMode="decimal" {...register("temperatureC")} />
            </FormField>
            <FormField
              label="Evaluación clínica"
              required
              error={errors.clinicalEvaluation?.message}
              className="sm:col-span-2 lg:col-span-4"
            >
              <Textarea rows={4} {...register("clinicalEvaluation")} />
            </FormField>
            <FormField
              label="Observaciones"
              error={errors.observations?.message}
              className="sm:col-span-2 lg:col-span-4"
            >
              <Textarea {...register("observations")} />
            </FormField>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Diagnósticos"
            actions={
              <Button
                variant="outline"
                size="sm"
                onClick={() => diagnoses.append({ description: "", observations: "" })}
              >
                <Plus className="h-4 w-4" aria-hidden /> Agregar diagnóstico
              </Button>
            }
          />
          <CardBody className="space-y-3">
            {diagnoses.fields.length === 0 && (
              <p className="text-sm text-slate-500">Sin diagnósticos.</p>
            )}
            {diagnoses.fields.map((f, i) => (
              <div
                key={f.id}
                className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_1fr_auto]"
              >
                <FormField
                  label="Descripción"
                  required
                  error={errors.diagnoses?.[i]?.description?.message}
                >
                  <Input {...register(`diagnoses.${i}.description`)} />
                </FormField>
                <FormField
                  label="Observaciones"
                  error={errors.diagnoses?.[i]?.observations?.message}
                >
                  <Input {...register(`diagnoses.${i}.observations`)} />
                </FormField>
                <Button
                  variant="ghost"
                  size="icon"
                  className="self-end text-red-600"
                  aria-label="Quitar diagnóstico"
                  onClick={() => diagnoses.remove(i)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Tratamientos"
            description="Un tratamiento activo cambia el estado del animal a «En tratamiento»."
            actions={
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  treatments.append({
                    description: "",
                    instructions: "",
                    startDate: todayInput(),
                    endDate: "",
                    observations: "",
                    medications: [],
                  })
                }
              >
                <Plus className="h-4 w-4" aria-hidden /> Agregar tratamiento
              </Button>
            }
          />
          <CardBody className="space-y-4">
            {treatments.fields.length === 0 && (
              <p className="text-sm text-slate-500">Sin tratamientos.</p>
            )}
            {treatments.fields.map((f, i) => {
              const e = errors.treatments?.[i];
              return (
                <div key={f.id} className="space-y-4 rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-800">Tratamiento {i + 1}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      onClick={() => treatments.remove(i)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden /> Quitar
                    </Button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Descripción" required error={e?.description?.message}>
                      <Input {...register(`treatments.${i}.description`)} />
                    </FormField>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField label="Inicio" required error={e?.startDate?.message}>
                        <Input type="date" {...register(`treatments.${i}.startDate`)} />
                      </FormField>
                      <FormField label="Fin" error={e?.endDate?.message}>
                        <Input type="date" {...register(`treatments.${i}.endDate`)} />
                      </FormField>
                    </div>
                    <FormField
                      label="Instrucciones"
                      required
                      error={e?.instructions?.message}
                      className="sm:col-span-2"
                    >
                      <Textarea {...register(`treatments.${i}.instructions`)} />
                    </FormField>
                  </div>
                  <MedicationFields
                    control={control}
                    register={register}
                    prefix={`treatments.${i}.medications`}
                    errors={e?.medications as never}
                  />
                </div>
              );
            })}
          </CardBody>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Guardar consulta
          </Button>
        </div>
      </form>
    </>
  );
}
