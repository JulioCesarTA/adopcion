import {
  AdopterInput,
  AlgorithmSettings,
  AnimalInput,
  computeCompatibility,
  DISCLAIMER,
  IncompleteProfileError,
  levelFor,
  round2,
  sortRanking,
} from './engine';

const SETTINGS: AlgorithmSettings = {
  version: 1,
  weights: { time: 30, space: 25, experience: 20, energy: 15, preferences: 10 },
  thresholdHigh: 80,
  thresholdMedium: 60,
};

/** Ejemplo de la sección 8.4 */
const adopter: AdopterInput = {
  housingType: 'CASA_CON_PATIO',
  hasYard: true,
  hasChildren: false,
  hasOtherAnimals: false,
  availableHoursPerDay: 3,
  experience: 'BASICA',
  preferredSpecies: null,
  preferredSize: null,
};

const animal: AnimalInput = {
  status: 'DISPONIBLE_ADOPCION',
  species: 'PERRO',
  size: 'GRANDE',
  energyLevel: 4,
  goodWithChildren: true,
  goodWithAnimals: true,
  needsYard: false,
  specialCare: false,
  requiredDailyHours: 4,
};

const points = (r: ReturnType<typeof computeCompatibility>) =>
  Object.fromEntries(r.criteria.map((c) => [c.key, c.points]));

describe('computeCompatibility — ejemplo sección 8.4', () => {
  const r = computeCompatibility(adopter, animal, SETTINGS);

  it('calcula cada criterio como en la especificación', () => {
    const fits = Object.fromEntries(r.criteria.map((c) => [c.key, c.fit]));
    expect(fits).toEqual({
      time: 0.75,
      space: 1,
      experience: 1,
      energy: 0.875,
      preferences: 1,
    });
    expect(points(r)).toEqual({
      time: 22.5,
      space: 25,
      experience: 20,
      energy: 13.13, // 13.125 redondeado a 2 decimales
      preferences: 10,
    });
  });

  it('total 90.625 → 90.63 (2 decimales) y nivel ALTA', () => {
    expect(r.score).toBe(90.63);
    expect(r.level).toBe('ALTA');
    expect(r.hardFilters).toEqual({ passed: true, reasons: [] });
  });

  it('incluye explicación en texto, versión del modelo y el aviso RN-08', () => {
    expect(r.criteria.every((c) => c.explanation.length > 10)).toBe(true);
    expect(r.criteria.find((c) => c.key === 'time')?.explanation).toContain('3 h/día');
    expect(r.modelVersion).toBe(1);
    expect(r.disclaimer).toBe(DISCLAIMER);
  });
});

describe('filtros duros', () => {
  it('animal no disponible → INCOMPATIBLE, score 0', () => {
    const r = computeCompatibility(adopter, { ...animal, status: 'EN_TRATAMIENTO' }, SETTINGS);
    expect(r).toMatchObject({ score: 0, level: 'INCOMPATIBLE', criteria: [] });
    expect(r.hardFilters.reasons[0]).toMatch(/no está disponible/);
  });

  it('no se lleva bien con niños y el hogar tiene niños', () => {
    const r = computeCompatibility(
      { ...adopter, hasChildren: true },
      { ...animal, goodWithChildren: false },
      SETTINGS,
    );
    expect(r.level).toBe('INCOMPATIBLE');
    expect(r.score).toBe(0);
    expect(r.hardFilters.reasons[0]).toMatch(/niños/);
  });

  it('no se lleva bien con otros animales y el adoptante tiene', () => {
    const r = computeCompatibility(
      { ...adopter, hasOtherAnimals: true },
      { ...animal, goodWithAnimals: false },
      SETTINGS,
    );
    expect(r.level).toBe('INCOMPATIBLE');
    expect(r.hardFilters.reasons[0]).toMatch(/otros animales/);
  });

  it('sin niños en el hogar, el filtro de niños no aplica', () => {
    const r = computeCompatibility(adopter, { ...animal, goodWithChildren: false }, SETTINGS);
    expect(r.level).not.toBe('INCOMPATIBLE');
  });

  it('acumula varios motivos', () => {
    const r = computeCompatibility(
      { ...adopter, hasChildren: true, hasOtherAnimals: true },
      { ...animal, goodWithChildren: false, goodWithAnimals: false },
      SETTINGS,
    );
    expect(r.hardFilters.reasons).toHaveLength(2);
  });
});

describe('perfil incompleto', () => {
  it('lanza IncompleteProfileError indicando los campos faltantes', () => {
    const bad = {
      ...adopter,
      availableHoursPerDay: undefined,
    } as unknown as AdopterInput;
    const badAnimal = { ...animal, size: undefined } as unknown as AnimalInput;
    expect(() => computeCompatibility(bad, badAnimal, SETTINGS)).toThrow(IncompleteProfileError);
    try {
      computeCompatibility(bad, badAnimal, SETTINGS);
    } catch (e) {
      expect((e as IncompleteProfileError).missing).toEqual([
        'adoptante: horas diarias disponibles',
        'animal: tamaño',
      ]);
      expect((e as Error).message).toMatch(/No se puede generar una recomendación confiable/);
    }
  });

  it('NaN también cuenta como dato faltante', () => {
    expect(() =>
      computeCompatibility(adopter, { ...animal, energyLevel: Number.NaN }, SETTINGS),
    ).toThrow(IncompleteProfileError);
  });
});

describe('pesos distintos', () => {
  it('usa los pesos configurados (solo tiempo = 100)', () => {
    const r = computeCompatibility(adopter, animal, {
      ...SETTINGS,
      version: 7,
      weights: {
        time: 100,
        space: 0,
        experience: 0,
        energy: 0,
        preferences: 0,
      },
    });
    expect(r.score).toBe(75);
    expect(r.level).toBe('MEDIA'); // 60 ≤ 75 < 80
  });

  it('nivel según umbrales configurables', () => {
    expect(levelFor(75, SETTINGS)).toBe('MEDIA');
    expect(levelFor(75, { thresholdHigh: 70, thresholdMedium: 50 })).toBe('ALTA');
    expect(levelFor(59.99, SETTINGS)).toBe('BAJA');
    expect(levelFor(80, SETTINGS)).toBe('ALTA');
  });

  it('cambiar pesos cambia el puntaje y guarda la versión', () => {
    const r = computeCompatibility(adopter, animal, {
      ...SETTINGS,
      version: 2,
      weights: {
        time: 50,
        space: 10,
        experience: 10,
        energy: 20,
        preferences: 10,
      },
    });
    // 50·0.75 + 10 + 10 + 20·0.875 + 10 = 85
    expect(r.score).toBe(85);
    expect(r.modelVersion).toBe(2);
  });
});

describe('reglas de cada criterio', () => {
  it('espacio: departamento con perro grande → 0; mediano → 0.5', () => {
    const dep = { ...adopter, housingType: 'DEPARTAMENTO' as const };
    expect(computeCompatibility(dep, animal, SETTINGS).criteria[1].fit).toBe(0);
    expect(
      computeCompatibility(dep, { ...animal, size: 'MEDIANO' }, SETTINGS).criteria[1].fit,
    ).toBe(0.5);
  });

  it('espacio: needs_yard suma 1 a la necesidad (tope 2)', () => {
    const csp = { ...adopter, housingType: 'CASA_SIN_PATIO' as const };
    const r = computeCompatibility(csp, { ...animal, size: 'MEDIANO', needsYard: true }, SETTINGS);
    expect(r.criteria[1].fit).toBe(0.5);
  });

  it('espacio: gato en departamento → 1 salvo que necesite patio', () => {
    const dep = { ...adopter, housingType: 'DEPARTAMENTO' as const };
    const cat = {
      ...animal,
      species: 'GATO' as const,
      size: 'GRANDE' as const,
    };
    expect(computeCompatibility(dep, cat, SETTINGS).criteria[1].fit).toBe(1);
    expect(computeCompatibility(dep, { ...cat, needsYard: true }, SETTINGS).criteria[1].fit).toBe(
      0,
    );
  });

  it('experiencia: cuidados especiales exige AVANZADA', () => {
    const special = { ...animal, specialCare: true };
    expect(
      computeCompatibility({ ...adopter, experience: 'NINGUNA' }, special, SETTINGS).criteria[2]
        .fit,
    ).toBe(0);
    expect(computeCompatibility(adopter, special, SETTINGS).criteria[2].fit).toBe(0.5);
    expect(
      computeCompatibility({ ...adopter, experience: 'AVANZADA' }, special, SETTINGS).criteria[2]
        .fit,
    ).toBe(1);
  });

  it('tiempo: requerido 0 → fit 1; más horas que las requeridas → tope 1', () => {
    expect(
      computeCompatibility(adopter, { ...animal, requiredDailyHours: 0 }, SETTINGS).criteria[0].fit,
    ).toBe(1);
    expect(
      computeCompatibility({ ...adopter, availableHoursPerDay: 10 }, animal, SETTINGS).criteria[0]
        .fit,
    ).toBe(1);
  });

  it('preferencias: 50 % especie + 50 % tamaño', () => {
    const r = computeCompatibility(
      { ...adopter, preferredSpecies: 'PERRO', preferredSize: 'PEQUENO' },
      animal,
      SETTINGS,
    );
    expect(r.criteria[4].fit).toBe(0.5);
    expect(r.criteria[4].points).toBe(5);
  });
});

describe('redondeo', () => {
  it('round2 redondea a 2 decimales (incluido el caso .xx5)', () => {
    expect(round2(90.625)).toBe(90.63);
    expect(round2(1.005)).toBe(1.01);
    expect(round2(33.333333)).toBe(33.33);
  });

  it('el score siempre tiene como máximo 2 decimales', () => {
    const r = computeCompatibility(
      { ...adopter, availableHoursPerDay: 1 },
      { ...animal, requiredDailyHours: 3 },
      SETTINGS,
    );
    expect(Number.isInteger(r.score * 100)).toBe(true);
  });
});

describe('orden del ranking', () => {
  it('ordena por puntaje descendente y desempata por código', () => {
    const mk = (code: string, score: number) => ({
      code,
      result: { ...computeCompatibility(adopter, animal, SETTINGS), score },
    });
    const sorted = sortRanking([
      mk('ZOO-2026-0003', 50),
      mk('ZOO-2026-0002', 90),
      mk('ZOO-2026-0001', 50),
      mk('X', 0),
    ]);
    expect(sorted.map((s) => s.code)).toEqual([
      'ZOO-2026-0002',
      'ZOO-2026-0001',
      'ZOO-2026-0003',
      'X',
    ]);
  });
});
