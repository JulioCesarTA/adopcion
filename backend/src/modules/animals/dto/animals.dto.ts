import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AnimalSize, AnimalStatus, Sex, Species } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || undefined : value;

export class CreateAnimalDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ enum: Species })
  @IsEnum(Species, { message: 'Especie inválida' })
  species: Species;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  breed?: string;

  @ApiPropertyOptional({ enum: Sex, default: Sex.DESCONOCIDO })
  @IsOptional()
  @IsEnum(Sex, { message: 'Sexo inválido' })
  sex?: Sex;

  @ApiPropertyOptional({ description: 'Edad aproximada en meses' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La edad debe ser un número entero de meses' })
  @Min(0, { message: 'La edad no puede ser negativa' })
  @Max(400)
  ageMonths?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  color?: string;

  @ApiProperty({ enum: AnimalSize })
  @IsEnum(AnimalSize, { message: 'Tamaño inválido' })
  size: AnimalSize;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsInt({ message: 'El nivel de energía debe ser un entero' })
  @Min(1, { message: 'El nivel de energía va de 1 a 5' })
  @Max(5, { message: 'El nivel de energía va de 1 a 5' })
  energyLevel: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  temperament?: string;

  @ApiProperty()
  @IsBoolean()
  goodWithChildren: boolean;

  @ApiProperty()
  @IsBoolean()
  goodWithAnimals: boolean;

  @ApiProperty()
  @IsBoolean()
  needsYard: boolean;

  @ApiProperty()
  @IsBoolean()
  specialCare: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  specialCareNotes?: string;

  @ApiProperty({ minimum: 0, maximum: 24 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 }, { message: 'Las horas deben ser un número (1 decimal)' })
  @Min(0, { message: 'Las horas van de 0 a 24' })
  @Max(24, { message: 'Las horas van de 0 a 24' })
  requiredDailyHours: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  physicalDescription?: string;

  @ApiProperty({ description: 'Fecha de ingreso (ISO 8601)' })
  @IsDateString({}, { message: 'Fecha de ingreso inválida' })
  entryDate: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'El motivo de ingreso es obligatorio' })
  @MaxLength(255)
  entryReason: string;
}

export class UpdateAnimalDto extends PartialType(CreateAnimalDto) {
  @ApiPropertyOptional({
    description: 'Notas de salida (editable en estados finales)',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  exitNotes?: string;
}

export class ListAnimalsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Código o nombre' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: Species })
  @IsOptional()
  @IsEnum(Species)
  species?: Species;

  @ApiPropertyOptional({ enum: AnimalStatus })
  @IsOptional()
  @IsEnum(AnimalStatus)
  status?: AnimalStatus;

  @ApiPropertyOptional({ enum: Sex })
  @IsOptional()
  @IsEnum(Sex)
  sex?: Sex;
}

export class AdoptableQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: Species })
  @IsOptional()
  @IsEnum(Species)
  species?: Species;

  @ApiPropertyOptional({ enum: AnimalSize })
  @IsOptional()
  @IsEnum(AnimalSize)
  size?: AnimalSize;

  @ApiPropertyOptional({ description: 'Edad mínima en meses' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minAge?: number;

  @ApiPropertyOptional({ description: 'Edad máxima en meses' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxAge?: number;

  @ApiPropertyOptional({ description: 'Nivel de energía máximo (1–5)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  maxEnergy?: number;
}

export const EXIT_TYPES = ['FALLECIDO', 'DEVUELTO', 'OTRO'] as const;
export type ExitType = (typeof EXIT_TYPES)[number];

export class ExitAnimalDto {
  @ApiProperty({ enum: EXIT_TYPES })
  @IsIn(EXIT_TYPES, { message: 'Motivo de salida inválido' })
  type: ExitType;

  @ApiPropertyOptional({
    description: 'Detalle del motivo (obligatorio si es OTRO)',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  detail?: string;

  @ApiProperty()
  @IsDateString({}, { message: 'Fecha inválida' })
  date: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export const TIMELINE_TYPES = ['CONSULTA', 'VACUNA', 'PERIODO'] as const;
export type TimelineType = (typeof TIMELINE_TYPES)[number];

export class TimelineQueryDto {
  @ApiPropertyOptional({
    description: 'Tipos separados por coma: CONSULTA,VACUNA,PERIODO',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',').filter(Boolean) : value,
  )
  @IsIn(TIMELINE_TYPES, { each: true })
  types?: TimelineType[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;
}
