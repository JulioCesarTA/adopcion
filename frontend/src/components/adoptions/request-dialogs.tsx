"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useAdoptionMutations } from "@/hooks/use-adoptions";
import { errorMessage } from "@/lib/api";
import { dateInputToIso, dateTimeInputToIso, nowInput, todayInput } from "@/lib/utils";
import { optionalDate, optionalText, requiredDate, requiredText } from "@/lib/validation";

function Footer({
  formId,
  onClose,
  loading,
  label,
  danger,
}: {
  formId: string;
  onClose: () => void;
  loading: boolean;
  label: string;
  danger?: boolean;
}) {
  return (
    <>
      <Button variant="outline" onClick={onClose} disabled={loading}>
        Cancelar
      </Button>
      <Button variant={danger ? "danger" : "primary"} type="submit" form={formId} loading={loading}>
        {label}
      </Button>
    </>
  );
}

export function StatusChangeDialog({
  requestId,
  target,
  onClose,
}: {
  requestId: string;
  target: "EN_EVALUACION" | "CANCELADA";
  onClose: () => void;
}) {
  const { changeStatus } = useAdoptionMutations(requestId);
  const cancel = target === "CANCELADA";
  const schema = z
    .object({ notes: z.string().trim().max(5000, "Máximo 5000 caracteres") })
    .refine((v) => !cancel || v.notes.length > 0, {
      path: ["notes"],
      message: "La nota es obligatoria al cancelar",
    });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { notes: "" },
  });

  const onSubmit = handleSubmit(async (v) => {
    try {
      await changeStatus.mutateAsync({ status: target, notes: v.notes?.trim() || undefined });
      toast.success(
        cancel
          ? "Solicitud cancelada. El animal vuelve a estar disponible."
          : "Solicitud en evaluación",
      );
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title={cancel ? "Cancelar solicitud" : "Pasar a evaluación"}
      description={
        cancel ? "Es un estado final. El animal volverá a «Disponible para adopción»." : undefined
      }
      footer={
        <Footer
          formId="status-form"
          onClose={onClose}
          loading={isSubmitting}
          label={cancel ? "Cancelar solicitud" : "Confirmar"}
          danger={cancel}
        />
      }
    >
      <form id="status-form" onSubmit={onSubmit} noValidate>
        <FormField
          label={cancel ? "Motivo de la cancelación" : "Nota de evaluación"}
          required={cancel}
          error={errors.notes?.message}
        >
          <Textarea {...register("notes")} />
        </FormField>
      </form>
    </Dialog>
  );
}

/** CU12: agregar nota de evaluación. */
const decisionSchema = z
  .object({
    result: z.enum(["APROBADA", "RECHAZADA"]),
    notes: requiredText("La nota", 5000),
    decisionDate: requiredDate("La fecha de decisión"),
    deliveryDate: optionalDate,
  })
  .refine((v) => v.result !== "APROBADA" || !!v.deliveryDate, {
    path: ["deliveryDate"],
    message: "La fecha de entrega es obligatoria al aprobar",
  })
  .refine((v) => !v.deliveryDate || v.deliveryDate.slice(0, 10) >= v.decisionDate, {
    path: ["deliveryDate"],
    message: "No puede ser anterior a la decisión",
  });

/** CU14: registrar resultado (aprobada/rechazada) con nota obligatoria. */
export function DecisionDialog({ requestId, onClose }: { requestId: string; onClose: () => void }) {
  const { decide } = useAdoptionMutations(requestId);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof decisionSchema>, unknown, z.output<typeof decisionSchema>>({
    resolver: zodResolver(decisionSchema),
    defaultValues: {
      result: "APROBADA",
      notes: "",
      decisionDate: todayInput(),
      deliveryDate: nowInput(),
    },
  });
  const approved = watch("result") === "APROBADA";

  const onSubmit = handleSubmit(async (v) => {
    try {
      await decide.mutateAsync({
        result: v.result,
        notes: v.notes,
        decisionDate: dateInputToIso(v.decisionDate),
        deliveryDate:
          v.result === "APROBADA" && v.deliveryDate
            ? dateTimeInputToIso(v.deliveryDate)
            : undefined,
      });
      toast.success(
        v.result === "APROBADA"
          ? "Adopción aprobada. El animal pasó a «Adoptado»."
          : "Solicitud rechazada. El animal vuelve a estar disponible.",
      );
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title="Registrar resultado de adopción"
      description="Recuerda: la recomendación es solo de apoyo; la decisión es del personal responsable."
      footer={
        <Footer
          formId="decision-form"
          onClose={onClose}
          loading={isSubmitting}
          label="Registrar resultado"
          danger={!approved}
        />
      }
    >
      <form id="decision-form" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <FormField label="Resultado" required error={errors.result?.message}>
          <Select {...register("result")}>
            <option value="APROBADA">Aprobada</option>
            <option value="RECHAZADA">Rechazada</option>
          </Select>
        </FormField>
        <FormField label="Fecha de decisión" required error={errors.decisionDate?.message}>
          <Input type="date" max={todayInput()} {...register("decisionDate")} />
        </FormField>
        {approved && (
          <FormField
            label="Fecha y hora de entrega del animal"
            required
            error={errors.deliveryDate?.message}
            className="sm:col-span-2"
          >
            <Input type="datetime-local" {...register("deliveryDate")} />
          </FormField>
        )}
        <FormField
          label="Nota / fundamento"
          required
          error={errors.notes?.message}
          className="sm:col-span-2"
        >
          <Textarea rows={4} {...register("notes")} />
        </FormField>
      </form>
    </Dialog>
  );
}

const followupSchema = z.object({
  followupDate: requiredDate("La fecha"),
  animalCondition: requiredText("El estado general del animal", 2000),
  observations: optionalText(5000),
});

/** CU15: seguimiento posterior a la adopción (solo solicitudes aprobadas). */
export function FollowupDialog({ requestId, onClose }: { requestId: string; onClose: () => void }) {
  const { addFollowup } = useAdoptionMutations(requestId);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof followupSchema>, unknown, z.output<typeof followupSchema>>({
    resolver: zodResolver(followupSchema),
    defaultValues: { followupDate: nowInput(), animalCondition: "" },
  });
  const onSubmit = handleSubmit(async (v) => {
    try {
      await addFollowup.mutateAsync({ ...v, followupDate: dateTimeInputToIso(v.followupDate) });
      toast.success("Seguimiento registrado");
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });
  return (
    <Dialog
      open
      onClose={onClose}
      title="Nuevo seguimiento"
      footer={<Footer formId="fu-form" onClose={onClose} loading={isSubmitting} label="Guardar" />}
    >
      <form id="fu-form" onSubmit={onSubmit} noValidate className="space-y-4">
        <FormField label="Fecha y hora" required error={errors.followupDate?.message}>
          <Input type="datetime-local" {...register("followupDate")} />
        </FormField>
        <FormField
          label="Estado general del animal"
          required
          error={errors.animalCondition?.message}
        >
          <Input placeholder="p. ej. Bien adaptado, sano" {...register("animalCondition")} />
        </FormField>
        <FormField label="Observaciones" error={errors.observations?.message}>
          <Textarea {...register("observations")} />
        </FormField>
      </form>
    </Dialog>
  );
}
