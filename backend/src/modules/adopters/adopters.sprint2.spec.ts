/**
 * Caja blanca del Sprint 2 — HU5: carnet de identidad único del adoptante.
 * Una prueba por camino independiente (técnica del camino básico).
 * Prisma está simulado con jest.fn().
 */
import { ConflictException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import { AdoptersService } from './adopters.service';

type ConCi = { assertCiFree(ci: string, exceptPersonId?: string): Promise<void> };

function setup(persona: object | null) {
  const prisma = { person: { findUnique: jest.fn().mockResolvedValue(persona) } };
  const service = new AdoptersService(prisma as unknown as PrismaService);
  return { service: service as unknown as ConCi, prisma };
}

describe('CB-HU5-A AdoptersService.assertCiFree (carnet de identidad único)', () => {
  it('CB-HU5-A-C1: no existe ninguna persona con esa CI → no lanza error', async () => {
    const { service, prisma } = setup(null);
    await expect(service.assertCiFree('9000009 SC')).resolves.toBeUndefined();
    expect(prisma.person.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ci: '9000009 SC' } }),
    );
  });

  it('CB-HU5-A-C2: la CI pertenece a la misma persona que se edita → no lanza error', async () => {
    const { service } = setup({ id: 'p1', adopterProfile: { id: 'a1' } });
    await expect(service.assertCiFree('9000001 SC', 'p1')).resolves.toBeUndefined();
  });

  it('CB-HU5-A-C3: la CI pertenece a otra persona → ConflictException con el adoptante existente', async () => {
    const { service } = setup({ id: 'p1', adopterProfile: { id: 'a1' } });
    const err = (await service
      .assertCiFree('9000001 SC')
      .catch((e: unknown) => e)) as ConflictException;
    expect(err).toBeInstanceOf(ConflictException);
    expect(err.getResponse()).toEqual({
      message: 'Ya existe un adoptante registrado con la CI 9000001 SC',
      errors: { existingAdopterId: 'a1' },
    });
  });
});
