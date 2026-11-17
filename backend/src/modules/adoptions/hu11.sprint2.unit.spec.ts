/**
 * Pruebas unitarias del Sprint 2 — HU11 Gestionar Proceso de Adopción.
 * Sin base de datos ni red: Prisma y AnimalStatusService están simulados con jest.fn().
 */
import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AnimalStatusService } from '../animals/animal-status.service';
import { createValidationPipe } from '../../common/validation';
import type { AuthUser } from '../../common/types';
import { AdoptionsService, appendNote } from './adoptions.service';
import { DecisionDto } from './dto/adoptions.dto';
import { animalStatusAfter, canRequestTransition } from './request-status';

const SOLICITUD = '33333333-3333-3333-3333-333333333333';
const user = { id: 'g1', role: 'GESTION', fullName: 'Gestion de Prueba' } as AuthUser;

function setup(solicitud: object, animal: object = {}) {
  const update = jest.fn(({ data }: { data: object }) => ({ id: SOLICITUD, ...data }));
  const tx = {
    $executeRaw: jest.fn().mockResolvedValue(1),
    adoptionRequest: { findUnique: jest.fn().mockResolvedValue(solicitud), update },
  };
  const prisma = { $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)) };
  const status = { getForUpdate: jest.fn().mockResolvedValue(animal), changeStatus: jest.fn() };
  const service = new AdoptionsService(
    prisma as unknown as PrismaService,
    status as unknown as AnimalStatusService,
  );
  return { service, update, status };
}

describe('HU11 Gestionar Proceso de Adopción — pruebas unitarias', () => {
  afterEach(() => jest.useRealTimers());

  it('PU-HU11-01 solo se aprueba o rechaza desde En evaluación', () => {
    // Arrange
    const casos = [
      ['EN_EVALUACION', 'APROBADA'],
      ['EN_EVALUACION', 'RECHAZADA'],
      ['PENDIENTE', 'APROBADA'],
      ['APROBADA', 'CANCELADA'],
    ] as const;
    // Act
    const permitido = casos.map(([de, a]) => canRequestTransition(de, a));
    // Assert
    expect(permitido).toEqual([true, true, false, false]);
  });

  it('PU-HU11-02 la situación final del animal según el resultado de la solicitud', () => {
    // Arrange
    const resultados = ['APROBADA', 'RECHAZADA', 'CANCELADA'] as const;
    // Act
    const situaciones = resultados.map((r) => animalStatusAfter(r));
    // Assert
    expect(situaciones).toEqual(['ADOPTADO', 'DISPONIBLE_ADOPCION', 'DISPONIBLE_ADOPCION']);
  });

  it('PU-HU11-03 rechaza registrar un rechazo sin el motivo', async () => {
    // Arrange
    const pipe = createValidationPipe();
    const sinMotivo = { result: 'RECHAZADA', decisionDate: '2026-11-17' };
    // Act
    const error = (await pipe
      .transform(sinMotivo, { type: 'body', metatype: DecisionDto })
      .catch((e: unknown) => e)) as BadRequestException;
    // Assert
    expect(error).toBeInstanceOf(BadRequestException);
    const campos = (error.getResponse() as { errors: { field: string }[] }).errors.map(
      (e) => e.field,
    );
    expect(campos).toEqual(['notes']);
  });

  it('PU-HU11-04 cada observación queda con su fecha y su autor sin borrar las anteriores', () => {
    // Arrange
    jest.useFakeTimers().setSystemTime(new Date('2026-11-17T14:30:00.000Z'));
    const anterior = '[16/11/26, 09:00 · Otra persona · Pendiente] Primera nota';
    // Act
    const notas = appendNote(anterior, 'Visita domiciliaria realizada', user, 'En evaluación');
    // Assert
    expect(notas?.startsWith(anterior)).toBe(true);
    expect(notas).toContain('17/11/26');
    expect(notas).toContain(
      '10:30 · Gestion de Prueba · En evaluación] Visita domiciliaria realizada',
    );
  });

  it('PU-HU11-05 no se agregan observaciones a una solicitud ya aprobada', async () => {
    // Arrange
    const { service, update } = setup({ id: SOLICITUD, status: 'APROBADA', evaluationNotes: null });
    // Act
    const intento = service.addNote(SOLICITUD, 'Nota tardía', user);
    // Assert
    await expect(intento).rejects.toThrow('Solo se agregan notas a solicitudes activas');
    expect(update).not.toHaveBeenCalled();
  });

  it('PU-HU11-06 al cancelar la solicitud el animal vuelve a estar disponible para adopción', async () => {
    // Arrange
    const { service, update, status } = setup(
      { id: SOLICITUD, animalId: 'n1', status: 'EN_EVALUACION', evaluationNotes: null },
      { id: 'n1', status: 'EN_PROCESO_ADOPCION' },
    );
    // Act
    await service.changeStatus(
      SOLICITUD,
      { status: 'CANCELADA', notes: 'El adoptante desistió' },
      user,
    );
    // Assert
    expect((update.mock.calls[0][0] as { data: { status: string } }).data.status).toBe('CANCELADA');
    expect(status.changeStatus).toHaveBeenCalledWith(
      expect.anything(),
      { id: 'n1', status: 'EN_PROCESO_ADOPCION' },
      'DISPONIBLE_ADOPCION',
    );
  });
});
