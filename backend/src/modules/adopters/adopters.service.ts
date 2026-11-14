import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { paginated } from '../../common/dto/pagination.dto';
import type { AuthUser } from '../../common/types';
import { CreateAdopterDto, ListAdoptersQueryDto, UpdateAdopterDto } from './dto/adopters.dto';

const PERSON_FIELDS = ['ci', 'firstName', 'lastName', 'phone', 'email', 'address'] as const;

/** CU10: la CI solo se muestra completa a GESTION y ADMIN. */
export function canSeeFullCi(role: UserRole): boolean {
  return role === 'GESTION' || role === 'ADMIN';
}

export function maskCi(ci: string): string {
  const visible = ci.slice(-3);
  return `${'•'.repeat(Math.max(3, ci.length - 3))}${visible}`;
}

const include = { person: true } satisfies Prisma.AdopterProfileInclude;
type AdopterRow = Prisma.AdopterProfileGetPayload<{ include: typeof include }>;

function present<T extends AdopterRow>(row: T, role: UserRole) {
  if (canSeeFullCi(role)) return row;
  return { ...row, person: { ...row.person, ci: maskCi(row.person.ci) } };
}

function split(dto: Partial<CreateAdopterDto>) {
  const person: Record<string, unknown> = {};
  const profile: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(dto)) {
    if (v === undefined) continue;
    if ((PERSON_FIELDS as readonly string[]).includes(k)) person[k] = v;
    else profile[k] = v;
  }
  return { person, profile };
}

@Injectable()
export class AdoptersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(q: ListAdoptersQueryDto, user: AuthUser) {
    const term = q.q?.trim();
    const where: Prisma.AdopterProfileWhereInput = term
      ? {
          person: {
            OR: [
              { ci: { contains: term, mode: 'insensitive' } },
              { firstName: { contains: term, mode: 'insensitive' } },
              { lastName: { contains: term, mode: 'insensitive' } },
            ],
          },
        }
      : {};
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.adopterProfile.findMany({
        where,
        include: { ...include, _count: { select: { adoptionRequests: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.adopterProfile.count({ where }),
    ]);
    return paginated(
      rows.map((r) => present(r, user.role)),
      total,
      q,
    );
  }

  async findOne(id: string, user: AuthUser) {
    const row = await this.prisma.adopterProfile.findUnique({
      where: { id },
      include: {
        ...include,
        adoptionRequests: {
          orderBy: { requestDate: 'desc' },
          include: {
            animal: {
              select: {
                id: true,
                code: true,
                name: true,
                species: true,
                photoUrl: true,
              },
            },
          },
        },
      },
    });
    if (!row) throw new NotFoundException('Adoptante no encontrado');
    return present(row, user.role);
  }

  async create(dto: CreateAdopterDto) {
    await this.assertCiFree(dto.ci);
    const { person, profile } = split(dto);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const row = await tx.adopterProfile.create({
          data: {
            ...(profile as Omit<Prisma.AdopterProfileCreateInput, 'person'>),
            person: {
              create: person as Prisma.PersonCreateWithoutAdopterProfileInput,
            },
          },
          include,
        });
        await this.audit.log(
          {
            action: 'CREATE',
            entityName: 'adopter_profiles',
            entityId: row.id,
            newValue: row,
          },
          tx,
        );
        return row;
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        await this.assertCiFree(dto.ci);
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateAdopterDto) {
    const current = await this.prisma.adopterProfile.findUnique({
      where: { id },
      include,
    });
    if (!current) throw new NotFoundException('Adoptante no encontrado');
    if (dto.ci && dto.ci !== current.person.ci) await this.assertCiFree(dto.ci, current.personId);
    const { person, profile } = split(dto);
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.adopterProfile.update({
        where: { id },
        data: {
          ...(profile as Prisma.AdopterProfileUpdateInput),
          ...(Object.keys(person).length ? { person: { update: person } } : {}),
        },
        include,
      });
      await this.audit.log(
        {
          action: 'UPDATE',
          entityName: 'adopter_profiles',
          entityId: id,
          oldValue: current,
          newValue: row,
        },
        tx,
      );
      return row;
    });
  }

  /** CI duplicada → 409 con el id del adoptante existente (para enlazarlo en la UI). */
  private async assertCiFree(ci: string, exceptPersonId?: string) {
    const person = await this.prisma.person.findUnique({
      where: { ci },
      include: { adopterProfile: { select: { id: true } } },
    });
    if (person && person.id !== exceptPersonId) {
      throw new ConflictException({
        message: `Ya existe un adoptante registrado con la CI ${ci}`,
        errors: { existingAdopterId: person.adopterProfile?.id ?? null },
      });
    }
  }
}
