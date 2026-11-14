import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AppConfigService } from '../../config/app-config.service';
import { MailService } from '../mail/mail.service';
import { BCRYPT_COST } from '../../common/password-policy';
import { paginated } from '../../common/dto/pagination.dto';
import { toPublicUser } from '../users/users.service';
import { ContactDto, PublicAnimalsQueryDto, RegisterClientDto } from './dto/public.dto';

/** Campos de un animal que se pueden mostrar al público (nada del HCD ni notas internas). */
export const PUBLIC_ANIMAL_SELECT = {
  id: true,
  code: true,
  name: true,
  species: true,
  breed: true,
  sex: true,
  ageMonths: true,
  color: true,
  size: true,
  energyLevel: true,
  temperament: true,
  goodWithChildren: true,
  goodWithAnimals: true,
  needsYard: true,
  specialCare: true,
  requiredDailyHours: true,
  photoUrl: true,
  entryDate: true,
} satisfies Prisma.AnimalSelect;

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly mail: MailService,
  ) {}

  info() {
    return { ...this.config.institution, chatEnabled: this.config.chat.enabled };
  }

  async animals(q: PublicAnimalsQueryDto) {
    const where: Prisma.AnimalWhereInput = {
      deletedAt: null,
      status: 'DISPONIBLE_ADOPCION',
      ...(q.species ? { species: q.species } : {}),
      ...(q.size ? { size: q.size } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.animal.findMany({
        where,
        select: PUBLIC_ANIMAL_SELECT,
        orderBy: { entryDate: 'asc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.animal.count({ where }),
    ]);
    return paginated(rows, total, q);
  }

  async animal(id: string) {
    const a = await this.prisma.animal.findFirst({
      where: { id, deletedAt: null, status: 'DISPONIBLE_ADOPCION' },
      select: PUBLIC_ANIMAL_SELECT,
    });
    if (!a) throw new NotFoundException('El animal no está disponible para adopción');
    return a;
  }

  /** Registro propio de clientes con aceptación de términos (se guarda la fecha). */
  async register(dto: RegisterClientDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (exists) throw new ConflictException('Ya existe una cuenta con ese correo. Inicia sesión.');
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName: dto.fullName,
          email: dto.email,
          phone: dto.phone,
          role: 'CLIENTE',
          passwordHash,
          termsAcceptedAt: new Date(),
        },
      });
      const pub = toPublicUser(user);
      return pub;
    });
  }

  /** «Contáctame»: guarda el mensaje y lo envía por correo si hay SMTP. */
  async contact(dto: ContactDto, ip?: string) {
    // Campo trampa: si viene lleno es un bot; se responde OK sin guardar nada.
    if (dto.website) return { ok: true, emailSent: false };

    const msg = await this.prisma.contactMessage.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        subject: dto.subject,
        message: dto.message,
        privacyAcceptedAt: new Date(),
        ip: ip ?? null,
      },
    });

    const inst = this.config.institution;
    const rows: [string, string][] = [
      ['Nombre', msg.name],
      ['Correo', msg.email],
      ['Teléfono', msg.phone ?? '—'],
      ['Asunto', msg.subject],
      ['Mensaje', msg.message],
    ];
    const toInstitution = await this.mail.send({
      to: this.config.smtp.contactTo,
      replyTo: msg.email,
      subject: `[Contacto web] ${msg.subject}`,
      text: rows.map(([k, v]) => `${k}: ${v}`).join('\n'),
      html: MailService.layout('Nuevo mensaje desde el sitio web', rows, inst.name),
    });
    if (toInstitution.sent) {
      // Acuse de recibo al visitante (si falla no afecta al resultado)
      await this.mail.send({
        to: msg.email,
        subject: `Recibimos tu mensaje — ${inst.shortName}`,
        text: `Hola ${msg.name}, recibimos tu mensaje «${msg.subject}». Te responderemos a la brevedad.\n\n${inst.name}\n${inst.phone} · ${inst.hours}`,
        html: MailService.layout(
          `Hola ${msg.name}, recibimos tu mensaje`,
          [
            ['Asunto', msg.subject],
            ['Atención', inst.hours],
            ['Teléfono', inst.phone],
          ],
          `${inst.name} — este es un mensaje automático.`,
        ),
      });
    }

    await this.prisma.contactMessage.update({
      where: { id: msg.id },
      data: { emailSent: toInstitution.sent, emailError: toInstitution.error ?? null },
    });
    return { ok: true, emailSent: toInstitution.sent };
  }
}
