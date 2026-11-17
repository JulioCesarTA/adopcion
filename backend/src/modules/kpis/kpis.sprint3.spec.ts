/**
 * Caja blanca del Sprint 3 — HU7: tendencia de un indicador de gestión respecto al período anterior.
 * Una prueba por camino independiente (técnica del camino básico). No usa base de datos.
 */
import type { PrismaService } from '../../prisma/prisma.service';
import { Kpi, KpisService } from './kpis.service';

type ConBuild = {
  build(base: Omit<Kpi, 'delta' | 'trend'>, opts?: { threshold?: number }): Kpi;
};
const service = new KpisService({} as PrismaService) as unknown as ConBuild;

const base = (value: number | null, previous: number | null): Omit<Kpi, 'delta' | 'trend'> => ({
  key: 'tasa-adopcion',
  label: 'Adopciones concretadas',
  value,
  unit: '%',
  previous,
  direction: 'mas-es-mejor',
  detail: '',
  help: '',
});

describe('CB-HU7-C KpisService.build (tendencia respecto al período anterior)', () => {
  it('CB-HU7-C-C1: el período actual no tiene valor → sin diferencia y tendencia estable', () => {
    const k = service.build(base(null, 40));
    expect(k.delta).toBeNull();
    expect(k.trend).toBe('estable');
  });

  it('CB-HU7-C-C2: el período anterior no tiene valor → sin diferencia y tendencia estable', () => {
    const k = service.build(base(66.67, null));
    expect(k.delta).toBeNull();
    expect(k.trend).toBe('estable');
  });

  it('CB-HU7-C-C3: la diferencia es menor que el umbral (0,3 < 0,5) → tendencia estable', () => {
    const k = service.build(base(50.3, 50));
    expect(k.delta).toBe(0.3);
    expect(k.trend).toBe('estable');
  });

  it('CB-HU7-C-C4: el valor sube por encima del umbral → tendencia sube', () => {
    const k = service.build(base(66.67, 33.33));
    expect(k.delta).toBe(33.34);
    expect(k.trend).toBe('sube');
  });

  it('CB-HU7-C-C5: el valor baja por encima del umbral → tendencia baja', () => {
    const k = service.build(base(4.4, 11), { threshold: 1 });
    expect(k.delta).toBe(-6.6);
    expect(k.trend).toBe('baja');
  });
});
