import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../../prisma/prisma.service';
import { AppConfigService } from '../../config/app-config.service';
import { adoptablesPrompt, stableSystemPrompt } from './chat-prompt';
import type { ChatTurnDto } from './dto/chat.dto';

/** Modelos que admiten el respaldo automático de servidor (`fallbacks: "default"`). */
const FALLBACK_MODELS = new Set([
  'claude-opus-5-5',
  'claude-opus-5',
  'claude-fable-5-2',
  'claude-fable-5-1',
  'claude-sonnet-5-5',
]);

const UNAVAILABLE =
  'El asistente no está disponible en este momento. Escríbenos por el formulario de contacto.';
const REFUSAL_REPLY =
  'Prefiero no responder a eso. Puedo ayudarte con preguntas sobre adopción, vacunas o la institución; para otros temas, escríbenos por el formulario de contacto.';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private client: Anthropic | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  private getClient(): Anthropic {
    // El SDK toma ANTHROPIC_API_KEY del entorno
    this.client ??= new Anthropic();
    return this.client;
  }

  /** Valida la forma del historial (viene del navegador: no es de confianza). */
  private validate(messages: ChatTurnDto[]) {
    if (messages[0].role !== 'user' || messages[messages.length - 1].role !== 'user') {
      throw new BadRequestException(
        'La conversación debe empezar y terminar con un mensaje del usuario',
      );
    }
    for (let i = 1; i < messages.length; i++) {
      if (messages[i].role === messages[i - 1].role) {
        throw new BadRequestException('Los turnos deben alternar entre usuario y asistente');
      }
    }
  }

  async reply(messages: ChatTurnDto[]): Promise<{ reply: string }> {
    const { enabled, model } = this.config.chat;
    if (!enabled) throw new ServiceUnavailableException(UNAVAILABLE);
    this.validate(messages);

    const animals = await this.prisma.animal.findMany({
      where: { deletedAt: null, status: 'DISPONIBLE_ADOPCION' },
      select: {
        name: true,
        code: true,
        species: true,
        size: true,
        ageMonths: true,
        goodWithChildren: true,
        goodWithAnimals: true,
      },
      orderBy: { code: 'asc' },
      take: 40,
    });

    try {
      const response = await this.getClient().beta.messages.create({
        model,
        max_tokens: 16000,
        // Chat de preguntas frecuentes: esfuerzo bajo = respuestas rápidas y económicas
        output_config: { effort: 'low' },
        ...(FALLBACK_MODELS.has(model)
          ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }
          : {}),
        system: [
          // Bloque estable primero (cacheado); lo variable después del breakpoint
          {
            type: 'text',
            text: stableSystemPrompt(this.config.institution),
            cache_control: { type: 'ephemeral' },
          },
          { type: 'text', text: adoptablesPrompt(animals) },
        ],
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      });

      if (response.stop_reason === 'refusal') return { reply: REFUSAL_REPLY };

      const text = response.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      return { reply: text || REFUSAL_REPLY };
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError) {
        throw new ServiceUnavailableException(
          'El asistente está muy ocupado. Intenta en unos segundos.',
        );
      }
      if (err instanceof Anthropic.AuthenticationError) {
        this.logger.error('ANTHROPIC_API_KEY inválida');
        throw new ServiceUnavailableException(UNAVAILABLE);
      }
      if (err instanceof Anthropic.APIError) {
        this.logger.error(`Error de la API de Claude (${err.status}): ${err.message}`);
        throw new ServiceUnavailableException(UNAVAILABLE);
      }
      throw err;
    }
  }
}
