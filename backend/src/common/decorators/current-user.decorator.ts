import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser, AuthenticatedRequest } from '../types';

/** Inyecta el usuario autenticado (lo coloca JwtAuthGuard en la request). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return req.user;
  },
);
