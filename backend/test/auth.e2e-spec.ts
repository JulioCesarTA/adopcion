/**
 * E2E de autenticación y usuarios. Requiere la BD levantada y con seed
 * (`docker compose up -d` + `npm run db:setup`).
 */
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/setup-app';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth y usuarios (e2e)', () => {
  let app: NestExpressApplication;
  let server: App;
  let prisma: PrismaService;
  const tempEmail = `e2e-${Date.now()}@zoonosis.test`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    setupApp(app);
    await app.init();
    server = app.getHttpServer();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  const login = (email: string, password = 'Zoo12345') =>
    request(server).post('/api/v1/auth/login').send({ email, password });

  it('login correcto devuelve access token y cookie httpOnly', async () => {
    const res = await login('admin@zoonosis.test').expect(200);
    const body = res.body as { accessToken: string; user: { role: string } };
    expect(body.accessToken).toBeTruthy();
    expect(body.user.role).toBe('ADMIN');
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toContain('refresh_token=');
    expect(cookie).toContain('HttpOnly');
  });

  it('credenciales inválidas → 401 con mensaje genérico', async () => {
    const res = await login('admin@zoonosis.test', 'incorrecta1').expect(401);
    expect((res.body as { message: string }).message).toBe('Credenciales inválidas');
    // no deja intentos acumulados para otros tests
    await prisma.user.update({
      where: { email: 'admin@zoonosis.test' },
      data: { failedAttempts: 0 },
    });
  });

  it('sin token → 401; rol sin permiso → 403', async () => {
    await request(server).get('/api/v1/users').expect(401);
    const vet = await login('vet@zoonosis.test').expect(200);
    await request(server)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${(vet.body as { accessToken: string }).accessToken}`)
      .expect(403);
  });

  it('ADMIN crea usuario, lo desactiva y el token del usuario deja de funcionar (RN-10)', async () => {
    const admin = await login('admin@zoonosis.test').expect(200);
    const auth = `Bearer ${(admin.body as { accessToken: string }).accessToken}`;

    const created = await request(server)
      .post('/api/v1/users')
      .set('Authorization', auth)
      .send({
        fullName: 'Usuario E2E',
        email: tempEmail,
        role: 'VETERINARIO',
        password: 'Temporal1',
      })
      .expect(201);
    const id = (created.body as { id: string }).id;

    await request(server)
      .post('/api/v1/users')
      .set('Authorization', auth)
      .send({
        fullName: 'Duplicado',
        email: tempEmail,
        role: 'VETERINARIO',
        password: 'Temporal1',
      })
      .expect(409);

    const userLogin = await login(tempEmail, 'Temporal1').expect(200);
    const userAuth = `Bearer ${(userLogin.body as { accessToken: string }).accessToken}`;
    await request(server).get('/api/v1/auth/me').set('Authorization', userAuth).expect(200);

    await request(server)
      .patch(`/api/v1/users/${id}/active`)
      .set('Authorization', auth)
      .send({ isActive: false })
      .expect(200);

    await request(server).get('/api/v1/auth/me').set('Authorization', userAuth).expect(401);
    const res = await login(tempEmail, 'Temporal1').expect(403);
    expect((res.body as { message: string }).message).toBe(
      'Cuenta desactivada, contacta al administrador',
    );
  });

  it('el admin no puede desactivarse a sí mismo', async () => {
    const admin = await login('admin@zoonosis.test').expect(200);
    const body = admin.body as { accessToken: string; user: { id: string } };
    await request(server)
      .patch(`/api/v1/users/${body.user.id}/active`)
      .set('Authorization', `Bearer ${body.accessToken}`)
      .send({ isActive: false })
      .expect(400);
  });
});
