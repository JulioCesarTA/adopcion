import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class CreateRecommendationDto {
  @ApiProperty()
  @IsUUID('4', { message: 'Adoptante inválido' })
  adopterId: string;

  @ApiProperty()
  @IsUUID('4', { message: 'Animal inválido' })
  animalId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'Solicitud inválida' })
  requestId?: string;
}

export class RecommendationHistoryQueryDto {
  @ApiProperty()
  @IsUUID('4')
  adopterId: string;

  @ApiProperty()
  @IsUUID('4')
  animalId: string;
}
