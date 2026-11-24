import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { AppConfigService } from '../../config/app-config.service';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );

/**
 * Envío de correo por SMTP genérico (Mailtrap, Resend, Brevo…). Si no hay SMTP
 * configurado, `send` devuelve `{ sent: false }` sin lanzar: el mensaje ya quedó en la BD.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: AppConfigService) {}

  get enabled(): boolean {
    return this.config.smtp.enabled;
  }

  private getTransporter(): Transporter {
    if (!this.transporter) {
      const s = this.config.smtp;
      this.transporter = nodemailer.createTransport({
        host: s.host,
        port: s.port,
        secure: s.secure,
        auth: s.user ? { user: s.user, pass: s.pass } : undefined,
      });
    }
    return this.transporter;
  }

  async send(msg: MailMessage): Promise<{ sent: boolean; error?: string }> {
    if (!this.enabled) return { sent: false, error: 'SMTP no configurado' };
    try {
      const info = await this.getTransporter().sendMail({ from: this.config.smtp.from, ...msg });
      // Con Ethereal (SMTP de prueba) el correo no llega a nadie: se ve en esta URL.
      const preview = nodemailer.getTestMessageUrl(info);
      if (preview) this.logger.log(`Vista previa del correo (Ethereal): ${preview}`);
      return { sent: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.logger.error(`No se pudo enviar el correo a ${msg.to}: ${error}`);
      return { sent: false, error: error.slice(0, 500) };
    }
  }

  /** Plantilla HTML simple y segura (todo el contenido se escapa). */
  static layout(title: string, rows: [string, string][], footer: string): string {
    const body = rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:6px 12px 6px 0;color:#64748b;vertical-align:top;white-space:nowrap">${escapeHtml(k)}</td><td style="padding:6px 0;color:#0f172a;white-space:pre-line">${escapeHtml(v)}</td></tr>`,
      )
      .join('');
    return `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:auto;color:#0f172a">
<h2 style="color:#0d9488;margin:0 0 12px">${escapeHtml(title)}</h2>
<table style="border-collapse:collapse;font-size:14px">${body}</table>
<p style="margin-top:24px;font-size:12px;color:#94a3b8">${escapeHtml(footer)}</p></div>`;
  }
}
