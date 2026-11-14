import { ConflictException } from '@nestjs/common';
import { AnimalStatus } from '@prisma/client';

const S = AnimalStatus;

export const STATUS_LABELS: Record<AnimalStatus, string> = {
  INGRESADO: 'Ingresado',
  EN_OBSERVACION: 'En observación',
  EN_CUARENTENA: 'En cuarentena',
  EN_TRATAMIENTO: 'En tratamiento',
  DISPONIBLE_ADOPCION: 'Disponible para adopción',
  EN_PROCESO_ADOPCION: 'En proceso de adopción',
  ADOPTADO: 'Adoptado',
  FALLECIDO: 'Fallecido',
  DEVUELTO: 'Devuelto / salida',
};

/** Estados "clínicos" dentro de la institución, gobernados por periodos y tratamientos. */
export const CLINICAL_STATES: AnimalStatus[] = [
  S.INGRESADO,
  S.EN_OBSERVACION,
  S.EN_CUARENTENA,
  S.EN_TRATAMIENTO,
];

/** Estados finales de salida (CU22). */
export const EXIT_STATES: AnimalStatus[] = [S.FALLECIDO, S.DEVUELTO];

/** Animales que ya no están en la institución. */
export const OUTSIDE_STATES: AnimalStatus[] = [S.ADOPTADO, S.FALLECIDO, S.DEVUELTO];

/** Estados en los que no se pueden crear registros clínicos nuevos (CU06, CU22). */
export const NO_CLINICAL_RECORDS_STATES: AnimalStatus[] = [S.ADOPTADO, S.FALLECIDO, S.DEVUELTO];

/**
 * Grafo de transiciones (sección 4). Extensiones documentadas en DECISIONS.md:
 * - observación/cuarentena ↔ tratamiento (precedencia: periodo > tratamiento > ingresado);
 * - DISPONIBLE_ADOPCION → INGRESADO ("Retirar de adopción", CU21).
 */
export const TRANSITIONS: Record<AnimalStatus, AnimalStatus[]> = {
  INGRESADO: [
    S.EN_OBSERVACION,
    S.EN_CUARENTENA,
    S.EN_TRATAMIENTO,
    S.DISPONIBLE_ADOPCION,
    S.FALLECIDO,
    S.DEVUELTO,
  ],
  EN_OBSERVACION: [S.INGRESADO, S.EN_TRATAMIENTO, S.FALLECIDO, S.DEVUELTO],
  EN_CUARENTENA: [S.INGRESADO, S.EN_TRATAMIENTO, S.FALLECIDO, S.DEVUELTO],
  EN_TRATAMIENTO: [S.INGRESADO, S.EN_OBSERVACION, S.EN_CUARENTENA, S.FALLECIDO, S.DEVUELTO],
  DISPONIBLE_ADOPCION: [S.EN_PROCESO_ADOPCION, S.INGRESADO, S.FALLECIDO, S.DEVUELTO],
  EN_PROCESO_ADOPCION: [S.ADOPTADO, S.DISPONIBLE_ADOPCION],
  ADOPTADO: [S.INGRESADO],
  FALLECIDO: [],
  DEVUELTO: [],
};

export function canTransition(from: AnimalStatus, to: AnimalStatus): boolean {
  return from === to || TRANSITIONS[from].includes(to);
}

/** Lanza 409 si la transición no está en el grafo. */
export function assertTransition(from: AnimalStatus, to: AnimalStatus): void {
  if (!canTransition(from, to)) {
    throw new ConflictException(
      `Transición de estado no permitida: ${STATUS_LABELS[from]} → ${STATUS_LABELS[to]}`,
    );
  }
}

/**
 * Estado clínico que corresponde según periodos y tratamientos activos
 * (precedencia: observación/cuarentena > tratamiento > ingresado).
 */
export function clinicalStatusFor(input: {
  activePeriodType: 'OBSERVACION' | 'CUARENTENA' | null;
  hasActiveTreatment: boolean;
}): AnimalStatus {
  if (input.activePeriodType === 'CUARENTENA') return S.EN_CUARENTENA;
  if (input.activePeriodType === 'OBSERVACION') return S.EN_OBSERVACION;
  if (input.hasActiveTreatment) return S.EN_TRATAMIENTO;
  return S.INGRESADO;
}
