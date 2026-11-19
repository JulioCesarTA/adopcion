"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useAnimalMutations } from "@/hooks/use-animals";
import { errorMessage } from "@/lib/api";
import { dateTimeInputToIso, nowInput } from "@/lib/utils";
import { requiredDate, requiredText } from "@/lib/validation";

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
