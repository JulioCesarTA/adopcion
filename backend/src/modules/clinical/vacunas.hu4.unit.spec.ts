/**
 * Pruebas unitarias del Sprint 1 — HU4 Gestión de Vacunación.
 * Sin base de datos ni red: Prisma está simulado con jest.fn().
 */
import type { PrismaService } from '../../prisma/prisma.service';
import type { AnimalStatusService } from '../animals/animal-status.service';
import { addDays, toDateOnly, todayLaPaz } from '../../common/dates';
import type { AuthUser } from '../../common/types';
import { ClinicalService } from './clinical.service';

const ANIMAL = '11111111-1111-1111-1111-111111111111';
const VACUNA = '44444444-4444-4444-4444-444444444444';
const vet = { id: '22222222-2222-2222-2222-222222222222', role: 'VETERINARIO' } as AuthUser;

function setup() {
  const tx = {
    vaccination: { create: jest.fn(({ data }: { data: object }) => ({ id: 'v', ...data })) },
  };
  const prisma = {
    animal: { findFirst: jest.fn() },
    vaccine: { findUnique: jest.fn() },
    $queryRaw: jest.fn().mockResolvedValue([]),
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const service = new ClinicalService(
    prisma as unknown as PrismaService,
    {} as AnimalStatusService,
  );
  return { service, prisma, tx };
}

describe('HU4 Gestión de Vacunación — pruebas unitarias', () => {
  afterEach(() => jest.useRealTimers());

  it('PU-HU4-01 toDateOnly convierte una fecha con o sin hora a la medianoche UTC', () => {
    // Arrange
    const sinHora = '2026-11-17';
    const conHora = '2026-11-17T21:45:00.000Z';
    // Act
    const a = toDateOnly(sinHora);
    const b = toDateOnly(conHora);
    // Assert
    expect(a.toISOString()).toBe('2026-11-17T00:00:00.000Z');
    expect(b.toISOString()).toBe('2026-11-17T00:00:00.000Z');
  });

  it('PU-HU4-02 addDays suma 7 días cruzando el fin de mes', () => {
    // Arrange
    const fecha = '2026-11-28';
    // Act
    const resultado = addDays(fecha, 7);
    // Assert
    expect(resultado).toBe('2026-12-05');
  });

  it('PU-HU4-03 todayLaPaz devuelve el día de Bolivia y no el de UTC', () => {
    // Arrange
    jest.useFakeTimers().setSystemTime(new Date('2026-11-18T02:30:00.000Z'));
    // Act
    const hoy = todayLaPaz();
    // Assert
    expect(hoy).toBe('2026-11-17');
  });

  it('PU-HU4-04 las próximas dosis se buscan hasta hoy + 7 días', async () => {
    // Arrange
    jest.useFakeTimers().setSystemTime(new Date('2026-11-17T15:00:00.000Z'));
    const { service, prisma } = setup();
    // Act
    await service.upcomingVaccinations(7);
    // Assert
    const limite = (prisma.$queryRaw.mock.calls[0] as unknown[])[1] as Date;
    expect(limite.toISOString()).toBe('2026-11-24T00:00:00.000Z');
  });

  it('PU-HU4-05 la consulta de próximas dosis toma solo la última dosis y excluye a los que salieron', async () => {
    // Arrange
    jest.useFakeTimers().setSystemTime(new Date('2026-11-17T15:00:00.000Z'));
    const { service, prisma } = setup();
    // Act
    await service.upcomingVaccinations(7);
    // Assert
    const sql = ((prisma.$queryRaw.mock.calls[0] as unknown[])[0] as string[]).join('?');
    expect(sql).toContain('DISTINCT ON (v.animal_id, v.vaccine_id)');
    expect(sql).toContain('v.application_date DESC');
    expect(sql).toContain("NOT IN ('ADOPTADO', 'FALLECIDO', 'DEVUELTO')");
  });

  it('PU-HU4-06 acepta una próxima dosis el mismo día de la aplicación', async () => {
    // Arrange
    const { service, prisma } = setup();
    prisma.animal.findFirst.mockResolvedValue({ id: ANIMAL, status: 'INGRESADO', species: 'GATO' });
    prisma.vaccine.findUnique.mockResolvedValue({
      id: VACUNA,
      name: 'Triple felina',
      species: ['GATO'],
      isActive: true,
    });
    const dto = {
      vaccineId: VACUNA,
      applicationDate: '2026-11-17',
      dose: '1 ml',
      batchNumber: 'TF-9',
      nextDoseDate: '2026-11-17',
    };
    // Act
    const r = await service.createVaccination(ANIMAL, dto, vet);
    // Assert
    expect(r.warnings).toEqual([]);
    expect(r.nextDoseDate?.toISOString()).toBe('2026-11-17T00:00:00.000Z');
  });
});
