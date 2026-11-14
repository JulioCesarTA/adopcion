import { Injectable, NotFoundException } from '@nestjs/common';
import { Animal, AnimalStatus, Prisma } from '@prisma/client';
import { assertTransition, CLINICAL_STATES, clinicalStatusFor } from './animal-status';

type Tx = Prisma.TransactionClient;

@Injectable()
export class AnimalStatusService {
  async getForUpdate(tx: Tx, animalId: string): Promise<Animal> {
    // Bloquea la fila para serializar cambios de estado concurrentes sobre el mismo animal
    await tx.$executeRaw`SELECT id FROM animals WHERE id = ${animalId}::uuid FOR UPDATE`;
    const animal = await tx.animal.findFirst({
      where: { id: animalId, deletedAt: null },
    });
    if (!animal) throw new NotFoundException('Animal no encontrado');
    return animal;
  }

  /** Cambia el estado validando el grafo (409 si no es válido) y lo audita. */
  async changeStatus(
    tx: Tx,
    animal: Pick<Animal, 'id' | 'status'>,
    to: AnimalStatus,
    extra: Prisma.AnimalUpdateInput = {},
  ): Promise<Animal> {
    assertTransition(animal.status, to);
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

  /** RN-03: devuelve la lista de condiciones que impiden habilitar para adopción. */
  async adoptionBlockers(tx: Tx, animal: Pick<Animal, 'id' | 'status'>): Promise<string[]> {
    const reasons: string[] = [];
    const [facts, consultations] = await Promise.all([
      this.clinicalFacts(tx, animal.id),
      tx.veterinaryConsultation.count({ where: { animalId: animal.id } }),
    ]);
    if (facts.activePeriodType === 'CUARENTENA') reasons.push('Tiene cuarentena activa');
    if (facts.activePeriodType === 'OBSERVACION') reasons.push('Tiene observación activa');
    if (facts.hasActiveTreatment) reasons.push('Tiene tratamiento activo');
    if (consultations === 0) reasons.push('No tiene ninguna consulta veterinaria registrada');
    if (reasons.length === 0 && animal.status !== 'INGRESADO') {
      reasons.push('El animal debe estar en estado "Ingresado"');
    }
    return reasons;
  }
}
