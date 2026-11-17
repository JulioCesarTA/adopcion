/**
 * Caja blanca del Sprint 2 — HU10: cerrar un período de cuarentena u observación.
 * Una prueba por camino independiente (técnica del camino básico).
 * Prisma y AnimalStatusService están simulados con jest.fn().
 */
import { ConflictException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AnimalStatusService } from '../animals/animal-status.service';
import type { AuthUser } from '../../common/types';
import { ClinicalService } from './clinical.service';

const PERIODO = '55555555-5555-5555-5555-555555555555';
const vet = { id: '22222222-2222-2222-2222-222222222222', role: 'VETERINARIO' } as AuthUser;

function setup(periodo: object | null) {
  const update = jest.fn(({ data }: { data: object }) => ({ id: PERIODO, ...data }));
  const tx = { quarantinePeriod: { update } };
  const prisma = {
    quarantinePeriod: { findUnique: jest.fn().mockResolvedValue(periodo) },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const status = { syncClinicalStatus: jest.fn().mockResolvedValue({}) };
  const service = new ClinicalService(
    prisma as unknown as PrismaService,
    status as unknown as AnimalStatusService,
  );
  return { service, update, status };
}

const activo = (controles: number) => ({
  id: PERIODO,
  animalId: 'a1',
  status: 'ACTIVO',
  startDate: new Date('2026-11-03T12:00:00Z'),
  _count: { controls: controles },
});
const cierre = { endDate: '2026-11-17T12:00:00Z', finalObservations: 'Sin signos clínicos' };

describe('CB-HU10-A ClinicalService.closePeriod (cerrar período)', () => {
  it('CB-HU10-A-C1: el período no existe → NotFoundException', async () => {
    const { service, update } = setup(null);
    await expect(service.closePeriod(PERIODO, cierre, vet)).rejects.toThrow(NotFoundException);
    expect(update).not.toHaveBeenCalled();
  });

  it('CB-HU10-A-C2: el período ya está finalizado → ConflictException', async () => {
    const { service, update } = setup({ ...activo(1), status: 'FINALIZADO' });
    await expect(service.closePeriod(PERIODO, cierre, vet)).rejects.toThrow(
      'El periodo ya está finalizado',
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('CB-HU10-A-C3: la fecha de fin es anterior al inicio → BadRequestException', async () => {
    const { service, update } = setup(activo(1));
    await expect(
      service.closePeriod(PERIODO, { endDate: '2026-11-01T12:00:00Z' }, vet),
    ).rejects.toThrow('La fecha de fin no puede ser anterior al inicio del periodo');
    expect(update).not.toHaveBeenCalled();
  });

  it('CB-HU10-A-C4: el período tiene controles → lo cierra y recalcula la situación del animal', async () => {
    const { service, update, status } = setup(activo(2));
    const r = await service.closePeriod(PERIODO, cierre, vet);
    expect(
      (update.mock.calls[0][0] as { data: { status: string; closedById: string } }).data,
    ).toMatchObject({
      status: 'FINALIZADO',
      closedById: vet.id,
    });
    expect(status.syncClinicalStatus).toHaveBeenCalledWith(expect.anything(), 'a1');
    expect(r.controlsCount).toBe(2);
  });

  it('CB-HU10-A-C5: sin controles y sin confirmación → ConflictException que pide confirmar', async () => {
    const { service, update } = setup(activo(0));
    const err = (await service
      .closePeriod(PERIODO, cierre, vet)
      .catch((e: unknown) => e)) as ConflictException;
    expect(err).toBeInstanceOf(ConflictException);
    expect(JSON.stringify(err.getResponse())).toContain('confirmWithoutControls');
    expect(update).not.toHaveBeenCalled();
  });

  it('CB-HU10-A-C6: sin controles pero con confirmación → lo cierra', async () => {
    const { service, update } = setup(activo(0));
    const r = await service.closePeriod(PERIODO, { ...cierre, confirmWithoutControls: true }, vet);
    expect(update).toHaveBeenCalledTimes(1);
    expect(r.controlsCount).toBe(0);
  });
});
