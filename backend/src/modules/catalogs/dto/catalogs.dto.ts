import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Species } from '@prisma/client';

export class CreateVaccineDto {
  @ApiProperty()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(150)
  name: string;

  @ApiProperty({ enum: Species, isArray: true })
  @IsEnum(Species, { each: true, message: 'Especie inválida' })
  @ArrayMinSize(1, { message: 'Selecciona al menos una especie' })
  species: Species[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isRabies?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateVaccineDto extends PartialType(CreateVaccineDto) {}

export class VaccineQueryDto {
  @ApiPropertyOptional({ description: 'true = solo activas (para selectores)' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  active?: boolean;
}
