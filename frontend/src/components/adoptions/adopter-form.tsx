"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useAdopterMutations } from "@/hooks/use-adoptions";
import { ApiError, errorMessage } from "@/lib/api";
import { EXPERIENCE, HOUSING, SIZE, SPECIES, options } from "@/lib/labels";
import type { Adopter } from "@/lib/types";
import { optionalText, requiredNumber, requiredText } from "@/lib/validation";

const schema = z.object({
  ci: z
    .string()
    .trim()
    .min(1, "La CI es obligatoria")
    .max(20, "Máximo 20 caracteres")
    .regex(/^[0-9A-Za-z\- ]+$/, "Solo números, letras y guiones"),
  firstName: requiredText("Los nombres", 100),
  lastName: requiredText("Los apellidos", 100),
  phone: z
    .string()
    .trim()
    .min(1, "El teléfono es obligatorio")
    .regex(/^[0-9+()\- ]{6,30}$/, "Teléfono inválido"),
  email: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().trim().email("Correo inválido").max(255).optional(),
  ),
  address: optionalText(255),
  housingType: z.enum(["DEPARTAMENTO", "CASA_SIN_PATIO", "CASA_CON_PATIO"], {
    errorMap: () => ({ message: "Selecciona el tipo de vivienda" }),
  }),
  hasYard: z.boolean(),
  hasChildren: z.boolean(),
  hasOtherAnimals: z.boolean(),
  availableHoursPerDay: requiredNumber(
    z.number().min(0, "Debe estar entre 0 y 24").max(24, "Debe estar entre 0 y 24"),
  ),
  experience: z.enum(["NINGUNA", "BASICA", "AVANZADA"], {
    errorMap: () => ({ message: "Selecciona el nivel de experiencia" }),
  }),
  preferredSpecies: z.preprocess(
    (v) => (v === "" ? null : v),
    z.enum(["PERRO", "GATO", "OTRO"]).nullable(),
  ),
  preferredSize: z.preprocess(
    (v) => (v === "" ? null : v),
    z.enum(["PEQUENO", "MEDIANO", "GRANDE"]).nullable(),
  ),
  observations: optionalText(5000),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

/** CU10: datos personales + perfil de evaluación del adoptante. */
export function AdopterForm({ adopter }: { adopter?: Adopter }) {
  const router = useRouter();
  const { create, update } = useAdopterMutations(adopter?.id);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: adopter
      ? {
          ...adopter.person,
          email: adopter.person.email ?? "",
          address: adopter.person.address ?? "",
          housingType: adopter.housingType,
          hasYard: adopter.hasYard,
          hasChildren: adopter.hasChildren,
          hasOtherAnimals: adopter.hasOtherAnimals,
          availableHoursPerDay: adopter.availableHoursPerDay,
          experience: adopter.experience,
          preferredSpecies: adopter.preferredSpecies ?? "",
          preferredSize: adopter.preferredSize ?? "",
          observations: adopter.observations ?? "",
        }
      : {
          hasYard: false,
          hasChildren: false,
          hasOtherAnimals: false,
          preferredSpecies: "",
          preferredSize: "",
        },
  });

  const onSubmit = handleSubmit(async (values) => {
    setDuplicateId(null);
    try {
      const saved = adopter ? await update.mutateAsync(values) : await create.mutateAsync(values);
      toast.success(adopter ? "Adoptante actualizado" : "Adoptante registrado");
      router.push(`/adoptantes/${saved.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("ci", { message: err.message });
        const raw = err.errors as unknown as { existingAdopterId?: string } | undefined;
        setDuplicateId(raw?.existingAdopterId ?? null);
        return;
      }
      if (err instanceof ApiError && err.errors) {
        for (const e of err.errors)
          setError(e.field as keyof FormInput, { message: e.messages[0] });
      }
      toast.error(errorMessage(err));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Card>
        <CardHeader title="Datos personales" />
        <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField label="Cédula de identidad (CI)" required error={errors.ci?.message}>
            <Input placeholder="p. ej. 7845123 SC" {...register("ci")} />
          </FormField>
          <FormField label="Nombres" required error={errors.firstName?.message}>
            <Input {...register("firstName")} />
          </FormField>
          <FormField label="Apellidos" required error={errors.lastName?.message}>
            <Input {...register("lastName")} />
          </FormField>
          <FormField label="Teléfono" required error={errors.phone?.message}>
            <Input type="tel" {...register("phone")} />
          </FormField>
          <FormField label="Correo" error={errors.email?.message}>
            <Input type="email" {...register("email")} />
          </FormField>
          <FormField label="Dirección" error={errors.address?.message}>
            <Input {...register("address")} />
          </FormField>
          {duplicateId && (
            <p className="text-sm sm:col-span-2 lg:col-span-3" role="alert">
              <Link
                href={`/adoptantes/${duplicateId}`}
                className="font-medium text-teal-700 hover:underline"
              >
                Ver el adoptante existente con esta CI →
              </Link>
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Perfil de evaluación"
          description="Se usa en la recomendación de compatibilidad."
        />
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Tipo de vivienda" required error={errors.housingType?.message}>
              <Select {...register("housingType")}>
                <option value="">Selecciona…</option>
                {options(HOUSING).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              label="Horas diarias disponibles"
              required
              error={errors.availableHoursPerDay?.message}
            >
              <Input
                type="number"
                step="0.5"
                min={0}
                max={24}
                {...register("availableHoursPerDay")}
              />
            </FormField>
            <FormField label="Experiencia con animales" required error={errors.experience?.message}>
              <Select {...register("experience")}>
                <option value="">Selecciona…</option>
                {options(EXPERIENCE).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Especie preferida" error={errors.preferredSpecies?.message}>
              <Select {...register("preferredSpecies")}>
                <option value="">Sin preferencia</option>
                {options(SPECIES).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Tamaño preferido" error={errors.preferredSize?.message}>
              <Select {...register("preferredSize")}>
                <option value="">Sin preferencia</option>
                {options(SIZE).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Checkbox label="Tiene patio" {...register("hasYard")} />
            <Checkbox label="Tiene niños en el hogar" {...register("hasChildren")} />
            <Checkbox label="Tiene otros animales" {...register("hasOtherAnimals")} />
          </div>
          <FormField label="Observaciones" error={errors.observations?.message}>
            <Textarea {...register("observations")} />
          </FormField>
        </CardBody>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {adopter ? "Guardar cambios" : "Registrar adoptante"}
        </Button>
      </div>
    </form>
  );
}
