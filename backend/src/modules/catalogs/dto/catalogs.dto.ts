import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
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

export class WeightsDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Min(0) @Max(100) time: number;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(0) @Max(100) space: number;
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  experience: number;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(0) @Max(100) energy: number;
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  preferences: number;
}

export class CreateAlgorithmSettingsDto {
  @ApiProperty({ type: WeightsDto })
  @ValidateNested()
  @Type(() => WeightsDto)
  weights: WeightsDto;

  @ApiProperty({ default: 80 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  thresholdHigh: number;

  @ApiProperty({ default: 60 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  thresholdMedium: number;
}
