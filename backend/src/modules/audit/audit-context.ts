import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Contexto por request para la auditoría (RN-09).
 * - `recorded` indica si algún servicio ya registró una entrada detallada
 *   (con valores antes/después); si no, el interceptor registra una genérica.
 */
export interface AuditStore {
  userId?: string;
  ip?: string;
  recorded: boolean;
}

export const auditStorage = new AsyncLocalStorage<AuditStore>();
