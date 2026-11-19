/**
 * Pruebas unitarias del Sprint 1 — HU8 Gestión de Usuario.
 * Sin base de datos ni red: Prisma y JwtService están simulados con jest.fn().
 * Las contraseñas de este archivo son valores ficticios de prueba.
 */
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AppConfigService } from '../../config/app-config.service';
import { createValidationPipe } from '../../common/validation';
import type { AuthUser } from '../../common/types';
import { AuthService } from '../auth/auth.service';
import { CreateUserDto } from './dto/users.dto';
import { UsersService, toPublicUser } from './users.service';

const ADMIN = '66666666-6666-6666-6666-666666666666';
const usuario = (extra: Partial<User> = {}): User => ({
  id: '77777777-7777-7777-7777-777777777777',
  email: 'usuario@zoonosis.test',
  fullName: 'Usuario de Prueba',
  passwordHash: '$2a$04$hashficticio',
  refreshTokenHash: 'hash-ficticio',
  failedAttempts: 2,
  role: 'VETERINARIO',
  isActive: true,
  lockedUntil: null,
  phone: null,
  termsAcceptedAt: null,
  createdAt: new Date('2026-11-01T00:00:00Z'),
  updatedAt: new Date('2026-11-01T00:00:00Z'),
  ...extra,
});

function usersSetup(actual: User) {
  const update = jest.fn(({ data }: { data: Partial<User> }) => ({ ...actual, ...data }));
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue(actual) },
    $transaction: jest.fn((fn: (t: object) => unknown) => fn({ user: { update } })),
  };
  return { service: new UsersService(prisma as unknown as PrismaService), update };
}

function authSetup(actual: User) {
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(actual),
      update: jest.fn(({ data }: { data: Partial<User> }) => ({ ...actual, ...data })),
    },
  };
  const jwt = {
    verifyAsync: jest.fn().mockResolvedValue({ sub: actual.id }),
    signAsync: jest.fn(),
  };
  const config = { jwtRefreshSecret: 'x' } as AppConfigService;
  const service = new AuthService(
    prisma as unknown as PrismaService,
    jwt as unknown as JwtService,
    config,
  );
  return { service, prisma, jwt };
}

describe('HU8 Gestión de Usuario — pruebas unitarias', () => {
  it('PU-HU8-01 la contraseña temporal exige 8 caracteres con letra y número', async () => {
    // Arrange
    const pipe = createValidationPipe();
    const cuenta = { fullName: 'Ana Rojas', email: 'ana@zoonosis.test', role: 'VETERINARIO' };
    const validar = (password: string) =>
      pipe.transform({ ...cuenta, password }, { type: 'body', metatype: CreateUserDto });
    // Act
    const soloLetras = validar('abcdefgh');
    const corta = validar('abc1234');
    const valida = validar('Temporal1');
    // Assert
    await expect(soloLetras).rejects.toThrow(BadRequestException);
    await expect(corta).rejects.toThrow(BadRequestException);
    await expect(valida).resolves.toMatchObject({ role: 'VETERINARIO' });
  });

  it('PU-HU8-02 toPublicUser no expone el hash de la contraseña ni el de la sesión', () => {
    // Arrange
    const u = usuario();
    // Act
    const publico = toPublicUser(u);
    // Assert
    expect(publico).not.toHaveProperty('passwordHash');
    expect(publico).not.toHaveProperty('refreshTokenHash');
    expect(publico).not.toHaveProperty('failedAttempts');
    expect(publico.email).toBe(u.email);
  });

  it('PU-HU8-03 restablecer la contraseña la guarda cifrada y cierra las sesiones', async () => {
    // Arrange
    const { service, update } = usersSetup(usuario());
    // Act
    await service.resetPassword('77777777-7777-7777-7777-777777777777', 'Temporal1');
    // Assert
    const data = update.mock.calls[0][0].data;
    expect(data.passwordHash).not.toBe('Temporal1');
    expect(await bcrypt.compare('Temporal1', data.passwordHash as string)).toBe(true);
    expect(data.refreshTokenHash).toBeNull();
    expect(data.failedAttempts).toBe(0);
  });

  it('PU-HU8-04 el administrador no puede cambiar su propio rol', async () => {
    // Arrange
    const { service, update } = usersSetup(usuario({ id: ADMIN, role: 'ADMIN' }));
    const actor = { id: ADMIN, role: 'ADMIN' } as AuthUser;
    // Act
    const intento = service.update(ADMIN, { role: 'VETERINARIO' }, actor);
    // Assert
    await expect(intento).rejects.toThrow('No puedes cambiar tu propio rol');
    expect(update).not.toHaveBeenCalled();
  });

  it('PU-HU8-05 el usuario cambia su contraseña y se guarda cifrada', async () => {
    // Arrange
    const actual = usuario({ passwordHash: await bcrypt.hash('Anterior1', 4) });
    const { service, prisma } = authSetup(actual);
    // Act
    await service.changePassword(actual.id, 'Anterior1', 'Nueva2026');
    // Assert
    const data = ((prisma.user.update.mock.calls[0] as unknown[])[0] as { data: Partial<User> })
      .data;
    expect(data.passwordHash).not.toBe('Nueva2026');
    expect(await bcrypt.compare('Nueva2026', data.passwordHash as string)).toBe(true);
  });

  it('PU-HU8-06 un usuario desactivado no puede renovar su sesión', async () => {
    // Arrange
    const token = 'refresh-ficticio';
    const hash = createHash('sha256').update(token).digest('hex');
    const { service, jwt } = authSetup(usuario({ isActive: false, refreshTokenHash: hash }));
    // Act
    const intento = service.refresh(token);
    // Assert
    await expect(intento).rejects.toThrow(UnauthorizedException);
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });
});
