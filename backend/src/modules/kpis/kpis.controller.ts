import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { KpisService } from './kpis.service';

export class KpisQueryDto {
  /** Meses de la ventana de análisis. Se compara contra los meses previos. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  months?: number;
}

@ApiTags('kpis')
@ApiBearerAuth()
@Controller('kpis')
export class KpisController {
  constructor(private readonly kpis: KpisService) {}

  @Roles(UserRole.ADMIN, UserRole.VETERINARIO, UserRole.GESTION, UserRole.DIRECTIVO)
  @Get()
  @ApiOperation({ summary: 'Indicadores de gestión del albergue con comparación de periodos' })
  get(@Query() q: KpisQueryDto) {
    return this.kpis.kpis(q.months ?? 6);
  }
}
