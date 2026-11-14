"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { ErrorState, PageSkeleton } from "@/components/info";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { TabPanel, Tabs } from "@/components/ui/tabs";
import { useAlgorithmSettings, useCatalogMutations } from "@/hooks/use-admin";
import { useVaccines } from "@/hooks/use-clinical";
import { ApiError, errorMessage } from "@/lib/api";
import { SPECIES } from "@/lib/labels";
import type { AlgorithmSettings, Species, Vaccine } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { requiredNumber, requiredText } from "@/lib/validation";

export default function CatalogsPage() {
  const [tab, setTab] = useState("vacunas");
  return (
    <>
      <PageHeader title="Catálogos y criterios del algoritmo" />
      <Tabs
        tabs={[
          { id: "vacunas", label: "Vacunas" },
          { id: "algoritmo", label: "Algoritmo" },
        ]}
        value={tab}
        onChange={setTab}
        idPrefix="cat"
      />
      <TabPanel id="vacunas" active={tab === "vacunas"} idPrefix="cat">
        <VaccinesTab />
      </TabPanel>
      <TabPanel id="algoritmo" active={tab === "algoritmo"} idPrefix="cat">
        <AlgorithmTab />
      </TabPanel>
    </>
  );
}

// ---------------- Vacunas ----------------

function VaccinesTab() {
  const { data, isLoading, error } = useVaccines();
  const [editing, setEditing] = useState<Vaccine | null | undefined>(undefined);

  const columns: Column<Vaccine>[] = [
    {
      key: "name",
      header: "Vacuna",
      sortValue: (v) => v.name,
      cell: (v) => <span className="font-medium text-slate-900">{v.name}</span>,
    },
    {
      key: "species",
      header: "Especies",
      cell: (v) => v.species.map((s) => SPECIES[s]).join(", "),
    },
    {
      key: "rabies",
      header: "Antirrábica",
      cell: (v) => (v.isRabies ? <Badge tone="red">Sí</Badge> : "No"),
    },
    {
      key: "active",
      header: "Estado",
      sortValue: (v) => (v.isActive ? 0 : 1),
      cell: (v) => (
        <Badge tone={v.isActive ? "green" : "slate"}>
          {v.isActive ? "Activa" : "Oculta del selector"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      className: "text-right",
      cell: (v) => (
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Editar ${v.name}`}
          onClick={() => setEditing(v)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Desactivar una vacuna solo la oculta del selector; el historial de vacunaciones se
          conserva.
        </p>
        <Button onClick={() => setEditing(null)}>
          <Plus className="h-4 w-4" aria-hidden /> Nueva vacuna
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={data}
        rowKey={(v) => v.id}
        loading={isLoading}
        error={error ? errorMessage(error) : null}
        emptyTitle="Sin vacunas en el catálogo"
      />
      {editing !== undefined && (
        <VaccineDialog vaccine={editing} onClose={() => setEditing(undefined)} />
      )}
    </div>
  );
}

const vaccineSchema = z.object({
  name: requiredText("El nombre", 150),
  species: z.array(z.enum(["PERRO", "GATO", "OTRO"])).min(1, "Selecciona al menos una especie"),
  isRabies: z.boolean(),
  isActive: z.boolean(),
});

function VaccineDialog({ vaccine, onClose }: { vaccine: Vaccine | null; onClose: () => void }) {
  const { createVaccine, updateVaccine } = useCatalogMutations();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof vaccineSchema>>({
    resolver: zodResolver(vaccineSchema),
    defaultValues: vaccine
      ? {
          name: vaccine.name,
          species: vaccine.species,
          isRabies: vaccine.isRabies,
          isActive: vaccine.isActive,
        }
      : { name: "", species: [], isRabies: false, isActive: true },
  });

  const onSubmit = handleSubmit(async (v) => {
    try {
      if (vaccine) await updateVaccine.mutateAsync({ id: vaccine.id, ...v });
      else await createVaccine.mutateAsync(v);
      toast.success(vaccine ? "Vacuna actualizada" : "Vacuna creada");
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setError("name", { message: err.message });
      else toast.error(errorMessage(err));
    }
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title={vaccine ? "Editar vacuna" : "Nueva vacuna"}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form="vaccine-form" loading={isSubmitting}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="vaccine-form" onSubmit={onSubmit} noValidate className="space-y-4">
        <FormField label="Nombre" required error={errors.name?.message}>
          <Input {...register("name")} />
        </FormField>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700">
            Especies <span className="text-red-600">*</span>
          </legend>
          <div className="flex flex-wrap gap-4">
            {(Object.keys(SPECIES) as Species[]).map((s) => (
              <Checkbox key={s} label={SPECIES[s]} value={s} {...register("species")} />
            ))}
          </div>
          {errors.species && <p className="mt-1 text-xs text-red-600">{errors.species.message}</p>}
        </fieldset>
        <Checkbox label="Es antirrábica" {...register("isRabies")} />
        <Checkbox label="Activa (visible en el selector)" {...register("isActive")} />
      </form>
    </Dialog>
  );
}

// ---------------- Algoritmo ----------------

const KEYS = [
  { key: "time", label: "Tiempo disponible" },
  { key: "space", label: "Espacio del hogar" },
  { key: "experience", label: "Experiencia" },
  { key: "energy", label: "Energía / estilo de vida" },
  { key: "preferences", label: "Preferencias" },
] as const;

const weight = requiredNumber(
  z.number().int("Debe ser entero").min(0, "Mínimo 0").max(100, "Máximo 100"),
);
const settingsSchema = z
  .object({
    time: weight,
    space: weight,
    experience: weight,
    energy: weight,
    preferences: weight,
    thresholdHigh: requiredNumber(z.number().int().min(1).max(100)),
    thresholdMedium: requiredNumber(z.number().int().min(0).max(99)),
  })
  .refine((v) => v.time + v.space + v.experience + v.energy + v.preferences === 100, {
    path: ["time"],
    message: "Los pesos deben sumar 100",
  })
  .refine((v) => v.thresholdMedium < v.thresholdHigh, {
    path: ["thresholdMedium"],
    message: "Debe ser menor que el umbral ALTA",
  });

function AlgorithmTab() {
  const { data, isLoading, error } = useAlgorithmSettings();
  if (isLoading) return <PageSkeleton />;
  if (error || !data) return <ErrorState message={errorMessage(error)} />;
  return <AlgorithmForm key={data.current.version} current={data.current} history={data.history} />;
}

function AlgorithmForm({
  current,
  history,
}: {
  current: AlgorithmSettings;
  history: AlgorithmSettings[];
}) {
  const { createSettings } = useCatalogMutations();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<z.input<typeof settingsSchema>, unknown, z.output<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      ...current.weights,
      thresholdHigh: current.thresholdHigh,
      thresholdMedium: current.thresholdMedium,
    },
  });

  const values = watch();
  const sum = KEYS.reduce((s, k) => s + (Number(values[k.key]) || 0), 0);

  const onSubmit = handleSubmit(async (v) => {
    try {
      const row = await createSettings.mutateAsync({
        weights: {
          time: v.time,
          space: v.space,
          experience: v.experience,
          energy: v.energy,
          preferences: v.preferences,
        },
        thresholdHigh: v.thresholdHigh,
        thresholdMedium: v.thresholdMedium,
      });
      toast.success(
        `Configuración guardada como versión ${row.version}. Los resultados anteriores no se recalculan.`,
      );
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader
          title={`Pesos de los criterios (versión actual: ${current.version})`}
          description="Deben sumar exactamente 100. Guardar crea una nueva versión del modelo."
        />
        <CardBody>
          <form onSubmit={onSubmit} noValidate className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {KEYS.map((k) => (
                <FormField key={k.key} label={k.label} required error={errors[k.key]?.message}>
                  <Input type="number" min={0} max={100} step={1} {...register(k.key)} />
                </FormField>
              ))}
            </div>
            <p
              className={`text-sm font-medium ${sum === 100 ? "text-green-700" : "text-red-600"}`}
              role="status"
            >
              Suma actual: {sum} / 100
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Umbral ALTA (≥)" required error={errors.thresholdHigh?.message}>
                <Input type="number" min={1} max={100} {...register("thresholdHigh")} />
              </FormField>
              <FormField label="Umbral MEDIA (≥)" required error={errors.thresholdMedium?.message}>
                <Input type="number" min={0} max={99} {...register("thresholdMedium")} />
              </FormField>
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
                Guardar nueva versión
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Historial de versiones" />
        <ul className="divide-y divide-slate-100">
          {history.map((h) => (
            <li key={h.version} className="px-5 py-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-900">Versión {h.version}</span>
                {h.version === current.version && <Badge tone="teal">Actual</Badge>}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {formatDateTime(h.createdAt)}
                {h.createdBy && ` · ${h.createdBy.fullName}`}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {KEYS.map((k) => `${k.label.split(" ")[0]} ${h.weights[k.key]}`).join(" · ")} ·
                umbrales {h.thresholdHigh}/{h.thresholdMedium}
              </p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
