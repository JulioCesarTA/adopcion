"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useAnimalMutations } from "@/hooks/use-animals";
import { errorMessage } from "@/lib/api";
import { dateTimeInputToIso, nowInput } from "@/lib/utils";
import { optionalText, requiredDate, requiredText } from "@/lib/validation";

const exitSchema = z
  .object({
    type: z.enum(["FALLECIDO", "DEVUELTO", "OTRO"]),
    detail: optionalText(80),
    date: requiredDate("La fecha"),
    notes: optionalText(2000),
  })
  .refine((v) => v.type !== "OTRO" || !!v.detail, {
    path: ["detail"],
    message: "Indica el motivo",
  });

/** CU22: registrar salida o baja. */
export function ExitDialog({ animalId, onClose }: { animalId: string; onClose: () => void }) {
  const { exit } = useAnimalMutations(animalId);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof exitSchema>, unknown, z.output<typeof exitSchema>>({
    resolver: zodResolver(exitSchema),
    defaultValues: { type: "DEVUELTO", date: nowInput() },
  });

  const onSubmit = handleSubmit(async (v) => {
    try {
      await exit.mutateAsync({ ...v, date: dateTimeInputToIso(v.date) });
      toast.success("Salida registrada");
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title="Registrar salida o baja"
      description="Es un estado final: el historial clínico queda consultable pero no se podrán crear registros nuevos."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button variant="danger" type="submit" form="exit-form" loading={isSubmitting}>
            Registrar salida
          </Button>
        </>
      }
    >
      <form id="exit-form" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <FormField label="Motivo" required error={errors.type?.message}>
          <Select {...register("type")}>
            <option value="DEVUELTO">Devuelto a su dueño</option>
            <option value="FALLECIDO">Fallecido</option>
            <option value="OTRO">Otro</option>
          </Select>
        </FormField>
        <FormField label="Fecha y hora" required error={errors.date?.message}>
          <Input type="datetime-local" {...register("date")} />
        </FormField>
        {watch("type") === "OTRO" && (
          <FormField
            label="Detalle del motivo"
            required
            error={errors.detail?.message}
            className="sm:col-span-2"
          >
            <Input {...register("detail")} />
          </FormField>
        )}
        <FormField label="Observaciones" error={errors.notes?.message} className="sm:col-span-2">
          <Textarea {...register("notes")} />
        </FormField>
      </form>
    </Dialog>
  );
}

const readmitSchema = z.object({
  date: requiredDate("La fecha"),
  reason: requiredText("El motivo", 255),
});

/** CU22: reingreso de un animal adoptado que vuelve a la institución. */
export function ReadmitDialog({ animalId, onClose }: { animalId: string; onClose: () => void }) {
  const { readmit } = useAnimalMutations(animalId);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof readmitSchema>, unknown, z.output<typeof readmitSchema>>({
    resolver: zodResolver(readmitSchema),
    defaultValues: { date: nowInput(), reason: "" },
  });

  const onSubmit = handleSubmit(async (v) => {
    try {
      await readmit.mutateAsync({ ...v, date: dateTimeInputToIso(v.date) });
      toast.success("Reingreso registrado");
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title="Registrar reingreso"
      description="El animal vuelve a la institución en estado «Ingresado»."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form="readmit-form" loading={isSubmitting}>
            Registrar reingreso
          </Button>
        </>
      }
    >
      <form id="readmit-form" onSubmit={onSubmit} noValidate className="space-y-4">
        <FormField label="Fecha y hora" required error={errors.date?.message}>
          <Input type="datetime-local" {...register("date")} />
        </FormField>
        <FormField label="Motivo" required error={errors.reason?.message}>
          <Input {...register("reason")} />
        </FormField>
      </form>
    </Dialog>
  );
}
