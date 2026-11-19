import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { RequestStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || undefined : value;

export class CreateAdoptionDto {
  @ApiProperty({ description: 'Id del perfil de adoptante' })
  @IsUUID('4', { message: 'Selecciona un adoptante' })
  adopterId: string;

  @ApiProperty()
  @IsUUID('4', { message: 'Selecciona un animal' })
  animalId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  notes?: string;
}

export class ChangeRequestStatusDto {
  @ApiProperty({ enum: ['EN_EVALUACION', 'CANCELADA'] })
  @IsIn(['EN_EVALUACION', 'CANCELADA'], {
    message: 'Estado inválido. Para aprobar o rechazar usa "Registrar resultado"',
  })
  status: 'EN_EVALUACION' | 'CANCELADA';

  @ApiPropertyOptional({ description: 'Obligatoria al cancelar' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  notes?: string;
}

export class AddNoteDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'La nota no puede estar vacía' })
  @MaxLength(5000)
  notes: string;
}

export class DecisionDto {
  @ApiProperty({ enum: ['APROBADA', 'RECHAZADA'] })
  @IsIn(['APROBADA', 'RECHAZADA'], {
    message: 'El resultado debe ser APROBADA o RECHAZADA',
  })
  result: 'APROBADA' | 'RECHAZADA';

  @ApiProperty()
  @Transform(trim)
  @IsString({ message: 'La nota es obligatoria' })
  @IsNotEmpty({ message: 'La nota es obligatoria' })
  @MaxLength(5000)
  notes: string;

  @ApiProperty()
  @IsDateString({}, { message: 'Fecha de decisión inválida' })
  decisionDate: string;

  @ApiPropertyOptional({ description: 'Obligatoria si se aprueba' })
  @IsOptional()
  @IsDateString({}, { message: 'Fecha de entrega inválida' })
  deliveryDate?: string;
}

export class CreateFollowupDto {
  @ApiProperty()
  @IsDateString({}, { message: 'Fecha inválida' })
  followupDate: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'El estado general del animal es obligatorio' })
  @MaxLength(2000)
  animalCondition: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  observations?: string;
}

export class ListAdoptionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Código/nombre del animal o nombre/CI del adoptante',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: RequestStatus })
  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;
}

export class RequestMineDto {
  @ApiProperty()
  @IsUUID('4', { message: 'Selecciona un animal' })
  animalId: string;
}
