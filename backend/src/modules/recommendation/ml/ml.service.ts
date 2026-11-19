import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MlModel, MlModelSource, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthUser } from '../../../common/types';
import { loadClinicalHistory, toAdopterInput, toAnimalInput } from '../inputs';
import { FEATURE_LABELS, FEATURE_NAMES, toFeatures, type Sample } from './dataset';
import { crossValidate, evaluate, type Metrics } from './metrics';
import { LogisticRegression } from './logistic-regression';
import { RandomForest, type SerializedForest } from './random-forest';
import type { TrainModelDto } from '../dto/ml.dto';

/** Mínimo de casos reales para entrenar sin recurrir a datos sintéticos. */
export const MIN_REAL_SAMPLES = 150;

export interface TrainingReport {
  version: number;
  algorithm: string;
  source: MlModelSource;
  datasetSize: number;
  realSamples: number;
  syntheticSamples: number;
  positiveRate: number;
  seed: number;
  /** Validación cruzada del Random Forest. */
  forest: ReturnType<typeof crossValidate>;
  /** Línea base que sí aprende. */
  logistic: ReturnType<typeof crossValidate>;
  /** Exactitud out-of-bag del modelo final. */
  oobScore: number | null;
  structure: { trees: number; avgDepth: number; avgLeaves: number };
  importances: { feature: string; label: string; importance: number }[];
  warnings: string[];
}

@Injectable()
export class MlService {
  private readonly logger = new Logger(MlService.name);
  /** Modelo activo en memoria, para no deserializarlo en cada predicción. */
  private cached: { version: number; forest: RandomForest } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------------------ lectura

  /**
   * Casos reales: solicitudes ya resueltas. `APROBADA` = 1, `RECHAZADA` = 0.
   * `PENDIENTE`, `EN_EVALUACION` y `CANCELADA` se excluyen: una cancelación no
   * dice nada sobre la idoneidad del par (puede ser un cambio de planes del
   * adoptante), así que etiquetarla como fracaso introduciría sesgo.
   */
  async realSamples(): Promise<Sample[]> {
    const requests = await this.prisma.adoptionRequest.findMany({
      where: { status: { in: ['APROBADA', 'RECHAZADA'] } },
      include: {
        adopterProfile: { include: { person: { select: { email: true } } } },
        animal: true,
      },
    });

    const samples: Sample[] = [];
    for (const r of requests) {
      if (!r.animal || r.animal.deletedAt) continue;
      try {
        const features = toFeatures(
          // Historial como cliente hasta el día en que pidió la adopción.
          toAdopterInput(
            r.adopterProfile,
            await loadClinicalHistory(this.prisma, r.adopterProfile.person.email, r.requestDate),
          ),
          // El animal ya cambió de estado tras la decisión; para el modelo se
          // evalúa como estaba al momento de solicitarlo.
          { ...toAnimalInput(r.animal), status: 'DISPONIBLE_ADOPCION' },
        );
        if (features.some((v) => !Number.isFinite(v))) continue;
        samples.push({ features, label: r.status === 'APROBADA' ? 1 : 0 });
      } catch {
        // Perfil incompleto: no sirve como caso de entrenamiento.
        continue;
      }
    }
    return samples;
  }

  /** Modelo activo, o `null` si no hay ninguno entrenado todavía. */
  async activeForest(): Promise<{ version: number; forest: RandomForest } | null> {
    if (this.cached) return this.cached;

    const row = await this.prisma.mlModel.findFirst({ where: { isActive: true } });
    if (!row) return null;

    try {
      const forest = RandomForest.fromJSON(row.model as unknown as SerializedForest);
      this.cached = { version: row.version, forest };
      return this.cached;
    } catch (err) {
      this.logger.error(`El modelo v${row.version} no se pudo cargar: ${(err as Error).message}`);
      return null;
    }
  }

  /** Invalida la caché. Se llama al entrenar o activar un modelo. */
  private invalidate(): void {
    this.cached = null;
  }

  async list() {
    // El modelo serializado puede pesar varios MB: `omit` lo deja fuera de la consulta.
    return this.prisma.mlModel.findMany({
      orderBy: { version: 'desc' },
      take: 30,
      omit: { model: true },
      include: { createdBy: { select: { id: true, fullName: true } } },
    });
  }

  async detail(version: number) {
    const row = await this.prisma.mlModel.findUnique({
      where: { version },
      omit: { model: true },
      include: { createdBy: { select: { id: true, fullName: true } } },
    });
    if (!row) throw new NotFoundException('Modelo no encontrado');
    return row;
  }

  // ------------------------------------------------------------ entrenamiento

  async train(dto: TrainModelDto, user: AuthUser): Promise<TrainingReport> {
    const seed = dto.seed ?? 2026;
    const folds = dto.folds ?? 5;
    const warnings: string[] = [];

    // Solo solicitudes reales resueltas: el sistema no entrena con casos inventados.
    const samples = await this.realSamples();

    if (samples.length > 0 && samples.length < MIN_REAL_SAMPLES) {
      warnings.push(
        `Solo hay ${samples.length} solicitudes resueltas utilizables; se recomiendan al menos ` +
          `${MIN_REAL_SAMPLES} para que las métricas sean estables.`,
      );
    }

    if (samples.length < 2 * folds) {
      throw new BadRequestException(
        `Hacen falta al menos ${2 * folds} casos para entrenar con ${folds} pliegues; hay ${samples.length}.`,
      );
    }

    const positives = samples.filter((s) => s.label === 1).length;
    if (positives === 0 || positives === samples.length) {
      throw new BadRequestException(
        'El conjunto tiene una sola clase: hacen falta solicitudes aprobadas y rechazadas.',
      );
    }

    const source: MlModelSource = 'REAL';

    // --- Validación cruzada: el bosque y la línea base logística ---
    const forestCv = crossValidate(
      {
        name: 'random-forest',
        fit: (train) => {
          const m = RandomForest.train(train, FEATURE_NAMES, { nTrees: dto.nTrees ?? 150, seed });
          return (f) => m.predictProba(f);
        },
      },
      samples,
      folds,
      seed,
    );

    const logisticCv = crossValidate(
      {
        name: 'logistic-regression',
        fit: (train) => {
          const m = LogisticRegression.train(train, FEATURE_NAMES, { epochs: 1500 });
          return (f) => m.predictProba(f);
        },
      },
      samples,
      folds,
      seed,
    );

    // --- Modelo final con todo el conjunto ---
    const forest = RandomForest.train(samples, FEATURE_NAMES, {
      nTrees: dto.nTrees ?? 150,
      seed,
    });

    const importances = forest.rankedImportances().map((r) => ({
      feature: r.feature,
      label: FEATURE_LABELS[r.feature as keyof typeof FEATURE_LABELS] ?? r.feature,
      importance: Math.round(r.importance * 10000) / 10000,
    }));

    const report: TrainingReport = {
      version: 0, // se asigna al guardar
      algorithm: 'random-forest',
      source,
      datasetSize: samples.length,
      realSamples: samples.length,
      syntheticSamples: 0,
      positiveRate: Math.round((positives / samples.length) * 10000) / 10000,
      seed,
      forest: forestCv,
      logistic: logisticCv,
      oobScore: forest.oobScore,
      structure: forest.structure(),
      importances,
      warnings,
    };

    // --- Persistir versionado, y activar si se pidió ---
    const saved = await this.prisma.$transaction(
      async (tx) => {
        const last = await tx.mlModel.findFirst({ orderBy: { version: 'desc' } });
        const version = (last?.version ?? 0) + 1;

        const activate = dto.activate ?? true;
        if (activate) {
          await tx.mlModel.updateMany({ where: { isActive: true }, data: { isActive: false } });
        }

        const row = await tx.mlModel.create({
          data: {
            version,
            algorithm: 'random-forest',
            source,
            isActive: activate,
            model: forest.toJSON() as unknown as Prisma.InputJsonValue,
            metrics: { ...report, version } as unknown as Prisma.InputJsonValue,
            datasetSize: samples.length,
            realSamples: samples.length,
            syntheticSamples: 0,
            seed,
            notes: dto.notes ?? null,
            createdById: user.id,
          },
        });

        return row;
      },
      // El modelo serializado pesa varios MB: 5 s (el límite por defecto) no alcanzan para guardarlo.
      { timeout: 30_000, maxWait: 10_000 },
    );

    this.invalidate();
    this.logger.log(
      `Modelo v${saved.version} entrenado (${source}, ${samples.length} casos, ` +
        `AUC ${forestCv.pooled.rocAuc}, exactitud ${forestCv.pooled.accuracy})`,
    );

    return { ...report, version: saved.version };
  }

  /** Activa un modelo ya entrenado (permite volver a una versión anterior). */
  async activate(version: number): Promise<Omit<MlModel, 'model'>> {
    const row = await this.prisma.mlModel.findUnique({ where: { version } });
    if (!row) throw new NotFoundException('Modelo no encontrado');

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.mlModel.updateMany({ where: { isActive: true }, data: { isActive: false } });
      const next = await tx.mlModel.update({
        where: { version },
        omit: { model: true },
        data: { isActive: true },
      });
      return next;
    });

    this.invalidate();
    return updated;
  }

  /** Desactiva el modelo vigente: el sistema vuelve al motor de reglas. */
  async deactivate(): Promise<{ deactivated: number | null }> {
    const current = await this.prisma.mlModel.findFirst({ where: { isActive: true } });
    if (!current) return { deactivated: null };

    await this.prisma.$transaction(async (tx) => {
      await tx.mlModel.update({ where: { version: current.version }, data: { isActive: false } });
    });

    this.invalidate();
    return { deactivated: current.version };
  }

  /** Estado para la interfaz de administración. */
  async status() {
    const [active, total, real] = await Promise.all([
      this.prisma.mlModel.findFirst({
        where: { isActive: true },
        include: { createdBy: { select: { fullName: true } } },
      }),
      this.prisma.mlModel.count(),
      this.realSamples(),
    ]);

    return {
      hasActiveModel: !!active,
      activeVersion: active?.version ?? null,
      activeSource: active?.source ?? null,
      activeMetrics: (active?.metrics as unknown as TrainingReport | null) ?? null,
      trainedAt: active?.createdAt ?? null,
      trainedBy: active?.createdBy.fullName ?? null,
      totalModels: total,
      realSamplesAvailable: real.length,
      minRealSamplesRecommended: MIN_REAL_SAMPLES,
      featureCount: FEATURE_NAMES.length,
    };
  }

  /** Evalúa un conjunto arbitrario con el modelo activo. Usado por las pruebas. */
  evaluateWith(forest: RandomForest, samples: Sample[]): Metrics {
    return evaluate(
      samples.map((s) => s.label),
      samples.map((s) => forest.predictProba(s.features)),
    );
  }
}
