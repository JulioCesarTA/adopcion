"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useAnimalMutations } from "@/hooks/use-animals";
import { useBookingOptions } from "@/hooks/use-bookings";
import { ApiError, errorMessage } from "@/lib/api";
import { ANIMAL_STATUS, SEX, SIZE, SPECIES, options } from "@/lib/labels";
import type { Animal } from "@/lib/types";
import { dateInputToIso, isoToDateInput, todayInput } from "@/lib/utils";
import {
  optionalNumber,
  optionalText,
  requiredDate,
  requiredNumber,
  requiredText,
  validatePhoto,
} from "@/lib/validation";
import { AnimalPhoto } from "./animal-photo";

const schema = z.object({
  name: optionalText(100),
  species: z.enum(["PERRO", "GATO", "OTRO"], {
    errorMap: () => ({ message: "Selecciona la especie" }),
  }),
  breed: optionalText(100),
  sex: z.enum(["MACHO", "HEMBRA", "DESCONOCIDO"]),
  ageMonths: optionalNumber(
    z.number().int("Debe ser un número entero").min(0, "No puede ser negativa").max(400),
  ),
  color: optionalText(100),
  size: z.enum(["PEQUENO", "MEDIANO", "GRANDE"], {
    errorMap: () => ({ message: "Selecciona el tamaño" }),
  }),
  energyLevel: requiredNumber(z.number().int().min(1, "De 1 a 5").max(5, "De 1 a 5")),
  temperament: optionalText(2000),
  goodWithChildren: z.boolean(),
  goodWithAnimals: z.boolean(),
  needsYard: z.boolean(),
  specialCare: z.boolean(),
  specialCareNotes: optionalText(2000),
  requiredDailyHours: requiredNumber(z.number().min(0, "Entre 0 y 24").max(24, "Entre 0 y 24")),
  physicalDescription: optionalText(2000),
  entryDate: requiredDate("La fecha de ingreso"),
  entryReason: requiredText("El motivo de ingreso", 255),
  exitNotes: optionalText(2000),
  status: z.string().optional(),
  ownerId: z.string().optional(),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

/** CU03 (registrar) y CU04 (editar, incluido el estado). */
export function AnimalForm({ animal }: { animal?: Animal }) {
  const router = useRouter();
  const isEdit = !!animal;
  const { create, update, uploadPhoto } = useAnimalMutations(animal?.id);
  const clients = useBookingOptions().data?.clients ?? [];
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: animal
      ? {
          name: animal.name ?? "",
          species: animal.species,
          breed: animal.breed ?? "",
          sex: animal.sex,
          ageMonths: animal.ageMonths ?? "",
          color: animal.color ?? "",
          size: animal.size,
          energyLevel: animal.energyLevel,
          temperament: animal.temperament ?? "",
          goodWithChildren: animal.goodWithChildren,
          goodWithAnimals: animal.goodWithAnimals,
          needsYard: animal.needsYard,
          specialCare: animal.specialCare,
          specialCareNotes: animal.specialCareNotes ?? "",
          requiredDailyHours: animal.requiredDailyHours,
          physicalDescription: animal.physicalDescription ?? "",
          entryDate: isoToDateInput(animal.entryDate),
          entryReason: animal.entryReason,
          exitNotes: animal.exitNotes ?? "",
          status: animal.status,
          ownerId: animal.ownerId ?? "",
        }
      : {
          sex: "DESCONOCIDO",
          energyLevel: 3,
          requiredDailyHours: 2,
          goodWithChildren: false,
          goodWithAnimals: false,
          needsYard: false,
          specialCare: false,
          entryDate: todayInput(),
        },
  });

  const specialCare = watch("specialCare");

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    const err = validatePhoto(file);
    setPhotoError(err);
    setPhoto(err ? null : file);
    setPreview(file && !err ? URL.createObjectURL(file) : null);
  };

  const onSubmit = handleSubmit(async (values) => {
    if (photoError) return;
    try {
      let id = animal?.id;
      const { exitNotes, status, ...data } = values;
      void exitNotes;
      const payload = {
        ...data,
        entryDate: dateInputToIso(values.entryDate),
        ownerId: values.ownerId || null,
        ...(isEdit && status ? { status: status as Animal["status"] } : {}),
      };
      if (isEdit) await update.mutateAsync(payload);
      else id = (await create.mutateAsync(payload)).id;
      if (photo && id) {
        try {
          await uploadPhoto.mutateAsync({ animalId: id, file: photo });
        } catch (err) {
          toast.error(`El animal se guardó, pero la foto no: ${errorMessage(err)}`);
        }
      }
      toast.success(isEdit ? "Animal actualizado" : "Animal registrado");
      router.push(`/animales/${id}`);
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        for (const e of err.errors)
          setError(e.field as keyof FormInput, { message: e.messages[0] });
      }
      toast.error(errorMessage(err));
    }
  });

  const dis = false;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Card>
        <CardHeader title="Datos generales" />
        <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField label="Nombre" error={errors.name?.message} hint="Opcional">
            <Input disabled={dis} {...register("name")} />
          </FormField>
          <FormField label="Especie" required error={errors.species?.message}>
            <Select disabled={dis} {...register("species")}>
              <option value="">Selecciona…</option>
              {options(SPECIES).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Raza" error={errors.breed?.message}>
            <Input disabled={dis} {...register("breed")} />
          </FormField>
          <FormField label="Sexo" required error={errors.sex?.message}>
            <Select disabled={dis} {...register("sex")}>
              {options(SEX).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Edad aproximada (meses)" error={errors.ageMonths?.message}>
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              disabled={dis}
              {...register("ageMonths")}
            />
          </FormField>
          <FormField label="Color" error={errors.color?.message}>
            <Input disabled={dis} {...register("color")} />
          </FormField>
          <FormField label="Tamaño" required error={errors.size?.message}>
            <Select disabled={dis} {...register("size")}>
              <option value="">Selecciona…</option>
              {options(SIZE).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Fecha de ingreso" required error={errors.entryDate?.message}>
            <Input type="date" max={todayInput()} disabled={dis} {...register("entryDate")} />
          </FormField>
          <FormField label="Motivo de ingreso" required error={errors.entryReason?.message}>
            <Input disabled={dis} {...register("entryReason")} />
          </FormField>
          <FormField
            label="Dueño (cliente)"
            hint="Opcional: el cliente verá su historial en el portal"
          >
            <Select {...register("ownerId")}>
              <option value="">Sin dueño</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} · {c.email}
                </option>
              ))}
            </Select>
          </FormField>
          {isEdit && (
            <FormField label="Estado" error={errors.status?.message}>
              <Select {...register("status")}>
                {options(ANIMAL_STATUS).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Comportamiento y necesidades"
          description="Se usan en la recomendación de compatibilidad."
        />
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Nivel de energía (1–5)" required error={errors.energyLevel?.message}>
              <Select disabled={dis} {...register("energyLevel")}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} — {["Muy bajo", "Bajo", "Medio", "Alto", "Muy alto"][n - 1]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              label="Horas diarias de atención requeridas"
              required
              error={errors.requiredDailyHours?.message}
            >
              <Input
                type="number"
                step="0.5"
                min={0}
                max={24}
                disabled={dis}
                {...register("requiredDailyHours")}
              />
            </FormField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Checkbox
              label="Se lleva bien con niños"
              disabled={dis}
              {...register("goodWithChildren")}
            />
            <Checkbox
              label="Se lleva bien con otros animales"
              disabled={dis}
              {...register("goodWithAnimals")}
            />
            <Checkbox label="Necesita patio" disabled={dis} {...register("needsYard")} />
            <Checkbox
              label="Requiere cuidados especiales"
              disabled={dis}
              {...register("specialCare")}
            />
          </div>
          <FormField label="Temperamento" error={errors.temperament?.message}>
            <Textarea disabled={dis} {...register("temperament")} />
          </FormField>
          {specialCare && (
            <FormField
              label="Notas de cuidados especiales"
              error={errors.specialCareNotes?.message}
            >
              <Textarea {...register("specialCareNotes")} />
            </FormField>
          )}
          <FormField label="Descripción física / notas" error={errors.physicalDescription?.message}>
            <Textarea {...register("physicalDescription")} />
          </FormField>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Foto" description="JPG, PNG o WEBP, máximo 5 MB." />
        <CardBody className="flex flex-wrap items-center gap-4">
          <AnimalPhoto
            url={preview ?? animal?.photoUrl}
            species={(watch("species") as Animal["species"]) || "OTRO"}
            alt="Vista previa de la foto"
            className="h-28 w-28 rounded-lg"
          />
          <div className="space-y-1">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <ImagePlus className="h-4 w-4" aria-hidden />
              {animal?.photoUrl || photo ? "Cambiar foto" : "Seleccionar foto"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={onPhoto}
              />
            </label>
            {photo && <p className="text-xs text-slate-500">{photo.name}</p>}
            {photoError && (
              <p className="text-xs text-red-600" role="alert">
                {photoError}
              </p>
            )}
          </div>
        </CardBody>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {isEdit ? "Guardar cambios" : "Registrar animal"}
        </Button>
      </div>
    </form>
  );
}
