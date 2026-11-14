import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PeriodType, TreatmentStatus } from '@prisma/client';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || undefined : value;
const required = (field: string) => ({ message: `${field} es obligatorio` });

// ---------- Consultas (CU06) ----------

export class CreateConsultationDto {
  @ApiProperty({ description: 'Fecha y hora (ISO 8601)' })
  @IsDateString({}, { message: 'Fecha y hora inválidas' })
  consultationDate: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty(required('El motivo'))
  @MaxLength(255)
  reason: string;

  @ApiPropertyOptional({ description: 'Peso en kg (> 0)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Peso inválido' })
  @Min(0.01, { message: 'El peso debe ser mayor a 0' })
  @Max(9999)
  weightKg?: number;

  @ApiPropertyOptional({ description: 'Temperatura en °C (30–45)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 }, { message: 'Temperatura inválida' })
  @Min(30, { message: 'La temperatura debe estar entre 30 y 45 °C' })
  @Max(45, { message: 'La temperatura debe estar entre 30 y 45 °C' })
  temperatureC?: number;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty(required('La evaluación clínica'))
  @MaxLength(5000)
  clinicalEvaluation: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  observations?: string;
}

export class UpdateConsultationDto extends PartialType(CreateConsultationDto) {}

// ---------- Diagnósticos y tratamientos (CU07) ----------

export class CreateDiagnosisDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty(required('La descripción'))
  @MaxLength(5000)
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  observations?: string;
}

export class CreateMedicationDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty(required('El nombre del medicamento'))
  @MaxLength(150)
  name: string;

  @ApiProperty()
  @Transform(trim)
  @IsString({ message: 'La dosis es obligatoria' })
  @IsNotEmpty(required('La dosis'))
  @MaxLength(50)
  dose: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty(required('La vía de administración'))
  @MaxLength(100)
  administrationRoute: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty(required('La frecuencia'))
  @MaxLength(100)
  frequency: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty(required('La duración'))
  @MaxLength(100)
  duration: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  observations?: string;
}

export class CreateTreatmentDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty(required('La descripción'))
  @MaxLength(5000)
  description: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty(required('Las instrucciones'))
  @MaxLength(5000)
  instructions: string;

  @ApiProperty({ description: 'YYYY-MM-DD' })
  @IsDateString({}, { message: 'Fecha de inicio inválida' })
  startDate: string;

  @ApiPropertyOptional({ description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsDateString({}, { message: 'Fecha de fin inválida' })
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  observations?: string;

  @ApiPropertyOptional({ type: [CreateMedicationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMedicationDto)
  medications?: CreateMedicationDto[];
}

export class UpdateTreatmentDto extends PartialType(
  OmitType(CreateTreatmentDto, ['medications'] as const),
) {
  @ApiPropertyOptional({ enum: TreatmentStatus })
  @IsOptional()
  @IsEnum(TreatmentStatus, { message: 'Estado de tratamiento inválido' })
  status?: TreatmentStatus;
}

// ---------- Vacunas (CU08) ----------

export class CreateVaccinationDto {
  @ApiProperty()
  @IsUUID('4', { message: 'Selecciona una vacuna del catálogo' })
  vaccineId: string;

  @ApiProperty({ description: 'YYYY-MM-DD' })
  @IsDateString({}, { message: 'Fecha de aplicación inválida' })
  applicationDate: string;

  @ApiProperty()
  @Transform(trim)
  @IsString({ message: 'La dosis es obligatoria' })
  @IsNotEmpty(required('La dosis'))
  @MaxLength(50)
  dose: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(50)
  batchNumber?: string;

  @ApiPropertyOptional({ description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsDateString({}, { message: 'Fecha de próxima dosis inválida' })
  nextDoseDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  observations?: string;
}

export class UpdateVaccinationDto extends PartialType(CreateVaccinationDto) {}

export class UpcomingQueryDto {
  @ApiPropertyOptional({ default: 30, description: 'Días hacia adelante' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  days: number = 30;
}

// ---------- Observación / cuarentena (CU09) ----------

export class CreatePeriodDto {
  @ApiProperty({ enum: PeriodType })
  @IsEnum(PeriodType, { message: 'Tipo inválido (OBSERVACION o CUARENTENA)' })
  type: PeriodType;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty(required('El motivo'))
  @MaxLength(2000)
  reason: string;

  @ApiProperty()
  @IsDateString({}, { message: 'Fecha de inicio inválida' })
  startDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString({}, { message: 'Fecha estimada de fin inválida' })
  expectedEndDate?: string;
}

export class CreateControlDto {
  @ApiProperty()
  @IsDateString({}, { message: 'Fecha del control inválida' })
  controlDate: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty(required('La condición del animal'))
  @MaxLength(2000)
  animalCondition: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  observations?: string;
}

export class ClosePeriodDto {
  @ApiProperty()
  @IsDateString({}, { message: 'Fecha de fin inválida' })
  endDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  finalObservations?: string;

  @ApiPropertyOptional({
    description: 'Confirmar el cierre aunque no haya controles',
  })
  @IsOptional()
  @IsBoolean()
  confirmWithoutControls?: boolean;
}

export class PeriodsQueryDto {
  @ApiPropertyOptional({ enum: ['ACTIVO', 'FINALIZADO'] })
  @IsOptional()
  @IsIn(['ACTIVO', 'FINALIZADO'])
  status?: 'ACTIVO' | 'FINALIZADO';
}
