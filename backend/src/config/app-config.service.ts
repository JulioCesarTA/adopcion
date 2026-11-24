import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Acceso tipado a las variables de entorno (ver .env.example). */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  private required(key: string): string {
    const value = this.config.get<string>(key);
    if (!value) throw new Error(`Falta la variable de entorno ${key}`);
    return value;
  }

  get port(): number {
    return Number(this.config.get('PORT') ?? 4000);
  }

  get frontendUrl(): string {
    return this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
  }

  get jwtAccessSecret(): string {
    return this.required('JWT_ACCESS_SECRET');
  }

  get jwtRefreshSecret(): string {
    return this.required('JWT_REFRESH_SECRET');
  }

  get jwtAccessTtlSeconds(): number {
    return Number(this.config.get('JWT_ACCESS_TTL_SECONDS') ?? 900);
  }

  get jwtRefreshTtlDays(): number {
    return Number(this.config.get('JWT_REFRESH_TTL_DAYS') ?? 7);
  }

  get cookieSecure(): boolean {
    return this.config.get<string>('COOKIE_SECURE') === 'true';
  }

  get cookieSameSite(): 'lax' | 'strict' | 'none' {
    const v = (this.config.get<string>('COOKIE_SAMESITE') ?? 'lax').toLowerCase();
    return v === 'strict' || v === 'none' ? v : 'lax';
  }

  get uploadDir(): string {
    return this.config.get<string>('UPLOAD_DIR') ?? 'uploads';
  }

  private str(key: string, fallback = ''): string {
    return (this.config.get<string>(key) ?? fallback).trim();
  }

  // ---------- Almacenamiento de fotos ----------

  /**
   * `local` guarda en disco y sirve en /uploads (desarrollo).
   * `s3` sube al bucket y guarda la URL pública (producción en EC2).
   * En EC2 no hacen falta claves: el SDK usa el rol IAM de la instancia.
   */
  get storage() {
    const driver: 'local' | 's3' =
      this.str('STORAGE_DRIVER', 'local').toLowerCase() === 's3' ? 's3' : 'local';
    return {
      driver,
      s3: {
        bucket: this.str('S3_BUCKET'),
        region: this.str('AWS_REGION', 'us-east-1'),
        publicBaseUrl: this.str('S3_PUBLIC_BASE_URL'),
        accessKeyId: this.str('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.str('AWS_SECRET_ACCESS_KEY'),
      },
    };
  }

  // ---------- Correo (formulario «Contáctame») ----------

  /** SMTP genérico: Mailtrap Sandbox en desarrollo; Resend, Brevo o Mailtrap Sending en producción. */
  get smtp() {
    const host = this.str('SMTP_HOST');
    return {
      enabled: !!host,
      host,
      port: Number(this.config.get('SMTP_PORT') ?? 587),
      secure: this.config.get<string>('SMTP_SECURE') === 'true',
      user: this.str('SMTP_USER'),
      pass: this.str('SMTP_PASS'),
      from: this.str('MAIL_FROM', 'Adopet <no-reply@adopet.test>'),
      // Vacío = no se avisa por correo a la institución.
      contactTo: this.str('CONTACT_TO', ''),
    };
  }

  // ---------- Asistente virtual (Claude) ----------

  get chat() {
    return {
      enabled: !!this.str('ANTHROPIC_API_KEY'),
      model: this.str('CHAT_MODEL', 'claude-opus-5-5'),
    };
  }

  // ---------- Datos públicos de la institución ----------

  get institution() {
    return {
      name: this.str('INSTITUTION_NAME', 'Adopet'),
      shortName: this.str('INSTITUTION_SHORT_NAME', 'Adopet'),
      address: this.str('INSTITUTION_ADDRESS', 'Santa Cruz de la Sierra, Bolivia'),
      phone: this.str('INSTITUTION_PHONE', '+591 3 000 0000'),
      email: this.str('INSTITUTION_EMAIL', 'contacto@adopet.test'),
      hours: this.str(
        'INSTITUTION_HOURS',
        'Lunes a viernes de 8:00 a 16:00; sábados de 8:00 a 12:00',
      ),
      social: {
        facebook: this.str('SOCIAL_FACEBOOK'),
        instagram: this.str('SOCIAL_INSTAGRAM'),
        tiktok: this.str('SOCIAL_TIKTOK'),
        youtube: this.str('SOCIAL_YOUTUBE'),
        whatsapp: this.str('SOCIAL_WHATSAPP'),
      },
    };
  }
}
