import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginated } from '../../common/dto/pagination.dto';
import { AuditQueryDto } from './dto/audit.dto';

/** CU19: consulta de auditoría (solo lectura; no existen endpoints de edición ni borrado). */
@Injectable()
export class AuditQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: AuditQueryDto) {
    const from = q.from ? new Date(`${q.from.slice(0, 10)}T00:00:00.000-04:00`) : undefined;
    const to = q.to ? new Date(`${q.to.slice(0, 10)}T23:59:59.999-04:00`) : undefined;
    if (from && to && from > to) throw new BadRequestException('Rango de fechas inválido');

    const where: Prisma.AuditLogWhereInput = {
      ...(q.userId ? { userId: q.userId } : {}),
      ...(q.action ? { action: { contains: q.action, mode: 'insensitive' } } : {}),
      ...(q.entityName ? { entityName: q.entityName } : {}),
      ...(q.entityId ? { entityId: q.entityId } : {}),
      ...(from || to ? { createdAt: { gte: from, lte: to } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: {
          user: {
            select: { id: true, fullName: true, email: true, role: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return paginated(rows, total, q);
  }

  /** Valores distintos para los filtros de la UI. */
  async facets() {
    const [actions, entities] = await Promise.all([
      this.prisma.auditLog.findMany({
        distinct: ['action'],
        select: { action: true },
        orderBy: { action: 'asc' },
        take: 200,
      }),
      this.prisma.auditLog.findMany({
        distinct: ['entityName'],
        where: { entityName: { not: null } },
        select: { entityName: true },
        orderBy: { entityName: 'asc' },
      }),
    ]);
    return {
      actions: actions.map((a) => a.action),
      entities: entities.map((e) => e.entityName).filter((e): e is string => !!e),
    };
  }
}
