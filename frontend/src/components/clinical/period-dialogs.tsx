"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useClinicalMutations } from "@/hooks/use-clinical";
import { ApiError, errorMessage } from "@/lib/api";
import type { QuarantinePeriod } from "@/lib/types";
import { dateTimeInputToIso, nowInput } from "@/lib/utils";
import { optionalDate, optionalText, requiredDate, requiredText } from "@/lib/validation";

const startSchema = z
  .object({
    type: z.enum(["OBSERVACION", "CUARENTENA"]),
    reason: requiredText("El motivo", 2000),
    startDate: requiredDate("La fecha de inicio"),
    expectedEndDate: optionalDate,
  })
  .refine((v) => !v.expectedEndDate || v.expectedEndDate >= v.startDate, {
    path: ["expectedEndDate"],
    message: "No puede ser anterior al inicio",
  });

/** CU09: iniciar periodo de observación o cuarentena. */
export function StartPeriodDialog({
  animalId,
  onClose,
}: {
  animalId: string;
  onClose: () => void;
}) {
  const { startPeriod } = useClinicalMutations(animalId);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof startSchema>, unknown, z.output<typeof startSchema>>({
    resolver: zodResolver(startSchema),
    defaultValues: { type: "CUARENTENA", startDate: nowInput(), reason: "" },
  });

  const onSubmit = handleSubmit(async (v) => {
    try {
      await startPeriod.mutateAsync({
        type: v.type,
        reason: v.reason,
        startDate: dateTimeInputToIso(v.startDate),
        expectedEndDate: v.expectedEndDate ? dateTimeInputToIso(v.expectedEndDate) : undefined,
      });
      toast.success("Periodo iniciado");
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title="Iniciar observación / cuarentena"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form="period-form" loading={isSubmitting}>
            Iniciar
          </Button>
        </>
      }
    >
      <form id="period-form" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <FormField label="Tipo" required error={errors.type?.message}>
          <Select {...register("type")}>
            <option value="CUARENTENA">Cuarentena</option>
            <option value="OBSERVACION">Observación</option>
          </Select>
        </FormField>
        <FormField label="Inicio" required error={errors.startDate?.message}>
          <Input type="datetime-local" {...register("startDate")} />
        </FormField>
        <FormField
          label="Fin estimado"
          error={errors.expectedEndDate?.message}
          className="sm:col-span-2"
        >
          <Input type="datetime-local" {...register("expectedEndDate")} />
        </FormField>
        <FormField label="Motivo" required error={errors.reason?.message} className="sm:col-span-2">
          <Textarea {...register("reason")} />
        </FormField>
      </form>
    </Dialog>
  );
}

const controlSchema = z.object({
  controlDate: requiredDate("La fecha"),
  animalCondition: requiredText("La condición del animal", 2000),
  observations: optionalText(2000),
});

/** CU09: registrar control (solo VETERINARIO). */
export function ControlDialog({
  animalId,
  period,
  onClose,
}: {
  animalId: string;
  period: QuarantinePeriod;
  onClose: () => void;
}) {
  const { addControl } = useClinicalMutations(animalId);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof controlSchema>, unknown, z.output<typeof controlSchema>>({
    resolver: zodResolver(controlSchema),
    defaultValues: { controlDate: nowInput(), animalCondition: "" },
  });

  const onSubmit = handleSubmit(async (v) => {
    try {
      await addControl.mutateAsync({
        periodId: period.id,
        ...v,
        controlDate: dateTimeInputToIso(v.controlDate),
      });
      toast.success("Control registrado");
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title="Registrar control"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form="control-form" loading={isSubmitting}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="control-form" onSubmit={onSubmit} noValidate className="space-y-4">
        <FormField label="Fecha y hora" required error={errors.controlDate?.message}>
          <Input type="datetime-local" {...register("controlDate")} />
        </FormField>
        <FormField label="Condición del animal" required error={errors.animalCondition?.message}>
          <Textarea {...register("animalCondition")} />
        </FormField>
        <FormField label="Observaciones" error={errors.observations?.message}>
          <Textarea {...register("observations")} />
        </FormField>
      </form>
    </Dialog>
  );
}

const closeSchema = z.object({
  endDate: requiredDate("La fecha de fin"),
  finalObservations: optionalText(5000),
});

/** CU09: cerrar periodo; si no hay controles, pide confirmación explícita. */
export function ClosePeriodDialog({
  animalId,
  period,
  onClose,
}: {
  animalId: string;
  period: QuarantinePeriod;
  onClose: () => void;
}) {
  const { closePeriod } = useClinicalMutations(animalId);
  const noControls = (period._count?.controls ?? period.controls?.length ?? 0) === 0;
  const [needsConfirm, setNeedsConfirm] = useState(noControls);
  const [confirmed, setConfirmed] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof closeSchema>, unknown, z.output<typeof closeSchema>>({
    resolver: zodResolver(closeSchema),
    defaultValues: { endDate: nowInput() },
  });

  const onSubmit = handleSubmit(async (v) => {
    try {
      await closePeriod.mutateAsync({
        periodId: period.id,
        endDate: dateTimeInputToIso(v.endDate),
        finalObservations: v.finalObservations,
        confirmWithoutControls: confirmed || undefined,
      });
      toast.success("Periodo cerrado");
      onClose();
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.status === 409 &&
        err.errors?.some((e) => e.field === "confirmWithoutControls")
      ) {
        setNeedsConfirm(true);
      }
      toast.error(errorMessage(err));
    }
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title="Cerrar periodo"
      description="El animal volverá a «Ingresado» (o «En tratamiento» si tiene tratamientos activos)."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="close-form"
            loading={isSubmitting}
            disabled={needsConfirm && !confirmed}
          >
            Cerrar periodo
          </Button>
        </>
      }
    >
      <form id="close-form" onSubmit={onSubmit} noValidate className="space-y-4">
        {needsConfirm && (
          <div
            className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
            role="alert"
          >
            <p>Este periodo no tiene controles registrados.</p>
            <label className="mt-2 flex items-center gap-2 font-medium">
              <input
                type="checkbox"
                className="accent-amber-600"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              Confirmo que deseo cerrarlo sin controles
            </label>
          </div>
        )}
        <FormField label="Fecha y hora de fin" required error={errors.endDate?.message}>
          <Input type="datetime-local" {...register("endDate")} />
        </FormField>
        <FormField label="Observaciones finales" error={errors.finalObservations?.message}>
          <Textarea {...register("finalObservations")} />
        </FormField>
      </form>
    </Dialog>
  );
}
