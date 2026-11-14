import { SetMetadata } from '@nestjs/common';

export const SKIP_AUDIT_KEY = 'skipAudit';

/** Excluye un endpoint de la auditoría genérica (p. ej. el refresco de tokens). */
export const SkipAudit = () => SetMetadata(SKIP_AUDIT_KEY, true);
