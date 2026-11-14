import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

interface ErrorBody {
  statusCode: number;
  message: string;
  errors?: unknown;
}

/**
 * Normaliza todos los errores al formato `{ statusCode, message, errors? }`
 * (sección 9) y traduce los errores conocidos de Prisma.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const body = this.toBody(exception);
    res.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ErrorBody {
    if (exception instanceof PayloadTooLargeException) {
      return {
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        message: 'El archivo supera el tamaño máximo permitido (5 MB)',
      };
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'string') return { statusCode: status, message: response };
      const r = response as { message?: string | string[]; errors?: unknown };
      const message = Array.isArray(r.message)
        ? r.message.join('; ')
        : (r.message ?? exception.message);
      return {
        statusCode: status,
        message,
        ...(r.errors ? { errors: r.errors } : {}),
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          return {
            statusCode: HttpStatus.CONFLICT,
            message: 'El registro ya existe (valor duplicado)',
          };
        case 'P2025':
          return {
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Registro no encontrado',
          };
        case 'P2003':
          return {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Referencia a un registro inexistente',
          };
      }
    }

    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Error interno del servidor. Intenta nuevamente.',
    };
  }
}
