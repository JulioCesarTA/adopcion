import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ContactStatus, Prisma, UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationQueryDto, paginated } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';

class ListContactQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ContactStatus })
  @IsOptional()
  @IsEnum(ContactStatus)
  status?: ContactStatus;

  @ApiPropertyOptional({ description: 'Nombre, correo o asunto' })
  @IsOptional()
  @IsString()
  q?: string;
}

class UpdateContactDto {
  @ApiProperty({ enum: ContactStatus })
  @IsEnum(ContactStatus, { message: 'Estado inválido' })
  status: ContactStatus;
}

/** Buzón de mensajes del formulario «Contáctame». */
@ApiTags('contact')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.GESTION)
@Controller('contact-messages')
export class ContactController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query() q: ListContactQueryDto) {
    const term = q.q?.trim();
    const where: Prisma.ContactMessageWhereInput = {
      ...(q.status ? { status: q.status } : {}),
      ...(term
        ? {
            OR: [
              { name: { contains: term, mode: 'insensitive' } },
              { email: { contains: term, mode: 'insensitive' } },
              { subject: { contains: term, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total, unread] = await this.prisma.$transaction([
      this.prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.contactMessage.count({ where }),
      this.prisma.contactMessage.count({ where: { status: 'NUEVO' } }),
    ]);
    return { ...paginated(rows, total, q), unread };
  }

  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateContactDto) {
    // Conserva el 404 cuando el mensaje no existe.
    await this.prisma.contactMessage.findUniqueOrThrow({ where: { id } });
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.contactMessage.update({
        where: { id },
        data: { status: dto.status },
      });
      return updated;
    });
  }
}
