/**
 * Pruebas unitarias del Sprint 2 — HU5 Creación de Solicitud de Adopción.
 * Sin base de datos ni red: Prisma está simulado con jest.fn().
 * Los carnets de identidad son ficticios.
 */
import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import { createValidationPipe } from '../../common/validation';
import type { AuthUser } from '../../common/types';
import { AdoptersService, canSeeFullCi, maskCi } from './adopters.service';
import { CreateAdopterDto } from './dto/adopters.dto';

const adoptante = {
  ci: '9000010 SC',
  firstName: 'Marta',
  lastName: 'Rivero Paz',
  phone: '70000010',
  housingType: 'CASA_CON_PATIO',
  hasYard: true,
  hasChildren: false,
  hasOtherAnimals: false,
  availableHoursPerDay: 4,
  experience: 'BASICA',
};

/** Ejecuta el ValidationPipe global y devuelve los campos con error ([] si es válido). */
async function camposConError(body: object): Promise<string[]> {
  try {
    await createValidationPipe().transform(body, { type: 'body', metatype: CreateAdopterDto });
    return [];
  } catch (e) {
    const r = (e as BadRequestException).getResponse() as { errors: { field: string }[] };
    return r.errors.map((x) => x.field);
  }
}

describe('HU5 Creación de Solicitud de Adopción — pruebas unitarias', () => {
  it('PU-HU5-01 rechaza −1 y 25 horas diarias disponibles', async () => {
    // Arrange
    const negativo = { ...adoptante, availableHoursPerDay: -1 };
    const excesivo = { ...adoptante, availableHoursPerDay: 25 };
    // Act
    const errNegativo = await camposConError(negativo);
    const errExcesivo = await camposConError(excesivo);
    // Assert
    expect(errNegativo).toEqual(['availableHoursPerDay']);
    expect(errExcesivo).toEqual(['availableHoursPerDay']);
  });

  it('PU-HU5-02 acepta los límites de 0 y 24 horas diarias disponibles', async () => {
    // Arrange
    const minimo = { ...adoptante, availableHoursPerDay: 0 };
    const maximo = { ...adoptante, availableHoursPerDay: 24 };
    // Act
    const errMinimo = await camposConError(minimo);
    const errMaximo = await camposConError(maximo);
    // Assert
    expect(errMinimo).toEqual([]);
    expect(errMaximo).toEqual([]);
  });

  it('PU-HU5-03 maskCi oculta el carnet y deja ver solo los 3 últimos caracteres', () => {
    // Arrange
    const ci = '9000010 SC';
    // Act
    const enmascarado = maskCi(ci);
    // Assert
    expect(enmascarado).toBe('••••••• SC');
    expect(enmascarado).not.toContain('9000010');
  });

  it('PU-HU5-04 canSeeFullCi permite el carnet completo solo a Gestión y al administrador', () => {
    // Arrange
    const roles = ['GESTION', 'ADMIN', 'DIRECTIVO', 'VETERINARIO'] as const;
    // Act
    const permisos = roles.map((r) => canSeeFullCi(r));
    // Assert
    expect(permisos).toEqual([true, true, false, false]);
  });

  it('PU-HU5-05 la ficha del adoptante muestra el carnet enmascarado al personal directivo', async () => {
    // Arrange
    const fila = {
      id: 'a1',
      person: { ci: '9000010 SC', firstName: 'Marta' },
      adoptionRequests: [],
    };
    const prisma = { adopterProfile: { findUnique: jest.fn().mockResolvedValue(fila) } };
    const service = new AdoptersService(prisma as unknown as PrismaService);
    const directivo = { id: 'd1', role: 'DIRECTIVO' } as AuthUser;
    // Act
    const ficha = await service.findOne('a1', directivo);
    // Assert
    expect(ficha.person.ci).toBe('••••••• SC');
  });

  it('PU-HU5-06 al registrar un adoptante separa los datos personales del perfil de evaluación', async () => {
    // Arrange
    const create = jest.fn(({ data }: { data: object }) => ({ id: 'a1', ...data }));
    const prisma = {
      person: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn((fn: (t: object) => unknown) => fn({ adopterProfile: { create } })),
    };
    const service = new AdoptersService(prisma as unknown as PrismaService);
    // Act
    await service.create(adoptante as unknown as CreateAdopterDto);
    // Assert
    const data = (create.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data.person).toEqual({
      create: { ci: '9000010 SC', firstName: 'Marta', lastName: 'Rivero Paz', phone: '70000010' },
    });
    expect(data).toMatchObject({ housingType: 'CASA_CON_PATIO', availableHoursPerDay: 4 });
    expect(data).not.toHaveProperty('ci');
  });
});
