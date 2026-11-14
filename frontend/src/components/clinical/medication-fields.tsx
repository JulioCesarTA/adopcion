"use client";

import {
  useFieldArray,
  type ArrayPath,
  type Control,
  type FieldArray,
  type FieldErrors,
  type FieldValues,
  type Path,
  type UseFormRegister,
} from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { emptyMedication } from "./clinical-schemas";

type MedicationErrors = FieldErrors<{
  name: string;
  dose: string;
  administrationRoute: string;
  frequency: string;
  duration: string;
}>[];

/**
 * Lista dinámica de medicamentos de un tratamiento. `prefix` es la ruta del array
 * en el formulario (p. ej. "medications" o "treatments.0.medications").
 */
export function MedicationFields<T extends FieldValues, TOut>({
  control,
  register: registerField,
  prefix,
  errors,
}: {
  control: Control<T, unknown, TOut>;
  register: UseFormRegister<T>;
  prefix: ArrayPath<T>;
  errors?: MedicationErrors;
}) {
  const { fields, append, remove } = useFieldArray({ control, name: prefix });
  const register = (name: string) => registerField(name as Path<T>);

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-slate-700">Medicamentos</legend>
      {fields.length === 0 && <p className="text-sm text-slate-500">Sin medicamentos.</p>}
      {fields.map((f, i) => {
        const e = errors?.[i];
        return (
          <div key={f.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <FormField label="Nombre" required error={e?.name?.message}>
                <Input {...register(`${prefix}.${i}.name`)} />
              </FormField>
              <FormField label="Dosis" required error={e?.dose?.message}>
                <Input placeholder="p. ej. 250 mg" {...register(`${prefix}.${i}.dose`)} />
              </FormField>
              <FormField label="Vía" required error={e?.administrationRoute?.message}>
                <Input
                  placeholder="Oral, IM, SC…"
                  {...register(`${prefix}.${i}.administrationRoute`)}
                />
              </FormField>
              <FormField label="Frecuencia" required error={e?.frequency?.message}>
                <Input placeholder="Cada 12 h" {...register(`${prefix}.${i}.frequency`)} />
              </FormField>
              <FormField label="Duración" required error={e?.duration?.message}>
                <Input placeholder="7 días" {...register(`${prefix}.${i}.duration`)} />
              </FormField>
            </div>
            <div className="mt-2 flex justify-end">
              <Button variant="ghost" size="sm" className="text-red-600" onClick={() => remove(i)}>
                <Trash2 className="h-4 w-4" aria-hidden /> Quitar medicamento
              </Button>
            </div>
          </div>
        );
      })}
      <Button
        variant="outline"
        size="sm"
        onClick={() => append({ ...emptyMedication } as FieldArray<T, ArrayPath<T>>)}
      >
        <Plus className="h-4 w-4" aria-hidden /> Agregar medicamento
      </Button>
    </fieldset>
  );
}
