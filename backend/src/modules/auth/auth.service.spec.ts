import { ForbiddenException, HttpException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import type { AppConfigService } from '../../config/app-config.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AuditService } from '../audit/audit.service';
import {
  ACCOUNT_DISABLED,
  AuthService,
  INVALID_CREDENTIALS,
  MAX_FAILED_ATTEMPTS,
} from './auth.service';

describe('AuthService', () => {
  let user: User;
  let prisma: { user: { findUnique: jest.Mock; update: jest.Mock } };
  let audit: { log: jest.Mock };
  let service: AuthService;

  beforeAll(async () => {
    user = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'vet@zoonosis.test',
      fullName: 'Vet',
      passwordHash: await bcrypt.hash('Zoo12345', 4),
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

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ ...user }),
        update: jest.fn().mockImplementation(({ data }: { data: Partial<User> }) => ({
          ...user,
          ...data,
        })),
      },
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    const config = {
      jwtAccessSecret: 'a',
      jwtRefreshSecret: 'r',
      jwtAccessTtlSeconds: 900,
      jwtRefreshTtlDays: 7,
    } as unknown as AppConfigService;
    service = new AuthService(
      prisma as unknown as PrismaService,
      new JwtService(),
      config,
      audit as unknown as AuditService,
    );
  });

  it('emite tokens, reinicia intentos y registra LOGIN', async () => {
    const res = await service.login('VET@zoonosis.test', 'Zoo12345');
    expect(res.accessToken).toBeTruthy();
    expect(res.refreshToken).toBeTruthy();
    expect(res.user).not.toHaveProperty('passwordHash');
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ failedAttempts: 0, lockedUntil: null }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'LOGIN' }));
  });

  it('usuario inexistente → mensaje genérico', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.login('x@x.com', 'Zoo12345')).rejects.toThrow(
      new UnauthorizedException(INVALID_CREDENTIALS),
    );
  });

  it('contraseña incorrecta → mensaje genérico e incrementa intentos', async () => {
    await expect(service.login(user.email, 'malaClave1')).rejects.toThrow(INVALID_CREDENTIALS);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { failedAttempts: 1, lockedUntil: null },
      }),
    );
  });

  it(`al intento fallido número ${MAX_FAILED_ATTEMPTS} bloquea 10 minutos (429)`, async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...user,
      failedAttempts: MAX_FAILED_ATTEMPTS - 1,
    });
    const err = await service.login(user.email, 'malaClave1').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect((err as HttpException).getStatus()).toBe(429);
    const call = prisma.user.update.mock.calls[0] as [{ data: { lockedUntil: Date } }];
    const minutes = (call[0].data.lockedUntil.getTime() - Date.now()) / 60_000;
    expect(minutes).toBeGreaterThan(9.9);
    expect(minutes).toBeLessThanOrEqual(10);
  });

  it('cuenta bloqueada rechaza incluso con contraseña correcta', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...user,
      lockedUntil: new Date(Date.now() + 60_000),
    });
    const err = await service.login(user.email, 'Zoo12345').catch((e: unknown) => e);
    expect((err as HttpException).getStatus()).toBe(429);
  });

  it('cuenta inactiva con contraseña correcta → "Cuenta desactivada"', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...user, isActive: false });
    await expect(service.login(user.email, 'Zoo12345')).rejects.toThrow(
      new ForbiddenException(ACCOUNT_DISABLED),
    );
  });

  it('refresh rechaza un usuario desactivado (RN-10)', async () => {
    const { refreshToken } = await service.login(user.email, 'Zoo12345');
    const stored = (prisma.user.update.mock.results.at(-1)?.value as User).refreshTokenHash;
    prisma.user.findUnique.mockResolvedValue({
      ...user,
      isActive: false,
      refreshTokenHash: stored,
    });
    await expect(service.refresh(refreshToken)).rejects.toThrow(UnauthorizedException);
  });

  it('cambio de contraseña: actual incorrecta o igual a la anterior → 400', async () => {
    await expect(service.changePassword(user.id, 'otra1234', 'Nueva1234')).rejects.toThrow(
      'La contraseña actual es incorrecta',
    );
    await expect(service.changePassword(user.id, 'Zoo12345', 'Zoo12345')).rejects.toThrow(
      'La nueva contraseña debe ser distinta de la actual',
    );
  });
});
