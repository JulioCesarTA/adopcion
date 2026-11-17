/**
 * Caja blanca del Sprint 1 — HU8 Gestión de Usuario: inicio de sesión.
 * Una prueba por camino independiente (técnica del camino básico).
 * Prisma, JwtService y la configuración están simulados con jest.fn().
 */
import { ForbiddenException, HttpException, UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import type { AppConfigService } from '../../config/app-config.service';
import type { PrismaService } from '../../prisma/prisma.service';
import { AuthService, LOCK_MINUTES } from './auth.service';

const CLAVE = 'ClaveDePrueba1';

describe('CB-HU8-A AuthService.login (iniciar sesión)', () => {
  let base: User;

  beforeAll(async () => {
    base = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'veterinario.prueba@zoonosis.test',
      fullName: 'Veterinario de Prueba',
      passwordHash: await bcrypt.hash(CLAVE, 4),
      role: UserRole.VETERINARIO,
      isActive: true,
      failedAttempts: 0,
      lockedUntil: null,
      refreshTokenHash: null,
      phone: null,
      termsAcceptedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  function setup(user: Partial<User> | null) {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user === null ? null : { ...base, ...user }),
        update: jest.fn().mockImplementation(({ data }: { data: Partial<User> }) => ({
          ...base,
          ...user,
          ...data,
        })),
      },
    };
    const jwt = { signAsync: jest.fn().mockResolvedValue('token-simulado') };
    const config = {
      jwtAccessSecret: 'a',
      jwtRefreshSecret: 'b',
      jwtAccessTtlSeconds: 900,
      jwtRefreshTtlDays: 7,
    };
    const service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
      config as unknown as AppConfigService,
    );
    return { service, prisma, jwt };
  }

  it('CB-HU8-A-C1: email no registrado → UnauthorizedException, sin emitir tokens', async () => {
    const { service, jwt } = setup(null);
    await expect(service.login('nadie@zoonosis.test', CLAVE)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('CB-HU8-A-C2: credenciales correctas y cuenta activa → emite la sesión', async () => {
    const { service, prisma, jwt } = setup({});
    const s = await service.login(base.email, CLAVE);
    expect(s.accessToken).toBe('token-simulado');
    expect(s.user.email).toBe(base.email);
    expect(jwt.signAsync).toHaveBeenCalledTimes(2);
    const data = ((prisma.user.update.mock.calls[0] as unknown[])[0] as { data: Partial<User> })
      .data;
    expect(data.failedAttempts).toBe(0);
    expect(data.lockedUntil).toBeNull();
  });

  it('CB-HU8-A-C3: cuenta con bloqueo vigente → HttpException 429, sin comparar la contraseña', async () => {
    const { service, prisma, jwt } = setup({ lockedUntil: new Date(Date.now() + 5 * 60_000) });
    const err = (await service.login(base.email, CLAVE).catch((e: unknown) => e)) as HttpException;
    expect(err).toBeInstanceOf(HttpException);
    expect(err.getStatus()).toBe(429);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('CB-HU8-A-C4: el bloqueo ya venció y la contraseña es correcta → emite la sesión', async () => {
    const { service, jwt } = setup({ lockedUntil: new Date(Date.now() - 60_000) });
    const s = await service.login(base.email, CLAVE);
    expect(s.accessToken).toBe('token-simulado');
    expect(jwt.signAsync).toHaveBeenCalledTimes(2);
  });

  it('CB-HU8-A-C5: contraseña incorrecta, menos de 5 intentos → suma un intento y rechaza', async () => {
    const { service, prisma, jwt } = setup({ failedAttempts: 2 });
    await expect(service.login(base.email, 'incorrecta')).rejects.toThrow(UnauthorizedException);
    const data = ((prisma.user.update.mock.calls[0] as unknown[])[0] as { data: Partial<User> })
      .data;
    expect(data.failedAttempts).toBe(3);
    expect(data.lockedUntil).toBeNull();
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('CB-HU8-A-C6: quinto intento fallido → bloquea la cuenta 10 minutos', async () => {
    const { service, prisma } = setup({ failedAttempts: 4 });
    const antes = Date.now();
    const err = (await service
      .login(base.email, 'incorrecta')
      .catch((e: unknown) => e)) as HttpException;
    expect(err).toBeInstanceOf(HttpException);
    expect(err.getStatus()).toBe(429);
    const data = ((prisma.user.update.mock.calls[0] as unknown[])[0] as { data: Partial<User> })
      .data;
    expect(data.failedAttempts).toBe(0);
    const minutos = ((data.lockedUntil as Date).getTime() - antes) / 60_000;
    expect(Math.round(minutos)).toBe(LOCK_MINUTES);
    expect(LOCK_MINUTES).toBe(10);
  });

  it('CB-HU8-A-C7: contraseña correcta pero cuenta desactivada → ForbiddenException', async () => {
    const { service, jwt } = setup({ isActive: false });
    await expect(service.login(base.email, CLAVE)).rejects.toThrow(ForbiddenException);
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });
});
