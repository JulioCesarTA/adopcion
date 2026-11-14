"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { RoleGate } from "@/components/role-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useClinicalMutations, useVaccinations, useVaccines } from "@/hooks/use-clinical";
import { errorMessage } from "@/lib/api";
import { SPECIES } from "@/lib/labels";
import type { Species, Vaccination } from "@/lib/types";
import { formatDay, todayInput } from "@/lib/utils";
import { optionalDate, optionalText, requiredDate, requiredText } from "@/lib/validation";

export function VaccinationsPanel({
  animalId,
  species,
  canRecord,
}: {
  animalId: string;
  species: Species;
  canRecord: boolean;
}) {
  const { data, isLoading, error } = useVaccinations(animalId);
  const [open, setOpen] = useState(false);
  const today = todayInput();

  const columns: Column<Vaccination>[] = [
    {
      key: "vaccine",
      header: "Vacuna",
      sortValue: (v) => v.vaccine.name,
      cell: (v) => (
        <span className="font-medium text-slate-900">
          {v.vaccine.name}
          {v.vaccine.isRabies && (
            <Badge tone="red" className="ml-2">
              Antirrábica
            </Badge>
          )}
        </span>
      ),
    },
    {
      key: "date",
      header: "Aplicación",
      sortValue: (v) => v.applicationDate,
      cell: (v) => formatDay(v.applicationDate),
    },
    { key: "dose", header: "Dosis", cell: (v) => v.dose },
    {
      key: "batch",
      header: "Lote",
      cell: (v) => v.batchNumber ?? "—",
      className: "hidden md:table-cell",
    },
    {
      key: "next",
      header: "Próxima dosis",
      sortValue: (v) => v.nextDoseDate ?? "",
      cell: (v) =>
        v.nextDoseDate ? (
          <span className={v.nextDoseDate.slice(0, 10) < today ? "font-medium text-red-600" : ""}>
            {formatDay(v.nextDoseDate)}
          </span>
        ) : (
          "—"
        ),
    },
    {
      key: "by",
      header: "Aplicada por",
      cell: (v) => v.appliedBy?.fullName ?? "—",
      className: "hidden lg:table-cell",
    },
  ];

  return (
    <div className="space-y-4">
      <RoleGate roles={["VETERINARIO"]}>
        {canRecord && (
          <div className="flex justify-end">
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden /> Nueva vacuna
            </Button>
          </div>
        )}
      </RoleGate>
      <DataTable
        columns={columns}
        data={data}
        rowKey={(v) => v.id}
        loading={isLoading}
        error={error ? errorMessage(error) : null}
        emptyTitle="Sin vacunas registradas"
      />
      {open && (
        <VaccinationDialog animalId={animalId} species={species} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}

const schema = z
  .object({
    vaccineId: z.string().min(1, "Selecciona una vacuna"),
    applicationDate: requiredDate("La fecha de aplicación"),
    dose: requiredText("La dosis", 50),
    batchNumber: optionalText(50),
    nextDoseDate: optionalDate,
    observations: optionalText(2000),
  })
  .refine((v) => !v.nextDoseDate || v.nextDoseDate >= v.applicationDate, {
    path: ["nextDoseDate"],
    message: "La próxima dosis no puede ser anterior a la aplicación",
  });

/** CU08: registrar vacunación desde el catálogo. */
function VaccinationDialog({
  animalId,
  species,
  onClose,
}: {
  animalId: string;
  species: Species;
  onClose: () => void;
}) {
  const { data: vaccines } = useVaccines(true);
  const { createVaccination } = useClinicalMutations(animalId);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { applicationDate: todayInput(), vaccineId: "", dose: "" },
  });

  const selected = vaccines?.find((v) => v.id === watch("vaccineId"));
  const incompatible = selected && !selected.species.includes(species);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const res = await createVaccination.mutateAsync(values);
      toast.success("Vacuna registrada");
      res.warnings?.forEach((w) => toast.warning(w));
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title="Nueva vacuna"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form="vacc-form" loading={isSubmitting}>
            Registrar
          </Button>
        </>
      }
    >
      <form id="vacc-form" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Vacuna"
          required
          error={errors.vaccineId?.message}
          className="sm:col-span-2"
        >
          <Select {...register("vaccineId")}>
            <option value="">Selecciona…</option>
            {vaccines?.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.species.map((s) => SPECIES[s]).join(", ")})
              </option>
            ))}
          </Select>
        </FormField>
        {incompatible && (
          <p
            className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900 sm:col-span-2"
            role="note"
          >
            Advertencia: esta vacuna no está indicada para {SPECIES[species].toLowerCase()} en el
            catálogo. Puedes registrarla igualmente.
          </p>
        )}
        <FormField label="Fecha de aplicación" required error={errors.applicationDate?.message}>
          <Input type="date" max={todayInput()} {...register("applicationDate")} />
        </FormField>
        <FormField label="Dosis" required error={errors.dose?.message}>
          <Input placeholder="p. ej. 1 ml" {...register("dose")} />
        </FormField>
        <FormField label="Lote" error={errors.batchNumber?.message}>
          <Input {...register("batchNumber")} />
        </FormField>
        <FormField label="Próxima dosis" error={errors.nextDoseDate?.message}>
          <Input type="date" {...register("nextDoseDate")} />
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
