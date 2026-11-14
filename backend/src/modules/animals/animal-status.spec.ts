import { ConflictException } from '@nestjs/common';
import { assertTransition, canTransition, clinicalStatusFor } from './animal-status';
import {
  animalStatusAfter,
  assertRequestTransition,
  canRequestTransition,
} from '../adoptions/request-status';

describe('máquina de estados del animal', () => {
  it.each([
    ['INGRESADO', 'EN_CUARENTENA'],
    ['EN_CUARENTENA', 'INGRESADO'],
    ['INGRESADO', 'DISPONIBLE_ADOPCION'],
    ['DISPONIBLE_ADOPCION', 'EN_PROCESO_ADOPCION'],
    ['EN_PROCESO_ADOPCION', 'ADOPTADO'],
    ['EN_PROCESO_ADOPCION', 'DISPONIBLE_ADOPCION'],
    ['ADOPTADO', 'INGRESADO'],
    ['INGRESADO', 'FALLECIDO'],
    ['DISPONIBLE_ADOPCION', 'DEVUELTO'],
  ] as const)('permite %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each([
    ['INGRESADO', 'ADOPTADO'],
    ['INGRESADO', 'EN_PROCESO_ADOPCION'],
    ['EN_CUARENTENA', 'DISPONIBLE_ADOPCION'],
    ['ADOPTADO', 'FALLECIDO'],
    ['FALLECIDO', 'INGRESADO'],
    ['DEVUELTO', 'INGRESADO'],
    ['EN_PROCESO_ADOPCION', 'FALLECIDO'],
  ] as const)('rechaza %s → %s con 409', (from, to) => {
    expect(canTransition(from, to)).toBe(false);
    expect(() => assertTransition(from, to)).toThrow(ConflictException);
  });

  it('precedencia del estado clínico: periodo > tratamiento > ingresado', () => {
    expect(clinicalStatusFor({ activePeriodType: 'CUARENTENA', hasActiveTreatment: true })).toBe(
      'EN_CUARENTENA',
    );
    expect(clinicalStatusFor({ activePeriodType: 'OBSERVACION', hasActiveTreatment: false })).toBe(
      'EN_OBSERVACION',
    );
    expect(clinicalStatusFor({ activePeriodType: null, hasActiveTreatment: true })).toBe(
      'EN_TRATAMIENTO',
    );
    expect(clinicalStatusFor({ activePeriodType: null, hasActiveTreatment: false })).toBe(
      'INGRESADO',
    );
  });
});

describe('máquina de estados de la solicitud', () => {
  it('PENDIENTE → EN_EVALUACION → APROBADA | RECHAZADA; cancelable mientras está activa', () => {
    expect(canRequestTransition('PENDIENTE', 'EN_EVALUACION')).toBe(true);
    expect(canRequestTransition('EN_EVALUACION', 'APROBADA')).toBe(true);
    expect(canRequestTransition('EN_EVALUACION', 'RECHAZADA')).toBe(true);
    expect(canRequestTransition('PENDIENTE', 'CANCELADA')).toBe(true);
    expect(canRequestTransition('EN_EVALUACION', 'CANCELADA')).toBe(true);
  });

  it('PENDIENTE no se aprueba directamente y los estados finales no cambian', () => {
    expect(canRequestTransition('PENDIENTE', 'APROBADA')).toBe(false);
    for (const final of ['APROBADA', 'RECHAZADA', 'CANCELADA'] as const) {
      expect(() => assertRequestTransition(final, 'EN_EVALUACION')).toThrow(ConflictException);
      expect(() => assertRequestTransition(final, 'CANCELADA')).toThrow(ConflictException);
    }
  });

  it('RN-06: estado del animal tras cada resultado', () => {
    expect(animalStatusAfter('APROBADA')).toBe('ADOPTADO');
    expect(animalStatusAfter('RECHAZADA')).toBe('DISPONIBLE_ADOPCION');
    expect(animalStatusAfter('CANCELADA')).toBe('DISPONIBLE_ADOPCION');
    expect(animalStatusAfter('PENDIENTE')).toBe('EN_PROCESO_ADOPCION');
  });
});
