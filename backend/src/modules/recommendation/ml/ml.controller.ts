import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/types';
import { MlService } from './ml.service';
import { TrainModelDto } from '../dto/ml.dto';

@ApiTags('recommendation-ml')
@ApiBearerAuth()
@Controller('ml')
export class MlController {
  constructor(private readonly ml: MlService) {}

  @Roles(UserRole.ADMIN, UserRole.GESTION, UserRole.DIRECTIVO)
  @Get('status')
  @ApiOperation({ summary: 'Modelo activo, su procedencia y sus métricas' })
  status() {
    return this.ml.status();
  }

  @Roles(UserRole.ADMIN, UserRole.GESTION, UserRole.DIRECTIVO)
  @Get('models')
  @ApiOperation({ summary: 'Historial de modelos entrenados' })
  list() {
    return this.ml.list();
  }

  @Roles(UserRole.ADMIN, UserRole.GESTION, UserRole.DIRECTIVO)
  @Get('models/:version')
  @ApiOperation({ summary: 'Métricas completas de un modelo' })
  detail(@Param('version', ParseIntPipe) version: number) {
    return this.ml.detail(version);
  }

  @Roles(UserRole.ADMIN)
  @Post('train')
  @ApiOperation({
    summary: 'Entrena un Random Forest y lo versiona',
    description:
      'Usa las solicitudes resueltas (APROBADA = 1, RECHAZADA = 0). Si no hay suficientes ' +
      'casos reales, completa con casos sintéticos y lo declara en la procedencia del modelo.',
  })
  train(@Body() dto: TrainModelDto, @CurrentUser() user: AuthUser) {
    return this.ml.train(dto, user);
  }

  @Roles(UserRole.ADMIN)
  @Post('models/:version/activate')
  @ApiOperation({ summary: 'Activa una versión ya entrenada' })
  activate(@Param('version', ParseIntPipe) version: number) {
    return this.ml.activate(version);
  }

  @Roles(UserRole.ADMIN)
  @Post('deactivate')
  @ApiOperation({
    summary: 'Desactiva el modelo vigente',
    description: 'El sistema vuelve a calcular las recomendaciones con el motor de reglas.',
  })
  deactivate() {
    return this.ml.deactivate();
  }
}
