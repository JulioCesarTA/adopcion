/**
 * Caja blanca del Sprint 3 — HU7 Panel de KPI: secciones aisladas y panel según el rol.
 * Una prueba por camino independiente (técnica del camino básico).
 * Prisma está simulado con jest.fn().
 */
import type { PrismaService } from '../../prisma/prisma.service';
import { DashboardService, Section } from './dashboard.service';

type ConSection = { section<T>(name: string, fn: () => Promise<T>): Promise<Section<T>> };

function prismaSimulado() {
  return {
    animal: { count: jest.fn().mockResolvedValue(2), groupBy: jest.fn().mockResolvedValue([]) },
    adoptionRequest: {
      count: jest.fn().mockResolvedValue(1),
      findMany: jest.fn().mockResolvedValue([{ id: 's1' }]),
    },
    $queryRaw: jest.fn().mockResolvedValue([]),
  };
}

describe('CB-HU7-A DashboardService.section (cada indicador aislado)', () => {
  const service = new DashboardService({} as PrismaService) as unknown as ConSection;

  it('CB-HU7-A-C1: el indicador se calcula → devuelve ok con sus datos', async () => {
    const r = await service.section('cards', () => Promise.resolve({ available: 3 }));
    expect(r).toEqual({ ok: true, data: { available: 3 } });
  });

  it('CB-HU7-A-C2: el indicador lanza un error → devuelve ok=false con un mensaje, sin propagar el error', async () => {
    const r = await service.section('byStatus', () =>
      Promise.reject(new Error('consulta fallida')),
    );
    expect(r).toEqual({ ok: false, error: 'No se pudo calcular este indicador' });
  });
});

describe('CB-HU7-B DashboardService.dashboard (panel según el rol)', () => {
  it('CB-HU7-B-C1: rol Personal Veterinario → sin la sección de últimas solicitudes', async () => {
    const prisma = prismaSimulado();
    const service = new DashboardService(prisma as unknown as PrismaService);
    const r = await service.dashboard('VETERINARIO');
    expect(r.latestRequests).toBeNull();
    expect(r.cards.ok).toBe(true);
    expect(prisma.adoptionRequest.findMany).not.toHaveBeenCalled();
  });

  it('CB-HU7-B-C2: rol Personal Directivo → incluye las últimas solicitudes', async () => {
    const prisma = prismaSimulado();
    const service = new DashboardService(prisma as unknown as PrismaService);
    const r = await service.dashboard('DIRECTIVO');
    expect(r.latestRequests).toEqual({ ok: true, data: [{ id: 's1' }] });
    expect(r.cards).toMatchObject({ ok: true, data: { available: 2, activeRequests: 1 } });
  });
});
