import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedRequest } from '../types';

/** Roles del personal interno (sección 3). */
export const STAFF_ROLES: UserRole[] = ['ADMIN', 'VETERINARIO', 'GESTION', 'DIRECTIVO'];
/** Todos los roles, incluidos CLIENTE y ADOPTANTE (portal). */
export const ALL_ROLES: UserRole[] = [...STAFF_ROLES, 'CLIENTE', 'ADOPTANTE'];

/**
 * Comprueba que el rol del usuario esté entre los permitidos por @Roles().
 * Sin @Roles(), el endpoint es SOLO para el personal interno: un CLIENTE
 * únicamente accede a lo que se le abre explícitamente (deny by default).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    // Endpoints @Public() no tienen usuario: el JwtAuthGuard ya decidió
    if (!req.user) return true;

    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const allowed = roles && roles.length ? roles : STAFF_ROLES;
    if (!allowed.includes(req.user.role)) {
      throw new ForbiddenException('No tienes acceso a este recurso');
    }
    return true;
  }
}
