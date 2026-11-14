import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AdoptionRequest, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AnimalStatusService } from '../animals/animal-status.service';
import { STATUS_LABELS } from '../animals/animal-status';
import { canSeeFullCi, maskCi } from '../adopters/adopters.service';
import { paginated } from '../../common/dto/pagination.dto';
import { LA_PAZ_TZ } from '../../common/dates';
import type { AuthUser } from '../../common/types';
import {
  animalStatusAfter,
  assertRequestTransition,
  REQUEST_STATUS_LABELS,
} from './request-status';
import {
  ChangeRequestStatusDto,
  CreateAdoptionDto,
  CreateFollowupDto,
  DecisionDto,
  ListAdoptionsQueryDto,
} from './dto/adoptions.dto';

type Tx = Prisma.TransactionClient;
const userSelect = { select: { id: true, fullName: true } } as const;
const noteStamp = new Intl.DateTimeFormat('es-BO', {
  timeZone: LA_PAZ_TZ,
  dateStyle: 'short',
  timeStyle: 'short',
  hour12: false,
});

/** Agrega una nota con fecha, autor y estado sin perder las anteriores. */
export function appendNote(
  existing: string | null,
  note: string | undefined,
  user: AuthUser,
  label: string,
): string | null {
  if (!note) return existing;
  const line = `[${noteStamp.format(new Date())} · ${user.fullName} · ${label}] ${note}`;
  return existing ? `${existing}\n\n${line}` : line;
}

const listInclude = {
  adopterProfile: { include: { person: true } },
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
  responsibleUser: userSelect,
} satisfies Prisma.AdoptionRequestInclude;

@Injectable()
export class AdoptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly status: AnimalStatusService,
  ) {}

  private mask<T extends { adopterProfile: { person: { ci: string } } }>(
    row: T,
    user: AuthUser,
  ): T {
    if (canSeeFullCi(user.role)) return row;
    return {
      ...row,
      adopterProfile: {
        ...row.adopterProfile,
        person: {
          ...row.adopterProfile.person,
          ci: maskCi(row.adopterProfile.person.ci),
        },
      },
    };
  }

  async list(q: ListAdoptionsQueryDto, user: AuthUser) {
    const term = q.q?.trim();
    const contains = { contains: term, mode: 'insensitive' as const };
    const where: Prisma.AdoptionRequestWhereInput = {
      ...(q.status ? { status: q.status } : {}),
      ...(term
        ? {
            OR: [
              { animal: { code: contains } },
              { animal: { name: contains } },
              { adopterProfile: { person: { firstName: contains } } },
              { adopterProfile: { person: { lastName: contains } } },
              { adopterProfile: { person: { ci: contains } } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.adoptionRequest.findMany({
        where,
        include: listInclude,
        orderBy: { requestDate: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.adoptionRequest.count({ where }),
    ]);
    return paginated(
      rows.map((r) => this.mask(r, user)),
      total,
      q,
    );
  }

  async findOne(id: string, user: AuthUser) {
    const row = await this.prisma.adoptionRequest.findUnique({
      where: { id },
      include: {
        ...listInclude,
        animal: true,
        followups: {
          orderBy: { followupDate: 'desc' },
          include: { createdBy: userSelect },
        },
        recommendations: {
          orderBy: { generatedAt: 'desc' },
          take: 1,
          include: { generatedBy: userSelect },
        },
      },
    });
    if (!row) throw new NotFoundException('Solicitud no encontrada');
    // Recomendación más reciente del par aunque no se haya generado desde la solicitud
    const latestRecommendation =
      row.recommendations[0] ??
      (await this.prisma.compatibilityRecommendation.findFirst({
        where: {
          adopterProfileId: row.adopterProfileId,
          animalId: row.animalId,
        },
        orderBy: { generatedAt: 'desc' },
        include: { generatedBy: userSelect },
      }));
    const { recommendations, ...rest } = row;
    void recommendations;
    return this.mask({ ...rest, latestRecommendation }, user);
  }

  private async lockRequest(tx: Tx, id: string): Promise<AdoptionRequest> {
    await tx.$executeRaw`SELECT id FROM adoption_requests WHERE id = ${id}::uuid FOR UPDATE`;
    const req = await tx.adoptionRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Solicitud no encontrada');
    return req;
  }

  /** CU11: RN-04 (animal disponible), RN-05 (una activa por animal), RN-06 (animal → en proceso). */
  async create(dto: CreateAdoptionDto, user: AuthUser) {
    const adopter = await this.prisma.adopterProfile.findUnique({
      where: { id: dto.adopterId },
    });
    if (!adopter) throw new NotFoundException('Adoptante no encontrado');

    try {
      return await this.prisma.$transaction(async (tx) => {
        const animal = await this.status.getForUpdate(tx, dto.animalId);
        if (animal.status === 'EN_PROCESO_ADOPCION') {
          throw new ConflictException('El animal ya tiene una solicitud de adopción activa');
        }
        if (animal.status !== 'DISPONIBLE_ADOPCION') {
          throw new ConflictException(
            `El animal no está disponible para adopción (estado: ${STATUS_LABELS[animal.status]})`,
          );
        }
        const request = await tx.adoptionRequest.create({
          data: {
            adopterProfileId: dto.adopterId,
            animalId: dto.animalId,
            responsibleUserId: user.id,
            status: 'PENDIENTE',
            evaluationNotes: appendNote(null, dto.notes, user, 'Pendiente'),
          },
        });
        await this.audit.log(
          {
            action: 'CREATE',
            entityName: 'adoption_requests',
            entityId: request.id,
            newValue: request,
          },
          tx,
        );
        await this.status.changeStatus(
          tx,
          animal,
          'EN_PROCESO_ADOPCION',
          {},
          'Solicitud de adopción creada',
        );
        return request;
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('El animal ya tiene una solicitud de adopción activa');
      }
      throw err;
    }
  }

  /** CU12: PENDIENTE → EN_EVALUACION, o cancelar (nota obligatoria). */
  async changeStatus(id: string, dto: ChangeRequestStatusDto, user: AuthUser) {
    if (dto.status === 'CANCELADA' && !dto.notes) {
      throw new BadRequestException('La nota es obligatoria para cancelar la solicitud');
    }
    return this.prisma.$transaction(async (tx) => {
      const req = await this.lockRequest(tx, id);
      assertRequestTransition(req.status, dto.status);
      const updated = await tx.adoptionRequest.update({
        where: { id },
        data: {
          status: dto.status,
          evaluationNotes: appendNote(
            req.evaluationNotes,
            dto.notes,
            user,
            REQUEST_STATUS_LABELS[dto.status],
          ),
          ...(dto.status === 'CANCELADA' ? { decisionDate: new Date() } : {}),
        },
      });
      await this.audit.log(
        {
          action: 'STATUS_CHANGE',
          entityName: 'adoption_requests',
          entityId: id,
          oldValue: { status: req.status },
          newValue: { status: dto.status, notes: dto.notes },
        },
        tx,
      );
      if (dto.status === 'CANCELADA')
        await this.releaseAnimal(tx, req.animalId, 'Solicitud cancelada');
      return updated;
    });
  }

  /** CU12: agregar notas de evaluación sin cambiar el estado. */
  async addNote(id: string, notes: string, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const req = await this.lockRequest(tx, id);
      if (!['PENDIENTE', 'EN_EVALUACION'].includes(req.status)) {
        throw new ConflictException('Solo se agregan notas a solicitudes activas');
      }
      const updated = await tx.adoptionRequest.update({
        where: { id },
        data: {
          evaluationNotes: appendNote(
            req.evaluationNotes,
            notes,
            user,
            REQUEST_STATUS_LABELS[req.status],
          ),
        },
      });
      await this.audit.log(
        {
          action: 'UPDATE',
          entityName: 'adoption_requests',
          entityId: id,
          newValue: { note: notes },
        },
        tx,
      );
      return updated;
    });
  }

  /** CU14: resultado de adopción (solo desde EN_EVALUACION). */
  async decide(id: string, dto: DecisionDto, user: AuthUser) {
    const decisionDate = new Date(dto.decisionDate);
    let deliveryDate: Date | null = null;
    if (dto.result === 'APROBADA') {
      if (!dto.deliveryDate) {
        throw new BadRequestException('La fecha de entrega es obligatoria al aprobar');
      }
      deliveryDate = new Date(dto.deliveryDate);
      if (deliveryDate.getTime() < decisionDate.getTime() - 86_400_000) {
        throw new BadRequestException('La fecha de entrega no puede ser anterior a la decisión');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const req = await this.lockRequest(tx, id);
      if (req.status !== 'EN_EVALUACION') {
        throw new ConflictException(
          `Solo se puede registrar el resultado de una solicitud en evaluación (estado actual: ${REQUEST_STATUS_LABELS[req.status]})`,
        );
      }
      assertRequestTransition(req.status, dto.result);
      const updated = await tx.adoptionRequest.update({
        where: { id },
        data: {
          status: dto.result,
          decisionDate,
          deliveryDate,
          evaluationNotes: appendNote(
            req.evaluationNotes,
            dto.notes,
            user,
            REQUEST_STATUS_LABELS[dto.result],
          ),
        },
      });
      await this.audit.log(
        {
          action: 'STATUS_CHANGE',
          entityName: 'adoption_requests',
          entityId: id,
          oldValue: { status: req.status },
          newValue: {
            status: dto.result,
            decisionDate,
            deliveryDate,
            notes: dto.notes,
          },
        },
        tx,
      );
      if (dto.result === 'APROBADA') {
        const animal = await this.status.getForUpdate(tx, req.animalId);
        await this.status.changeStatus(
          tx,
          animal,
          animalStatusAfter('APROBADA'),
          {},
          'Adopción aprobada',
        );
      } else {
        await this.releaseAnimal(tx, req.animalId, 'Solicitud rechazada');
      }
      return updated;
    });
  }

  /** RN-06: al rechazar o cancelar, el animal vuelve a estar disponible. */
  private async releaseAnimal(tx: Tx, animalId: string, reason: string) {
    const animal = await this.status.getForUpdate(tx, animalId);
    if (animal.status === 'EN_PROCESO_ADOPCION') {
      await this.status.changeStatus(tx, animal, 'DISPONIBLE_ADOPCION', {}, reason);
    }
  }

  private async approvedOrThrow(id: string) {
    const req = await this.prisma.adoptionRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Solicitud no encontrada');
    if (req.status !== 'APROBADA') {
      throw new ConflictException('Disponible solo para solicitudes aprobadas');
    }
    return req;
  }

  // ---------- CU15: seguimiento posterior (RN-07) ----------

  async listFollowups(id: string) {
    const req = await this.prisma.adoptionRequest.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!req) throw new NotFoundException('Solicitud no encontrada');
    return this.prisma.adoptionFollowup.findMany({
      where: { adoptionRequestId: id },
      orderBy: { followupDate: 'desc' },
      include: { createdBy: userSelect },
    });
  }

  async createFollowup(id: string, dto: CreateFollowupDto, user: AuthUser) {
    const req = await this.approvedOrThrow(id);
    if (req.deliveryDate && new Date(dto.followupDate) < req.deliveryDate) {
      throw new BadRequestException('El seguimiento no puede ser anterior a la entrega del animal');
    }
    return this.prisma.$transaction(async (tx) => {
      const f = await tx.adoptionFollowup.create({
        data: {
          adoptionRequestId: id,
          followupDate: new Date(dto.followupDate),
          animalCondition: dto.animalCondition,
          observations: dto.observations,
          createdById: user.id,
        },
        include: { createdBy: userSelect },
      });
      await this.audit.log(
        {
          action: 'CREATE',
          entityName: 'adoption_followups',
          entityId: f.id,
          newValue: f,
        },
        tx,
      );
      return f;
    });
  }

  // ---------- CU26: datos del acta ----------

  async act(id: string) {
    await this.approvedOrThrow(id);
    const req = await this.prisma.adoptionRequest.findUniqueOrThrow({
      where: { id },
      include: {
        adopterProfile: { include: { person: true } },
        responsibleUser: userSelect,
        animal: {
          include: {
            vaccinations: {
              orderBy: { applicationDate: 'desc' },
              include: { vaccine: { select: { name: true, isRabies: true } } },
            },
          },
        },
      },
    });
    return {
      institution: 'Asociación de Zoonosis de Santa Cruz de la Sierra',
      actNumber: `ACTA-${req.animal.code}`,
      request: {
        id: req.id,
        requestDate: req.requestDate,
        decisionDate: req.decisionDate,
        deliveryDate: req.deliveryDate,
        responsible: req.responsibleUser,
      },
      adopter: { ...req.adopterProfile.person, profile: req.adopterProfile },
      animal: req.animal,
      commitments: [
        'Brindar alimentación adecuada, agua limpia y un espacio protegido de la intemperie.',
        'Mantener al día las vacunas (incluida la antirrábica) y la desparasitación.',
        'Llevar al animal a control veterinario ante cualquier signo de enfermedad.',
        'No abandonar, maltratar ni ceder al animal a terceros sin informar a la institución.',
        'Considerar la esterilización según indicación veterinaria.',
        'Permitir las visitas o llamadas de seguimiento de la institución.',
        'Informar a la institución si no puede continuar con la tenencia, para su reingreso.',
      ],
    };
  }
}
