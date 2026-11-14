import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class TrainModelDto {
  @ApiPropertyOptional({
    description:
      'Incluir casos sintéticos. Si se omite, se incluyen solo cuando no hay suficientes datos reales.',
  })
  @IsOptional()
  @IsBoolean()
  useSynthetic?: boolean;

  @ApiPropertyOptional({ description: 'Cantidad de casos sintéticos', default: 1200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(20000)
  syntheticSize?: number;

  @ApiPropertyOptional({ description: 'Árboles del bosque', default: 150 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(500)
  nTrees?: number;

  @ApiPropertyOptional({ description: 'Pliegues de la validación cruzada', default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(10)
  folds?: number;

  @ApiPropertyOptional({ description: 'Semilla aleatoria (reproducibilidad)', default: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  seed?: number;

  @ApiPropertyOptional({ description: 'Activar el modelo al terminar', default: true })
  @IsOptional()
  @IsBoolean()
  activate?: boolean;

  @ApiPropertyOptional({ description: 'Nota libre sobre este entrenamiento' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
