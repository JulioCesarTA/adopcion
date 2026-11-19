import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { BookingStatus, UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { PrismaService } from '../../prisma/prisma.service';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const { ADMIN, VETERINARIO, CLIENTE } = UserRole;

class CreateBookingDto {
  @ApiProperty()
  @IsUUID('4', { message: 'Animal inválido' })
  animalId: string;

  @ApiPropertyOptional({
    description: 'Cliente (solo lo envía el personal; el cliente reserva para sí)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Cliente inválido' })
  clientId?: string;

  @ApiProperty({ description: 'Día y hora de la consulta (ISO 8601)' })
  @IsDateString({}, { message: 'Fecha y hora inválidas' })
  scheduledAt: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

class SetBookingStatusDto {
  @ApiProperty({ enum: BookingStatus })
  @IsEnum(BookingStatus, { message: 'Estado inválido' })
  status: BookingStatus;
}

const include = {
  animal: { select: { id: true, code: true, name: true, species: true } },
  client: { select: { id: true, fullName: true, email: true, phone: true } },
  createdBy: { select: { id: true, fullName: true } },
};

/** Reserva de consultas: un cliente registrado reserva día y hora para un animal registrado. */
@ApiTags('bookings')
@ApiBearerAuth()
@Roles(ADMIN, VETERINARIO, CLIENTE)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly prisma: PrismaService) {}

  /** El personal ve todas las reservas; el cliente, solo las suyas. */
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.prisma.consultationBooking.findMany({
      where: user.role === CLIENTE ? { clientId: user.id } : {},
      orderBy: { scheduledAt: 'asc' },
      include,
    });
  }

  /** Datos para los selectores del formulario: animales registrados y, para el personal, clientes. */
  @Get('options')
  async options(@CurrentUser() user: AuthUser) {
    const [animals, clients] = await Promise.all([
      this.prisma.animal.findMany({
        where: { deletedAt: null, ...(user.role === CLIENTE ? { ownerId: user.id } : {}) },
        orderBy: { code: 'desc' },
        select: { id: true, code: true, name: true, species: true },
      }),
      user.role === CLIENTE
        ? []
        : this.prisma.user.findMany({
            where: { role: CLIENTE, isActive: true },
            orderBy: { fullName: 'asc' },
            select: { id: true, fullName: true, email: true },
          }),
    ]);
    return { animals, clients };
  }

  @Post()
  async create(@Body() dto: CreateBookingDto, @CurrentUser() user: AuthUser) {
    const clientId = user.role === CLIENTE ? user.id : dto.clientId;
    if (!clientId) throw new BadRequestException('Elige el cliente');
    const [client, animal] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: clientId }, select: { role: true } }),
      this.prisma.animal.findFirst({
        where: { id: dto.animalId, deletedAt: null },
        select: { id: true, ownerId: true },
      }),
    ]);
    if (!client || client.role !== CLIENTE) {
      throw new BadRequestException('El cliente debe estar registrado');
    }
    if (!animal) throw new BadRequestException('El animal debe estar registrado');
    if (user.role === CLIENTE && animal.ownerId !== user.id) {
      throw new BadRequestException('Solo puedes reservar consultas para tus animales');
    }
    return this.prisma.consultationBooking.create({
      data: {
        animalId: dto.animalId,
        clientId,
        createdById: user.id,
        scheduledAt: new Date(dto.scheduledAt),
        reason: dto.reason,
        notes: dto.notes || null,
      },
      include,
    });
  }

  /** El cliente ve sus animales con todo su historial: consultas, vacunas, cuarentenas y reservas. */
  @Roles(CLIENTE)
  @Get('my-animals')
  myAnimals(@CurrentUser() user: AuthUser) {
    return this.prisma.animal.findMany({
      where: { ownerId: user.id, deletedAt: null },
      orderBy: { code: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        species: true,
        breed: true,
        sex: true,
        ageMonths: true,
        size: true,
        status: true,
        photoUrl: true,
        consultations: {
          orderBy: { consultationDate: 'desc' },
          include: {
            veterinarian: { select: { fullName: true } },
            diagnoses: true,
            treatments: { include: { medications: true } },
          },
        },
        vaccinations: {
          orderBy: { applicationDate: 'desc' },
          include: { vaccine: { select: { name: true } } },
        },
        periods: { orderBy: { startDate: 'desc' } },
        bookings: { orderBy: { scheduledAt: 'desc' } },
      },
    });
  }

  /** El personal cambia cualquier estado; el cliente solo puede cancelar sus reservas. */
  @Patch(':id/status')
  async setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetBookingStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    const booking = await this.prisma.consultationBooking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Reserva no encontrada');
    if (user.role === CLIENTE && (booking.clientId !== user.id || dto.status !== 'CANCELADA')) {
      throw new ForbiddenException('Solo puedes cancelar tus reservas');
    }
    return this.prisma.consultationBooking.update({
      where: { id },
      data: { status: dto.status },
      include,
    });
  }
}
