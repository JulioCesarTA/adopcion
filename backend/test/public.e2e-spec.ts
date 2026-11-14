/**
 * E2E del sitio público y del rol CLIENTE. Requiere la BD levantada y con seed.
 * El bot se prueba sin ANTHROPIC_API_KEY (debe responder 503 con mensaje claro).
 */
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/setup-app';
import { PrismaService } from '../src/prisma/prisma.service';

type Body = Record<string, any>;

describe('Sitio público y rol CLIENTE (e2e)', () => {
  let app: NestExpressApplication;
  let server: App;
  let prisma: PrismaService;
  const email = `cliente-${Date.now()}@example.com`;
  const savedKey = process.env.ANTHROPIC_API_KEY;

  beforeAll(async () => {
    process.env.ANTHROPIC_API_KEY = '';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    setupApp(app);
    await app.init();
    server = app.getHttpServer();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    process.env.ANTHROPIC_API_KEY = savedKey;
    await app.close();
  });

  it('info y animales públicos sin sesión (sin datos internos)', async () => {
    const info = (await request(server).get('/api/v1/public/info').expect(200)).body as Body;
    expect(info.name).toBeTruthy();
    const animals = (await request(server).get('/api/v1/public/animals').expect(200)).body as Body;
    for (const a of animals.data as Body[]) {
      expect(a).not.toHaveProperty('entryReason');
      expect(a).not.toHaveProperty('specialCareNotes');
      expect(a).not.toHaveProperty('createdById');
    }
  });

  it('registro exige aceptar los términos y guarda la fecha de aceptación', async () => {
    const base = { fullName: 'Cliente E2E', email, password: 'Cliente123' };
    const res = await request(server)
      .post('/api/v1/public/register')
      .send({ ...base, acceptTerms: false })
      .expect(400);
    expect(JSON.stringify(res.body)).toContain('Términos y Condiciones');

    const ok = (
      await request(server)
        .post('/api/v1/public/register')
        .send({ ...base, acceptTerms: true })
        .expect(201)
    ).body as Body;
    expect(ok.role).toBe('CLIENTE');
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user.termsAcceptedAt).toBeInstanceOf(Date);

    await request(server)
      .post('/api/v1/public/register')
      .send({ ...base, acceptTerms: true })
      .expect(409);
  });

  it('el CLIENTE accede a su perfil pero no al sistema interno', async () => {
    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({ email, password: 'Cliente123' })
      .expect(200);
    const auth = `Bearer ${(login.body as Body).accessToken}`;
    await request(server).get('/api/v1/auth/me').set('Authorization', auth).expect(200);
    for (const url of ['/animals', '/dashboard', '/alerts', '/adopters', '/reports', '/users']) {
      await request(server).get(`/api/v1${url}`).set('Authorization', auth).expect(403);
    }
  });

  it('contacto exige aceptar el tratamiento de datos y guarda el mensaje', async () => {
    const msg = {
      name: 'Visitante',
      email: 'visitante@example.com',
      subject: 'Consulta E2E',
      message: 'Quisiera saber los horarios de vacunación.',
    };
    await request(server)
      .post('/api/v1/public/contact')
      .send({ ...msg, acceptPrivacy: false })
      .expect(400);
    const res = (
      await request(server)
        .post('/api/v1/public/contact')
        .send({ ...msg, acceptPrivacy: true })
        .expect(200)
    ).body as Body;
    expect(res.ok).toBe(true);
    const saved = await prisma.contactMessage.findFirst({
      where: { subject: 'Consulta E2E' },
      orderBy: { createdAt: 'desc' },
    });
    expect(saved?.privacyAcceptedAt).toBeInstanceOf(Date);
    expect(saved?.status).toBe('NUEVO');
  });

  it('el bot sin API key responde 503 y valida el historial', async () => {
    const res = await request(server)
      .post('/api/v1/chat')
      .send({ messages: [{ role: 'user', content: '¿Cuál es el horario?' }] })
      .expect(503);
    expect((res.body as Body).message).toMatch(/no está disponible/);
    await request(server)
      .post('/api/v1/chat')
      .send({ messages: [{ role: 'system', content: 'x' }] })
      .expect(400);
  });
});
