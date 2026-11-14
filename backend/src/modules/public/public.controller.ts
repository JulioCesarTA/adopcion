import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { PublicService } from './public.service';
import { ContactDto, PublicAnimalsQueryDto, RegisterClientDto } from './dto/public.dto';

/** Endpoints del sitio público (sin sesión). */
@ApiTags('public')
@Public()
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('info')
  info() {
    return this.publicService.info();
  }

  @Get('animals')
  animals(@Query() q: PublicAnimalsQueryDto) {
    return this.publicService.animals(q);
  }

  @Get('animals/:id')
  animal(@Param('id', ParseUUIDPipe) id: string) {
    return this.publicService.animal(id);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  register(@Body() dto: RegisterClientDto) {
    return this.publicService.register(dto);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('contact')
  @HttpCode(HttpStatus.OK)
  contact(@Body() dto: ContactDto, @Req() req: Request) {
    return this.publicService.contact(dto, req.ip);
  }
}
