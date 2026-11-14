import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { AnimalSize, ExperienceLevel, HousingType, Species } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || undefined : value;
/** Permite enviar "" o null para limpiar una preferencia opcional. */
const emptyToNull = ({ value }: { value: unknown }) => (value === '' ? null : value);

export class CreateAdopterDto {
  @ApiProperty({ description: 'Cédula de identidad', example: '7845123 SC' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase().replace(/\s+/g, ' ') : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'La CI es obligatoria' })
  @MaxLength(20, { message: 'La CI tiene como máximo 20 caracteres' })
  @Matches(/^[0-9A-Z\- ]+$/, {
    message: 'La CI solo puede contener números, letras y guiones',
  })
  ci: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Los nombres son obligatorios' })
  @MaxLength(100)
  firstName: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Los apellidos son obligatorios' })
  @MaxLength(100)
  lastName: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  @MaxLength(30)
  @Matches(/^[0-9+()\- ]{6,30}$/, { message: 'Teléfono inválido' })
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() || undefined : value,
  )
  @IsEmail({}, { message: 'Correo inválido' })
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiProperty({ enum: HousingType })
  @IsEnum(HousingType, { message: 'Tipo de vivienda inválido' })
  housingType: HousingType;

  @ApiProperty()
  @IsBoolean()
  hasYard: boolean;

  @ApiProperty()
  @IsBoolean()
  hasChildren: boolean;

  @ApiProperty()
  @IsBoolean()
  hasOtherAnimals: boolean;

  @ApiProperty({ minimum: 0, maximum: 24 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 }, { message: 'Las horas deben ser un número' })
  @Min(0, { message: 'Las horas disponibles deben estar entre 0 y 24' })
  @Max(24, { message: 'Las horas disponibles deben estar entre 0 y 24' })
  availableHoursPerDay: number;

  @ApiProperty({ enum: ExperienceLevel })
  @IsEnum(ExperienceLevel, { message: 'Nivel de experiencia inválido' })
  experience: ExperienceLevel;

  @ApiPropertyOptional({ enum: Species, nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_o, v) => v !== null)
  @IsEnum(Species, { message: 'Especie inválida' })
  preferredSpecies?: Species | null;

  @ApiPropertyOptional({ enum: AnimalSize, nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_o, v) => v !== null)
  @IsEnum(AnimalSize, { message: 'Tamaño inválido' })
  preferredSize?: AnimalSize | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  observations?: string;
}

export class UpdateAdopterDto extends PartialType(CreateAdopterDto) {}

export class ListAdoptersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'CI, nombres o apellidos' })
  @IsOptional()
  @IsString()
  q?: string;
}
