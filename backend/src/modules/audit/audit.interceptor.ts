import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from, mergeMap } from 'rxjs';
import { SKIP_AUDIT_KEY } from '../../common/decorators/skip-audit.decorator';
import type { AuthenticatedRequest } from '../../common/types';
import { auditStorage, AuditStore } from './audit-context';
import { AuditService } from './audit.service';

const MUTATING = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

/**
 * Interceptor global de auditoría (RN-09).
 * Abre un contexto por request; si el servicio no registró una entrada
 * detallada, registra una genérica para todo POST/PATCH/PUT/DELETE exitoso.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly audit: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_AUDIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    // Con @SkipAudit() se mantiene el contexto (IP) pero no se escribe la entrada genérica.
    const store: AuditStore = {
      userId: req.user?.id,
      ip: req.ip,
      recorded: Boolean(skip),
    };

    return new Observable((subscriber) => {
      auditStorage.run(store, () => {
        next
          .handle()
          .pipe(
            mergeMap((result: unknown) =>
              from(this.afterSuccess(req, store, result).then(() => result)),
            ),
          )
          .subscribe(subscriber);
      });
    });
  }

  private async afterSuccess(
    req: AuthenticatedRequest,
    store: AuditStore,
    result: unknown,
  ): Promise<void> {
    if (!MUTATING.has(req.method) || store.recorded) return;
    try {
      const path = (req.route as { path?: string } | undefined)?.path ?? req.path;
      const entityName = path.replace(/^\/api\/v1\//, '').split('/')[0] || null;
      const paramId: unknown = req.params?.id;
      const id =
        typeof paramId === 'string'
          ? paramId
          : result && typeof result === 'object' && 'id' in result
            ? String(result.id)
            : undefined;
      await auditStorage.run(store, () =>
        this.audit.log({
          action: `${req.method} ${path}`,
          entityName: entityName ?? undefined,
          entityId: id,
          newValue: req.body as unknown,
        }),
      );
    } catch (err) {
      this.logger.error(`No se pudo registrar auditoría: ${String(err)}`);
    }
  }
}
