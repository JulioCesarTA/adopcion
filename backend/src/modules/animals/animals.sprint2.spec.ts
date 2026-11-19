/**
 * Caja blanca del Sprint 2 — HU10: habilitar un animal para adopción.
 * Una prueba por camino independiente (técnica del camino básico).
 * Prisma está simulado con jest.fn().
 */
import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type { StorageService } from '../storage/storage.service';
import type { AnimalStatusService } from './animal-status.service';
import { AnimalsService } from './animals.service';

const ID = '11111111-1111-1111-1111-111111111111';

function setup(estado: string | null) {
  const prisma = {
    animal: {
      findFirst: jest.fn().mockResolvedValue(estado ? { id: ID, status: estado } : null),
      update: jest.fn(({ data }: { data: { status: string } }) => ({ id: ID, ...data })),
    },
  };
  const service = new AnimalsService(
    prisma as unknown as PrismaService,
    {} as AnimalStatusService,
    {} as StorageService,
  );
  return { service, prisma };
}

describe('CB-HU10-B AnimalsService.enableAdoption (habilitar para adopción)', () => {
  it('CB-HU10-B-C1: el animal no existe → NotFoundException', async () => {
    const { service, prisma } = setup(null);
    await expect(service.enableAdoption(ID)).rejects.toThrow(NotFoundException);
    expect(prisma.animal.update).not.toHaveBeenCalled();
  });

  it('CB-HU10-B-C2: el animal está en cuarentena → pasa a Disponible para adopción', async () => {
    const { service, prisma } = setup('EN_CUARENTENA');
    const r = await service.enableAdoption(ID);
    expect(r.status).toBe('DISPONIBLE_ADOPCION');
    expect(prisma.animal.update).toHaveBeenCalledTimes(1);
  });

  it('CB-HU10-B-C3: el animal está ingresado → pasa a Disponible para adopción', async () => {
    const { service, prisma } = setup('INGRESADO');
    const r = await service.enableAdoption(ID);
    expect(r.status).toBe('DISPONIBLE_ADOPCION');
    expect(prisma.animal.update).toHaveBeenCalledWith({
      where: { id: ID },
      data: { status: 'DISPONIBLE_ADOPCION' },
    });
  });
});
