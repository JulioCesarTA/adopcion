import { Injectable, NotFoundException } from '@nestjs/common';
import { Animal, AnimalStatus, Prisma } from '@prisma/client';
import { CLINICAL_STATES, clinicalStatusFor } from './animal-status';

type Tx = Prisma.TransactionClient;

@Injectable()
export class AnimalStatusService {
  async getForUpdate(tx: Tx, animalId: string): Promise<Animal> {
    const animal = await tx.animal.findFirst({
      where: { id: animalId, deletedAt: null },
    });
    if (!animal) throw new NotFoundException('Animal no encontrado');
    return animal;
  }

  /** Cambia el estado del animal (sin restricciones de transición). */
  async changeStatus(
    tx: Tx,
    animal: Pick<Animal, 'id' | 'status'>,
    to: AnimalStatus,
    extra: Prisma.AnimalUpdateInput = {},
  ): Promise<Animal> {
    const updated = await tx.animal.update({
      where: { id: animal.id },
      data: { ...extra, status: to },
    });
    return updated;
  }

  /**
   * Recalcula el estado clínico (periodo activo > tratamiento activo > ingresado).
   * Solo actúa si el animal está en un estado clínico; los demás estados
   * (adopción, salida) no se tocan.
   */
  async syncClinicalStatus(tx: Tx, animalId: string): Promise<Animal> {
    const animal = await this.getForUpdate(tx, animalId);
    if (!CLINICAL_STATES.includes(animal.status)) return animal;
    const target = clinicalStatusFor(await this.clinicalFacts(tx, animalId));
    if (target === animal.status) return animal;
    return this.changeStatus(tx, animal, target);
  }

  async clinicalFacts(tx: Tx, animalId: string) {
    const [period, activeTreatments] = await Promise.all([
      tx.quarantinePeriod.findFirst({
        where: { animalId, status: 'ACTIVO' },
        select: { type: true },
      }),
      tx.treatment.count({
        where: { status: 'ACTIVO', consultation: { animalId } },
      }),
    ]);
    return {
      activePeriodType: period?.type ?? null,
      hasActiveTreatment: activeTreatments > 0,
    };
  }
}
