/**
 * Pruebas unitarias del Sprint 1 — HU2 Registro de Consulta Clínica.
 * Sin base de datos ni red: Prisma está simulado con jest.fn().
 */
import { BadRequestException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AnimalStatusService } from '../animals/animal-status.service';
import { createValidationPipe } from '../../common/validation';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthUser } from '../../common/types';
import { ClinicalService } from './clinical.service';
import { ClinicalController } from './clinical.controller';
import { CreateConsultationDto, CreateMedicationDto } from './dto/clinical.dto';

const ANIMAL = '11111111-1111-1111-1111-111111111111';
const vet = { id: '22222222-2222-2222-2222-222222222222', role: 'VETERINARIO' } as AuthUser;

const consulta = (extra: object) => ({
  consultationDate: '2026-11-17T10:00:00.000Z',
  reason: 'Control',
  clinicalEvaluation: 'Sin novedades',
  ...extra,
});

/** Ejecuta el ValidationPipe global y devuelve los campos con error ([] si es válido). */
async function camposConError(body: object, metatype: new () => object): Promise<string[]> {
  try {
    await createValidationPipe().transform(body, { type: 'body', metatype });
    return [];
  } catch (e) {
    const r = (e as BadRequestException).getResponse() as { errors: { field: string }[] };
    return r.errors.map((x) => x.field);
  }
}

describe('HU2 Registro de Consulta Clínica — pruebas unitarias', () => {
  it('PU-HU2-01 solo la fecha y hora de la consulta es obligatoria', async () => {
    // Arrange
    const soloFecha = { consultationDate: '2026-11-17T10:00:00.000Z' };
    const sinFecha = { reason: 'Control' };
    // Act
    const errSoloFecha = await camposConError(soloFecha, CreateConsultationDto);
    const errSinFecha = await camposConError(sinFecha, CreateConsultationDto);
    // Assert
    expect(errSoloFecha).toEqual([]);
    expect(errSinFecha).toEqual(['consultationDate']);
  });

  it('PU-HU2-02 acepta la temperatura con un decimal y el peso con dos decimales', async () => {
    // Arrange
    const datos = consulta({ temperatureC: 38.5, weightKg: 12.25 });
    // Act
    const err = await camposConError(datos, CreateConsultationDto);
    // Assert
    expect(err).toEqual([]);
  });

  it('PU-HU2-03 rechaza un peso, una temperatura o un estado del animal inválidos', async () => {
    // Arrange
    const datos = consulta({ weightKg: 'doce', temperatureC: 'alta', animalStatus: 'PERDIDO' });
    // Act
    const err = await camposConError(datos, CreateConsultationDto);
    // Assert
    expect(err.sort()).toEqual(['animalStatus', 'temperatureC', 'weightKg']);
  });

  it('PU-HU2-04 rechaza un medicamento sin dosis', async () => {
    // Arrange
    const medicamento = {
      name: 'Amoxicilina',
      administrationRoute: 'Oral',
      frequency: 'Cada 12 horas',
      duration: '7 días',
    };
    // Act
    const errores = await camposConError(medicamento, CreateMedicationDto);
    // Assert
    expect(errores).toEqual(['dose']);
  });

  it('PU-HU2-05 el veterinario se toma del usuario autenticado y no del cuerpo', async () => {
    // Arrange
    const tx = { veterinaryConsultation: { create: jest.fn((a: { data: object }) => a.data) } };
    const prisma = {
      animal: { findFirst: jest.fn().mockResolvedValue({ id: ANIMAL, status: 'INGRESADO' }) },
      $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
    };
    const service = new ClinicalService(
      prisma as unknown as PrismaService,
      {} as AnimalStatusService,
    );
    const dto = consulta({ veterinarianId: '99999999-9999-9999-9999-999999999999' });
    // Act
    const c = (await service.createConsultation(ANIMAL, dto, vet)) as unknown as {
      veterinarianId: string;
    };
    // Assert
    expect(c.veterinarianId).toBe(vet.id);
  });

  it('PU-HU2-06 el administrador puede registrar una consulta', () => {
    // Arrange
    const guard = new RolesGuard(new Reflector());
    const contexto = {
      getHandler: () => Reflect.get(ClinicalController.prototype, 'createConsultation') as object,
      getClass: () => ClinicalController,
      switchToHttp: () => ({ getRequest: () => ({ user: { id: 'a', role: 'ADMIN' } }) }),
    } as unknown as ExecutionContext;
    // Act
    const permitir = () => guard.canActivate(contexto);
    // Assert
    expect(permitir).not.toThrow();
  });
});
