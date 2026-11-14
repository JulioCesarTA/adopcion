import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { auditStorage } from './audit-context';
import { sanitizeForAudit } from './sanitize';

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'CREATE'
  | 'UPDATE'
  | 'STATUS_CHANGE'
  | 'DELETE'
  | 'PASSWORD_CHANGE'
  | 'PASSWORD_RESET'
  | (string & {});

export interface AuditEntry {
  action: AuditAction;
  entityName?: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  /** Si no se indica, se toma del contexto de la request. */
  userId?: string | null;
}

type Tx = Prisma.TransactionClient | PrismaService;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra una entrada en audit_logs. Puede recibir el cliente de una
   * transacción para que la auditoría sea atómica con el cambio.
   */
  async log(entry: AuditEntry, tx: Tx = this.prisma): Promise<void> {
    const store = auditStorage.getStore();
    if (store) store.recorded = true;

    const oldValue = sanitizeForAudit(entry.oldValue);
    const newValue = sanitizeForAudit(entry.newValue);

    await tx.auditLog.create({
      data: {
        userId: entry.userId !== undefined ? entry.userId : (store?.userId ?? null),
        action: entry.action,
        entityName: entry.entityName ?? null,
        entityId: entry.entityId ?? null,
        oldValue: oldValue === null ? Prisma.DbNull : (oldValue as Prisma.InputJsonValue),
        newValue: newValue === null ? Prisma.DbNull : (newValue as Prisma.InputJsonValue),
        ip: store?.ip ?? null,
      },
    });
  }
}
