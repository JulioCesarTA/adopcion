import type { BadgeTone } from "@/components/ui/badge";
import type {
  AnimalSize,
  AnimalStatus,
  ExperienceLevel,
  HousingType,
  Level,
  PeriodType,
  RequestStatus,
  Sex,
  Species,
  TreatmentStatus,
} from "./types";

type Labeled<T extends string> = Record<T, { label: string; tone: BadgeTone }>;

export const ANIMAL_STATUS: Labeled<AnimalStatus> = {
  INGRESADO: { label: "Ingresado", tone: "slate" },
  EN_OBSERVACION: { label: "En observación", tone: "amber" },
  EN_CUARENTENA: { label: "En cuarentena", tone: "red" },
  EN_TRATAMIENTO: { label: "En tratamiento", tone: "violet" },
  DISPONIBLE_ADOPCION: { label: "Disponible para adopción", tone: "green" },
  EN_PROCESO_ADOPCION: { label: "Solicitud en progreso", tone: "blue" },
  ADOPTADO: { label: "Adoptado", tone: "teal" },
  FALLECIDO: { label: "Fallecido", tone: "slate" },
  DEVUELTO: { label: "Devuelto / salida", tone: "slate" },
};

export const REQUEST_STATUS: Labeled<RequestStatus> = {
  PENDIENTE: { label: "Pendiente", tone: "amber" },
  EN_EVALUACION: { label: "En evaluación", tone: "blue" },
  APROBADA: { label: "Aprobada", tone: "green" },
  RECHAZADA: { label: "Rechazada", tone: "red" },
  CANCELADA: { label: "Cancelada", tone: "slate" },
};

export const TREATMENT_STATUS: Labeled<TreatmentStatus> = {
  ACTIVO: { label: "Activo", tone: "violet" },
  FINALIZADO: { label: "Finalizado", tone: "green" },
  SUSPENDIDO: { label: "Suspendido", tone: "slate" },
};

export const LEVEL: Labeled<Level> = {
  ALTA: { label: "Alta", tone: "green" },
  MEDIA: { label: "Media", tone: "amber" },
  BAJA: { label: "Baja", tone: "red" },
  INCOMPATIBLE: { label: "Incompatible", tone: "slate" },
};

export const PERIOD_TYPE: Labeled<PeriodType> = {
  OBSERVACION: { label: "Observación", tone: "amber" },
  CUARENTENA: { label: "Cuarentena", tone: "red" },
};

export const SPECIES: Record<Species, string> = { PERRO: "Perro", GATO: "Gato", OTRO: "Otro" };
export const SEX: Record<Sex, string> = {
  MACHO: "Macho",
  HEMBRA: "Hembra",
  DESCONOCIDO: "Desconocido",
};
export const SIZE: Record<AnimalSize, string> = {
  PEQUENO: "Pequeño",
  MEDIANO: "Mediano",
  GRANDE: "Grande",
};
export const HOUSING: Record<HousingType, string> = {
  DEPARTAMENTO: "Departamento",
  CASA_SIN_PATIO: "Casa sin patio",
  CASA_CON_PATIO: "Casa con patio",
};
export const EXPERIENCE: Record<ExperienceLevel, string> = {
  NINGUNA: "Ninguna",
  BASICA: "Básica",
  AVANZADA: "Avanzada",
};


export function options<T extends string>(map: Record<T, string | { label: string }>) {
  return (Object.keys(map) as T[]).map((value) => {
    const v = map[value];
    return { value, label: typeof v === "string" ? v : v.label };
  });
}

export function animalName(a: { name: string | null; code: string }): string {
  return a.name?.trim() ? a.name : `Sin nombre (${a.code})`;
}

export function formatAge(months: number | null | undefined): string {
  if (months === null || months === undefined) return "—";
  if (months < 12) return `${months} ${months === 1 ? "mes" : "meses"}`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return `${y} ${y === 1 ? "año" : "años"}${m ? ` y ${m} ${m === 1 ? "mes" : "meses"}` : ""}`;
}
