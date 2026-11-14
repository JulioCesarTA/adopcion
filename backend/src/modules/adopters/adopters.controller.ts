import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { AdoptersService } from './adopters.service';
import { CreateAdopterDto, ListAdoptersQueryDto, UpdateAdopterDto } from './dto/adopters.dto';

const { ADMIN, GESTION, DIRECTIVO } = UserRole;

@ApiTags('adopters')
@ApiBearerAuth()
@Controller('adopters')
export class AdoptersController {
  constructor(private readonly adopters: AdoptersService) {}

  @Roles(GESTION, ADMIN, DIRECTIVO)
  @Get()
  list(@Query() q: ListAdoptersQueryDto, @CurrentUser() user: AuthUser) {
    return this.adopters.list(q, user);
  }

  @Roles(GESTION)
  @Post()
  create(@Body() dto: CreateAdopterDto) {
    return this.adopters.create(dto);
  }

  @Roles(GESTION, ADMIN, DIRECTIVO)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.adopters.findOne(id, user);
  }

  @Roles(GESTION)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAdopterDto) {
    return this.adopters.update(id, dto);
  }
}
