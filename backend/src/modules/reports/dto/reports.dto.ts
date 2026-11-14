import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { AnimalStatus, Species } from '@prisma/client';

export class ReportFiltersDto {
  @ApiPropertyOptional({
    description: 'YYYY-MM-DD (por defecto: hace 12 meses)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Fecha "desde" inválida' })
  from?: string;

  @ApiPropertyOptional({ description: 'YYYY-MM-DD (por defecto: hoy)' })
  @IsOptional()
  @IsDateString({}, { message: 'Fecha "hasta" inválida' })
  to?: string;

  @ApiPropertyOptional({ enum: Species })
  @IsOptional()
  @IsEnum(Species, { message: 'Especie inválida' })
  species?: Species;

  @ApiPropertyOptional({ enum: AnimalStatus })
  @IsOptional()
  @IsEnum(AnimalStatus, { message: 'Estado inválido' })
  status?: AnimalStatus;
}
