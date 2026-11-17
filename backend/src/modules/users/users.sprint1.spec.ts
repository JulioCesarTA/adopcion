/**
 * Caja blanca del Sprint 1 — HU8 Gestión de Usuario: crear y activar/desactivar.
 * Una prueba por camino independiente (técnica del camino básico).
 * Prisma está simulado con jest.fn().
 */
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/types';
import { UsersService } from './users.service';

const ADMIN = '66666666-6666-6666-6666-666666666666';
const OTRO = '77777777-7777-7777-7777-777777777777';
const actor = { id: ADMIN, role: 'ADMIN' } as AuthUser;

function setup() {
  const fila = (data: object) => ({
    id: OTRO,
    email: 'usuario@zoonosis.test',
    fullName: 'Usuario',
    role: 'VETERINARIO',
    isActive: true,
    lockedUntil: null,
    phone: null,
    termsAcceptedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...data,
  });
  const tx = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn().mockImplementation(({ data }: { data: object }) => fila(data)),
      update: jest.fn().mockImplementation(({ data }: { data: object }) => fila(data)),
    },
  };
  const prisma = {
    ...tx,
    $transaction: jest.fn().mockImplementation((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  return { service: new UsersService(prisma as unknown as PrismaService), prisma, tx };
}

describe('CB-HU8-B UsersService.setActive (activar o desactivar usuario)', () => {
  it('CB-HU8-B-C1: el usuario a modificar no existe → NotFoundException', async () => {
    const { service, prisma, tx } = setup();
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.setActive(OTRO, false, actor)).rejects.toThrow(NotFoundException);
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('CB-HU8-B-C2: desactivar a otro usuario → lo desactiva e invalida su sesión', async () => {
    const { service, prisma, tx } = setup();
    prisma.user.findUnique.mockResolvedValue({ id: OTRO });
    const u = await service.setActive(OTRO, false, actor);
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: OTRO },
      data: { isActive: false, refreshTokenHash: null },
    });
    expect(u.isActive).toBe(false);
  });

  it('CB-HU8-B-C3: activar a otro usuario → lo activa y limpia el bloqueo', async () => {
    const { service, prisma, tx } = setup();
    prisma.user.findUnique.mockResolvedValue({ id: OTRO });
    await service.setActive(OTRO, true, actor);
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: OTRO },
      data: { isActive: true, failedAttempts: 0, lockedUntil: null },
    });
  });

  it('CB-HU8-B-C4: el administrador intenta desactivarse a sí mismo → BadRequestException', async () => {
    const { service, prisma, tx } = setup();
    await expect(service.setActive(ADMIN, false, actor)).rejects.toThrow(BadRequestException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('CB-HU8-B-C5: el administrador se activa a sí mismo → se permite', async () => {
    const { service, prisma, tx } = setup();
    prisma.user.findUnique.mockResolvedValue({ id: ADMIN });
    await service.setActive(ADMIN, true, actor);
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: ADMIN },
      data: { isActive: true, failedAttempts: 0, lockedUntil: null },
    });
  });
});

describe('CB-HU8-C UsersService.create (crear usuario)', () => {
  const dto = {
    fullName: 'María López Rojas',
    email: 'maria.lopez@zoonosis.test',
    role: 'VETERINARIO',
    password: 'ClaveTemporal1',
  } as never;

  it('CB-HU8-C-C1: el email ya está registrado → ConflictException', async () => {
    const { service, prisma, tx } = setup();
    prisma.user.findUnique.mockResolvedValue({ id: OTRO });
    await expect(service.create(dto)).rejects.toThrow(ConflictException);
    expect(tx.user.create).not.toHaveBeenCalled();
  });

  it('CB-HU8-C-C2: email libre → crea la cuenta con el rol y la contraseña cifrada', async () => {
    const { service, prisma, tx } = setup();
    prisma.user.findUnique.mockResolvedValue(null);
    const u = await service.create(dto);
    const data = (
      (tx.user.create.mock.calls[0] as unknown[])[0] as { data: Record<string, string> }
    ).data;
    expect(data.role).toBe('VETERINARIO');
    expect(data.passwordHash).not.toBe('ClaveTemporal1');
    expect(data.passwordHash.startsWith('$2')).toBe(true);
    expect(u).not.toHaveProperty('passwordHash');
    expect(u.email).toBe('maria.lopez@zoonosis.test');
  });
});
