import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/** Restringe un endpoint a los roles indicados (RBAC fijo, sección 3). */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
