import { z } from "zod";

/** Misma política que el backend (CU02): mín. 8 caracteres, letra y número. */
export const passwordSchema = z
  .string()
  .min(8, "Debe tener al menos 8 caracteres")
  .max(72, "Debe tener como máximo 72 caracteres")
  .regex(/[A-Za-z]/, "Debe incluir al menos una letra")
  .regex(/\d/, "Debe incluir al menos un número");

export const fullNameSchema = z
  .string()
  .trim()
  .min(1, "El nombre es obligatorio")
  .max(150, "Máximo 150 caracteres");

const emptyToUndefined = (v: unknown) =>
  v === "" || v === null || Number.isNaN(v) ? undefined : v;

/** Texto opcional: "" → undefined. */
export const optionalText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(max, `Máximo ${max} caracteres`).optional(),
  );

export const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `${label} es obligatorio`).max(max, `Máximo ${max} caracteres`);

/** Número opcional desde un input (acepta coma decimal). */
export const optionalNumber = (schema: z.ZodNumber) =>
  z.preprocess((v) => {
    const clean = typeof v === "string" ? v.replace(",", ".").trim() : v;
    return emptyToUndefined(clean === undefined || clean === "" ? undefined : Number(clean));
  }, schema.optional());

/** Número obligatorio desde un input (acepta coma decimal). */
export const requiredNumber = (schema: z.ZodNumber, message = "Este campo es obligatorio") =>
  z.preprocess(
    (v) => {
      if (typeof v === "string") {
        const clean = v.replace(",", ".").trim();
        return clean === "" ? undefined : Number(clean);
      }
      return v;
    },
    z.number({ required_error: message, invalid_type_error: "Debe ser un número" }).pipe(schema),
  );

export const requiredDate = (label: string) => z.string().min(1, `${label} es obligatoria`);
export const optionalDate = z.preprocess((v) => (v === "" ? undefined : v), z.string().optional());

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validatePhoto(file: File | undefined | null): string | null {
  if (!file) return null;
  if (!PHOTO_TYPES.includes(file.type)) return "Formato no permitido. Usa JPG, PNG o WEBP";
  if (file.size > MAX_PHOTO_BYTES) return "La foto supera los 5 MB";
  return null;
}
