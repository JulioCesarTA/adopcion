import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AdopterProfile, Animal, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CatalogsService } from '../catalogs/catalogs.service';
import type { AuthUser } from '../../common/types';
import {
  AdopterInput,
  AnimalInput,
  CompatibilityResult,
  computeCompatibility,
  DISCLAIMER,
  IncompleteProfileError,
  sortRanking,
} from './engine';
import { CreateRecommendationDto } from './dto/recommendation.dto';

export function toAdopterInput(p: AdopterProfile): AdopterInput {
  return {
    housingType: p.housingType,
    hasYard: p.hasYard,
    hasChildren: p.hasChildren,
    hasOtherAnimals: p.hasOtherAnimals,
    availableHoursPerDay: p.availableHoursPerDay?.toNumber(),
    experience: p.experience,
    preferredSpecies: p.preferredSpecies,
    preferredSize: p.preferredSize,
  };
}

export function toAnimalInput(a: Animal): AnimalInput {
  return {
    status: a.status,
    species: a.species,
    size: a.size,
    energyLevel: a.energyLevel,
    goodWithChildren: a.goodWithChildren,
    goodWithAnimals: a.goodWithAnimals,
    needsYard: a.needsYard,
    specialCare: a.specialCare,
    requiredDailyHours: a.requiredDailyHours?.toNumber(),
  };
}

const animalSummary = (a: Animal) => ({
  id: a.id,
  code: a.code,
  name: a.name,
  species: a.species,
  size: a.size,
  sex: a.sex,
  ageMonths: a.ageMonths,
  energyLevel: a.energyLevel,
  photoUrl: a.photoUrl,
  status: a.status,
});

function toJson(result: CompatibilityResult): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue;
}

@Injectable()
export class RecommendationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogs: CatalogsService,
  ) {}

  private async adopterOrThrow(id: string) {
    const adopter = await this.prisma.adopterProfile.findUnique({
      where: { id },
      include: { person: { select: { firstName: true, lastName: true } } },
    });
    if (!adopter) throw new NotFoundException('Adoptante no encontrado');
    return adopter;
  }

  private incomplete(err: IncompleteProfileError): UnprocessableEntityException {
    return new UnprocessableEntityException({
      message: err.message,
      errors: err.missing,
    });
  }

  /** CU13 modo 1: ranking de todos los animales disponibles para un adoptante. */
  async ranking(adopterId: string, user: AuthUser) {
    const adopter = await this.adopterOrThrow(adopterId);
    const settings = await this.catalogs.currentSettings();
    const animals = await this.prisma.animal.findMany({
      where: { status: 'DISPONIBLE_ADOPCION', deletedAt: null },
    });

    const computed: {
      animal: Animal;
      code: string;
      result: CompatibilityResult;
    }[] = [];
    const skipped: {
      animal: ReturnType<typeof animalSummary>;
      missing: string[];
    }[] = [];

    for (const animal of animals) {
      try {
        computed.push({
          animal,
          code: animal.code,
          result: computeCompatibility(toAdopterInput(adopter), toAnimalInput(animal), settings),
        });
      } catch (err) {
        if (!(err instanceof IncompleteProfileError)) throw err;
        // Si falta un dato del adoptante, ninguna recomendación es confiable → 422
        if (err.missing.some((m) => m.startsWith('adoptante'))) throw this.incomplete(err);
        skipped.push({ animal: animalSummary(animal), missing: err.missing });
      }
    }

    const ranked = sortRanking(computed);
    if (ranked.length) {
      await this.prisma.compatibilityRecommendation.createMany({
        data: ranked.map((r) => ({
          adopterProfileId: adopterId,
          animalId: r.animal.id,
          score: r.result.score,
          level: r.result.level,
          breakdown: toJson(r.result),
          modelVersion: settings.version,
          generatedById: user.id,
        })),
      });
    }

    return {
      adopter: {
        id: adopter.id,
        name: `${adopter.person.firstName} ${adopter.person.lastName}`,
      },
      modelVersion: settings.version,
      disclaimer: DISCLAIMER,
      generatedAt: new Date(),
      data: ranked.map((r) => ({
        animal: animalSummary(r.animal),
        score: r.result.score,
        level: r.result.level,
        breakdown: r.result,
      })),
      skipped,
    };
  }

  /** CU13 modo 2: puntaje de un par adoptante–animal (p. ej. desde una solicitud). */
  async pair(dto: CreateRecommendationDto, user: AuthUser) {
    const adopter = await this.adopterOrThrow(dto.adopterId);
    const animal = await this.prisma.animal.findFirst({
      where: { id: dto.animalId, deletedAt: null },
    });
    if (!animal) throw new NotFoundException('Animal no encontrado');

    if (dto.requestId) {
      const req = await this.prisma.adoptionRequest.findUnique({
        where: { id: dto.requestId },
      });
      if (!req) throw new NotFoundException('Solicitud no encontrada');
      if (req.adopterProfileId !== dto.adopterId || req.animalId !== dto.animalId) {
        throw new BadRequestException('La solicitud no corresponde a ese adoptante y animal');
      }
    }

    const settings = await this.catalogs.currentSettings();
    // Desde una solicitud activa el animal está "en proceso": se evalúa como disponible.
    const input = toAnimalInput(animal);
    if (dto.requestId && animal.status === 'EN_PROCESO_ADOPCION')
      input.status = 'DISPONIBLE_ADOPCION';

    let result: CompatibilityResult;
    try {
      result = computeCompatibility(toAdopterInput(adopter), input, settings);
    } catch (err) {
      if (err instanceof IncompleteProfileError) throw this.incomplete(err);
      throw err;
    }

    const saved = await this.prisma.compatibilityRecommendation.create({
      data: {
        adopterProfileId: dto.adopterId,
        animalId: dto.animalId,
        adoptionRequestId: dto.requestId ?? null,
        score: result.score,
        level: result.level,
        breakdown: toJson(result),
        modelVersion: settings.version,
        generatedById: user.id,
      },
      include: { generatedBy: { select: { id: true, fullName: true } } },
    });
    return { ...saved, animal: animalSummary(animal) };
  }

  /** Historial de recomendaciones de un par. */
  history(adopterId: string, animalId: string) {
    return this.prisma.compatibilityRecommendation.findMany({
      where: { adopterProfileId: adopterId, animalId },
      orderBy: { generatedAt: 'desc' },
      take: 20,
      include: { generatedBy: { select: { id: true, fullName: true } } },
    });
  }
}
