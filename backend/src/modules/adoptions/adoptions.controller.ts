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
  ChangeRequestStatusDto,
  CreateAdoptionDto,
  CreateFollowupDto,
  DecisionDto,
  ListAdoptionsQueryDto,
  RequestMineDto,
} from './dto/adoptions.dto';

const { ADMIN } = UserRole;
const READERS = [ADMIN];

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

  @Roles(ADMIN)
  @Post()
  create(@Body() dto: CreateAdoptionDto, @CurrentUser() user: AuthUser) {
    return this.adoptions.create(dto, user);
  }

  /** El cliente o adoptante solicita la adopción desde su portal; la solicitud llega al personal. */
  @Roles(UserRole.ADOPTANTE, UserRole.CLIENTE)
  @Post('mine')
  requestMine(@Body() dto: RequestMineDto, @CurrentUser() user: AuthUser) {
    return this.adoptions.requestByClient(dto.animalId, user);
  }

  @Roles(...READERS)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.adoptions.findOne(id, user);
  }

  @Roles(ADMIN)
  @Patch(':id/status')
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeRequestStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adoptions.changeStatus(id, dto, user);
  }

  @Roles(ADMIN)
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

  @Roles(ADMIN)
  @Post(':id/followups')
  createFollowup(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateFollowupDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adoptions.createFollowup(id, dto, user);
  }

  @Roles(ADMIN)
  @Get(':id/act')
  act(@Param('id', ParseUUIDPipe) id: string) {
    return this.adoptions.act(id);
  }
}
