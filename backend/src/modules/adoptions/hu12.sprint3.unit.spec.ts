/**
 * Pruebas unitarias del Sprint 3 — HU12 Seguimiento Post-adopción.
 * Sin base de datos ni red: Prisma y AnimalStatusService están simulados con jest.fn().
 */
import { BadRequestException, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AnimalStatusService } from '../animals/animal-status.service';
import type { StorageService } from '../storage/storage.service';
import { AnimalsService } from '../animals/animals.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { createValidationPipe } from '../../common/validation';
import type { AuthUser } from '../../common/types';
import { AdoptionsController } from './adoptions.controller';
import { AdoptionsService } from './adoptions.service';
import { CreateFollowupDto } from './dto/adoptions.dto';

const SOLICITUD = '33333333-3333-3333-3333-333333333333';
const user = { id: 'g1', role: 'ADMIN', fullName: 'Gestion de Prueba' } as AuthUser;

async function camposConError(body: object): Promise<string[]> {
  try {
    await createValidationPipe().transform(body, { type: 'body', metatype: CreateFollowupDto });
    return [];
  } catch (e) {
    const r = (e as BadRequestException).getResponse() as { errors: { field: string }[] };
    return r.errors.map((x) => x.field);
  }
}

/** Servicio con una solicitud aprobada (entrega el 15/11/2026) y la creación simulada. */
function aprobada() {
  const create = jest.fn(({ data }: { data: object }) => ({ id: 'f1', ...data }));
  const solicitud = {
    id: SOLICITUD,
    animalId: 'n1',
    status: 'APROBADA',
    deliveryDate: new Date('2026-11-15T14:00:00Z'),
  };
  const prisma = {
    adoptionRequest: { findUnique: jest.fn().mockResolvedValue(solicitud) },
    adoptionFollowup: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn((fn: (t: object) => unknown) => fn({ adoptionFollowup: { create } })),
  };
  const service = new AdoptionsService(
    prisma as unknown as PrismaService,
    {} as AnimalStatusService,
  );
  return { service, prisma, create };
}

/** Contexto de una petición al registro de seguimientos con el rol indicado. */
const contexto = (role: string) =>
  ({
    getHandler: () => Reflect.get(AdoptionsController.prototype, 'createFollowup') as object,
    getClass: () => AdoptionsController,
    switchToHttp: () => ({ getRequest: () => ({ user: { id: 'u', role } }) }),
  }) as unknown as ExecutionContext;

describe('HU12 Seguimiento Post-adopción — pruebas unitarias', () => {
  it('PU-HU12-01 rechaza un seguimiento sin el estado general del animal', async () => {
    // Arrange
    const sinEstado = { followupDate: '2026-11-17T10:00:00-04:00', observations: 'Visita' };
    // Act
    const errores = await camposConError(sinEstado);
    // Assert
    expect(errores).toEqual(['animalCondition']);
  });

  it('PU-HU12-02 rechaza un seguimiento sin una fecha válida', async () => {
    // Arrange
    const sinFecha = { followupDate: 'mañana', animalCondition: 'Sano' };
    // Act
    const errores = await camposConError(sinFecha);
    // Assert
    expect(errores).toEqual(['followupDate']);
  });

  it('PU-HU12-03 el autor se toma del usuario autenticado y el seguimiento queda vinculado a la adopción', async () => {
    // Arrange
    const { service, create } = aprobada();
    const cuerpo = {
      followupDate: '2026-11-17T10:00:00-04:00',
      animalCondition: 'Sano',
      createdById: 'otro-usuario',
    };
    // Act
    await service.createFollowup(SOLICITUD, cuerpo, user);
    // Assert
    const data = (create.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data.createdById).toBe(user.id);
    expect(data.adoptionRequestId).toBe(SOLICITUD);
  });

  it('PU-HU12-04 los seguimientos de una solicitud se piden ordenados por fecha', async () => {
    // Arrange
    const { service, prisma } = aprobada();
    // Act
    await service.listFollowups(SOLICITUD);
    // Assert
    expect(prisma.adoptionFollowup.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { adoptionRequestId: SOLICITUD },
        orderBy: { followupDate: 'desc' },
      }),
    );
  });

  it('PU-HU12-05 la ficha del animal incluye los seguimientos de sus adopciones, ordenados por fecha', async () => {
    // Arrange
    const animal = { id: 'n1', status: 'ADOPTADO', periods: [], adoptionRequests: [] };
    const findFirst = jest.fn().mockResolvedValue(animal);
    const prisma = { animal: { findFirst }, treatment: { count: jest.fn().mockResolvedValue(0) } };
    const service = new AnimalsService(
      prisma as unknown as PrismaService,
      {} as AnimalStatusService,
      {} as StorageService,
    );
    // Act
    await service.findOne('n1');
    // Assert
    const args = (findFirst.mock.calls[0] as unknown[])[0] as {
      include: { adoptionRequests: { include: { followups: object } } };
    };
    expect(args.include.adoptionRequests.include.followups).toMatchObject({
      orderBy: { followupDate: 'desc' },
    });
  });

  it('PU-HU12-06 solo el administrador registra seguimientos', () => {
    // Arrange
    const guard = new RolesGuard(new Reflector());
    // Act
    const gestion = guard.canActivate(contexto('ADMIN'));
    const directivo = () => guard.canActivate(contexto('VETERINARIO'));
    // Assert
    expect(gestion).toBe(true);
    expect(directivo).toThrow(ForbiddenException);
  });
});
