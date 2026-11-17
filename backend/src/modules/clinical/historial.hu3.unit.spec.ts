/**
 * Pruebas unitarias del Sprint 1 — HU3 Gestionar Historial Clínico.
 * Sin base de datos ni red: Prisma está simulado con jest.fn().
 */
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PrismaService } from '../../prisma/prisma.service';
import type { StorageService } from '../storage/storage.service';
import type { AnimalStatusService } from '../animals/animal-status.service';
import { AnimalsService } from '../animals/animals.service';
import { AnimalsController } from '../animals/animals.controller';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthUser } from '../../common/types';
import { ClinicalService } from './clinical.service';

const ANIMAL = '11111111-1111-1111-1111-111111111111';
const vet = { id: '22222222-2222-2222-2222-222222222222', role: 'VETERINARIO' } as AuthUser;
const otroVet = { id: '55555555-5555-5555-5555-555555555555', role: 'VETERINARIO' } as AuthUser;
const admin = { id: '66666666-6666-6666-6666-666666666666', role: 'ADMIN' } as AuthUser;

function historial(consultas: object[], vacunas: object[], periodos: object[]) {
  const prisma = {
    animal: { findFirst: jest.fn().mockResolvedValue({ id: ANIMAL }) },
    veterinaryConsultation: { findMany: jest.fn().mockResolvedValue(consultas) },
    vaccination: { findMany: jest.fn().mockResolvedValue(vacunas) },
    quarantinePeriod: { findMany: jest.fn().mockResolvedValue(periodos) },
  };
  const service = new AnimalsService(
    prisma as unknown as PrismaService,
    {} as AnimalStatusService,
    {} as StorageService,
  );
  return { service, prisma };
}

function clinica() {
  const echo = jest.fn(({ data }: { data: object }) => ({ id: 'r', ...data }));
  const tx = { treatment: { update: echo }, vaccination: { update: echo } };
  const prisma = {
    treatment: { findUnique: jest.fn() },
    vaccination: { findUnique: jest.fn() },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const service = new ClinicalService(
    prisma as unknown as PrismaService,
    {} as AnimalStatusService,
  );
  return { service, prisma, echo };
}

describe('HU3 Gestionar Historial Clínico — pruebas unitarias', () => {
  it('PU-HU3-01 el historial ordena los registros del más reciente al más antiguo', async () => {
    // Arrange
    const { service } = historial(
      [{ id: 'c1', consultationDate: new Date('2026-10-05T10:00:00Z') }],
      [{ id: 'v1', applicationDate: new Date('2026-11-12T00:00:00Z') }],
      [{ id: 'p1', startDate: new Date('2026-09-20T00:00:00Z') }],
    );
    // Act
    const { data } = await service.timeline(ANIMAL, {});
    // Assert
    expect(data.map((r) => r.id)).toEqual(['v1', 'c1', 'p1']);
  });

  it('PU-HU3-02 el historial de un animal sin registros devuelve una lista vacía', async () => {
    // Arrange
    const { service } = historial([], [], []);
    // Act
    const resultado = await service.timeline(ANIMAL, {});
    // Assert
    expect(resultado).toEqual({ data: [] });
  });

  it('PU-HU3-03 cada registro del historial lleva fecha, tipo y profesional', async () => {
    // Arrange
    const fecha = new Date('2026-11-10T09:00:00Z');
    const { service, prisma } = historial([{ id: 'c1', consultationDate: fecha }], [], []);
    // Act
    const { data } = await service.timeline(ANIMAL, {});
    // Assert
    expect(data[0]).toMatchObject({ type: 'CONSULTA', date: fecha, id: 'c1' });
    const args = (prisma.veterinaryConsultation.findMany.mock.calls[0] as unknown[])[0];
    expect(args).toMatchObject({ include: { veterinarian: expect.any(Object) as object } });
  });

  it('PU-HU3-04 otro veterinario no puede corregir un tratamiento ajeno', async () => {
    // Arrange
    const { service, prisma, echo } = clinica();
    prisma.treatment.findUnique.mockResolvedValue({
      id: 't1',
      status: 'ACTIVO',
      startDate: new Date('2026-11-01'),
      endDate: null,
      consultation: { animalId: ANIMAL, veterinarianId: vet.id },
    });
    // Act
    const intento = service.updateTreatment('t1', { observations: 'Cambio' }, otroVet);
    // Assert
    await expect(intento).rejects.toThrow(ForbiddenException);
    expect(echo).not.toHaveBeenCalled();
  });

  it('PU-HU3-05 el administrador puede corregir una vacunación registrada por otro', async () => {
    // Arrange
    const { service, prisma, echo } = clinica();
    prisma.vaccination.findUnique.mockResolvedValue({
      id: 'v1',
      appliedById: vet.id,
      vaccineId: 'vac',
      applicationDate: new Date('2026-11-10'),
      nextDoseDate: null,
    });
    // Act
    await service.updateVaccination('v1', { batchNumber: 'LOTE-2' }, admin);
    // Assert
    expect(echo).toHaveBeenCalledTimes(1);
    expect(echo.mock.calls[0][0].data).toEqual({ batchNumber: 'LOTE-2' });
  });

  it('PU-HU3-06 un usuario del portal público no puede ver el historial', () => {
    // Arrange
    const guard = new RolesGuard(new Reflector());
    const contexto = {
      getHandler: () => Reflect.get(AnimalsController.prototype, 'timeline') as object,
      getClass: () => AnimalsController,
      switchToHttp: () => ({ getRequest: () => ({ user: { id: 'c', role: 'CLIENTE' } }) }),
    } as unknown as ExecutionContext;
    // Act
    const acceder = () => guard.canActivate(contexto);
    // Assert
    expect(acceder).toThrow(ForbiddenException);
  });
});
