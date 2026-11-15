import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AlgorithmSetting, Vaccine } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AlgorithmSettings, Weights } from '../recommendation/engine';
import { CreateVaccineDto, UpdateVaccineDto } from './dto/catalogs.dto';

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

  // ---------- Pesos del motor de reglas (solo lectura; los carga el seed) ----------

  private async currentSettingsRow(): Promise<AlgorithmSetting> {
    const row = await this.prisma.algorithmSetting.findFirst({
      orderBy: { version: 'desc' },
    });
    if (!row) throw new NotFoundException('No hay configuración del algoritmo (ejecuta el seed)');
    return row;
  }

  async currentSettings(): Promise<AlgorithmSettings> {
    return toSettings(await this.currentSettingsRow());
  }
}
