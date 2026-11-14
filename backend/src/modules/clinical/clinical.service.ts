import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Animal, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AnimalStatusService } from '../animals/animal-status.service';
import {
  CLINICAL_STATES,
  NO_CLINICAL_RECORDS_STATES,
  STATUS_LABELS,
} from '../animals/animal-status';
import { addDays, toDateOnly, todayLaPaz } from '../../common/dates';
import type { AuthUser } from '../../common/types';
import {
  ClosePeriodDto,
  CreateConsultationDto,
  CreateControlDto,
  CreateDiagnosisDto,
  CreateMedicationDto,
  CreatePeriodDto,
  CreateTreatmentDto,
  CreateVaccinationDto,
  UpdateConsultationDto,
  UpdateTreatmentDto,
  UpdateVaccinationDto,
} from './dto/clinical.dto';

type Tx = Prisma.TransactionClient;
const userSelect = { select: { id: true, fullName: true } } as const;

export interface UpcomingVaccinationRow {
  id: string;
  animal_id: string;
  animal_code: string;
  animal_name: string | null;
  species: string;
  vaccine_id: string;
  vaccine_name: string;
  application_date: Date;
  next_dose_date: Date;
}

@Injectable()
export class ClinicalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly status: AnimalStatusService,
  ) {}

  // =====================================================================
  // Helpers
  // =====================================================================

  private async animalOrThrow(id: string, tx: Tx = this.prisma): Promise<Animal> {
    const animal = await tx.animal.findFirst({
      where: { id, deletedAt: null },
    });
    if (!animal) throw new NotFoundException('Animal no encontrado');
    return animal;
  }

  /** CU06/CU22: no se crean registros clínicos para animales adoptados o dados de baja. */
  private assertAcceptsRecords(animal: Animal) {
    if (NO_CLINICAL_RECORDS_STATES.includes(animal.status)) {
      throw new ConflictException(
        `No se pueden registrar datos clínicos: el animal está "${STATUS_LABELS[animal.status]}"`,
      );
    }
  }

  /** RN-02: solo el veterinario autor o un ADMIN puede corregir un registro clínico. */
  private assertCanEdit(authorId: string, user: AuthUser) {
    if (user.role !== 'ADMIN' && user.id !== authorId) {
      throw new ForbiddenException(
        'Solo el veterinario autor o un administrador puede corregir este registro',
      );
    }
  }

  private assertDateOrder(
    start: string | Date,
    end: string | Date | null | undefined,
    msg: string,
  ) {
    if (end && toDateOnly(end) < toDateOnly(start)) throw new BadRequestException(msg);
  }

  /**
   * Si el animal estaba disponible para adopción y aparece un tratamiento o un
   * periodo, se retira automáticamente de adopción (RN-03 deja de cumplirse).
   */
  private async withdrawIfAvailable(tx: Tx, animalId: string, reason: string) {
    const animal = await this.status.getForUpdate(tx, animalId);
    if (animal.status === 'DISPONIBLE_ADOPCION') {
      await this.status.changeStatus(tx, animal, 'INGRESADO', {}, reason);
    }
  }

  // =====================================================================
  // Consultas (CU06)
  // =====================================================================

  async listConsultations(animalId: string) {
    await this.animalOrThrow(animalId);
    return this.prisma.veterinaryConsultation.findMany({
      where: { animalId },
      orderBy: { consultationDate: 'desc' },
      include: {
        veterinarian: userSelect,
        _count: { select: { diagnoses: true, treatments: true } },
      },
    });
  }

  async createConsultation(animalId: string, dto: CreateConsultationDto, user: AuthUser) {
    const animal = await this.animalOrThrow(animalId);
    this.assertAcceptsRecords(animal);
    return this.prisma.$transaction(async (tx) => {
      const c = await tx.veterinaryConsultation.create({
        data: {
          ...dto,
          consultationDate: new Date(dto.consultationDate),
          animalId,
          veterinarianId: user.id,
        },
      });
      await this.audit.log(
        {
          action: 'CREATE',
          entityName: 'veterinary_consultations',
          entityId: c.id,
          newValue: c,
        },
        tx,
      );
      return c;
    });
  }

  async getConsultation(id: string) {
    const c = await this.prisma.veterinaryConsultation.findUnique({
      where: { id },
      include: {
        veterinarian: userSelect,
        animal: {
          select: {
            id: true,
            code: true,
            name: true,
            species: true,
            status: true,
          },
        },
        diagnoses: { orderBy: { createdAt: 'asc' } },
        treatments: {
          orderBy: { createdAt: 'asc' },
          include: { medications: true },
        },
      },
    });
    if (!c) throw new NotFoundException('Consulta no encontrada');
    return c;
  }

  async updateConsultation(id: string, dto: UpdateConsultationDto, user: AuthUser) {
    const current = await this.prisma.veterinaryConsultation.findUnique({
      where: { id },
    });
    if (!current) throw new NotFoundException('Consulta no encontrada');
    this.assertCanEdit(current.veterinarianId, user);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.veterinaryConsultation.update({
        where: { id },
        data: {
          ...dto,
          ...(dto.consultationDate ? { consultationDate: new Date(dto.consultationDate) } : {}),
        },
      });
      await this.audit.log(
        {
          action: 'UPDATE',
          entityName: 'veterinary_consultations',
          entityId: id,
          oldValue: current,
          newValue: updated,
        },
        tx,
      );
      return updated;
    });
  }

  private async consultationForNewRecord(id: string) {
    const c = await this.prisma.veterinaryConsultation.findUnique({
      where: { id },
      include: { animal: true },
    });
    if (!c) throw new NotFoundException('Consulta no encontrada');
    this.assertAcceptsRecords(c.animal);
    return c;
  }

  // =====================================================================
  // Diagnósticos, tratamientos y medicamentos (CU07)
  // =====================================================================

  async addDiagnosis(consultationId: string, dto: CreateDiagnosisDto) {
    await this.consultationForNewRecord(consultationId);
    return this.prisma.$transaction(async (tx) => {
      const d = await tx.diagnosis.create({ data: { ...dto, consultationId } });
      await this.audit.log(
        {
          action: 'CREATE',
          entityName: 'diagnoses',
          entityId: d.id,
          newValue: d,
        },
        tx,
      );
      return d;
    });
  }

  async addTreatment(consultationId: string, dto: CreateTreatmentDto) {
    const consultation = await this.consultationForNewRecord(consultationId);
    this.assertDateOrder(
      dto.startDate,
      dto.endDate,
      'La fecha de fin no puede ser anterior a la de inicio',
    );
    const { medications, ...data } = dto;

    return this.prisma.$transaction(async (tx) => {
      const t = await tx.treatment.create({
        data: {
          ...data,
          consultationId,
          startDate: toDateOnly(dto.startDate),
          endDate: dto.endDate ? toDateOnly(dto.endDate) : null,
          status: 'ACTIVO',
          medications: medications?.length ? { create: medications } : undefined,
        },
        include: { medications: true },
      });
      await this.audit.log(
        {
          action: 'CREATE',
          entityName: 'treatments',
          entityId: t.id,
          newValue: t,
        },
        tx,
      );
      await this.withdrawIfAvailable(
        tx,
        consultation.animalId,
        'Retirado de adopción por nuevo tratamiento',
      );
      await this.status.syncClinicalStatus(tx, consultation.animalId, 'Tratamiento iniciado');
      return t;
    });
  }

  async updateTreatment(id: string, dto: UpdateTreatmentDto, user: AuthUser) {
    const current = await this.prisma.treatment.findUnique({
      where: { id },
      include: {
        consultation: { select: { animalId: true, veterinarianId: true } },
      },
    });
    if (!current) throw new NotFoundException('Tratamiento no encontrado');
    this.assertCanEdit(current.consultation.veterinarianId, user);

    const start = dto.startDate ?? current.startDate;
    const end = dto.endDate !== undefined ? dto.endDate : current.endDate;
    this.assertDateOrder(start, end, 'La fecha de fin no puede ser anterior a la de inicio');

    const { consultation, ...before } = current;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.treatment.update({
        where: { id },
        data: {
          ...dto,
          ...(dto.startDate ? { startDate: toDateOnly(dto.startDate) } : {}),
          ...(dto.endDate ? { endDate: toDateOnly(dto.endDate) } : {}),
          // Al finalizar sin fecha de fin, se registra hoy
          ...(dto.status && dto.status !== 'ACTIVO' && !end
            ? { endDate: toDateOnly(todayLaPaz()) }
            : {}),
        },
        include: { medications: true },
      });
      await this.audit.log(
        {
          action: dto.status && dto.status !== before.status ? 'STATUS_CHANGE' : 'UPDATE',
          entityName: 'treatments',
          entityId: id,
          oldValue: before,
          newValue: updated,
        },
        tx,
      );
      if (dto.status && dto.status !== before.status) {
        if (dto.status === 'ACTIVO') {
          await this.withdrawIfAvailable(
            tx,
            consultation.animalId,
            'Retirado de adopción por tratamiento reactivado',
          );
        }
        await this.status.syncClinicalStatus(
          tx,
          consultation.animalId,
          `Tratamiento ${dto.status.toLowerCase()}`,
        );
      }
      return updated;
    });
  }

  async addMedication(treatmentId: string, dto: CreateMedicationDto) {
    const t = await this.prisma.treatment.findUnique({
      where: { id: treatmentId },
      include: { consultation: { include: { animal: true } } },
    });
    if (!t) throw new NotFoundException('Tratamiento no encontrado');
    this.assertAcceptsRecords(t.consultation.animal);
    return this.prisma.$transaction(async (tx) => {
      const m = await tx.medication.create({ data: { ...dto, treatmentId } });
      await this.audit.log(
        {
          action: 'CREATE',
          entityName: 'medications',
          entityId: m.id,
          newValue: m,
        },
        tx,
      );
      return m;
    });
  }

  // =====================================================================
  // Vacunas (CU08)
  // =====================================================================

  async listVaccinations(animalId: string) {
    await this.animalOrThrow(animalId);
    return this.prisma.vaccination.findMany({
      where: { animalId },
      orderBy: [{ applicationDate: 'desc' }, { createdAt: 'desc' }],
      include: { vaccine: true, appliedBy: userSelect },
    });
  }

  async createVaccination(animalId: string, dto: CreateVaccinationDto, user: AuthUser) {
    const animal = await this.animalOrThrow(animalId);
    this.assertAcceptsRecords(animal);
    this.assertDateOrder(
      dto.applicationDate,
      dto.nextDoseDate,
      'La próxima dosis no puede ser anterior a la fecha de aplicación',
    );
    const vaccine = await this.prisma.vaccine.findUnique({
      where: { id: dto.vaccineId },
    });
    if (!vaccine) throw new BadRequestException('La vacuna no existe en el catálogo');
    if (!vaccine.isActive)
      throw new BadRequestException('La vacuna está desactivada en el catálogo');

    // Advertencia que no bloquea (CU08)
    const warnings = vaccine.species.includes(animal.species)
      ? []
      : [`La vacuna "${vaccine.name}" no está indicada en el catálogo para la especie del animal`];

    const vaccination = await this.prisma.$transaction(async (tx) => {
      const v = await tx.vaccination.create({
        data: {
          ...dto,
          animalId,
          applicationDate: toDateOnly(dto.applicationDate),
          nextDoseDate: dto.nextDoseDate ? toDateOnly(dto.nextDoseDate) : null,
          appliedById: user.id,
        },
        include: { vaccine: true },
      });
      await this.audit.log(
        {
          action: 'CREATE',
          entityName: 'vaccinations',
          entityId: v.id,
          newValue: v,
        },
        tx,
      );
      return v;
    });
    return { ...vaccination, warnings };
  }

  async updateVaccination(id: string, dto: UpdateVaccinationDto, user: AuthUser) {
    const current = await this.prisma.vaccination.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Vacunación no encontrada');
    this.assertCanEdit(current.appliedById, user);
    const app = dto.applicationDate ?? current.applicationDate;
    const next = dto.nextDoseDate !== undefined ? dto.nextDoseDate : current.nextDoseDate;
    this.assertDateOrder(
      app,
      next,
      'La próxima dosis no puede ser anterior a la fecha de aplicación',
    );
    if (dto.vaccineId && dto.vaccineId !== current.vaccineId) {
      const v = await this.prisma.vaccine.findUnique({
        where: { id: dto.vaccineId },
      });
      if (!v?.isActive) throw new BadRequestException('Vacuna inexistente o desactivada');
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.vaccination.update({
        where: { id },
        data: {
          ...dto,
          ...(dto.applicationDate ? { applicationDate: toDateOnly(dto.applicationDate) } : {}),
          ...(dto.nextDoseDate ? { nextDoseDate: toDateOnly(dto.nextDoseDate) } : {}),
        },
        include: { vaccine: true },
      });
      await this.audit.log(
        {
          action: 'UPDATE',
          entityName: 'vaccinations',
          entityId: id,
          oldValue: current,
          newValue: updated,
        },
        tx,
      );
      return updated;
    });
  }

  /**
   * Última dosis de cada vacuna por animal (en la institución) cuya próxima dosis
   * vence hasta `today + days`. Las dosis reemplazadas por una posterior no cuentan.
   */
  async upcomingVaccinations(days: number): Promise<UpcomingVaccinationRow[]> {
    const limit = toDateOnly(addDays(todayLaPaz(), days));
    return this.prisma.$queryRaw<UpcomingVaccinationRow[]>`
      SELECT * FROM (
        SELECT DISTINCT ON (v.animal_id, v.vaccine_id)
               v.id, v.animal_id, a.code AS animal_code, a.name AS animal_name,
               a.species::text AS species, v.vaccine_id, vc.name AS vaccine_name,
               v.application_date, v.next_dose_date
          FROM vaccinations v
          JOIN animals a ON a.id = v.animal_id
          JOIN vaccines vc ON vc.id = v.vaccine_id
         WHERE a.deleted_at IS NULL
           AND a.status::text NOT IN ('ADOPTADO', 'FALLECIDO', 'DEVUELTO')
         ORDER BY v.animal_id, v.vaccine_id, v.application_date DESC, v.created_at DESC
      ) latest
      WHERE latest.next_dose_date IS NOT NULL AND latest.next_dose_date <= ${limit}::date
      ORDER BY latest.next_dose_date ASC`;
  }

  // =====================================================================
  // Observación y cuarentena (CU09)
  // =====================================================================

  async listPeriods(animalId: string) {
    await this.animalOrThrow(animalId);
    return this.prisma.quarantinePeriod.findMany({
      where: { animalId },
      orderBy: { startDate: 'desc' },
      include: {
        startedBy: userSelect,
        closedBy: userSelect,
        controls: {
          orderBy: { controlDate: 'desc' },
          include: { createdBy: userSelect },
        },
      },
    });
  }

  async listAllPeriods(status?: 'ACTIVO' | 'FINALIZADO') {
    return this.prisma.quarantinePeriod.findMany({
      where: { ...(status ? { status } : {}), animal: { deletedAt: null } },
      orderBy: [{ status: 'asc' }, { expectedEndDate: 'asc' }],
      take: 200,
      include: {
        animal: {
          select: {
            id: true,
            code: true,
            name: true,
            species: true,
            status: true,
            photoUrl: true,
          },
        },
        startedBy: userSelect,
        controls: { orderBy: { controlDate: 'desc' }, take: 1 },
        _count: { select: { controls: true } },
      },
    });
  }

  async startPeriod(animalId: string, dto: CreatePeriodDto, user: AuthUser) {
    this.assertDateOrder(
      dto.startDate,
      dto.expectedEndDate,
      'La fecha estimada de fin no puede ser anterior a la de inicio',
    );
    try {
      return await this.prisma.$transaction(async (tx) => {
        const animal = await this.status.getForUpdate(tx, animalId);
        this.assertAcceptsRecords(animal);
        if (animal.status === 'EN_PROCESO_ADOPCION') {
          throw new ConflictException(
            'El animal tiene una solicitud de adopción activa. Cancélala antes de iniciar un periodo.',
          );
        }
        if (!CLINICAL_STATES.includes(animal.status) && animal.status !== 'DISPONIBLE_ADOPCION') {
          throw new ConflictException(
            `No se puede iniciar un periodo con el animal "${STATUS_LABELS[animal.status]}"`,
          );
        }
        const active = await tx.quarantinePeriod.findFirst({
          where: { animalId, status: 'ACTIVO' },
        });
        if (active)
          throw new ConflictException(
            'El animal ya tiene un periodo de observación/cuarentena activo',
          );

        const p = await tx.quarantinePeriod.create({
          data: {
            animalId,
            type: dto.type,
            reason: dto.reason,
            startDate: new Date(dto.startDate),
            expectedEndDate: dto.expectedEndDate ? new Date(dto.expectedEndDate) : null,
            status: 'ACTIVO',
            startedById: user.id,
          },
        });
        await this.audit.log(
          {
            action: 'CREATE',
            entityName: 'quarantine_periods',
            entityId: p.id,
            newValue: p,
          },
          tx,
        );
        await this.withdrawIfAvailable(tx, animalId, 'Retirado de adopción por inicio de periodo');
        await this.status.syncClinicalStatus(
          tx,
          animalId,
          dto.type === 'CUARENTENA' ? 'Inicio de cuarentena' : 'Inicio de observación',
        );
        return p;
      });
    } catch (err) {
      // Índice único parcial uq_one_active_period (carrera entre dos requests)
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(
          'El animal ya tiene un periodo de observación/cuarentena activo',
        );
      }
      throw err;
    }
  }

  private async activePeriodOrThrow(id: string) {
    const p = await this.prisma.quarantinePeriod.findUnique({
      where: { id },
      include: { _count: { select: { controls: true } } },
    });
    if (!p) throw new NotFoundException('Periodo no encontrado');
    if (p.status !== 'ACTIVO') throw new ConflictException('El periodo ya está finalizado');
    return p;
  }

  async addControl(periodId: string, dto: CreateControlDto, user: AuthUser) {
    const period = await this.activePeriodOrThrow(periodId);
    if (new Date(dto.controlDate) < period.startDate) {
      throw new BadRequestException('El control no puede ser anterior al inicio del periodo');
    }
    return this.prisma.$transaction(async (tx) => {
      const c = await tx.quarantineControl.create({
        data: {
          quarantinePeriodId: periodId,
          controlDate: new Date(dto.controlDate),
          animalCondition: dto.animalCondition,
          observations: dto.observations,
          createdById: user.id,
        },
        include: { createdBy: userSelect },
      });
      await this.audit.log(
        {
          action: 'CREATE',
          entityName: 'quarantine_controls',
          entityId: c.id,
          newValue: c,
        },
        tx,
      );
      return c;
    });
  }

  async closePeriod(periodId: string, dto: ClosePeriodDto, user: AuthUser) {
    const period = await this.activePeriodOrThrow(periodId);
    if (new Date(dto.endDate) < period.startDate) {
      throw new BadRequestException('La fecha de fin no puede ser anterior al inicio del periodo');
    }
    if (period._count.controls === 0 && !dto.confirmWithoutControls) {
      throw new ConflictException({
        message: 'El periodo no tiene controles registrados. Confirma para cerrarlo igualmente.',
        errors: [
          {
            field: 'confirmWithoutControls',
            messages: ['Se requiere confirmación'],
          },
        ],
      });
    }
    const { _count, ...before } = period;
    return this.prisma.$transaction(async (tx) => {
      const closed = await tx.quarantinePeriod.update({
        where: { id: periodId },
        data: {
          status: 'FINALIZADO',
          endDate: new Date(dto.endDate),
          finalObservations: dto.finalObservations,
          closedById: user.id,
        },
      });
      await this.audit.log(
        {
          action: 'STATUS_CHANGE',
          entityName: 'quarantine_periods',
          entityId: periodId,
          oldValue: before,
          newValue: closed,
        },
        tx,
      );
      await this.status.syncClinicalStatus(tx, period.animalId, 'Cierre de periodo');
      return { ...closed, controlsCount: _count.controls };
    });
  }
}
