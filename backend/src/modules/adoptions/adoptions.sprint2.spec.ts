/**
 * Caja blanca del Sprint 2 — HU5 (crear solicitud) y HU11 (decisión y acta).
 * Una prueba por camino independiente (técnica del camino básico).
 * Prisma y AnimalStatusService están simulados con jest.fn().
 */
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AnimalStatusService } from '../animals/animal-status.service';
import type { AuthUser } from '../../common/types';
import { AdoptionsService } from './adoptions.service';

const ADOPTANTE = '11111111-1111-1111-1111-111111111111';
const ANIMAL = '22222222-2222-2222-2222-222222222222';
const SOLICITUD = '33333333-3333-3333-3333-333333333333';
const user = {
  id: '44444444-4444-4444-4444-444444444444',
  role: 'GESTION',
  fullName: 'Gestion',
} as AuthUser;

function setup() {
  const echo = jest.fn(async ({ data }: { data: object }) =>
    Promise.resolve({ id: SOLICITUD, ...data }),
  );
  const tx = {
    $executeRaw: jest.fn().mockResolvedValue(1),
    adoptionRequest: { create: echo, update: echo, findUnique: jest.fn() },
  };
  const prisma = {
    adopterProfile: { findUnique: jest.fn() },
    adoptionRequest: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn() },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const status = {
    getForUpdate: jest.fn(),
    changeStatus: jest.fn().mockResolvedValue({}),
  };
  const service = new AdoptionsService(
    prisma as unknown as PrismaService,
    status as unknown as AnimalStatusService,
  );
  return { service, prisma, tx, status, echo };
}

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('error de base de datos', { code, clientVersion: '6' });

describe('CB-HU5-B AdoptionsService.create (crear solicitud de adopción)', () => {
  const dto = { adopterId: ADOPTANTE, animalId: ANIMAL };

  it('CB-HU5-B-C1: el adoptante no existe → NotFoundException', async () => {
    const { service, prisma, echo } = setup();
    prisma.adopterProfile.findUnique.mockResolvedValue(null);
    await expect(service.create(dto, user)).rejects.toThrow(NotFoundException);
    expect(echo).not.toHaveBeenCalled();
  });

  it('CB-HU5-B-C2: animal disponible → crea la solicitud pendiente y el animal pasa a En proceso', async () => {
    const { service, prisma, status } = setup();
    prisma.adopterProfile.findUnique.mockResolvedValue({ id: ADOPTANTE });
    status.getForUpdate.mockResolvedValue({ id: ANIMAL, status: 'DISPONIBLE_ADOPCION' });
    const r = (await service.create(dto, user)) as unknown as {
      status: string;
      responsibleUserId: string;
    };
    expect(r.status).toBe('PENDIENTE');
    expect(r.responsibleUserId).toBe(user.id);
    expect(status.changeStatus).toHaveBeenCalledWith(
      expect.anything(),
      { id: ANIMAL, status: 'DISPONIBLE_ADOPCION' },
      'EN_PROCESO_ADOPCION',
    );
  });

  it('CB-HU5-B-C3: el animal ya tiene una solicitud en curso → ConflictException', async () => {
    const { service, prisma, status, echo } = setup();
    prisma.adopterProfile.findUnique.mockResolvedValue({ id: ADOPTANTE });
    status.getForUpdate.mockResolvedValue({ id: ANIMAL, status: 'EN_PROCESO_ADOPCION' });
    await expect(service.create(dto, user)).rejects.toThrow(
      'El animal ya tiene una solicitud de adopción activa',
    );
    expect(echo).not.toHaveBeenCalled();
  });

  it('CB-HU5-B-C4: el animal no está disponible (Ingresado) → ConflictException', async () => {
    const { service, prisma, status, echo } = setup();
    prisma.adopterProfile.findUnique.mockResolvedValue({ id: ADOPTANTE });
    status.getForUpdate.mockResolvedValue({ id: ANIMAL, status: 'INGRESADO' });
    await expect(service.create(dto, user)).rejects.toThrow(
      'El animal no está disponible para adopción (estado: Ingresado)',
    );
    expect(echo).not.toHaveBeenCalled();
  });

  it('CB-HU5-B-C5: la base rechaza una segunda solicitud activa (P2002) → ConflictException', async () => {
    const { service, prisma, status, echo } = setup();
    prisma.adopterProfile.findUnique.mockResolvedValue({ id: ADOPTANTE });
    status.getForUpdate.mockResolvedValue({ id: ANIMAL, status: 'DISPONIBLE_ADOPCION' });
    echo.mockRejectedValueOnce(prismaError('P2002'));
    await expect(service.create(dto, user)).rejects.toThrow(ConflictException);
  });

  it('CB-HU5-B-C6: la base lanza otro error conocido (P2003) → se propaga el mismo error', async () => {
    const { service, prisma, status, echo } = setup();
    prisma.adopterProfile.findUnique.mockResolvedValue({ id: ADOPTANTE });
    status.getForUpdate.mockResolvedValue({ id: ANIMAL, status: 'DISPONIBLE_ADOPCION' });
    const original = prismaError('P2003');
    echo.mockRejectedValueOnce(original);
    await expect(service.create(dto, user)).rejects.toBe(original);
  });

  it('CB-HU5-B-C7: la creación lanza un error que no es de Prisma → se propaga el mismo error', async () => {
    const { service, prisma, status, echo } = setup();
    prisma.adopterProfile.findUnique.mockResolvedValue({ id: ADOPTANTE });
    status.getForUpdate.mockResolvedValue({ id: ANIMAL, status: 'DISPONIBLE_ADOPCION' });
    const original = new Error('conexión interrumpida');
    echo.mockRejectedValueOnce(original);
    await expect(service.create(dto, user)).rejects.toBe(original);
  });
});

describe('CB-HU11-A AdoptionsService.decide (registrar la decisión de adopción)', () => {
  const aprobar = {
    result: 'APROBADA' as const,
    notes: 'Visita domiciliaria favorable',
    decisionDate: '2026-11-17T00:00:00-04:00',
    deliveryDate: '2026-11-18T10:00:00-04:00',
  };
  const rechazar = {
    result: 'RECHAZADA' as const,
    notes: 'No cuenta con espacio',
    decisionDate: '2026-11-17T00:00:00-04:00',
  };
  const enEvaluacion = {
    id: SOLICITUD,
    animalId: ANIMAL,
    status: 'EN_EVALUACION',
    evaluationNotes: null,
  };

  it('CB-HU11-A-C1: rechazar una solicitud en evaluación → queda rechazada y el animal vuelve a estar disponible', async () => {
    const { service, tx, status, echo } = setup();
    tx.adoptionRequest.findUnique.mockResolvedValue(enEvaluacion);
    status.getForUpdate.mockResolvedValue({ id: ANIMAL, status: 'EN_PROCESO_ADOPCION' });
    await service.decide(SOLICITUD, rechazar, user);
    expect((echo.mock.calls[0][0] as { data: { status: string } }).data.status).toBe('RECHAZADA');
    expect(status.changeStatus).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'DISPONIBLE_ADOPCION',
    );
  });

  it('CB-HU11-A-C2: aprobar sin fecha de entrega → BadRequestException', async () => {
    const { service, prisma } = setup();
    const { deliveryDate: _sinFecha, ...sinEntrega } = aprobar;
    void _sinFecha;
    await expect(service.decide(SOLICITUD, sinEntrega, user)).rejects.toThrow(
      'La fecha de entrega es obligatoria al aprobar',
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('CB-HU11-A-C3: aprobar con una entrega anterior a la decisión → BadRequestException', async () => {
    const { service, prisma } = setup();
    await expect(
      service.decide(SOLICITUD, { ...aprobar, deliveryDate: '2026-11-10T10:00:00-04:00' }, user),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('CB-HU11-A-C4: aprobar una solicitud en evaluación → queda aprobada y el animal pasa a Adoptado', async () => {
    const { service, tx, status, echo } = setup();
    tx.adoptionRequest.findUnique.mockResolvedValue(enEvaluacion);
    status.getForUpdate.mockResolvedValue({ id: ANIMAL, status: 'EN_PROCESO_ADOPCION' });
    await service.decide(SOLICITUD, aprobar, user);
    const data = (
      echo.mock.calls[0][0] as {
        data: { status: string; deliveryDate: Date; evaluationNotes: string };
      }
    ).data;
    expect(data.status).toBe('APROBADA');
    expect(data.deliveryDate).toBeInstanceOf(Date);
    expect(data.evaluationNotes).toContain('Gestion · Aprobada] Visita domiciliaria favorable');
    expect(status.changeStatus).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'ADOPTADO',
    );
  });

  it('CB-HU11-A-C5: rechazar una solicitud que no existe → NotFoundException', async () => {
    const { service, tx, echo } = setup();
    tx.adoptionRequest.findUnique.mockResolvedValue(null);
    await expect(service.decide(SOLICITUD, rechazar, user)).rejects.toThrow(NotFoundException);
    expect(echo).not.toHaveBeenCalled();
  });

  it('CB-HU11-A-C6: rechazar una solicitud pendiente (no en evaluación) → ConflictException', async () => {
    const { service, tx, echo } = setup();
    tx.adoptionRequest.findUnique.mockResolvedValue({ ...enEvaluacion, status: 'PENDIENTE' });
    await expect(service.decide(SOLICITUD, rechazar, user)).rejects.toThrow(
      'Solo se puede registrar el resultado de una solicitud en evaluación (estado actual: Pendiente)',
    );
    expect(echo).not.toHaveBeenCalled();
  });

  it('CB-HU11-A-C7: aprobar una solicitud ya rechazada → ConflictException', async () => {
    const { service, tx, echo } = setup();
    tx.adoptionRequest.findUnique.mockResolvedValue({ ...enEvaluacion, status: 'RECHAZADA' });
    await expect(service.decide(SOLICITUD, aprobar, user)).rejects.toThrow(ConflictException);
    expect(echo).not.toHaveBeenCalled();
  });
});

describe('CB-HU11-B AdoptionsService.act (obtener el acta de entrega)', () => {
  it('CB-HU11-B-C1: la solicitud no existe → NotFoundException', async () => {
    const { service, prisma } = setup();
    prisma.adoptionRequest.findUnique.mockResolvedValue(null);
    await expect(service.act(SOLICITUD)).rejects.toThrow(NotFoundException);
    expect(prisma.adoptionRequest.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it('CB-HU11-B-C2: la solicitud no está aprobada → ConflictException', async () => {
    const { service, prisma } = setup();
    prisma.adoptionRequest.findUnique.mockResolvedValue({ id: SOLICITUD, status: 'EN_EVALUACION' });
    await expect(service.act(SOLICITUD)).rejects.toThrow(
      'Disponible solo para solicitudes aprobadas',
    );
    expect(prisma.adoptionRequest.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it('CB-HU11-B-C3: solicitud aprobada → devuelve el acta con animal, adoptante, entrega, responsable y compromisos', async () => {
    const { service, prisma } = setup();
    prisma.adoptionRequest.findUnique.mockResolvedValue({ id: SOLICITUD, status: 'APROBADA' });
    const entrega = new Date('2026-11-18T14:00:00Z');
    prisma.adoptionRequest.findUniqueOrThrow.mockResolvedValue({
      id: SOLICITUD,
      requestDate: new Date('2026-11-11T14:00:00Z'),
      decisionDate: new Date('2026-11-17T04:00:00Z'),
      deliveryDate: entrega,
      responsibleUser: { id: user.id, fullName: 'Gestion' },
      adopterProfile: {
        housingType: 'CASA_CON_PATIO',
        person: { firstName: 'Rosa', lastName: 'Quiroga' },
      },
      animal: { code: 'ZOO-2026-0006', name: 'Lola', vaccinations: [] },
    });
    const acta = await service.act(SOLICITUD);
    expect(acta.actNumber).toBe('ACTA-ZOO-2026-0006');
    expect(acta.animal.name).toBe('Lola');
    expect(acta.adopter.firstName).toBe('Rosa');
    expect(acta.request.deliveryDate).toBe(entrega);
    expect(acta.request.responsible.fullName).toBe('Gestion');
    expect(acta.commitments).toHaveLength(7);
  });
});
