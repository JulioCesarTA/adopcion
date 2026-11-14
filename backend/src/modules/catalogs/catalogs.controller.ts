import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { CatalogsService } from './catalogs.service';
import {
  CreateAlgorithmSettingsDto,
  CreateVaccineDto,
  UpdateVaccineDto,
  VaccineQueryDto,
} from './dto/catalogs.dto';

const { ADMIN, VETERINARIO, GESTION } = UserRole;

@ApiTags('catalogs')
@ApiBearerAuth()
@Controller()
export class CatalogsController {
  constructor(private readonly catalogs: CatalogsService) {}

  @Roles(ADMIN, VETERINARIO)
  @Get('vaccines')
  listVaccines(@Query() q: VaccineQueryDto) {
    return this.catalogs.listVaccines(q.active);
  }

  @Roles(ADMIN)
  @Post('vaccines')
  createVaccine(@Body() dto: CreateVaccineDto) {
    return this.catalogs.createVaccine(dto);
  }

  @Roles(ADMIN)
  @Patch('vaccines/:id')
  updateVaccine(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateVaccineDto) {
    return this.catalogs.updateVaccine(id, dto);
  }

  @Roles(ADMIN, GESTION)
  @Get('algorithm-settings')
  settings() {
    return this.catalogs.settingsHistory();
  }

  @Roles(ADMIN)
  @Post('algorithm-settings')
  createSettings(@Body() dto: CreateAlgorithmSettingsDto, @CurrentUser() user: AuthUser) {
    return this.catalogs.createSettings(dto, user);
  }
}
