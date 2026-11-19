import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { RecommendationService } from './recommendation.service';
import { CreateRecommendationDto, RecommendationHistoryQueryDto } from './dto/recommendation.dto';

@ApiTags('recommendation')
@ApiBearerAuth()
@Roles(UserRole.GESTION, UserRole.ADMIN)
@Controller('recommendations')
export class RecommendationController {
  constructor(private readonly recommendations: RecommendationService) {}

  /** El cliente o adoptante ve los animales disponibles ordenados por compatibilidad con su hogar. */
  @Roles(UserRole.ADOPTANTE, UserRole.CLIENTE)
  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.recommendations.mine(user);
  }

  @Get('adopter/:adopterId')
  ranking(@Param('adopterId', ParseUUIDPipe) adopterId: string, @CurrentUser() user: AuthUser) {
    return this.recommendations.ranking(adopterId, user);
  }

  @Get('animal/:animalId')
  rankingForAnimal(
    @Param('animalId', ParseUUIDPipe) animalId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.recommendations.rankingForAnimal(animalId, user);
  }

  @Post()
  pair(@Body() dto: CreateRecommendationDto, @CurrentUser() user: AuthUser) {
    return this.recommendations.pair(dto, user);
  }

  @Roles(UserRole.GESTION, UserRole.ADMIN, UserRole.DIRECTIVO)
  @Get('history')
  history(@Query() q: RecommendationHistoryQueryDto) {
    return this.recommendations.history(q.adopterId, q.animalId);
  }
}
