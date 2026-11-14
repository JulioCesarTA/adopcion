"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useCatalogMutations } from "@/hooks/use-admin";
import { useVaccines } from "@/hooks/use-clinical";
import { useAuth } from "@/lib/auth";
import { errorMessage } from "@/lib/api";
import { SPECIES } from "@/lib/labels";
import type { Species, Vaccine } from "@/lib/types";
import { requiredText } from "@/lib/validation";

const ALL_SPECIES: Species[] = ["PERRO", "GATO", "OTRO"];

const schema = z.object({
  name: requiredText("El nombre", 120),
  species: z.array(z.enum(["PERRO", "GATO", "OTRO"])).min(1, "Elige al menos una especie"),
  isRabies: z.boolean(),
  isActive: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

function VaccineDialog({ vaccine, onClose }: { vaccine: Vaccine | null; onClose: () => void }) {
  const isNew = !vaccine;
  const { createVaccine, updateVaccine } = useCatalogMutations();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: vaccine?.name ?? "",
      species: vaccine?.species ?? [],
      isRabies: vaccine?.isRabies ?? false,
      isActive: vaccine?.isActive ?? true,
    },
  });

  const species = watch("species");

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isNew) {
        await createVaccine.mutateAsync(values);
        toast.success("Vacuna creada");
      } else {
        await updateVaccine.mutateAsync({ id: vaccine.id, ...values });
        toast.success("Vacuna actualizada");
      }
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title={isNew ? "Nueva vacuna" : "Editar vacuna"}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form="vaccine-form" loading={isSubmitting}>
            {isNew ? "Crear" : "Guardar"}
          </Button>
        </>
      }
    >
      <form id="vaccine-form" onSubmit={onSubmit} noValidate className="space-y-4">
        <FormField label="Nombre" required error={errors.name?.message}>
          <Input {...register("name")} />
        </FormField>

        <FormField
          label="Especies"
          required
          error={errors.species?.message}
          hint="Aplicarla a otra especie queda registrado con una advertencia, no se bloquea."
        >
          <div className="flex flex-wrap gap-3">
            {ALL_SPECIES.map((s) => (
              <Checkbox
                key={s}
                label={SPECIES[s]}
                checked={species.includes(s)}
                onChange={(e) =>
                  setValue(
                    "species",
                    e.target.checked ? [...species, s] : species.filter((x) => x !== s),
                    { shouldValidate: true },
                  )
                }
              />
            ))}
          </div>
        </FormField>

        <Checkbox label="Es antirrábica" {...register("isRabies")} />
        <Checkbox
          label="Activa"
          description="Una vacuna inactiva no se puede aplicar, pero sigue en el historial."
          {...register("isActive")}
        />
      </form>
    </Dialog>
  );
}

/** Catálogo de vacunas: alta y edición. Solo ADMIN puede modificarlo. */
export function VaccineCatalog() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const { data, isLoading, error } = useVaccines();
  const [editing, setEditing] = useState<Vaccine | null>(null);
  const [creating, setCreating] = useState(false);

  const columns: Column<Vaccine>[] = [
    { key: "name", header: "Nombre", sortValue: (v) => v.name, cell: (v) => v.name },
    {
      key: "species",
      header: "Especies",
      cell: (v) => (
        <span className="flex flex-wrap gap-1">
          {v.species.map((s) => (
            <Badge key={s} tone="slate">
              {SPECIES[s]}
            </Badge>
          ))}
        </span>
      ),
    },
    {
      key: "isRabies",
      header: "Antirrábica",
      cell: (v) => (v.isRabies ? <Badge tone="teal">Sí</Badge> : <span>—</span>),
    },
    {
      key: "isActive",
      header: "Estado",
      cell: (v) =>
        v.isActive ? <Badge tone="green">Activa</Badge> : <Badge tone="slate">Inactiva</Badge>,
    },
    ...(isAdmin
      ? [
          {
            key: "actions",
            header: "",
            cell: (v: Vaccine) => (
              <Button variant="ghost" size="sm" onClick={() => setEditing(v)}>
                <Pencil className="h-4 w-4" aria-hidden />
                <span className="sr-only">Editar {v.name}</span>
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        rowKey={(v) => v.id}
        loading={isLoading}
        error={error ? errorMessage(error) : null}
        emptyTitle="El catálogo está vacío"
        toolbar={
          isAdmin ? (
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" aria-hidden />
              Nueva vacuna
            </Button>
          ) : undefined
        }
      />
      {(creating || editing) && (
        <VaccineDialog
          vaccine={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </>
  );
}
