import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Animal, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { paginated } from '../../common/dto/pagination.dto';
import { currentYearLaPaz } from '../../common/dates';
import type { AuthUser, Paginated } from '../../common/types';
import { AnimalStatusService } from './animal-status.service';
import { EXIT_STATES, OUTSIDE_STATES, STATUS_LABELS } from './animal-status';
import {
  AdoptableQueryDto,
  CreateAnimalDto,
  ExitAnimalDto,
  ListAnimalsQueryDto,
  TimelineQueryDto,
  UpdateAnimalDto,
} from './dto/animals.dto';

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/** Detecta el formato por "magic bytes" (no se confía en el mimetype enviado). */
export function detectImageType(buf: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (
    buf.length >= 8 &&
    buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  )
    return 'png';
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  )
    return 'webp';
  return null;
}

/** Campos editables cuando el animal está en un estado final (CU04: "solo notas"). */
const NOTE_FIELDS = ['physicalDescription', 'specialCareNotes', 'exitNotes'] as const;

const listSelect = {
  id: true,
  code: true,
  name: true,
  species: true,
  breed: true,
  sex: true,
  ageMonths: true,
  size: true,
  energyLevel: true,
  status: true,
  photoUrl: true,
  entryDate: true,
  goodWithChildren: true,
  goodWithAnimals: true,
  needsYard: true,
  specialCare: true,
  requiredDailyHours: true,
} satisfies Prisma.AnimalSelect;

@Injectable()
export class AnimalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly status: AnimalStatusService,
    private readonly storage: StorageService,
  ) {}

  async list(q: ListAnimalsQueryDto): Promise<Paginated<unknown>> {
    const term = q.q?.trim();
    const where: Prisma.AnimalWhereInput = {
      deletedAt: null,
      ...(q.species ? { species: q.species } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.sex ? { sex: q.sex } : {}),
      ...(term
        ? {
            OR: [
              { code: { contains: term, mode: 'insensitive' } },
              { name: { contains: term, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.animal.findMany({
        where,
        select: listSelect,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.animal.count({ where }),
    ]);
    return paginated(rows, total, q);
  }

  /** CU24: animales disponibles para adopción. */
  async adoptable(q: AdoptableQueryDto): Promise<Paginated<unknown>> {
    const where: Prisma.AnimalWhereInput = {
      deletedAt: null,
      status: 'DISPONIBLE_ADOPCION',
      ...(q.species ? { species: q.species } : {}),
      ...(q.size ? { size: q.size } : {}),
      ...(q.maxEnergy ? { energyLevel: { lte: q.maxEnergy } } : {}),
      ...(q.minAge !== undefined || q.maxAge !== undefined
        ? { ageMonths: { gte: q.minAge, lte: q.maxAge } }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.animal.findMany({
        where,
        select: { ...listSelect, temperament: true, color: true },
        orderBy: { entryDate: 'asc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.animal.count({ where }),
    ]);
    return paginated(rows, total, q);
  }

  async findOne(id: string) {
    const animal = await this.prisma.animal.findFirst({
      where: { id, deletedAt: null },
      include: {
        createdBy: { select: { id: true, fullName: true } },
        periods: { where: { status: 'ACTIVO' }, take: 1 },
        adoptionRequests: {
          orderBy: { requestDate: 'desc' },
          include: {
            adopterProfile: {
              include: {
                person: { select: { firstName: true, lastName: true } },
              },
            },
            // CU15: los seguimientos se ven en la ficha del animal
            followups: {
              orderBy: { followupDate: 'desc' },
              include: { createdBy: { select: { id: true, fullName: true } } },
            },
          },
        },
        _count: { select: { consultations: true, vaccinations: true } },
      },
    });
    if (!animal) throw new NotFoundException('Animal no encontrado');
    const activeTreatments = await this.prisma.treatment.count({
      where: { status: 'ACTIVO', consultation: { animalId: id } },
    });
    const { periods, ...rest } = animal;
    const adoptionBlockers =
      animal.status === 'INGRESADO' || animal.status === 'DISPONIBLE_ADOPCION'
        ? await this.status.adoptionBlockers(this.prisma, {
            id,
            status: 'INGRESADO',
          })
        : null;
    return {
      ...rest,
      activePeriod: periods[0] ?? null,
      activeTreatments,
      adoptionBlockers,
    };
  }

  /** CU03: registrar animal con código ZOO-AAAA-NNNN (RN-01). */
  async create(dto: CreateAnimalDto, user: AuthUser): Promise<Animal> {
    return this.prisma.$transaction(async (tx) => {
      const code = await this.nextCode(tx);
      const animal = await tx.animal.create({
        data: {
          ...dto,
          entryDate: new Date(dto.entryDate),
          code,
          status: 'INGRESADO',
          createdById: user.id,
        },
      });
      return animal;
    });
  }

  /** CU04: el estado nunca se edita a mano; en estados finales solo se editan notas. */
  async update(id: string, dto: UpdateAnimalDto): Promise<Animal> {
    const current = await this.getOrThrow(id);
    const isFinal = OUTSIDE_STATES.includes(current.status);
    const provided = Object.entries(dto).filter(([, v]) => v !== undefined);

    if (isFinal) {
      const forbidden = provided
        .map(([k]) => k)
        .filter((k) => !(NOTE_FIELDS as readonly string[]).includes(k));
      if (forbidden.length) {
        throw new ConflictException(
          `El animal está "${STATUS_LABELS[current.status]}": solo se pueden editar las notas`,
        );
      }
    }

    const data: Prisma.AnimalUpdateInput = Object.fromEntries(
      provided.filter(([k]) => isFinal || k !== 'exitNotes'),
    );
    if (dto.entryDate) data.entryDate = new Date(dto.entryDate);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.animal.update({ where: { id }, data });
      return updated;
    });
  }

  async savePhoto(id: string, file: Express.Multer.File | undefined): Promise<Animal> {
    if (!file) throw new BadRequestException('Debes adjuntar una foto (campo "file")');
    if (file.size > MAX_PHOTO_BYTES) throw new BadRequestException('La foto supera los 5 MB');
    const ext = detectImageType(file.buffer);
    if (!ext) throw new BadRequestException('Formato no permitido. Usa JPG, PNG o WEBP');

    const current = await this.getOrThrow(id);
    const photoUrl = await this.storage.put(
      `animals/${id}-${randomUUID()}.${ext}`,
      file.buffer,
      ext,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      const a = await tx.animal.update({ where: { id }, data: { photoUrl } });
      return a;
    });

    await this.storage.remove(current.photoUrl);
    return updated;
  }

  /** CU21: habilitar para adopción (RN-03). */
  async enableAdoption(id: string): Promise<Animal> {
    return this.prisma.$transaction(async (tx) => {
      const animal = await this.status.getForUpdate(tx, id);
      if (animal.status === 'DISPONIBLE_ADOPCION') {
        throw new ConflictException('El animal ya está disponible para adopción');
      }
      const blockers = await this.status.adoptionBlockers(tx, animal);
      if (blockers.length) {
        throw new ConflictException({
          message: `No se puede habilitar para adopción: ${blockers.join('; ')}`,
          errors: blockers,
        });
      }
      return this.status.changeStatus(tx, animal, 'DISPONIBLE_ADOPCION');
    });
  }

  /** CU21: retirar de adopción (solo si no tiene solicitud activa). */
  async disableAdoption(id: string): Promise<Animal> {
    return this.prisma.$transaction(async (tx) => {
      const animal = await this.status.getForUpdate(tx, id);
      if (animal.status === 'EN_PROCESO_ADOPCION') {
        throw new ConflictException(
          'El animal tiene una solicitud de adopción activa. Cancélala antes de retirarlo.',
        );
      }
      if (animal.status !== 'DISPONIBLE_ADOPCION') {
        throw new ConflictException('El animal no está disponible para adopción');
      }
      return this.status.changeStatus(tx, animal, 'INGRESADO');
    });
  }

  /** CU22: registrar salida o baja. */
  async exit(id: string, dto: ExitAnimalDto, user: AuthUser): Promise<Animal> {
    if (dto.type === 'OTRO' && !dto.detail) {
      throw new BadRequestException('Indica el detalle del motivo de salida');
    }
    return this.prisma.$transaction(async (tx) => {
      const animal = await this.status.getForUpdate(tx, id);
      if (EXIT_STATES.includes(animal.status) || animal.status === 'ADOPTADO') {
        throw new ConflictException(
          `El animal ya está en un estado final (${STATUS_LABELS[animal.status]})`,
        );
      }
      if (animal.status === 'EN_PROCESO_ADOPCION') {
        throw new ConflictException(
          'El animal tiene una solicitud de adopción activa. Cancélala antes de registrar la salida.',
        );
      }
      const date = new Date(dto.date);

      // Cierra registros clínicos abiertos (no se borran, RN-02)
      const period = await tx.quarantinePeriod.findFirst({
        where: { animalId: id, status: 'ACTIVO' },
      });
      if (period) {
        await tx.quarantinePeriod.update({
          where: { id: period.id },
          data: {
            status: 'FINALIZADO',
            endDate: date,
            closedById: user.id,
            finalObservations: 'Cerrado automáticamente por salida del animal',
          },
        });
      }
      const treatments = await tx.treatment.findMany({
        where: { status: 'ACTIVO', consultation: { animalId: id } },
      });
      for (const t of treatments) {
        await tx.treatment.update({
          where: { id: t.id },
          data: { status: 'SUSPENDIDO' },
        });
      }

      const target = dto.type === 'FALLECIDO' ? 'FALLECIDO' : 'DEVUELTO';
      const reason = dto.type === 'OTRO' ? `OTRO: ${dto.detail}` : dto.type;
      return this.status.changeStatus(tx, animal, target, {
        exitDate: date,
        exitReason: reason,
        exitNotes: dto.notes ?? null,
      });
    });
  }

  /** CU22: reingreso de un animal adoptado que vuelve a la institución. */
  async readmit(id: string): Promise<Animal> {
    return this.prisma.$transaction(async (tx) => {
      const animal = await this.status.getForUpdate(tx, id);
      if (animal.status !== 'ADOPTADO') {
        throw new ConflictException('Solo se puede reingresar un animal adoptado');
      }
      const updated = await this.status.changeStatus(tx, animal, 'INGRESADO', {
        exitDate: null,
        exitReason: null,
        exitNotes: null,
      });
      return updated;
    });
  }

  /** CU05: Historial Clínico Digital = unión cronológica inversa. */
  async timeline(id: string, q: TimelineQueryDto) {
    await this.getOrThrow(id);
    const types = q.types?.length ? q.types : ['CONSULTA', 'VACUNA', 'PERIODO'];
    const from = q.from ? new Date(q.from) : undefined;
    const to = q.to ? new Date(q.to) : undefined;
    if (from && to && from > to) throw new BadRequestException('Rango de fechas inválido');
    // `to` inclusivo para fechas sin hora
    const toEnd = to && q.to?.length === 10 ? new Date(to.getTime() + 86_399_999) : to;
    const range = from || toEnd ? { gte: from, lte: toEnd } : undefined;
    const user = { select: { id: true, fullName: true } };

    const [consultations, vaccinations, periods] = await Promise.all([
      types.includes('CONSULTA')
        ? this.prisma.veterinaryConsultation.findMany({
            where: { animalId: id, consultationDate: range },
            include: {
              veterinarian: user,
              diagnoses: { orderBy: { createdAt: 'asc' } },
              treatments: {
                orderBy: { createdAt: 'asc' },
                include: { medications: true },
              },
            },
          })
        : [],
      types.includes('VACUNA')
        ? this.prisma.vaccination.findMany({
            where: { animalId: id, applicationDate: range },
            include: { vaccine: true, appliedBy: user },
          })
        : [],
      types.includes('PERIODO')
        ? this.prisma.quarantinePeriod.findMany({
            where: { animalId: id, startDate: range },
            include: {
              startedBy: user,
              closedBy: user,
              controls: {
                orderBy: { controlDate: 'desc' },
                include: { createdBy: user },
              },
            },
          })
        : [],
    ]);

    const items = [
      ...consultations.map((c) => ({
        type: 'CONSULTA' as const,
        date: c.consultationDate,
        id: c.id,
        data: c,
      })),
      ...vaccinations.map((v) => ({
        type: 'VACUNA' as const,
        date: v.applicationDate,
        id: v.id,
        data: v,
      })),
      ...periods.map((p) => ({
        type: 'PERIODO' as const,
        date: p.startDate,
        id: p.id,
        data: p,
      })),
    ];
    items.sort((a, b) => b.date.getTime() - a.date.getTime());
    return { data: items };
  }

  async getOrThrow(id: string): Promise<Animal> {
    const animal = await this.prisma.animal.findFirst({
      where: { id, deletedAt: null },
    });
    if (!animal) throw new NotFoundException('Animal no encontrado');
    return animal;
  }

  /** RN-01: siguiente código del año, serializado con un advisory lock. */
  private async nextCode(tx: Prisma.TransactionClient): Promise<string> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('animal_code'))`;
    const year = currentYearLaPaz();
    const prefix = `ZOO-${year}-`;
    const last = await tx.animal.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const next = last ? Number(last.code.slice(prefix.length)) + 1 : 1;
    return `${prefix}${String(next).padStart(4, '0')}`;
  }
}
