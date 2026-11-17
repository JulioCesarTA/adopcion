/**
 * Caja blanca del Sprint 1 — HU1 Gestión de Animal.
 * Una prueba por camino independiente (técnica del camino básico).
 * Prisma y el almacenamiento están simulados con jest.fn().
 */
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type { StorageService } from '../storage/storage.service';
import type { AnimalStatusService } from './animal-status.service';
import { AnimalsService } from './animals.service';
import { currentYearLaPaz } from '../../common/dates';
import type { AuthUser } from '../../common/types';

const ID = '11111111-1111-1111-1111-111111111111';
const user = { id: '22222222-2222-2222-2222-222222222222', role: 'GESTION' } as AuthUser;
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

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
    put: jest.fn().mockResolvedValue('http://localhost/uploads/animals/nueva.jpg'),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  const service = new AnimalsService(
    prisma as unknown as PrismaService,
    {} as AnimalStatusService,
    storage as unknown as StorageService,
  );
  return { service, prisma, tx, storage };
}

const dto = {
  species: 'PERRO',
  sex: 'MACHO',
  size: 'MEDIANO',
  energyLevel: 3,
  entryDate: '2026-11-17T12:00:00.000Z',
  entryReason: 'Rescate en vía pública',
} as never;

describe('CB-HU1-A AnimalsService.create (registrar animal)', () => {
  const year = currentYearLaPaz();

  it('CB-HU1-A-C1: ya hay un código este año → asigna el siguiente', async () => {
    const { service, tx } = setup();
    tx.animal.findFirst.mockResolvedValue({ code: `ZOO-${year}-0007` });
    const animal = await service.create(dto, user);
    expect(animal.code).toBe(`ZOO-${year}-0008`);
    expect(animal.status).toBe('INGRESADO');
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it('CB-HU1-A-C2: no hay códigos este año → asigna el 0001', async () => {
    const { service, tx } = setup();
    tx.animal.findFirst.mockResolvedValue(null);
    const animal = await service.create(dto, user);
    expect(animal.code).toBe(`ZOO-${year}-0001`);
    expect(animal.status).toBe('INGRESADO');
    expect(animal.createdById).toBe(user.id);
  });
});

describe('CB-HU1-B AnimalsService.update (editar animal)', () => {
  it('CB-HU1-B-C1: el animal no existe → NotFoundException', async () => {
    const { service, prisma } = setup();
    prisma.animal.findFirst.mockResolvedValue(null);
    await expect(service.update(ID, { name: 'Bruno' })).rejects.toThrow(NotFoundException);
    expect(prisma.animal.update).not.toHaveBeenCalled();
  });

  it('CB-HU1-B-C2: animal en la institución, sin fecha de ingreso → actualiza', async () => {
    const { service, prisma, tx } = setup();
    prisma.animal.findFirst.mockResolvedValue({ id: ID, status: 'INGRESADO' });
    await service.update(ID, { name: 'Bruno' });
    expect(tx.animal.update).toHaveBeenCalledWith({ where: { id: ID }, data: { name: 'Bruno' } });
  });

  it('CB-HU1-B-C3: animal en la institución, con fecha de ingreso → la convierte a fecha', async () => {
    const { service, prisma, tx } = setup();
    prisma.animal.findFirst.mockResolvedValue({ id: ID, status: 'INGRESADO' });
    await service.update(ID, { entryDate: '2026-11-01T00:00:00.000Z' });
    const data = (
      (tx.animal.update.mock.calls[0] as unknown[])[0] as { data: { entryDate: unknown } }
    ).data;
    expect(data.entryDate).toBeInstanceOf(Date);
  });

  it('CB-HU1-B-C4: animal adoptado y se intenta cambiar el nombre → ConflictException', async () => {
    const { service, prisma, tx } = setup();
    prisma.animal.findFirst.mockResolvedValue({ id: ID, status: 'ADOPTADO' });
    await expect(service.update(ID, { name: 'Otro' })).rejects.toThrow(ConflictException);
    expect(tx.animal.update).not.toHaveBeenCalled();
  });

  it('CB-HU1-B-C5: animal adoptado y solo se editan las notas → actualiza', async () => {
    const { service, prisma, tx } = setup();
    prisma.animal.findFirst.mockResolvedValue({ id: ID, status: 'ADOPTADO' });
    await service.update(ID, { exitNotes: 'Adopción sin novedades' });
    expect(tx.animal.update).toHaveBeenCalledWith({
      where: { id: ID },
      data: { exitNotes: 'Adopción sin novedades' },
    });
  });
});

describe('CB-HU1-C AnimalsService.savePhoto (subir o reemplazar la fotografía)', () => {
  const file = (buffer: Buffer, size = buffer.length) => ({ buffer, size }) as Express.Multer.File;

  it('CB-HU1-C-C1: no se adjunta archivo → BadRequestException', async () => {
    const { service, storage } = setup();
    await expect(service.savePhoto(ID, undefined)).rejects.toThrow(BadRequestException);
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('CB-HU1-C-C2: archivo de más de 5 MB → BadRequestException', async () => {
    const { service, storage } = setup();
    await expect(service.savePhoto(ID, file(JPG, 5 * 1024 * 1024 + 1))).rejects.toThrow(
      'La foto supera los 5 MB',
    );
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('CB-HU1-C-C3: el contenido no es JPG, PNG ni WEBP → BadRequestException', async () => {
    const { service, storage } = setup();
    await expect(service.savePhoto(ID, file(Buffer.from('%PDF-1.7 texto')))).rejects.toThrow(
      'Formato no permitido',
    );
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('CB-HU1-C-C4: archivo válido pero el animal no existe → NotFoundException', async () => {
    const { service, prisma, storage } = setup();
    prisma.animal.findFirst.mockResolvedValue(null);
    await expect(service.savePhoto(ID, file(JPG))).rejects.toThrow(NotFoundException);
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('CB-HU1-C-C5: archivo JPG válido → guarda la nueva y elimina la anterior', async () => {
    const { service, prisma, tx, storage } = setup();
    prisma.animal.findFirst.mockResolvedValue({
      id: ID,
      photoUrl: 'http://localhost/uploads/animals/vieja.jpg',
    });
    const updated = await service.savePhoto(ID, file(JPG));
    expect(storage.put).toHaveBeenCalledTimes(1);
    expect((storage.put.mock.calls[0] as unknown[])[2]).toBe('jpg');
    expect(tx.animal.update).toHaveBeenCalledWith({
      where: { id: ID },
      data: { photoUrl: 'http://localhost/uploads/animals/nueva.jpg' },
    });
    expect(storage.remove).toHaveBeenCalledWith('http://localhost/uploads/animals/vieja.jpg');
    expect(updated.photoUrl).toBe('http://localhost/uploads/animals/nueva.jpg');
  });
});
