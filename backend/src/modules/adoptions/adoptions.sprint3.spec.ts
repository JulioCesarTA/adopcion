/**
 * Caja blanca del Sprint 3 — HU12 Seguimiento Post-adopción.
 * Una prueba por camino independiente (técnica del camino básico).
 * Prisma y AnimalStatusService están simulados con jest.fn().
 */
import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AnimalStatusService } from '../animals/animal-status.service';
import type { AuthUser } from '../../common/types';
import { AdoptionsService } from './adoptions.service';

const SOLICITUD = '33333333-3333-3333-3333-333333333333';
const user = { id: 'g1', role: 'ADMIN', fullName: 'Gestion de Prueba' } as AuthUser;

function setup(solicitud: object | null) {
  const create = jest.fn(({ data }: { data: object }) => ({ id: 'f1', ...data }));
  const prisma = {
    adoptionRequest: { findUnique: jest.fn().mockResolvedValue(solicitud) },
    adoptionFollowup: { findMany: jest.fn().mockResolvedValue([{ id: 'f2' }, { id: 'f1' }]) },
    $transaction: jest.fn((fn: (t: object) => unknown) => fn({ adoptionFollowup: { create } })),
  };
  const service = new AdoptionsService(
    prisma as unknown as PrismaService,
    {} as AnimalStatusService,
  );
  return { service, prisma, create };
}

const dto = {
  followupDate: '2026-11-17T10:00:00-04:00',
  animalCondition: 'Sano',
  observations: 'Visita domiciliaria',
};
const entrega = new Date('2026-11-15T14:00:00Z');

describe('CB-HU12-A AdoptionsService.createFollowup (registrar un seguimiento)', () => {
  it('CB-HU12-A-C1: la solicitud no existe → NotFoundException', async () => {
    const { service, create } = setup(null);
    await expect(service.createFollowup(SOLICITUD, dto, user)).rejects.toThrow(NotFoundException);
    expect(create).not.toHaveBeenCalled();
  });

  it('CB-HU12-A-C2: la solicitud está en evaluación → ConflictException', async () => {
    const { service, create } = setup({
      id: SOLICITUD,
      status: 'EN_EVALUACION',
      deliveryDate: null,
    });
    await expect(service.createFollowup(SOLICITUD, dto, user)).rejects.toThrow(
      'Disponible solo para solicitudes aprobadas',
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('CB-HU12-A-C3: aprobada sin fecha de entrega registrada → crea el seguimiento', async () => {
    const { service, create } = setup({ id: SOLICITUD, status: 'APROBADA', deliveryDate: null });
    await service.createFollowup(SOLICITUD, dto, user);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('CB-HU12-A-C4: el seguimiento es anterior a la entrega del animal → BadRequestException', async () => {
    const { service, create } = setup({ id: SOLICITUD, status: 'APROBADA', deliveryDate: entrega });
    await expect(
      service.createFollowup(
        SOLICITUD,
        { ...dto, followupDate: '2026-11-14T10:00:00-04:00' },
        user,
      ),
    ).rejects.toThrow('El seguimiento no puede ser anterior a la entrega del animal');
    expect(create).not.toHaveBeenCalled();
  });

  it('CB-HU12-A-C5: aprobada y el seguimiento es posterior a la entrega → crea el seguimiento con su autor', async () => {
    const { service, create } = setup({ id: SOLICITUD, status: 'APROBADA', deliveryDate: entrega });
    const f = (await service.createFollowup(SOLICITUD, dto, user)) as unknown as {
      adoptionRequestId: string;
      createdById: string;
      followupDate: Date;
    };
    expect(create).toHaveBeenCalledTimes(1);
    expect(f.adoptionRequestId).toBe(SOLICITUD);
    expect(f.createdById).toBe(user.id);
    expect(f.followupDate.toISOString()).toBe('2026-11-17T14:00:00.000Z');
  });
});

describe('CB-HU12-B AdoptionsService.listFollowups (listar los seguimientos)', () => {
  it('CB-HU12-B-C1: la solicitud no existe → NotFoundException', async () => {
    const { service, prisma } = setup(null);
    await expect(service.listFollowups(SOLICITUD)).rejects.toThrow('Solicitud no encontrada');
    expect(prisma.adoptionFollowup.findMany).not.toHaveBeenCalled();
  });

  it('CB-HU12-B-C2: la solicitud existe → devuelve sus seguimientos', async () => {
    const { service } = setup({ id: SOLICITUD });
    const lista = await service.listFollowups(SOLICITUD);
    expect(lista).toEqual([{ id: 'f2' }, { id: 'f1' }]);
  });
});
