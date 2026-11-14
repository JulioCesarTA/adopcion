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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { memoryStorage } from 'multer';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { AnimalsService, MAX_PHOTO_BYTES } from './animals.service';
import {
  AdoptableQueryDto,
  CreateAnimalDto,
  ExitAnimalDto,
  ListAnimalsQueryDto,
  ReadmitAnimalDto,
  TimelineQueryDto,
  UpdateAnimalDto,
} from './dto/animals.dto';

const { ADMIN, VETERINARIO, GESTION, DIRECTIVO } = UserRole;

@ApiTags('animals')
@ApiBearerAuth()
@Controller('animals')
export class AnimalsController {
  constructor(private readonly animals: AnimalsService) {}

  @Get()
  list(@Query() q: ListAnimalsQueryDto) {
    return this.animals.list(q);
  }

  @Get('adoptable')
  adoptable(@Query() q: AdoptableQueryDto) {
    return this.animals.adoptable(q);
  }

  @Roles(GESTION)
  @Post()
  create(@Body() dto: CreateAnimalDto, @CurrentUser() user: AuthUser) {
    return this.animals.create(dto, user);
  }

  @Roles(ADMIN, VETERINARIO, GESTION, DIRECTIVO)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.animals.findOne(id);
  }

  @Roles(GESTION)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAnimalDto) {
    return this.animals.update(id, dto);
  }

  @Roles(GESTION)
  @Post(':id/photo')
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      // un byte más que el máximo para poder responder 400 con mensaje claro
      limits: { fileSize: MAX_PHOTO_BYTES + 1 },
    }),
  )
  uploadPhoto(@Param('id', ParseUUIDPipe) id: string, @UploadedFile() file?: Express.Multer.File) {
    return this.animals.savePhoto(id, file);
  }

  @Roles(VETERINARIO)
  @Post(':id/enable-adoption')
  @HttpCode(HttpStatus.OK)
  enableAdoption(@Param('id', ParseUUIDPipe) id: string) {
    return this.animals.enableAdoption(id);
  }

  @Roles(VETERINARIO)
  @Post(':id/disable-adoption')
  @HttpCode(HttpStatus.OK)
  disableAdoption(@Param('id', ParseUUIDPipe) id: string) {
    return this.animals.disableAdoption(id);
  }

  @Roles(GESTION)
  @Post(':id/exit')
  @HttpCode(HttpStatus.OK)
  exit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExitAnimalDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.animals.exit(id, dto, user);
  }

  @Roles(GESTION)
  @Post(':id/readmit')
  @HttpCode(HttpStatus.OK)
  readmit(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReadmitAnimalDto) {
    return this.animals.readmit(id, dto);
  }

  @Get(':id/timeline')
  timeline(@Param('id', ParseUUIDPipe) id: string, @Query() q: TimelineQueryDto) {
    return this.animals.timeline(id, q);
  }
}
