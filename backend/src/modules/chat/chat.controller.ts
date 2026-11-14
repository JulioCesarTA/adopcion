import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { SkipAudit } from '../../common/decorators/skip-audit.decorator';
import { ChatService } from './chat.service';
import { ChatDto } from './dto/chat.dto';

/** Asistente virtual del sitio público y del portal de clientes. */
@ApiTags('chat')
@Public()
@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @SkipAudit()
  @Post()
  @HttpCode(HttpStatus.OK)
  reply(@Body() dto: ChatDto) {
    return this.chat.reply(dto.messages);
  }
}
