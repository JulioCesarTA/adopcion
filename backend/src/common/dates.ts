/**
 * RN-11: se guarda en UTC y se razona en hora de Bolivia (America/La_Paz, UTC-4 fijo, sin horario de verano).
 */
export const LA_PAZ_TZ = 'America/La_Paz';
const OFFSET_MS = -4 * 60 * 60 * 1000;

/** Fecha calendario (YYYY-MM-DD) de "hoy" en Bolivia. */
export function todayLaPaz(now = new Date()): string {
  return new Date(now.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

/** Año actual en Bolivia. */
export function currentYearLaPaz(now = new Date()): number {
  return Number(todayLaPaz(now).slice(0, 4));
}

/**
 * Convierte 'YYYY-MM-DD' (o un ISO completo) en un Date a medianoche UTC,
 * que es como Prisma lee/escribe columnas `date`.
 */
export function toDateOnly(value: string | Date): Date {
  const s = typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10);
  return new Date(`${s}T00:00:00.000Z`);
}

/** Suma días a una fecha calendario 'YYYY-MM-DD'. */
export function addDays(dateOnly: string, days: number): string {
  const d = toDateOnly(dateOnly);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Inicio del mes actual en Bolivia, expresado como instante UTC. */
export function startOfMonthLaPaz(now = new Date()): Date {
  const local = todayLaPaz(now).slice(0, 7); // YYYY-MM
  return new Date(new Date(`${local}-01T00:00:00.000Z`).getTime() - OFFSET_MS);
}

/** Inicio del mes (Bolivia) desplazado `monthsBack` meses hacia atrás. */
export function startOfMonthLaPazMinus(monthsBack: number, now = new Date()): Date {
  const [y, m] = todayLaPaz(now).slice(0, 7).split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 - monthsBack, 1));
  return new Date(d.getTime() - OFFSET_MS);
}

/** Diferencia en días entre dos fechas calendario. */
export function diffDays(fromDateOnly: string, toDateOnlyStr: string): number {
  return Math.round(
    (toDateOnly(toDateOnlyStr).getTime() - toDateOnly(fromDateOnly).getTime()) / 86_400_000,
  );
}
