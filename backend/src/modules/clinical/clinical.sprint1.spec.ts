/**
 * Caja blanca del Sprint 1 — HU2, HU3 y HU4.
 * Una prueba por camino independiente (técnica del camino básico).
 * Prisma está simulado con jest.fn().
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AnimalStatusService } from '../animals/animal-status.service';
import type { AuthUser } from '../../common/types';
import { ClinicalService } from './clinical.service';

const ANIMAL = '11111111-1111-1111-1111-111111111111';
const CONSULTA = '33333333-3333-3333-3333-333333333333';
const VACUNA = '44444444-4444-4444-4444-444444444444';
const vet = { id: '22222222-2222-2222-2222-222222222222', role: 'VETERINARIO' } as AuthUser;
const otroVet = { id: '55555555-5555-5555-5555-555555555555', role: 'VETERINARIO' } as AuthUser;
const admin = { id: '66666666-6666-6666-6666-666666666666', role: 'ADMIN' } as AuthUser;

function setup() {
  const echo = ({ data }: { data: object }) => ({ id: 'nuevo', ...data });
  const tx = {
    animal: { findFirst: jest.fn() },
    vaccine: { findUnique: jest.fn() },
    veterinaryConsultation: {
      findUnique: jest.fn(),
      create: jest.fn().mockImplementation(echo),
      update: jest.fn().mockImplementation(echo),
    },
    vaccination: { create: jest.fn().mockImplementation(echo) },
  };
  const prisma = {
    ...tx,
    $transaction: jest.fn().mockImplementation((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const service = new ClinicalService(
    prisma as unknown as PrismaService,
    {} as AnimalStatusService,
  );
  return { service, prisma, tx };
}

describe('CB-HU2-A ClinicalService.createConsultation (registrar consulta clínica)', () => {
  const dto = {
    consultationDate: '2026-11-17T10:00:00.000Z',
    reason: 'Control',
    clinicalEvaluation: 'Sin novedades',
    weightKg: 12.5,
    temperatureC: 38.6,
  } as never;

  it('CB-HU2-A-C1: el animal no existe → NotFoundException', async () => {
    const { service, prisma, tx } = setup();
    prisma.animal.findFirst.mockResolvedValue(null);
    await expect(service.createConsultation(ANIMAL, dto, vet)).rejects.toThrow(NotFoundException);
    expect(tx.veterinaryConsultation.create).not.toHaveBeenCalled();
  });

  it('CB-HU2-A-C2: el animal adoptado → registra la consulta', async () => {
    const { service, prisma, tx } = setup();
    prisma.animal.findFirst.mockResolvedValue({ id: ANIMAL, status: 'ADOPTADO' });
    await service.createConsultation(ANIMAL, dto, vet);
    expect(tx.veterinaryConsultation.create).toHaveBeenCalledTimes(1);
  });

  it('CB-HU2-A-C3: animal en la institución → registra la consulta con el veterinario y la fecha', async () => {
    const { service, prisma } = setup();
    prisma.animal.findFirst.mockResolvedValue({ id: ANIMAL, status: 'INGRESADO' });
    const c = (await service.createConsultation(ANIMAL, dto, vet)) as unknown as {
      veterinarianId: string;
      animalId: string;
      consultationDate: Date;
    };
    expect(c.veterinarianId).toBe(vet.id);
    expect(c.animalId).toBe(ANIMAL);
    expect(c.consultationDate).toBeInstanceOf(Date);
  });
});

describe('CB-HU3-A ClinicalService.updateConsultation (corregir un registro clínico)', () => {
  const consulta = { id: CONSULTA, veterinarianId: vet.id };

  it('CB-HU3-A-C1: la consulta no existe → NotFoundException', async () => {
    const { service, prisma, tx } = setup();
    prisma.veterinaryConsultation.findUnique.mockResolvedValue(null);
    await expect(service.updateConsultation(CONSULTA, { reason: 'x' }, vet)).rejects.toThrow(
      NotFoundException,
    );
    expect(tx.veterinaryConsultation.update).not.toHaveBeenCalled();
  });

  it('CB-HU3-A-C2: la corrige un administrador, sin cambiar la fecha → actualiza', async () => {
    const { service, prisma, tx } = setup();
    prisma.veterinaryConsultation.findUnique.mockResolvedValue(consulta);
    await service.updateConsultation(CONSULTA, { reason: 'Motivo corregido' }, admin);
    expect(tx.veterinaryConsultation.update).toHaveBeenCalledWith({
      where: { id: CONSULTA },
      data: { reason: 'Motivo corregido' },
    });
  });

  it('CB-HU3-A-C3: la intenta corregir un veterinario que no es el autor → ForbiddenException', async () => {
    const { service, prisma, tx } = setup();
    prisma.veterinaryConsultation.findUnique.mockResolvedValue(consulta);
    await expect(service.updateConsultation(CONSULTA, { reason: 'x' }, otroVet)).rejects.toThrow(
      ForbiddenException,
    );
    expect(tx.veterinaryConsultation.update).not.toHaveBeenCalled();
  });

  it('CB-HU3-A-C4: la corrige el veterinario autor, sin cambiar la fecha → actualiza', async () => {
    const { service, prisma, tx } = setup();
    prisma.veterinaryConsultation.findUnique.mockResolvedValue(consulta);
    await service.updateConsultation(CONSULTA, { observations: 'Nota' }, vet);
    expect(tx.veterinaryConsultation.update).toHaveBeenCalledWith({
      where: { id: CONSULTA },
      data: { observations: 'Nota' },
    });
  });

  it('CB-HU3-A-C5: la corrige un administrador y cambia la fecha → la convierte a fecha', async () => {
    const { service, prisma, tx } = setup();
    prisma.veterinaryConsultation.findUnique.mockResolvedValue(consulta);
    await service.updateConsultation(
      CONSULTA,
      { consultationDate: '2026-11-10T09:30:00.000Z' },
      admin,
    );
    const data = (
      (tx.veterinaryConsultation.update.mock.calls[0] as unknown[])[0] as {
        data: { consultationDate: unknown };
      }
    ).data;
    expect(data.consultationDate).toBeInstanceOf(Date);
  });
});

describe('CB-HU4-A ClinicalService.createVaccination (registrar vacuna)', () => {
  const perro = { id: ANIMAL, status: 'INGRESADO', species: 'PERRO' };
  const vacuna = { id: VACUNA, name: 'Antirrabica', species: ['PERRO', 'GATO'], isActive: true };
  const base = {
    vaccineId: VACUNA,
    applicationDate: '2026-11-17',
    dose: '1 ml',
    batchNumber: 'AR-1',
  };
  const conProxima = { ...base, nextDoseDate: '2027-11-17' };

  it('CB-HU4-A-C1: el animal no existe → NotFoundException', async () => {
    const { service, prisma, tx } = setup();
    prisma.animal.findFirst.mockResolvedValue(null);
    await expect(service.createVaccination(ANIMAL, base as never, vet)).rejects.toThrow(
      NotFoundException,
    );
    expect(tx.vaccination.create).not.toHaveBeenCalled();
  });

  it('CB-HU4-A-C2: el animal ya salió de la institución → ConflictException', async () => {
    const { service, prisma, tx } = setup();
    prisma.animal.findFirst.mockResolvedValue({ ...perro, status: 'FALLECIDO' });
    await expect(service.createVaccination(ANIMAL, base as never, vet)).rejects.toThrow(
      ConflictException,
    );
    expect(tx.vaccination.create).not.toHaveBeenCalled();
  });

  it('CB-HU4-A-C3: la próxima dosis es anterior a la aplicación → BadRequestException', async () => {
    const { service, prisma, tx } = setup();
    prisma.animal.findFirst.mockResolvedValue(perro);
    await expect(
      service.createVaccination(ANIMAL, { ...base, nextDoseDate: '2026-11-01' }, vet),
    ).rejects.toThrow('La próxima dosis no puede ser anterior a la fecha de aplicación');
    expect(tx.vaccination.create).not.toHaveBeenCalled();
  });

  it('CB-HU4-A-C4: sin próxima dosis y la vacuna no existe → BadRequestException', async () => {
    const { service, prisma, tx } = setup();
    prisma.animal.findFirst.mockResolvedValue(perro);
    prisma.vaccine.findUnique.mockResolvedValue(null);
    await expect(service.createVaccination(ANIMAL, base as never, vet)).rejects.toThrow(
      'La vacuna no existe en el catálogo',
    );
    expect(tx.vaccination.create).not.toHaveBeenCalled();
  });

  it('CB-HU4-A-C5: la vacuna está dada de baja → BadRequestException', async () => {
    const { service, prisma, tx } = setup();
    prisma.animal.findFirst.mockResolvedValue(perro);
    prisma.vaccine.findUnique.mockResolvedValue({ ...vacuna, isActive: false });
    await expect(service.createVaccination(ANIMAL, base as never, vet)).rejects.toThrow(
      'La vacuna está desactivada en el catálogo',
    );
    expect(tx.vaccination.create).not.toHaveBeenCalled();
  });

  it('CB-HU4-A-C6: vacuna indicada para la especie, sin próxima dosis → registra sin advertencias', async () => {
    const { service, prisma } = setup();
    prisma.animal.findFirst.mockResolvedValue(perro);
    prisma.vaccine.findUnique.mockResolvedValue(vacuna);
    const r = (await service.createVaccination(ANIMAL, base, vet)) as unknown as {
      warnings: string[];
      nextDoseDate: Date | null;
      appliedById: string;
    };
    expect(r.warnings).toEqual([]);
    expect(r.nextDoseDate).toBeNull();
    expect(r.appliedById).toBe(vet.id);
  });

  it('CB-HU4-A-C7: vacuna no indicada para la especie → registra igual, con advertencia', async () => {
    const { service, prisma, tx } = setup();
    prisma.animal.findFirst.mockResolvedValue(perro);
    prisma.vaccine.findUnique.mockResolvedValue({
      ...vacuna,
      name: 'Triple felina',
      species: ['GATO'],
    });
    const r = (await service.createVaccination(ANIMAL, base, vet)) as unknown as {
      warnings: string[];
    };
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toContain('no está indicada');
    expect(tx.vaccination.create).toHaveBeenCalledTimes(1);
  });

  it('CB-HU4-A-C8: vacuna válida con próxima dosis posterior → registra con la próxima dosis', async () => {
    const { service, prisma } = setup();
    prisma.animal.findFirst.mockResolvedValue(perro);
    prisma.vaccine.findUnique.mockResolvedValue(vacuna);
    const r = (await service.createVaccination(ANIMAL, conProxima, vet)) as unknown as {
      warnings: string[];
      nextDoseDate: Date;
    };
    expect(r.warnings).toEqual([]);
    expect(r.nextDoseDate.toISOString().slice(0, 10)).toBe('2027-11-17');
  });

  it('CB-HU4-A-C9: con próxima dosis válida pero la vacuna no existe → BadRequestException', async () => {
    const { service, prisma, tx } = setup();
    prisma.animal.findFirst.mockResolvedValue(perro);
    prisma.vaccine.findUnique.mockResolvedValue(null);
    await expect(service.createVaccination(ANIMAL, conProxima as never, vet)).rejects.toThrow(
      BadRequestException,
    );
    expect(tx.vaccination.create).not.toHaveBeenCalled();
  });
});
