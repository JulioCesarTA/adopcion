import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { AdoptersService } from './adopters.service';
import {
  CreateAdopterDto,
  ListAdoptersQueryDto,
  MyAdopterProfileDto,
  UpdateAdopterDto,
} from './dto/adopters.dto';

const { ADMIN, ADOPTANTE, CLIENTE } = UserRole;

@ApiTags('adopters')
@ApiBearerAuth()
@Controller('adopters')
export class AdoptersController {
  constructor(private readonly adopters: AdoptersService) {}

  @Roles(ADMIN)
  @Get()
  list(@Query() q: ListAdoptersQueryDto, @CurrentUser() user: AuthUser) {
    return this.adopters.list(q, user);
  }

  @Roles(ADMIN)
  @Post()
  create(@Body() dto: CreateAdopterDto) {
    return this.adopters.create(dto);
  }

  /** El cliente o adoptante consulta los datos de su hogar (null si todavía no los cargó). */
  @Roles(ADOPTANTE, CLIENTE)
  @Get('mine')
  findMine(@CurrentUser() user: AuthUser) {
    return this.adopters.findMine(user);
  }

  /** El cliente o adoptante crea o actualiza los datos de su hogar. */
  @Roles(ADOPTANTE, CLIENTE)
  @Put('mine')
  saveMine(@Body() dto: MyAdopterProfileDto, @CurrentUser() user: AuthUser) {
    return this.adopters.saveMine(dto, user);
  }

  @Roles(ADMIN)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.adopters.findOne(id, user);
  }

  @Roles(ADMIN)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAdopterDto) {
    return this.adopters.update(id, dto);
  }
}
