import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { AdoptionsService } from './adoptions.service';
import {
  AddNoteDto,
  ChangeRequestStatusDto,
  CreateAdoptionDto,
  CreateFollowupDto,
  DecisionDto,
  ListAdoptionsQueryDto,
} from './dto/adoptions.dto';

const { ADMIN, GESTION, DIRECTIVO } = UserRole;
const READERS = [ADMIN, GESTION, DIRECTIVO];

@ApiTags('adoptions')
@ApiBearerAuth()
@Controller('adoptions')
export class AdoptionsController {
  constructor(private readonly adoptions: AdoptionsService) {}

  @Roles(...READERS)
  @Get()
  list(@Query() q: ListAdoptionsQueryDto, @CurrentUser() user: AuthUser) {
    return this.adoptions.list(q, user);
  }

  @Roles(GESTION)
  @Post()
  create(@Body() dto: CreateAdoptionDto, @CurrentUser() user: AuthUser) {
    return this.adoptions.create(dto, user);
  }

  @Roles(...READERS)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.adoptions.findOne(id, user);
  }

  @Roles(GESTION)
  @Patch(':id/status')
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeRequestStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adoptions.changeStatus(id, dto, user);
  }

  @Roles(GESTION)
  @Post(':id/notes')
  @HttpCode(HttpStatus.OK)
  addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddNoteDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adoptions.addNote(id, dto.notes, user);
  }

  @Roles(GESTION)
  @Post(':id/decision')
  @HttpCode(HttpStatus.OK)
  decide(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecisionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adoptions.decide(id, dto, user);
  }

  @Roles(...READERS)
  @Get(':id/followups')
  listFollowups(@Param('id', ParseUUIDPipe) id: string) {
    return this.adoptions.listFollowups(id);
  }

  @Roles(GESTION)
  @Post(':id/followups')
  createFollowup(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateFollowupDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adoptions.createFollowup(id, dto, user);
  }

  @Roles(GESTION)
  @Get(':id/act')
  act(@Param('id', ParseUUIDPipe) id: string) {
    return this.adoptions.act(id);
  }
}
