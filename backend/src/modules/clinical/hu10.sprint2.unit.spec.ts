/**
 * Pruebas unitarias del Sprint 2 — HU10 Gestión de Períodos de Cuarentena.
 * Sin base de datos ni red: Prisma y AnimalStatusService están simulados con jest.fn().
 */
import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AnimalStatusService } from '../animals/animal-status.service';
import { clinicalStatusFor } from '../animals/animal-status';
import { createValidationPipe } from '../../common/validation';
import type { AuthUser } from '../../common/types';
import { ClinicalService } from './clinical.service';
import { CreateControlDto, CreatePeriodDto } from './dto/clinical.dto';

const ANIMAL = '11111111-1111-1111-1111-111111111111';
const vet = { id: '22222222-2222-2222-2222-222222222222', role: 'VETERINARIO' } as AuthUser;
const periodo = {
  type: 'CUARENTENA' as const,
  reason: 'Contacto con un caso sospechoso',
  startDate: '2026-11-17T10:00:00-04:00',
};

async function camposConError(body: object, metatype: new () => object): Promise<string[]> {
  try {
    await createValidationPipe().transform(body, { type: 'body', metatype });
    return [];
  } catch (e) {
    const r = (e as BadRequestException).getResponse() as { errors: { field: string }[] };
    return r.errors.map((x) => x.field);
  }
}

function setup(estado: string, abierto: object | null) {
  const create = jest.fn(({ data }: { data: object }) => ({ id: 'p1', ...data }));
  const tx = { quarantinePeriod: { findFirst: jest.fn().mockResolvedValue(abierto), create } };
  const prisma = { $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)) };
  const status = {
    getForUpdate: jest.fn().mockResolvedValue({ id: ANIMAL, status: estado }),
    changeStatus: jest.fn(),
    syncClinicalStatus: jest.fn(),
  };
  const service = new ClinicalService(
    prisma as unknown as PrismaService,
    status as unknown as AnimalStatusService,
  );
  return { service, create };
}

/** Servicio con un período activo (iniciado el 17/11/2026) y la creación de controles simulada. */
function controlSetup() {
  const create = jest.fn(({ data }: { data: object }) => ({ id: 'c1', ...data }));
  const prisma = {
    quarantinePeriod: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'p1',
        status: 'ACTIVO',
        startDate: new Date('2026-11-17T14:00:00Z'),
        _count: { controls: 0 },
      }),
    },
    $transaction: jest.fn((fn: (t: object) => unknown) => fn({ quarantineControl: { create } })),
  };
  const service = new ClinicalService(
    prisma as unknown as PrismaService,
    {} as AnimalStatusService,
  );
  return { service, create };
}

describe('HU10 Gestión de Períodos de Cuarentena — pruebas unitarias', () => {
  it('PU-HU10-01 rechaza un período de un tipo que no es Observación ni Cuarentena', async () => {
    // Arrange
    const invalido = { ...periodo, type: 'AISLAMIENTO' };
    // Act
    const errores = await camposConError(invalido, CreatePeriodDto);
    // Assert
    expect(errores).toEqual(['type']);
  });

  it('PU-HU10-02 rechaza un control sin la condición observada del animal', async () => {
    // Arrange
    const control = { controlDate: '2026-11-17T12:00:00-04:00', observations: 'Sin novedades' };
    // Act
    const errores = await camposConError(control, CreateControlDto);
    // Assert
    expect(errores).toEqual(['animalCondition']);
  });

  it('PU-HU10-03 la situación del animal depende del tipo de período abierto', () => {
    // Arrange
    const cuarentena = { activePeriodType: 'CUARENTENA' as const, hasActiveTreatment: true };
    const observacion = { activePeriodType: 'OBSERVACION' as const, hasActiveTreatment: false };
    // Act
    const a = clinicalStatusFor(cuarentena);
    const b = clinicalStatusFor(observacion);
    // Assert
    expect(a).toBe('EN_CUARENTENA');
    expect(b).toBe('EN_OBSERVACION');
  });

  it('PU-HU10-04 rechaza abrir un segundo período si ya hay uno abierto', async () => {
    // Arrange
    const { service, create } = setup('EN_OBSERVACION', { id: 'p0', status: 'ACTIVO' });
    // Act
    const intento = service.startPeriod(ANIMAL, periodo, vet);
    // Assert
    await expect(intento).rejects.toThrow(
      'El animal ya tiene un periodo de observación/cuarentena activo',
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('PU-HU10-05 rechaza la cuarentena de un animal con una solicitud de adopción en curso', async () => {
    // Arrange
    const { service, create } = setup('EN_PROCESO_ADOPCION', null);
    // Act
    const intento = service.startPeriod(ANIMAL, periodo, vet);
    // Assert
    await expect(intento).rejects.toThrow(/solicitud de adopción activa/);
    expect(create).not.toHaveBeenCalled();
  });

  it('PU-HU10-06 el control se guarda con su fecha, lo observado y el responsable', async () => {
    // Arrange
    const { service, create } = controlSetup();
    const dto = {
      controlDate: '2026-11-18T09:00:00-04:00',
      animalCondition: 'Estable',
      observations: 'Come bien',
    };
    // Act
    await service.addControl('p1', dto, vet);
    // Assert
    const data = (create.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data).toMatchObject({
      animalCondition: 'Estable',
      observations: 'Come bien',
      createdById: vet.id,
    });
    expect((data.controlDate as Date).toISOString()).toBe('2026-11-18T13:00:00.000Z');
  });
});
