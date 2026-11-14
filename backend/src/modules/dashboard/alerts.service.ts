import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClinicalService } from '../clinical/clinical.service';
import { diffDays, toDateOnly, todayLaPaz } from '../../common/dates';

export const VACCINE_ALERT_DAYS = 7;

/** CU23: alertas calculadas al consultar (sin tareas programadas en v1). */
@Injectable()
export class AlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clinical: ClinicalService,
  ) {}

  async alerts() {
    const today = todayLaPaz();
    const now = new Date();
    const animalSelect = {
      select: { id: true, code: true, name: true, species: true, status: true },
    };

    const [vaccines, periods, treatments] = await Promise.all([
      // RN-12: próxima dosis vencida o a ≤ 7 días
      this.clinical.upcomingVaccinations(VACCINE_ALERT_DAYS),
      // Periodos que superaron su fecha estimada
      this.prisma.quarantinePeriod.findMany({
        where: {
          status: 'ACTIVO',
          expectedEndDate: { lt: now },
          animal: { deletedAt: null },
        },
        orderBy: { expectedEndDate: 'asc' },
        include: { animal: animalSelect },
      }),
      // Tratamientos activos cuya fecha fin ya pasó
      this.prisma.treatment.findMany({
        where: {
          status: 'ACTIVO',
          endDate: { lt: toDateOnly(today) },
          consultation: { animal: { deletedAt: null } },
        },
        orderBy: { endDate: 'asc' },
        include: {
          consultation: { select: { id: true, animal: animalSelect } },
        },
      }),
    ]);

    const vaccineAlerts = vaccines.map((v) => {
      const due = v.next_dose_date.toISOString().slice(0, 10);
      const daysLeft = diffDays(today, due);
      return {
        vaccinationId: v.id,
        animal: {
          id: v.animal_id,
          code: v.animal_code,
          name: v.animal_name,
          species: v.species,
        },
        vaccine: { id: v.vaccine_id, name: v.vaccine_name },
        nextDoseDate: due,
        daysLeft,
        overdue: daysLeft < 0,
      };
    });

    const periodAlerts = periods.map((p) => ({
      periodId: p.id,
      type: p.type,
      animal: p.animal,
      startDate: p.startDate,
      expectedEndDate: p.expectedEndDate,
      daysOverdue: p.expectedEndDate
        ? diffDays(p.expectedEndDate.toISOString().slice(0, 10), today)
        : 0,
    }));

    const treatmentAlerts = treatments.map((t) => ({
      treatmentId: t.id,
      consultationId: t.consultation.id,
      description: t.description,
      animal: t.consultation.animal,
      endDate: t.endDate,
      daysOverdue: t.endDate ? diffDays(t.endDate.toISOString().slice(0, 10), today) : 0,
    }));

    return {
      vaccines: vaccineAlerts,
      periods: periodAlerts,
      treatments: treatmentAlerts,
      total: vaccineAlerts.length + periodAlerts.length + treatmentAlerts.length,
    };
  }
}
