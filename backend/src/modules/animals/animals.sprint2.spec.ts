/**
 * Caja blanca del Sprint 2 — HU10: habilitar un animal para adopción.
 * Una prueba por camino independiente (técnica del camino básico).
 * Prisma y AnimalStatusService están simulados con jest.fn().
 */
import { ConflictException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type { StorageService } from '../storage/storage.service';
import type { AnimalStatusService } from './animal-status.service';
import { AnimalsService } from './animals.service';

const ID = '11111111-1111-1111-1111-111111111111';

function setup(estado: string, impedimentos: string[]) {
  const tx = {};
  const prisma = { $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)) };
  const status = {
    getForUpdate: jest.fn().mockResolvedValue({ id: ID, status: estado }),
    adoptionBlockers: jest.fn().mockResolvedValue(impedimentos),
    changeStatus: jest.fn((_tx: unknown, a: { id: string }, to: string) => ({
      id: a.id,
      status: to,
    })),
  };
  const service = new AnimalsService(
    prisma as unknown as PrismaService,
    status as unknown as AnimalStatusService,
    {} as StorageService,
  );
  return { service, status };
}

describe('CB-HU10-B AnimalsService.enableAdoption (habilitar para adopción)', () => {
  it('CB-HU10-B-C1: el animal ya está disponible para adopción → ConflictException', async () => {
    const { service, status } = setup('DISPONIBLE_ADOPCION', []);
    await expect(service.enableAdoption(ID)).rejects.toThrow(
      'El animal ya está disponible para adopción',
    );
    expect(status.adoptionBlockers).not.toHaveBeenCalled();
  });

  it('CB-HU10-B-C2: el animal tiene una cuarentena activa → ConflictException con el impedimento', async () => {
    const { service, status } = setup('EN_CUARENTENA', ['Tiene cuarentena activa']);
    const err = (await service.enableAdoption(ID).catch((e: unknown) => e)) as ConflictException;
    expect(err).toBeInstanceOf(ConflictException);
    expect(err.getResponse()).toMatchObject({ errors: ['Tiene cuarentena activa'] });
    expect(status.changeStatus).not.toHaveBeenCalled();
  });

  it('CB-HU10-B-C3: el animal no tiene impedimentos → pasa a Disponible para adopción', async () => {
    const { service, status } = setup('INGRESADO', []);
    const r = await service.enableAdoption(ID);
    expect(r.status).toBe('DISPONIBLE_ADOPCION');
    expect(status.changeStatus).toHaveBeenCalledTimes(1);
  });
});
