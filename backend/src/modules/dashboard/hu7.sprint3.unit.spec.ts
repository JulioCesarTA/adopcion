/**
 * Pruebas unitarias del Sprint 3 — HU7 Panel de KPI en Tiempo Real.
 * Sin base de datos ni red: Prisma está simulado con jest.fn(). Reloj fijo con jest.useFakeTimers().
 */
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PrismaService } from '../../prisma/prisma.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { KpisController } from '../kpis/kpis.controller';
import { KpisService } from '../kpis/kpis.service';
import { DashboardService, lastMonths, monthLabel } from './dashboard.service';

/** Prisma simulado: todos los conteos en 0 y sin filas. */
function prismaVacio() {
  return {
    animal: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    adoptionRequest: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    $queryRaw: jest.fn().mockResolvedValue([]),
  };
}

describe('HU7 Panel de KPI en Tiempo Real — pruebas unitarias', () => {
  afterEach(() => jest.useRealTimers());

  it('PU-HU7-01 lastMonths devuelve los últimos 6 meses cruzando el cambio de año', () => {
    // Arrange
    jest.useFakeTimers().setSystemTime(new Date('2026-02-10T15:00:00.000Z'));
    // Act
    const meses = lastMonths(6);
    // Assert
    expect(meses).toEqual(['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02']);
  });

  it('PU-HU7-02 monthLabel muestra el mes abreviado en español y el año con dos cifras', () => {
    // Arrange
    const meses = ['2026-01', '2026-09', '2025-12'];
    // Act
    const etiquetas = meses.map((m) => monthLabel(m));
    // Assert
    expect(etiquetas).toEqual(['ene 26', 'sep 26', 'dic 25']);
  });

  it('PU-HU7-03 el período anterior abarca los meses inmediatamente previos de la misma duración', async () => {
    // Arrange
    jest.useFakeTimers().setSystemTime(new Date('2026-11-17T15:00:00.000Z'));
    const prisma = prismaVacio();
    const service = new KpisService(prisma as unknown as PrismaService);
    // Act
    const r = await service.kpis(3);
    // Assert
    expect(r.from).toBe('2026-09-01');
    const rango = {
      gte: new Date('2026-06-01T04:00:00.000Z'),
      lt: new Date('2026-09-01T04:00:00.000Z'),
    };
    expect(prisma.adoptionRequest.count).toHaveBeenCalledWith({
      where: { status: 'APROBADA', decisionDate: rango },
    });
  });

  it('PU-HU7-04 sin animales en la institución la cobertura de vacunación queda sin datos y no divide por cero', async () => {
    // Arrange
    jest.useFakeTimers().setSystemTime(new Date('2026-11-17T15:00:00.000Z'));
    const service = new KpisService(prismaVacio() as unknown as PrismaService);
    // Act
    const r = await service.kpis(3);
    // Assert
    const vacunas = r.kpis.find((k) => k.key === 'cobertura-vacunacion');
    expect(vacunas?.value).toBeNull();
    expect(vacunas?.detail).toBe('0 de 0 animales en la institución, con esquema al día');
    expect(r.kpis).toHaveLength(6);
  });

  it('PU-HU7-05 la tarjeta «En la institución» no cuenta a los animales que salieron', async () => {
    // Arrange
    const prisma = prismaVacio();
    const service = new DashboardService(prisma as unknown as PrismaService);
    // Act
    await service.dashboard('DIRECTIVO');
    // Assert
    expect(prisma.animal.count).toHaveBeenCalledWith({
      where: { deletedAt: null, status: { notIn: ['ADOPTADO', 'FALLECIDO', 'DEVUELTO'] } },
    });
  });

  it('PU-HU7-06 la pantalla de indicadores de gestión se niega a un cliente del portal', () => {
    // Arrange
    const guard = new RolesGuard(new Reflector());
    const contexto = (role: string) =>
      ({
        getHandler: () => Reflect.get(KpisController.prototype, 'get') as object,
        getClass: () => KpisController,
        switchToHttp: () => ({ getRequest: () => ({ user: { id: 'u', role } }) }),
      }) as unknown as ExecutionContext;
    // Act
    const directivo = guard.canActivate(contexto('DIRECTIVO'));
    const cliente = () => guard.canActivate(contexto('CLIENTE'));
    // Assert
    expect(directivo).toBe(true);
    expect(cliente).toThrow(ForbiddenException);
  });
});
