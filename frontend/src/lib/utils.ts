import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** RN-11: todas las fechas se muestran en hora de Bolivia (UTC-4, sin horario de verano). */
export const TIME_ZONE = "America/La_Paz";
const OFFSET = "-04:00";
const OFFSET_MS = -4 * 3_600_000;

const dateFmt = new Intl.DateTimeFormat("es-BO", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("es-BO", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Para columnas `date` (sin hora): se formatean en UTC para no correrse un día. */
const dayFmt = new Intl.DateTimeFormat("es-BO", {
  timeZone: "UTC",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** Instante (timestamptz) → fecha en hora de Bolivia. */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return dateFmt.format(new Date(value));
}

/** Instante (timestamptz) → fecha y hora en hora de Bolivia. */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return dateTimeFmt.format(new Date(value));
}

/** Fecha calendario (columna `date`, 'YYYY-MM-DD…') → dd/mm/aaaa. */
export function formatDay(value: string | null | undefined): string {
  if (!value) return "—";
  return dayFmt.format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}

/** 'YYYY-MM-DD' de hoy en Bolivia (para inputs type="date"). */
export function todayInput(): string {
  return new Date(Date.now() + OFFSET_MS).toISOString().slice(0, 10);
}

/** 'YYYY-MM-DDTHH:mm' de ahora en Bolivia (para inputs type="datetime-local"). */
export function nowInput(): string {
  return new Date(Date.now() + OFFSET_MS).toISOString().slice(0, 16);
}

/** Valor de input datetime-local (hora de Bolivia) → ISO con zona. */
export function dateTimeInputToIso(value: string): string {
  return `${value.length === 16 ? `${value}:00` : value}${OFFSET}`;
}

/** Valor de input date (día en Bolivia) → ISO al inicio del día en Bolivia. */
export function dateInputToIso(value: string): string {
  return `${value}T00:00:00${OFFSET}`;
}

/** ISO → valor para input datetime-local en hora de Bolivia. */
export function isoToDateTimeInput(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(new Date(iso).getTime() + OFFSET_MS).toISOString().slice(0, 16);
}

/** ISO (timestamptz) → valor para input date en hora de Bolivia. */
export function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(new Date(iso).getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

export function formatNumber(n: number | null | undefined, decimals = 0): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("es-BO", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
