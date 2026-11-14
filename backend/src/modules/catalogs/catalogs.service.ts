import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AlgorithmSetting, Vaccine } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/types';
import type { AlgorithmSettings, Weights } from '../recommendation/engine';
import { CreateAlgorithmSettingsDto, CreateVaccineDto, UpdateVaccineDto } from './dto/catalogs.dto';

export function toSettings(row: AlgorithmSetting): AlgorithmSettings {
  return {
    version: row.version,
    weights: row.weights as unknown as Weights,
    thresholdHigh: row.thresholdHigh,
    thresholdMedium: row.thresholdMedium,
  };
}

@Injectable()
export class CatalogsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Vacunas ----------

  listVaccines(active?: boolean): Promise<Vaccine[]> {
    return this.prisma.vaccine.findMany({
      where: active === undefined ? {} : { isActive: active },
      orderBy: { name: 'asc' },
    });
  }

  async createVaccine(dto: CreateVaccineDto): Promise<Vaccine> {
    await this.assertNameFree(dto.name);
    return this.prisma.$transaction(async (tx) => {
      const v = await tx.vaccine.create({
        data: { ...dto, species: [...new Set(dto.species)] },
      });
      return v;
    });
  }

  /** Desactivar solo oculta la vacuna del selector; el histórico se conserva (CU16). */
  async updateVaccine(id: string, dto: UpdateVaccineDto): Promise<Vaccine> {
    const current = await this.prisma.vaccine.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Vacuna no encontrada');
    if (dto.name && dto.name.toLowerCase() !== current.name.toLowerCase()) {
      await this.assertNameFree(dto.name);
    }
    return this.prisma.$transaction(async (tx) => {
      const v = await tx.vaccine.update({
        where: { id },
        data: {
          ...dto,
          ...(dto.species ? { species: [...new Set(dto.species)] } : {}),
        },
      });
      return v;
    });
  }

  private async assertNameFree(name: string) {
    const exists = await this.prisma.vaccine.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });
    if (exists) throw new ConflictException('Ya existe una vacuna con ese nombre');
  }

  // ---------- Pesos del algoritmo ----------

  async currentSettingsRow(): Promise<AlgorithmSetting> {
    const row = await this.prisma.algorithmSetting.findFirst({
      orderBy: { version: 'desc' },
    });
    if (!row) throw new NotFoundException('No hay configuración del algoritmo (ejecuta el seed)');
    return row;
  }

  async currentSettings(): Promise<AlgorithmSettings> {
    return toSettings(await this.currentSettingsRow());
  }

  async settingsHistory() {
    const [current, history] = await Promise.all([
      this.currentSettingsRow(),
      this.prisma.algorithmSetting.findMany({
        orderBy: { version: 'desc' },
        take: 20,
        include: { createdBy: { select: { fullName: true } } },
      }),
    ]);
    return { current, history };
  }

  /** Crea una nueva versión; los cálculos anteriores no se recalculan. */
  async createSettings(dto: CreateAlgorithmSettingsDto, user: AuthUser): Promise<AlgorithmSetting> {
    const w = dto.weights;
    const sum = w.time + w.space + w.experience + w.energy + w.preferences;
    if (sum !== 100) throw new BadRequestException(`Los pesos deben sumar 100 (suman ${sum})`);
    if (dto.thresholdMedium >= dto.thresholdHigh) {
      throw new BadRequestException('El umbral MEDIA debe ser menor que el umbral ALTA');
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('algorithm_settings'))`;
      const last = await tx.algorithmSetting.findFirst({
        orderBy: { version: 'desc' },
      });
      const row = await tx.algorithmSetting.create({
        data: {
          version: (last?.version ?? 0) + 1,
          weights: {
            time: w.time,
            space: w.space,
            experience: w.experience,
            energy: w.energy,
            preferences: w.preferences,
          },
          thresholdHigh: dto.thresholdHigh,
          thresholdMedium: dto.thresholdMedium,
          createdById: user.id,
        },
      });
      return row;
    });
  }
}
