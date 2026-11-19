/**
 * Prueba de caja blanca — camino básico de la HU5 Creación de Solicitud de Adopción, siguiendo el
 * diagrama de secuencia del Sprint 2 «Crear una solicitud de adopción»:
 *   POST /adoptions → AdoptionsController → AdoptionsService.create (alt RN-04 / RN-05 / válido)
 *   → respuesta → POST /recommendations → RecommendationService.pair → puntaje, nivel y desglose.
 * C(G) = 3: un caso por camino básico. Se ejecuta contra la base de prueba (`.env.test`).
 */
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/setup-app';
import { PrismaService } from '../src/prisma/prisma.service';

type Body = Record<string, any>;

describe('HU5 caja blanca — camino básico de Crear Solicitud de Adopción', () => {
  let app: NestExpressApplication;
  let server: App;
  let prisma: PrismaService;
  const tokens: Record<string, string> = {};
  let adopterId = '';
  const stamp = Date.now().toString().slice(-7);

  const api = (role: string) => ({
    get: (url: string) =>
      request(server).get(`/api/v1${url}`).set('Authorization', `Bearer ${tokens[role]}`),
    post: (url: string, body: object = {}) =>
      request(server)
        .post(`/api/v1${url}`)
        .set('Authorization', `Bearer ${tokens[role]}`)
        .send(body),
  });
  const estado = async (id: string) =>
    ((await api('admin').get(`/animals/${id}`).expect(200)).body as Body).status as string;

  /** Registra un animal; si `disponible`, el veterinario lo consulta y lo habilita para adopción. */
  const animal = async (name: string, disponible: boolean) => {
    const res = await api('admin')
      .post('/animals', {
        name,
        species: 'PERRO',
        sex: 'MACHO',
        size: 'MEDIANO',
        energyLevel: 3,
        goodWithChildren: true,
        goodWithAnimals: true,
        needsYard: false,
        specialCare: false,
        requiredDailyHours: 2,
        entryDate: new Date().toISOString(),
        entryReason: 'Prueba de caja blanca HU5',
      })
      .expect(201);
    const id = (res.body as Body).id as string;
    if (disponible) {
      await api('vet')
        .post(`/animals/${id}/consultations`, { consultationDate: new Date().toISOString() })
        .expect(201);
      await api('vet').post(`/animals/${id}/enable-adoption`).expect(200);
    }
    return id;
  };

  /** Mensajes finales del diagrama: el personal pide la recomendación del par y la ve. */
  const recomendacion = async (animalId: string, requestId?: string) => {
    const pair = (
      await api('admin')
        .post('/recommendations', { adopterId, animalId, ...(requestId ? { requestId } : {}) })
        .expect(201)
    ).body as Body;
    const breakdown = pair.breakdown as Body;
    expect(typeof pair.score).toBe('number');
    expect(typeof pair.level).toBe('string');
    expect(breakdown.disclaimer).toBe(
      'Resultado de apoyo. La decisión final es del personal responsable.',
    );
    return { pair, breakdown };
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    setupApp(app);
    await app.init();
    server = app.getHttpServer();
    prisma = app.get(PrismaService);

    for (const [role, email] of [
      ['admin', 'admin@zoonosis.test'],
      ['vet', 'vet@zoonosis.test'],
    ]) {
      const res = await request(server)
        .post('/api/v1/auth/login')
        .send({ email, password: 'Zoo12345' })
        .expect(200);
      tokens[role] = (res.body as Body).accessToken as string;
    }
    const adopter = await api('admin')
      .post('/adopters', {
        ci: `CB5${stamp}`,
        firstName: 'Caja',
        lastName: 'Blanca',
        phone: '70000000',
        housingType: 'CASA_CON_PATIO',
        hasYard: true,
        hasChildren: false,
        hasOtherAnimals: false,
        availableHoursPerDay: 4,
        experience: 'BASICA',
      })
      .expect(201);
    adopterId = (adopter.body as Body).id as string;
  });

  afterAll(async () => {
    await app.close();
  });

  it('C1 (1-2-3-4-5-6-10-11-12-13-14) el animal no está disponible: 409 RN-04', async () => {
    const animalId = await animal(`CB5 Ingresado ${stamp}`, false);
    const res = await api('admin').post('/adoptions', { adopterId, animalId }).expect(409);
    expect((res.body as Body).message).toContain('no está disponible para adopción');
    expect(await estado(animalId)).toBe('INGRESADO');
    // El filtro duro del motor marca el par como incompatible porque el animal no está disponible.
    const { pair, breakdown } = await recomendacion(animalId);
    expect(pair.level).toBe('INCOMPATIBLE');
    expect((breakdown.hardFilters as Body).passed).toBe(false);
  });

  it('C2 (1-2-3-4-5-7-8-10-11-12-13-14) el animal ya tiene una solicitud activa: 409 RN-05', async () => {
    const animalId = await animal(`CB5 Con solicitud ${stamp}`, true);
    await api('admin').post('/adoptions', { adopterId, animalId }).expect(201);
    // Carrera de dos solicitudes: el animal todavía figura disponible, pero ya tiene una activa.
    await prisma.animal.update({
      where: { id: animalId },
      data: { status: 'DISPONIBLE_ADOPCION' },
    });
    const res = await api('admin').post('/adoptions', { adopterId, animalId }).expect(409);
    expect((res.body as Body).message).toBe('El animal ya tiene una solicitud de adopción activa');
    const activas = await prisma.adoptionRequest.count({
      where: { animalId, status: { in: ['PENDIENTE', 'EN_EVALUACION'] } },
    });
    expect(activas).toBe(1);
    const { breakdown } = await recomendacion(animalId);
    expect(breakdown.criteria).toHaveLength(5);
  });

  it('C3 (1-2-3-4-5-7-9-10-11-12-13-14) solicitud válida: 201, Pendiente y animal en proceso', async () => {
    const animalId = await animal(`CB5 Disponible ${stamp}`, true);
    const res = await api('admin').post('/adoptions', { adopterId, animalId }).expect(201);
    expect((res.body as Body).status).toBe('PENDIENTE');
    expect(await estado(animalId)).toBe('EN_PROCESO_ADOPCION');
    // Desde la ficha de la solicitud: el animal en proceso se evalúa como disponible.
    const { breakdown } = await recomendacion(animalId, (res.body as Body).id as string);
    expect(breakdown.criteria).toHaveLength(5);
  });
});
