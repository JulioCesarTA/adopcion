/**
 * Caja blanca del Sprint 3 — HU9 Asistente Virtual con IA.
 * Una prueba por camino independiente (técnica del camino básico).
 * El SDK de Anthropic está simulado con jest.mock(): ninguna prueba llama a la API real.
 * Prisma y la configuración están simulados con jest.fn().
 */
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AppConfigService } from '../../config/app-config.service';
import { ChatService } from './chat.service';
import type { ChatTurnDto } from './dto/chat.dto';

jest.mock('@anthropic-ai/sdk', () => {
  class APIError extends Error {
    constructor(
      readonly status: number,
      message: string,
    ) {
      super(message);
    }
  }
  class RateLimitError extends APIError {}
  class AuthenticationError extends APIError {}
  const mockCreate = jest.fn();
  class Anthropic {
    static APIError = APIError;
    static RateLimitError = RateLimitError;
    static AuthenticationError = AuthenticationError;
    beta = { messages: { create: mockCreate } };
  }
  return { __esModule: true, default: Anthropic, mockCreate };
});

type ErrCtor = new (status: number, message: string) => Error;
const sdk = jest.requireMock<{
  default: { APIError: ErrCtor; RateLimitError: ErrCtor; AuthenticationError: ErrCtor };
  mockCreate: jest.Mock;
}>('@anthropic-ai/sdk');

const institucion = {
  name: 'Asociación de Zoonosis de Prueba',
  shortName: 'Zoonosis',
  address: 'Calle Ficticia 123',
  phone: '70000000',
  email: 'contacto@zoonosis.test',
  hours: 'Lunes a viernes, 8:00 a 16:00',
  social: {},
};

function setup(enabled = true, model = 'modelo-de-prueba') {
  sdk.mockCreate.mockReset();
  const prisma = { animal: { findMany: jest.fn().mockResolvedValue([]) } };
  const config = { chat: { enabled, model }, institution: institucion };
  const service = new ChatService(
    prisma as unknown as PrismaService,
    config as unknown as AppConfigService,
  );
  return { service, prisma };
}

const u = (content: string): ChatTurnDto => ({ role: 'user', content });
const a = (content: string): ChatTurnDto => ({ role: 'assistant', content });
const texto = (t: string) => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: t }] });

describe('CB-HU9-A ChatService.validate (forma del historial)', () => {
  const { service } = setup();
  const validar = (m: ChatTurnDto[]) =>
    (service as unknown as { validate(m: ChatTurnDto[]): void }).validate(m);

  it('CB-HU9-A-C1: la conversación empieza con el asistente → BadRequestException', () => {
    expect(() => validar([a('Hola'), u('¿Horario?')])).toThrow(BadRequestException);
  });

  it('CB-HU9-A-C2: la conversación termina con el asistente → BadRequestException', () => {
    expect(() => validar([u('Hola'), a('¿En qué te ayudo?')])).toThrow(
      'La conversación debe empezar y terminar con un mensaje del usuario',
    );
  });

  it('CB-HU9-A-C3: un solo mensaje del usuario → válido (el ciclo no se repite)', () => {
    expect(() => validar([u('¿Qué animales hay?')])).not.toThrow();
  });

  it('CB-HU9-A-C4: usuario, asistente y usuario alternados → válido', () => {
    expect(() => validar([u('Hola'), a('¿En qué te ayudo?'), u('¿Horario?')])).not.toThrow();
  });

  it('CB-HU9-A-C5: dos mensajes seguidos del usuario → BadRequestException', () => {
    expect(() => validar([u('Hola'), u('¿Horario?')])).toThrow(
      'Los turnos deben alternar entre usuario y asistente',
    );
  });
});

describe('CB-HU9-B ChatService.reply (responder una consulta)', () => {
  const pregunta = [u('¿Qué animales hay disponibles?')];

  it('CB-HU9-B-C1: el servicio de IA no está configurado → mensaje amable (503)', async () => {
    const { service, prisma } = setup(false);
    await expect(service.reply(pregunta)).rejects.toThrow(
      'El asistente no está disponible en este momento. Escríbenos por el formulario de contacto.',
    );
    expect(prisma.animal.findMany).not.toHaveBeenCalled();
  });

  it('CB-HU9-B-C2: modelo sin respaldo y respuesta con texto → devuelve la respuesta sin guardar nada', async () => {
    const { service, prisma } = setup();
    sdk.mockCreate.mockResolvedValue(texto('Hoy están Bruno, Mishi y Kira.'));
    const r = await service.reply(pregunta);
    expect(r).toEqual({ reply: 'Hoy están Bruno, Mishi y Kira.' });
    expect((sdk.mockCreate.mock.calls[0] as unknown[])[0]).not.toHaveProperty('fallbacks');
    expect(Object.keys(prisma)).toEqual(['animal']);
    expect(Object.keys(prisma.animal)).toEqual(['findMany']);
  });

  it('CB-HU9-B-C3: modelo con respaldo de servidor → pide el respaldo y devuelve la respuesta', async () => {
    const { service } = setup(true, 'claude-opus-5-5');
    sdk.mockCreate.mockResolvedValue(texto('Puedes adoptar en la sección «Adopta».'));
    const r = await service.reply(pregunta);
    expect((sdk.mockCreate.mock.calls[0] as unknown[])[0]).toMatchObject({ fallbacks: 'default' });
    expect(r.reply).toBe('Puedes adoptar en la sección «Adopta».');
  });

  it('CB-HU9-B-C4: el modelo se niega a responder → respuesta amable de rechazo', async () => {
    const { service } = setup();
    sdk.mockCreate.mockResolvedValue({ stop_reason: 'refusal', content: [] });
    const r = await service.reply(pregunta);
    expect(r.reply).toMatch(/^Prefiero no responder a eso/);
  });

  it('CB-HU9-B-C5: la respuesta llega sin texto → respuesta amable de rechazo', async () => {
    const { service } = setup();
    sdk.mockCreate.mockResolvedValue({ stop_reason: 'end_turn', content: [] });
    const r = await service.reply(pregunta);
    expect(r.reply).toMatch(/^Prefiero no responder a eso/);
  });

  it('CB-HU9-B-C6: la API responde 429 (límite) → ServiceUnavailableException «muy ocupado»', async () => {
    const { service } = setup();
    sdk.mockCreate.mockRejectedValue(new sdk.default.RateLimitError(429, 'rate limit'));
    await expect(service.reply(pregunta)).rejects.toThrow(
      'El asistente está muy ocupado. Intenta en unos segundos.',
    );
  });

  it('CB-HU9-B-C7: la clave de la API no es válida → mensaje amable (503)', async () => {
    const { service } = setup();
    sdk.mockCreate.mockRejectedValue(new sdk.default.AuthenticationError(401, 'invalid key'));
    await expect(service.reply(pregunta)).rejects.toThrow(ServiceUnavailableException);
  });

  it('CB-HU9-B-C8: la API falla con otro error (500) → mensaje amable (503)', async () => {
    const { service } = setup();
    sdk.mockCreate.mockRejectedValue(new sdk.default.APIError(500, 'internal'));
    await expect(service.reply(pregunta)).rejects.toThrow(
      'El asistente no está disponible en este momento. Escríbenos por el formulario de contacto.',
    );
  });

  it('CB-HU9-B-C9: falla con un error que no es de la API → se propaga el mismo error', async () => {
    const { service } = setup();
    const original = new TypeError('fallo inesperado');
    sdk.mockCreate.mockRejectedValue(original);
    await expect(service.reply(pregunta)).rejects.toBe(original);
  });
});
