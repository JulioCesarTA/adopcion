import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CatalogsService } from './catalogs.service';
import { CreateVaccineDto, UpdateVaccineDto, VaccineQueryDto } from './dto/catalogs.dto';

const { ADMIN, VETERINARIO } = UserRole;

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
}
