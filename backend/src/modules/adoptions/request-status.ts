import { ConflictException } from '@nestjs/common';
import { RequestStatus } from '@prisma/client';

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  PENDIENTE: 'Pendiente',
  EN_EVALUACION: 'En evaluación',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
  CANCELADA: 'Cancelada',
};

/** Máquina de estados de la solicitud (sección 4). APROBADA, RECHAZADA y CANCELADA son finales. */
export const REQUEST_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  PENDIENTE: ['EN_EVALUACION', 'CANCELADA'],
  EN_EVALUACION: ['APROBADA', 'RECHAZADA', 'CANCELADA'],
  APROBADA: [],
  RECHAZADA: [],
  CANCELADA: [],
};

export function canRequestTransition(from: RequestStatus, to: RequestStatus): boolean {
  return REQUEST_TRANSITIONS[from].includes(to);
}

export function assertRequestTransition(from: RequestStatus, to: RequestStatus): void {
  if (!canRequestTransition(from, to)) {
    throw new ConflictException(
      `Transición no permitida: ${REQUEST_STATUS_LABELS[from]} → ${REQUEST_STATUS_LABELS[to]}`,
    );
  }
}

/** RN-06: estado del animal al que lleva cada estado final de la solicitud. */
export function animalStatusAfter(status: RequestStatus) {
  switch (status) {
    case 'APROBADA':
      return 'ADOPTADO' as const;
    case 'RECHAZADA':
    case 'CANCELADA':
      return 'DISPONIBLE_ADOPCION' as const;
    default:
      return 'EN_PROCESO_ADOPCION' as const;
  }
}
