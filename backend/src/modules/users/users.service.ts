import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BCRYPT_COST } from '../../common/password-policy';
import { paginated } from '../../common/dto/pagination.dto';
import type { AuthUser, Paginated } from '../../common/types';
import { CreateUserDto, ListUsersQueryDto, UpdateUserDto } from './dto/users.dto';

export type PublicUser = Omit<User, 'passwordHash' | 'refreshTokenHash' | 'failedAttempts'>;

export function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    isActive: u.isActive,
    lockedUntil: u.lockedUntil,
    phone: u.phone,
    termsAcceptedAt: u.termsAcceptedAt,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(q: ListUsersQueryDto): Promise<Paginated<PublicUser>> {
    const where: Prisma.UserWhereInput = {
      ...(q.role ? { role: q.role } : {}),
      ...(q.isActive !== undefined ? { isActive: q.isActive } : {}),
      ...(q.q
        ? {
            OR: [
              { fullName: { contains: q.q, mode: 'insensitive' } },
              { email: { contains: q.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { fullName: 'asc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginated(rows.map(toPublicUser), total, q);
  }

  async findOne(id: string): Promise<PublicUser> {
    return toPublicUser(await this.getOrThrow(id));
  }

  async create(dto: CreateUserDto): Promise<PublicUser> {
    await this.assertEmailFree(dto.email);
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName: dto.fullName,
          email: dto.email,
          role: dto.role,
          passwordHash,
        },
      });
      const pub = toPublicUser(user);
      await this.audit.log(
        {
          action: 'CREATE',
          entityName: 'users',
          entityId: user.id,
          newValue: pub,
        },
        tx,
      );
      return pub;
    });
  }

  async update(id: string, dto: UpdateUserDto, actor: AuthUser): Promise<PublicUser> {
    const current = await this.getOrThrow(id);
    if (id === actor.id && dto.role && dto.role !== current.role) {
      throw new BadRequestException('No puedes cambiar tu propio rol');
    }
    if (dto.email && dto.email !== current.email) await this.assertEmailFree(dto.email);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id }, data: dto });
      const pub = toPublicUser(updated);
      await this.audit.log(
        {
          action: 'UPDATE',
          entityName: 'users',
          entityId: id,
          oldValue: toPublicUser(current),
          newValue: pub,
        },
        tx,
      );
      return pub;
    });
  }

  async setActive(id: string, isActive: boolean, actor: AuthUser): Promise<PublicUser> {
    if (id === actor.id && !isActive) {
      throw new BadRequestException('No puedes desactivar tu propia cuenta');
    }
    const current = await this.getOrThrow(id);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        // RN-10: al desactivar se invalida el refresh token
        data: isActive
          ? { isActive: true, failedAttempts: 0, lockedUntil: null }
          : { isActive: false, refreshTokenHash: null },
      });
      await this.audit.log(
        {
          action: 'STATUS_CHANGE',
          entityName: 'users',
          entityId: id,
          oldValue: { isActive: current.isActive },
          newValue: { isActive: updated.isActive },
        },
        tx,
      );
      return toPublicUser(updated);
    });
  }

  async resetPassword(id: string, password: string): Promise<PublicUser> {
    await this.getOrThrow(id);
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: {
          passwordHash,
          refreshTokenHash: null,
          failedAttempts: 0,
          lockedUntil: null,
        },
      });
      await this.audit.log({ action: 'PASSWORD_RESET', entityName: 'users', entityId: id }, tx);
      return toPublicUser(updated);
    });
  }

  private async getOrThrow(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  private async assertEmailFree(email: string): Promise<void> {
    const exists = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (exists) throw new ConflictException('El email ya está registrado');
  }
}
