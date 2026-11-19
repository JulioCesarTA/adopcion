import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  IsIn,
} from 'class-validator';
import { AnimalSize, Species } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { PASSWORD_MESSAGE, PASSWORD_REGEX } from '../../../common/password-policy';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || undefined : value;
const lower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/** Registro de un cliente desde la landing (rol CLIENTE). */
export class RegisterClientDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(150)
  fullName: string;

  @ApiProperty()
  @Transform(lower)
  @IsEmail({}, { message: 'Correo inválido' })
  @MaxLength(255)
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @Matches(/^[0-9+()\- ]{6,30}$/, { message: 'Teléfono inválido' })
  phone?: string;

  @ApiProperty()
  @IsString()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  password: string;

  @ApiProperty({
    description: 'Debe ser true: acepta Términos y Condiciones y Política de Privacidad',
  })
  @IsBoolean()
  @Equals(true, { message: 'Debes aceptar los Términos y Condiciones y la Política de Privacidad' })
  acceptTerms: boolean;

  @ApiPropertyOptional({
    enum: ['CLIENTE', 'ADOPTANTE'],
    description: 'Tipo de cuenta (por defecto CLIENTE)',
  })
  @IsOptional()
  @IsIn(['CLIENTE', 'ADOPTANTE'], { message: 'Tipo de cuenta inválido' })
  accountType?: 'CLIENTE' | 'ADOPTANTE';
}

/** Formulario «Contáctame». */
export class ContactDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(150)
  name: string;

  @ApiProperty()
  @Transform(lower)
  @IsEmail({}, { message: 'Correo inválido' })
  @MaxLength(255)
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @Matches(/^[0-9+()\- ]{6,30}$/, { message: 'Teléfono inválido' })
  phone?: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'El asunto es obligatorio' })
  @MaxLength(150)
  subject: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(10, { message: 'El mensaje debe tener al menos 10 caracteres' })
  @MaxLength(5000)
  message: string;

  @ApiProperty({ description: 'Debe ser true: acepta el tratamiento de sus datos' })
  @IsBoolean()
  @Equals(true, { message: 'Debes aceptar el tratamiento de tus datos personales' })
  acceptPrivacy: boolean;

  /** Campo trampa anti-spam: debe venir vacío (los bots lo llenan). */
  @ApiPropertyOptional({ description: 'Dejar vacío' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}

export class PublicAnimalsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: Species })
  @IsOptional()
  @IsEnum(Species)
  species?: Species;

  @ApiPropertyOptional({ enum: AnimalSize })
  @IsOptional()
  @IsEnum(AnimalSize)
  size?: AnimalSize;
}
