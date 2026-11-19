/**
 * Pruebas unitarias del Sprint 2 — HU6 Recomendación de Compatibilidad.
 * Sin base de datos ni red: Prisma, el catálogo y el modelo están simulados con jest.fn().
 * El Random Forest se entrena con una semilla fija.
 */
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import type { CatalogsService } from '../catalogs/catalogs.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthUser } from '../../common/types';
import {
  AdopterInput,
  AlgorithmSettings,
  AnimalInput,
  CompatibilityResult,
  computeCompatibility,
  sortRanking,
} from './engine';
import { MlController } from './ml/ml.controller';
import type { MlService } from './ml/ml.service';
import { RandomForest } from './ml/random-forest';
import { FEATURE_NAMES } from './ml/dataset';
import { generateSyntheticDataset } from './ml/synthetic.fixture';
import { RecommendationService } from './recommendation.service';

const settings: AlgorithmSettings = {
  version: 1,
  weights: { time: 30, space: 25, experience: 20, energy: 15, preferences: 10 },
  thresholdHigh: 80,
  thresholdMedium: 60,
};
const hogar: AdopterInput = {
  housingType: 'CASA_CON_PATIO',
  hasYard: true,
  hasChildren: false,
  hasOtherAnimals: false,
  availableHoursPerDay: 8,
  experience: 'AVANZADA',
};
const perro: AnimalInput = {
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

/** Servicio con un animal disponible, un adoptante (la fila simulada) y sin modelo activo. */
function rankingSetup(fila: object) {
  const prisma = {
    animal: {
      findFirst: jest.fn().mockResolvedValue({
        ...perro,
        id: 'n1',
        code: 'ZOO-2026-0003',
        requiredDailyHours: new Prisma.Decimal(2),
      }),
    },
    adopterProfile: { findMany: jest.fn().mockResolvedValue([fila]) },
    compatibilityRecommendation: { createMany: jest.fn() },
  };
  const catalogs = { currentSettings: jest.fn().mockResolvedValue(settings) };
  const ml = { activeForest: jest.fn().mockResolvedValue(null) };
  return new RecommendationService(
    prisma as unknown as PrismaService,
    catalogs as unknown as CatalogsService,
    ml as unknown as MlService,
  );
}

describe('HU6 Recomendación de Compatibilidad — pruebas unitarias', () => {
  it('PU-HU6-01 con todos los criterios favorables el puntaje llega a 100 y no lo supera', () => {
    // Arrange
    const adoptante = { ...hogar };
    // Act
    const r = computeCompatibility(adoptante, perro, settings);
    // Assert
    expect(r.score).toBe(100);
    expect(r.criteria).toHaveLength(5);
    expect(r.disclaimer).toBe('Resultado de apoyo. La decisión final es del personal responsable.');
  });

  it('PU-HU6-02 un animal que no tolera otros animales es incompatible con un hogar que ya tiene', () => {
    // Arrange
    const adoptante = { ...hogar, hasOtherAnimals: true };
    const animal = { ...perro, goodWithAnimals: false };
    // Act
    const r = computeCompatibility(adoptante, animal, settings);
    // Assert
    expect(r.level).toBe('INCOMPATIBLE');
    expect(r.score).toBe(0);
    expect(r.hardFilters.reasons).toEqual([
      'El animal no se lleva bien con otros animales y el adoptante tiene otros animales.',
    ]);
  });

  it('PU-HU6-03 sortRanking ordena de mayor a menor puntaje y desempata por código', () => {
    // Arrange
    const item = (code: string, score: number) => ({
      code,
      result: { score } as CompatibilityResult,
    });
    const items = [
      item('ZOO-2026-0003', 70),
      item('ZOO-2026-0002', 91.5),
      item('ZOO-2026-0001', 70),
    ];
    // Act
    const orden = sortRanking(items).map((i) => i.code);
    // Assert
    expect(orden).toEqual(['ZOO-2026-0002', 'ZOO-2026-0001', 'ZOO-2026-0003']);
  });

  it('PU-HU6-04 el Random Forest da la misma probabilidad con la misma semilla', () => {
    // Arrange
    const { samples } = generateSyntheticDataset({ size: 200, seed: 2026 });
    const caso = samples[0].features;
    // Act
    const a = RandomForest.train(samples, FEATURE_NAMES, { nTrees: 15, seed: 2026 });
    const b = RandomForest.train(samples, FEATURE_NAMES, { nTrees: 15, seed: 2026 });
    // Assert
    expect(a.predictProba(caso)).toBe(b.predictProba(caso));
    expect(a.predictProba(caso)).toBeGreaterThanOrEqual(0);
    expect(a.predictProba(caso)).toBeLessThanOrEqual(1);
  });

  it('PU-HU6-05 solo el administrador puede entrenar el modelo de inteligencia artificial', () => {
    // Arrange
    const guard = new RolesGuard(new Reflector());
    const contexto = (role: string) =>
      ({
        getHandler: () => Reflect.get(MlController.prototype, 'train') as object,
        getClass: () => MlController,
        switchToHttp: () => ({ getRequest: () => ({ user: { id: 'u', role } }) }),
      }) as unknown as ExecutionContext;
    // Act
    const admin = guard.canActivate(contexto('ADMIN'));
    const gestion = () => guard.canActivate(contexto('VETERINARIO'));
    // Assert
    expect(admin).toBe(true);
    expect(gestion).toThrow(ForbiddenException);
  });

  it('PU-HU6-06 la lista de adoptantes compatibles con un animal no muestra el carnet', async () => {
    // Arrange
    const service = rankingSetup({
      id: 'a1',
      housingType: 'CASA_CON_PATIO',
      hasYard: true,
      hasChildren: false,
      hasOtherAnimals: false,
      availableHoursPerDay: new Prisma.Decimal(8),
      experience: 'AVANZADA',
      person: { firstName: 'Jorge', lastName: 'Vargas', phone: '70000002', ci: '9000002 LP' },
    });
    // Act
    const r = await service.rankingForAnimal('n1', { id: 'g', role: 'ADMIN' } as AuthUser);
    // Assert
    expect(r.data[0].adopter.name).toBe('Jorge Vargas');
    expect(r.data[0].adopter).not.toHaveProperty('ci');
    expect(JSON.stringify(r.data)).not.toContain('9000002');
  });
});
