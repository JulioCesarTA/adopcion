/**
 * Caja blanca del Sprint 2 — HU6 Recomendación de Compatibilidad.
 * Una prueba por camino independiente (técnica del camino básico).
 * Prisma, el catálogo y el servicio del modelo están simulados con jest.fn().
 */
import type { PrismaService } from '../../prisma/prisma.service';
import type { CatalogsService } from '../catalogs/catalogs.service';
import type { MlService } from './ml/ml.service';
import { AdopterInput, AlgorithmSettings, AnimalInput, levelFor } from './engine';
import { RecommendationService, ScoredResult } from './recommendation.service';

const settings: AlgorithmSettings = {
  version: 1,
  weights: { time: 30, space: 25, experience: 20, energy: 15, preferences: 10 },
  thresholdHigh: 80,
  thresholdMedium: 60,
};
const adoptante: AdopterInput = {
  housingType: 'CASA_CON_PATIO',
  hasYard: true,
  hasChildren: true,
  hasOtherAnimals: false,
  availableHoursPerDay: 5,
  experience: 'BASICA',
};
const animal: AnimalInput = {
  status: 'DISPONIBLE_ADOPCION',
  species: 'PERRO',
  size: 'MEDIANO',
  energyLevel: 3,
  goodWithChildren: true,
  goodWithAnimals: true,
  needsYard: false,
  specialCare: false,
  requiredDailyHours: 2,
};

type ConScore = {
  score(a: AdopterInput, n: AnimalInput, s: AlgorithmSettings): Promise<ScoredResult>;
};

function setup(activo: unknown) {
  const ml = { activeForest: jest.fn().mockResolvedValue(activo) };
  const service = new RecommendationService(
    {} as PrismaService,
    {} as CatalogsService,
    ml as unknown as MlService,
  );
  return { service: service as unknown as ConScore, ml };
}

describe('CB-HU6-A RecommendationService.score (modelo o reglas fijas)', () => {
  it('CB-HU6-A-C1: no pasa un filtro obligatorio → INCOMPATIBLE con reglas, sin consultar el modelo', async () => {
    const { service, ml } = setup(null);
    const r = await service.score(adoptante, { ...animal, goodWithChildren: false }, settings);
    expect(r.method).toBe('REGLAS');
    expect(r.level).toBe('INCOMPATIBLE');
    expect(r.score).toBe(0);
    expect(ml.activeForest).not.toHaveBeenCalled();
  });

  it('CB-HU6-A-C2: pasa los filtros y no hay modelo activo → puntaje de las reglas fijas', async () => {
    const { service, ml } = setup(null);
    const r = await service.score(adoptante, animal, settings);
    expect(ml.activeForest).toHaveBeenCalledTimes(1);
    expect(r.method).toBe('REGLAS');
    expect(r.ml).toBeNull();
    expect(r.score).toBe(r.ruleScore);
  });

  it('CB-HU6-A-C3: pasa los filtros y hay modelo activo → puntaje de la probabilidad del modelo', async () => {
    const forest = {
      predictProba: jest.fn().mockReturnValue(0.7234),
      agreement: jest.fn().mockReturnValue(0.9),
      explain: jest
        .fn()
        .mockReturnValue([
          { feature: 'hoursRatio', value: 2.5, contribution: 0.12, direction: 'favorece' },
        ]),
    };
    const { service } = setup({ version: 3, forest });
    const r = await service.score(adoptante, animal, settings);
    expect(r.method).toBe('MODELO');
    expect(r.score).toBe(72.34);
    expect(r.level).toBe('MEDIA');
    expect(r.ml?.modelVersion).toBe(3);
    expect(r.ml?.factors).toHaveLength(1);
  });
});

describe('CB-HU6-B levelFor (nivel de compatibilidad)', () => {
  it('CB-HU6-B-C1: puntaje 80 (igual al umbral alto) → ALTA', () => {
    expect(levelFor(80, settings)).toBe('ALTA');
  });

  it('CB-HU6-B-C2: puntaje 60 (igual al umbral medio) → MEDIA', () => {
    expect(levelFor(60, settings)).toBe('MEDIA');
  });

  it('CB-HU6-B-C3: puntaje 59,99 (bajo el umbral medio) → BAJA', () => {
    expect(levelFor(59.99, settings)).toBe('BAJA');
  });
});
