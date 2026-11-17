/**
 * Pruebas unitarias del Sprint 1 — HU1 Gestión de Animal.
 * Sin base de datos ni red: Prisma y el almacenamiento están simulados con jest.fn().
 */
import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type { StorageService } from '../storage/storage.service';
import type { AnimalStatusService } from './animal-status.service';
import { AnimalsService, MAX_PHOTO_BYTES, detectImageType } from './animals.service';
import { CreateAnimalDto, ListAnimalsQueryDto } from './dto/animals.dto';
import { createValidationPipe } from '../../common/validation';
import type { AuthUser } from '../../common/types';

const ID = '11111111-1111-1111-1111-111111111111';
const user = { id: '22222222-2222-2222-2222-222222222222', role: 'GESTION' } as AuthUser;
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')]);

function setup() {
  const tx = {
    $executeRaw: jest.fn().mockResolvedValue(1),
    animal: {
      findFirst: jest.fn(),
      create: jest.fn().mockImplementation(({ data }: { data: object }) => ({ id: ID, ...data })),
      update: jest.fn().mockImplementation(({ data }: { data: object }) => ({ id: ID, ...data })),
    },
  };
  const prisma = {
    ...tx,
    $transaction: jest.fn().mockImplementation((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const storage = {
    put: jest.fn().mockResolvedValue('/uploads/animals/nueva.jpg'),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  const service = new AnimalsService(
    prisma as unknown as PrismaService,
    {} as AnimalStatusService,
    storage as unknown as StorageService,
  );
  return { service, prisma, tx, storage };
}

const animalValido = {
  species: 'PERRO',
  size: 'MEDIANO',
  energyLevel: 3,
  goodWithChildren: true,
  goodWithAnimals: true,
  needsYard: false,
  specialCare: false,
  requiredDailyHours: 2,
  entryDate: '2026-11-17',
  entryReason: 'Rescate en vía pública',
};

describe('HU1 Gestión de Animal — pruebas unitarias', () => {
  afterEach(() => jest.useRealTimers());

  it('PU-HU1-01 detectImageType reconoce JPG, PNG y WEBP por su contenido', () => {
    // Arrange
    const archivos = [JPG, PNG, WEBP];
    // Act
    const tipos = archivos.map((b) => detectImageType(b));
    // Assert
    expect(tipos).toEqual(['jpg', 'png', 'webp']);
  });

  it('PU-HU1-02 detectImageType rechaza un PDF aunque se llame .jpg', () => {
    // Arrange
    const pdf = Buffer.from('%PDF-1.7 documento');
    // Act
    const tipo = detectImageType(pdf);
    // Assert
    expect(tipo).toBeNull();
  });

  it('PU-HU1-03 savePhoto acepta una foto de exactamente 5 MB', async () => {
    // Arrange
    const { service, prisma, storage } = setup();
    prisma.animal.findFirst.mockResolvedValue({ id: ID, photoUrl: null });
    const file = { buffer: JPG, size: MAX_PHOTO_BYTES } as Express.Multer.File;
    // Act
    const animal = await service.savePhoto(ID, file);
    // Assert
    expect(MAX_PHOTO_BYTES).toBe(5 * 1024 * 1024);
    expect(storage.put).toHaveBeenCalledTimes(1);
    expect(animal.photoUrl).toBe('/uploads/animals/nueva.jpg');
  });

  it('PU-HU1-04 el DTO de animal sin especie es rechazado', async () => {
    // Arrange
    const pipe = createValidationPipe();
    const sinEspecie: Record<string, unknown> = { ...animalValido };
    delete sinEspecie.species;
    // Act
    const error = (await pipe
      .transform(sinEspecie, { type: 'body', metatype: CreateAnimalDto })
      .catch((e: unknown) => e)) as BadRequestException;
    // Assert
    expect(error).toBeInstanceOf(BadRequestException);
    const campos = (error.getResponse() as { errors: { field: string }[] }).errors;
    expect(campos.map((c) => c.field)).toEqual(['species']);
  });

  it('PU-HU1-05 create asigna un código ZOO-AAAA-NNNN con el año de Bolivia', async () => {
    // Arrange
    jest.useFakeTimers().setSystemTime(new Date('2027-01-01T03:00:00.000Z'));
    const { service, tx } = setup();
    tx.animal.findFirst.mockResolvedValue({ code: 'ZOO-2026-0041' });
    // Act
    const animal = await service.create(animalValido as unknown as CreateAnimalDto, user);
    // Assert
    expect(animal.code).toMatch(/^ZOO-\d{4}-\d{4}$/);
    expect(animal.code).toBe('ZOO-2026-0042');
    expect(animal.status).toBe('INGRESADO');
  });

  it('PU-HU1-06 el listado de animales acepta el filtro por tamaño', async () => {
    // Arrange
    const pipe = createValidationPipe();
    const consulta = { species: 'PERRO', size: 'GRANDE' };
    // Act
    const resultado = pipe.transform(consulta, { type: 'query', metatype: ListAnimalsQueryDto });
    // Assert
    await expect(resultado).resolves.toMatchObject({ species: 'PERRO', size: 'GRANDE' });
  });
});
