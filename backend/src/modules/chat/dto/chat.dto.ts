import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export const MAX_CHAT_TURNS = 20;
export const MAX_CHAT_CHARS = 2000;

export class ChatTurnDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_CHAT_CHARS, { message: `Cada mensaje admite hasta ${MAX_CHAT_CHARS} caracteres` })
  content: string;
}

export class ChatDto {
  @ApiProperty({
    type: [ChatTurnDto],
    description: 'Historial; el último turno debe ser del usuario',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_CHAT_TURNS, {
    message: 'La conversación es muy larga; inicia una nueva',
  })
  @ValidateNested({ each: true })
  @Type(() => ChatTurnDto)
  messages: ChatTurnDto[];
}
