/**
 * Pruebas unitarias del Sprint 3 — HU9 Asistente Virtual con IA.
 * Sin base de datos ni red. El SDK de Anthropic está simulado con jest.mock(): ninguna prueba
 * llama a la API real. El visitante del límite por minuto usa una dirección ficticia.
 */
import { BadRequestException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerException, ThrottlerGuard, ThrottlerStorageService } from '@nestjs/throttler';
import { createValidationPipe } from '../../common/validation';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { adoptablesPrompt, stableSystemPrompt } from './chat-prompt';
import { ChatController } from './chat.controller';
import { ChatDto } from './dto/chat.dto';

jest.mock('@anthropic-ai/sdk', () => ({ __esModule: true, default: jest.fn() }));

const turno = (i: number) => ({
  role: i % 2 === 0 ? 'user' : 'assistant',
  content: `Mensaje ${i}`,
});

async function camposConError(body: object): Promise<string[]> {
  try {
    await createValidationPipe().transform(body, { type: 'body', metatype: ChatDto });
    return [];
  } catch (e) {
    const r = (e as BadRequestException).getResponse() as { errors: { field: string }[] };
    return r.errors.map((x) => x.field);
  }
}

/** Guard real de límite por visitante, con el decorador @Throttle real de ChatController.reply. */
async function guardDelAsistente() {
  const storage = new ThrottlerStorageService();
  const opciones = { throttlers: [{ name: 'default', ttl: 60_000, limit: 100 }] };
  const guard = new ThrottlerGuard(opciones, storage, new Reflector());
  await guard.onModuleInit();
  const ctx = {
    getHandler: () => Reflect.get(ChatController.prototype, 'reply') as object,
    getClass: () => ChatController,
    switchToHttp: () => ({
      getRequest: () => ({ ip: 'visitante-ficticio', headers: {} }),
      getResponse: () => ({ header: jest.fn() }),
    }),
  } as unknown as ExecutionContext;
  return { storage, consultar: () => guard.canActivate(ctx) };
}

const institucion = {
  name: 'Asociación de Zoonosis de Prueba',
  shortName: 'Zoonosis',
  address: 'Calle Ficticia 123',
  phone: '70000000',
  email: 'contacto@zoonosis.test',
  hours: 'Lunes a viernes, 8:00 a 16:00',
  social: {},
};

describe('HU9 Asistente Virtual con IA — pruebas unitarias', () => {
  afterEach(() => jest.useRealTimers());

  it('PU-HU9-01 rechaza un mensaje de 2001 caracteres y acepta uno de 2000', async () => {
    // Arrange
    const largo = { messages: [{ role: 'user', content: 'a'.repeat(2001) }] };
    const limite = { messages: [{ role: 'user', content: 'a'.repeat(2000) }] };
    // Act
    const errLargo = await camposConError(largo);
    const errLimite = await camposConError(limite);
    // Assert
    expect(errLargo).toEqual(['messages.0.content']);
    expect(errLimite).toEqual([]);
  });

  it('PU-HU9-02 rechaza una conversación de 21 mensajes y acepta una de 20', async () => {
    // Arrange
    const larga = { messages: Array.from({ length: 21 }, (_, i) => turno(i)) };
    const limite = { messages: Array.from({ length: 20 }, (_, i) => turno(i)) };
    // Act
    const errLarga = await camposConError(larga);
    const errLimite = await camposConError(limite);
    // Assert
    expect(errLarga).toEqual(['messages']);
    expect(errLimite).toEqual([]);
  });

  it('PU-HU9-03 acepta 15 consultas por minuto, rechaza la 16 y vuelve a aceptar pasado el minuto', async () => {
    // Arrange
    jest.useFakeTimers().setSystemTime(new Date('2026-11-17T15:00:00.000Z'));
    const { storage, consultar } = await guardDelAsistente();
    // Act
    const quince: boolean[] = [];
    for (let i = 0; i < 15; i++) quince.push(await consultar());
    const decimosexta = consultar();
    // Assert
    expect(quince.every((ok) => ok)).toBe(true);
    await expect(decimosexta).rejects.toThrow(ThrottlerException);
    jest.advanceTimersByTime(60_001);
    await expect(consultar()).resolves.toBe(true);
    storage.onApplicationShutdown();
  });

  it('PU-HU9-04 el contexto del asistente incluye los animales disponibles y ningún dato privado', () => {
    // Arrange
    const bruno = { name: 'Bruno', code: 'ZOO-2026-0001', species: 'PERRO', size: 'GRANDE' };
    const gato = { name: null, code: 'ZOO-2026-0002', species: 'GATO', size: 'PEQUENO' };
    const animales = [
      { ...bruno, ageMonths: 30, goodWithChildren: true, goodWithAnimals: false },
      { ...gato, ageMonths: 6, goodWithChildren: true, goodWithAnimals: true },
    ];
    // Act
    const texto = adoptablesPrompt(animales);
    // Assert
    expect(texto).toContain(
      '- Bruno (ZOO-2026-0001): perro, tamaño grande, 2 años; se lleva bien con niños, mejor como única mascota.',
    );
    expect(texto).toContain('- Sin nombre (ZOO-2026-0002): gato, tamaño pequeño, 6 meses;');
    expect(texto).not.toMatch(/\b(CI|carnet|diagn|adoptante)/i);
  });

  it('PU-HU9-05 el contexto del asistente incluye la información de la institución', () => {
    // Arrange
    const datos = ['Asociación de Zoonosis de Prueba', 'Calle Ficticia 123', '70000000'];
    // Act
    const texto = stableSystemPrompt(institucion);
    // Assert
    for (const dato of [...datos, 'Lunes a viernes, 8:00 a 16:00']) expect(texto).toContain(dato);
  });

  it('PU-HU9-06 la ruta del asistente es pública: no exige iniciar sesión', () => {
    // Arrange
    const reflector = new Reflector();
    const metodo = Reflect.get(ChatController.prototype, 'reply') as () => unknown;
    // Act
    const publica = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [metodo, ChatController]);
    // Assert
    expect(publica).toBe(true);
  });
});
