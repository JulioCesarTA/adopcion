import { z } from "zod";
import {
  optionalDate,
  optionalNumber,
  optionalText,
  requiredDate,
  requiredText,
} from "@/lib/validation";

export const medicationSchema = z.object({
  name: requiredText("El nombre", 150),
  dose: requiredText("La dosis", 50),
  administrationRoute: requiredText("La vía", 100),
  frequency: requiredText("La frecuencia", 100),
  duration: requiredText("La duración", 100),
  observations: optionalText(2000),
});

export const treatmentSchema = z
  .object({
    description: requiredText("La descripción", 5000),
    instructions: requiredText("Las instrucciones", 5000),
    startDate: requiredDate("La fecha de inicio"),
    endDate: optionalDate,
    observations: optionalText(5000),
    medications: z.array(medicationSchema),
  })
  .refine((t) => !t.endDate || t.endDate >= t.startDate, {
    path: ["endDate"],
    message: "La fecha de fin no puede ser anterior a la de inicio",
  });

export const diagnosisSchema = z.object({
  description: requiredText("La descripción", 5000),
  observations: optionalText(5000),
});

export const consultationSchema = z.object({
  consultationDate: requiredDate("La fecha y hora"),
  reason: requiredText("El motivo", 255),
  weightKg: optionalNumber(z.number().gt(0, "El peso debe ser mayor a 0").max(9999)),
  temperatureC: optionalNumber(
    z.number().min(30, "Debe estar entre 30 y 45 °C").max(45, "Debe estar entre 30 y 45 °C"),
  ),
  clinicalEvaluation: requiredText("La evaluación clínica", 5000),
  observations: optionalText(5000),
});

export const emptyMedication = {
  name: "",
  dose: "",
  administrationRoute: "",
  frequency: "",
  duration: "",
  observations: "",
};
