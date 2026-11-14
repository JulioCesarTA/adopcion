import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AppConfigService } from '../../config/app-config.service';
import { AuditService } from '../audit/audit.service';
import { BCRYPT_COST } from '../../common/password-policy';
import type { JwtAccessPayload, JwtRefreshPayload } from '../../common/types';
import { PublicUser, toPublicUser } from '../users/users.service';

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_MINUTES = 10;
export const INVALID_CREDENTIALS = 'Credenciales inválidas';
export const ACCOUNT_DISABLED = 'Cuenta desactivada, contacta al administrador';

export interface SessionResult {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
    private readonly audit: AuditService,
  ) {}

  /** CU01: valida credenciales, aplica bloqueo tras 5 intentos fallidos y emite tokens. */
  async login(email: string, password: string): Promise<SessionResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user) throw new UnauthorizedException(INVALID_CREDENTIALS);

    const now = new Date();
    if (user.lockedUntil && user.lockedUntil > now) {
      throw this.lockedError(user.lockedUntil, now);
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      const attempts = user.failedAttempts + 1;
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        const lockedUntil = new Date(now.getTime() + LOCK_MINUTES * 60_000);
        await this.prisma.user.update({
          where: { id: user.id },
          data: { failedAttempts: 0, lockedUntil },
        });
        await this.audit.log({
          action: 'ACCOUNT_LOCKED',
          entityName: 'users',
          entityId: user.id,
          userId: user.id,
        });
        throw this.lockedError(lockedUntil, now);
      }
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedAttempts: attempts, lockedUntil: null },
      });
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (!user.isActive) throw new ForbiddenException(ACCOUNT_DISABLED);

    const session = await this.issueSession(user, {
      failedAttempts: 0,
      lockedUntil: null,
    });
    await this.audit.log({
      action: 'LOGIN',
      entityName: 'users',
      entityId: user.id,
      userId: user.id,
    });
    return session;
  }

  /** Rota el refresh token. Falla si el usuario está inactivo (RN-10) o el token fue invalidado. */
  async refresh(refreshToken: string | undefined): Promise<SessionResult> {
    const user = await this.userFromRefreshToken(refreshToken);
    if (!user) throw new UnauthorizedException('Sesión expirada, inicia sesión nuevamente');
    if (!user.isActive) throw new UnauthorizedException(ACCOUNT_DISABLED);
    return this.issueSession(user);
  }

  /** CU20: invalida el refresh token. Nunca falla: si el token no es válido no hace nada. */
  async logout(refreshToken: string | undefined): Promise<void> {
    const user = await this.userFromRefreshToken(refreshToken);
    if (!user) return;
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: null },
    });
    await this.audit.log({
      action: 'LOGOUT',
      entityName: 'users',
      entityId: user.id,
      userId: user.id,
    });
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return toPublicUser(user);
  }

  async updateMe(userId: string, fullName: string): Promise<PublicUser> {
    const before = await this.me(userId);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { fullName },
    });
    const after = toPublicUser(updated);
    await this.audit.log({
      action: 'UPDATE',
      entityName: 'users',
      entityId: userId,
      oldValue: before,
      newValue: after,
    });
    return after;
  }

  /** CU25: cambio de contraseña pidiendo la actual. */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }
    if (await bcrypt.compare(newPassword, user.passwordHash)) {
      throw new BadRequestException('La nueva contraseña debe ser distinta de la actual');
    }
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    await this.audit.log({
      action: 'PASSWORD_CHANGE',
      entityName: 'users',
      entityId: userId,
    });
  }

  private async issueSession(
    user: User,
    extra: { failedAttempts?: number; lockedUntil?: Date | null } = {},
  ): Promise<SessionResult> {
    const accessPayload: JwtAccessPayload = { sub: user.id, role: user.role };
    const refreshPayload: JwtRefreshPayload = {
      sub: user.id,
      jti: randomUUID(),
    };

    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: this.config.jwtAccessSecret,
      expiresIn: this.config.jwtAccessTtlSeconds,
    });
    const refreshToken = await this.jwt.signAsync(refreshPayload, {
      secret: this.config.jwtRefreshSecret,
      expiresIn: this.config.jwtRefreshTtlDays * 24 * 60 * 60,
    });

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: sha256(refreshToken), ...extra },
    });
    return { accessToken, refreshToken, user: toPublicUser(updated) };
  }

  private async userFromRefreshToken(token: string | undefined): Promise<User | null> {
    if (!token) return null;
    try {
      const payload = await this.jwt.verifyAsync<JwtRefreshPayload>(token, {
        secret: this.config.jwtRefreshSecret,
      });
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user || user.refreshTokenHash !== sha256(token)) return null;
      return user;
    } catch {
      return null;
    }
  }

  private lockedError(until: Date, now: Date): HttpException {
    const minutes = Math.max(1, Math.ceil((until.getTime() - now.getTime()) / 60_000));
    return new HttpException(
      `Cuenta bloqueada por intentos fallidos. Intenta nuevamente en ${minutes} min.`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
