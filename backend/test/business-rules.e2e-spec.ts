/**
 * Pruebas de integración de la API con la base de datos real: animales, historia clínica,
 * cuarentena, adopción desde el portal, recomendación, panel y reservas de consulta.
 * Los actores son los roles del Product Backlog: administrador, veterinario, cliente y adoptante.
 * Requiere la base de prueba con las migraciones y el seed (`npm run db:setup`).
 */
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/setup-app';

type Body = Record<string, any>;

describe('Reglas de negocio (e2e)', () => {
  let app: NestExpressApplication;
  let server: App;
  const tokens: Record<string, string> = {};
  const ids: Record<string, string> = {};
  const stamp = Date.now().toString().slice(-7);

  const api = (role: string) => ({
    get: (url: string) =>
      request(server).get(`/api/v1${url}`).set('Authorization', `Bearer ${tokens[role]}`),
    post: (url: string, body: object = {}) =>
      request(server)
        .post(`/api/v1${url}`)
        .set('Authorization', `Bearer ${tokens[role]}`)
        .send(body),
    patch: (url: string, body: object = {}) =>
      request(server)
        .patch(`/api/v1${url}`)
        .set('Authorization', `Bearer ${tokens[role]}`)
        .send(body),
  });
  const animalStatus = async (id: string) =>
    ((await api('admin').get(`/animals/${id}`).expect(200)).body as Body).status as string;

  const nuevoAnimal = (name: string, extra: object = {}) => ({
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
    entryReason: 'Prueba de integración',
    ...extra,
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    setupApp(app);
    await app.init();
    server = app.getHttpServer();

    // El cliente y el adoptante se registran por el portal, como en el sistema real.
    for (const [role, accountType] of [
      ['cliente', 'CLIENTE'],
      ['adoptante', 'ADOPTANTE'],
    ]) {
      const res = await request(server)
        .post('/api/v1/public/register')
        .send({
          fullName: `${role === 'cliente' ? 'Cliente' : 'Adoptante'} Integracion ${stamp}`,
          email: `${role}-${stamp}@example.com`,
          password: 'Prueba123',
          acceptTerms: true,
          accountType,
        })
        .expect(201);
      ids[role] = (res.body as Body).id as string;
    }
    for (const [role, email, password] of [
      ['admin', 'admin@zoonosis.test', 'Zoo12345'],
      ['vet', 'vet@zoonosis.test', 'Zoo12345'],
      ['cliente', `cliente-${stamp}@example.com`, 'Prueba123'],
      ['adoptante', `adoptante-${stamp}@example.com`, 'Prueba123'],
    ]) {
      const res = await request(server)
        .post('/api/v1/auth/login')
        .send({ email, password })
        .expect(200);
      tokens[role] = (res.body as Body).accessToken as string;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('INT-01: el administrador registra un animal con código ZOO-AAAA-NNNN en estado Ingresado', async () => {
    const res = await api('admin')
      .post('/animals', nuevoAnimal(`Integracion ${stamp}`))
      .expect(201);
    const body = res.body as Body;
    expect(body.code).toMatch(/^ZOO-\d{4}-\d{4}$/);
    expect(body.status).toBe('INGRESADO');
    expect(body.requiredDailyHours).toBe(2);
    ids.animal = body.id as string;

    await api('vet').post('/animals', nuevoAnimal('Sin permiso')).expect(403);
    const bad = await api('admin').post('/animals', { species: 'PERRO' }).expect(400);
    expect((bad.body as Body).errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'size' })]),
    );
  });

  it('INT-02: el administrador edita los datos y el estado del animal, y el listado filtra por tamaño', async () => {
    const res = await api('admin')
      .patch(`/animals/${ids.animal}`, { color: 'Negro', status: 'EN_OBSERVACION' })
      .expect(200);
    expect((res.body as Body).color).toBe('Negro');
    expect(await animalStatus(ids.animal)).toBe('EN_OBSERVACION');
    await api('admin').patch(`/animals/${ids.animal}`, { status: 'INGRESADO' }).expect(200);
    expect(await animalStatus(ids.animal)).toBe('INGRESADO');
    await api('vet').patch(`/animals/${ids.animal}`, { color: 'Blanco' }).expect(403);

    const list = (await api('admin').get('/animals?size=GRANDE&pageSize=100').expect(200))
      .body as Body;
    expect((list.data as Body[]).every((a) => a.size === 'GRANDE')).toBe(true);
    expect((list.data as Body[]).some((a) => a.id === ids.animal)).toBe(false);
  });

  it('INT-03: el veterinario y el administrador registran consultas; la consulta puede cambiar el estado del animal', async () => {
    const vet = await api('vet')
      .post(`/animals/${ids.animal}/consultations`, { consultationDate: new Date().toISOString() })
      .expect(201);
    expect((vet.body as Body).reason).toBe('');

    await api('admin')
      .post(`/animals/${ids.animal}/consultations`, {
        consultationDate: new Date().toISOString(),
        reason: 'Control',
        weightKg: 12.5,
        temperatureC: 38.5,
        animalStatus: 'EN_TRATAMIENTO',
      })
      .expect(201);
    expect(await animalStatus(ids.animal)).toBe('EN_TRATAMIENTO');

    await api('cliente')
      .post(`/animals/${ids.animal}/consultations`, { consultationDate: new Date().toISOString() })
      .expect(403);
  });

  it('INT-04: un solo periodo de cuarentena activo; el cierre sin controles pide confirmación', async () => {
    const period = await api('vet')
      .post(`/animals/${ids.animal}/periods`, {
        type: 'CUARENTENA',
        reason: 'Prueba',
        startDate: new Date(Date.now() - 3_600_000).toISOString(),
      })
      .expect(201);
    expect(await animalStatus(ids.animal)).toBe('EN_CUARENTENA');

    await api('vet')
      .post(`/animals/${ids.animal}/periods`, {
        type: 'OBSERVACION',
        reason: 'Segundo periodo',
        startDate: new Date().toISOString(),
      })
      .expect(409);

    const pid = (period.body as Body).id as string;
    await api('admin')
      .post(`/periods/${pid}/close`, { endDate: new Date().toISOString() })
      .expect(403);
    await api('vet')
      .post(`/periods/${pid}/close`, { endDate: new Date().toISOString() })
      .expect(409);
    await api('vet')
      .post(`/periods/${pid}/close`, {
        endDate: new Date().toISOString(),
        confirmWithoutControls: true,
      })
      .expect(200);
    expect(await animalStatus(ids.animal)).toBe('INGRESADO');
  });

  it('INT-05: un tratamiento activo pasa el animal a En tratamiento; al finalizarlo vuelve a Ingresado', async () => {
    const consultations = (await api('vet').get(`/animals/${ids.animal}/consultations`).expect(200))
      .body as Body[];
    // La consulta del veterinario (INT-03): solo el autor corrige sus registros (RN-02).
    const cid = consultations.find((c) => c.reason === '')?.id as string;

    await api('vet')
      .post(`/consultations/${cid}/treatments`, {
        description: 'Antibiótico',
        instructions: 'Con comida',
        startDate: '2026-02-10',
        endDate: '2026-02-01',
      })
      .expect(400);
    await api('vet')
      .post(`/consultations/${cid}/treatments`, {
        description: 'Antibiótico',
        instructions: 'Con comida',
        startDate: '2026-02-10',
        medications: [
          {
            name: 'Amoxicilina',
            administrationRoute: 'Oral',
            frequency: 'c/12h',
            duration: '7 días',
          },
        ],
      })
      .expect(400);

    const t = await api('vet')
      .post(`/consultations/${cid}/treatments`, {
        description: 'Antibiótico',
        instructions: 'Con comida',
        startDate: '2026-02-10',
        medications: [
          {
            name: 'Amoxicilina',
            dose: '250 mg',
            administrationRoute: 'Oral',
            frequency: 'c/12h',
            duration: '7 días',
          },
        ],
      })
      .expect(201);
    expect(await animalStatus(ids.animal)).toBe('EN_TRATAMIENTO');

    await api('vet')
      .patch(`/treatments/${(t.body as Body).id}`, { status: 'FINALIZADO' })
      .expect(200);
    expect(await animalStatus(ids.animal)).toBe('INGRESADO');
  });

  it('INT-06: el historial clínico está en orden cronológico inverso', async () => {
    const res = await api('vet').get(`/animals/${ids.animal}/timeline`).expect(200);
    const items = (res.body as Body).data as { date: string; type: string }[];
    expect(items.length).toBeGreaterThanOrEqual(3);
    const dates = items.map((i) => new Date(i.date).getTime());
    expect([...dates].sort((a, b) => b - a)).toEqual(dates);
  });

  it('INT-07: el veterinario y el administrador habilitan y retiran al animal de adopción', async () => {
    await api('cliente').post(`/animals/${ids.animal}/enable-adoption`).expect(403);
    await api('vet').post(`/animals/${ids.animal}/enable-adoption`).expect(200);
    expect(await animalStatus(ids.animal)).toBe('DISPONIBLE_ADOPCION');
    await api('admin').post(`/animals/${ids.animal}/disable-adoption`).expect(200);
    expect(await animalStatus(ids.animal)).toBe('INGRESADO');
    await api('admin').post(`/animals/${ids.animal}/enable-adoption`).expect(200);
    expect(await animalStatus(ids.animal)).toBe('DISPONIBLE_ADOPCION');
  });

  it('INT-08: adoptante con CI única y horas disponibles de 0 a 24', async () => {
    const data = {
      ci: `INT${stamp}`,
      firstName: 'Prueba',
      lastName: 'Integracion',
      phone: '70000000',
      housingType: 'CASA_CON_PATIO',
      hasYard: true,
      hasChildren: false,
      hasOtherAnimals: false,
      availableHoursPerDay: 4,
      experience: 'BASICA',
    };
    await api('admin')
      .post('/adopters', { ...data, availableHoursPerDay: 30 })
      .expect(400);
    const res = await api('admin').post('/adopters', data).expect(201);
    ids.adopter = (res.body as Body).id as string;
    const dup = await api('admin').post('/adopters', data).expect(409);
    expect(((dup.body as Body).errors as Body).existingAdopterId).toBe(ids.adopter);
  });

  it('INT-09: el ranking, el par y el ranking inverso incluyen puntaje y el aviso de apoyo', async () => {
    const ranking = (await api('admin').get(`/recommendations/adopter/${ids.adopter}`).expect(200))
      .body as Body;
    expect(ranking.disclaimer).toBe(
      'Resultado de apoyo. La decisión final es del personal responsable.',
    );
    const scores = (ranking.data as Body[]).map((r) => r.score as number);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    expect((ranking.data as Body[]).some((r) => (r.animal as Body).id === ids.animal)).toBe(true);

    const pair = (
      await api('admin')
        .post('/recommendations', { adopterId: ids.adopter, animalId: ids.animal })
        .expect(201)
    ).body as Body;
    expect(pair.score).toBeGreaterThan(0);
    expect((pair.breakdown as Body).criteria).toHaveLength(5);

    const inverse = (await api('admin').get(`/recommendations/animal/${ids.animal}`).expect(200))
      .body as Body;
    expect((inverse.animal as Body).id).toBe(ids.animal);
    for (const item of inverse.data as Body[]) {
      expect(item.adopter).not.toHaveProperty('ci');
      expect(typeof item.score).toBe('number');
    }
  });

  it('INT-10: el adoptante solicita la adopción desde el portal y el animal queda en proceso', async () => {
    await api('cliente').post('/adoptions/mine', { animalId: ids.animal }).expect(403);

    const res = await api('adoptante')
      .post('/adoptions/mine', { animalId: ids.animal })
      .expect(201);
    ids.request = (res.body as Body).id as string;
    expect((res.body as Body).status).toBe('PENDIENTE');
    expect(await animalStatus(ids.animal)).toBe('EN_PROCESO_ADOPCION');

    await api('adoptante').post('/adoptions/mine', { animalId: ids.animal }).expect(409);

    const list = (await api('admin').get('/adoptions?pageSize=100').expect(200)).body as Body;
    expect((list.data as Body[]).some((r) => r.id === ids.request)).toBe(true);
  });

  it('INT-11: el administrador evalúa, rechaza y aprueba solicitudes, y genera el acta', async () => {
    const req = ids.request;
    await api('admin')
      .post(`/adoptions/${req}/decision`, {
        result: 'APROBADA',
        notes: 'Apto',
        decisionDate: new Date().toISOString(),
        deliveryDate: new Date().toISOString(),
      })
      .expect(409);
    await api('admin').patch(`/adoptions/${req}/status`, { status: 'CANCELADA' }).expect(400);
    await api('admin').patch(`/adoptions/${req}/status`, { status: 'EN_EVALUACION' }).expect(200);
    await api('admin').patch(`/adoptions/${req}/status`, { status: 'EN_EVALUACION' }).expect(409);
    await api('admin')
      .post(`/adoptions/${req}/decision`, {
        result: 'RECHAZADA',
        decisionDate: new Date().toISOString(),
      })
      .expect(400);
    await api('admin')
      .post(`/adoptions/${req}/decision`, {
        result: 'RECHAZADA',
        notes: 'No apto',
        decisionDate: new Date().toISOString(),
      })
      .expect(200);
    expect(await animalStatus(ids.animal)).toBe('DISPONIBLE_ADOPCION');

    const r2 = await api('adoptante').post('/adoptions/mine', { animalId: ids.animal }).expect(201);
    ids.approved = (r2.body as Body).id as string;
    await api('admin')
      .patch(`/adoptions/${ids.approved}/status`, { status: 'EN_EVALUACION' })
      .expect(200);
    await api('admin')
      .post(`/adoptions/${ids.approved}/decision`, {
        result: 'APROBADA',
        notes: 'Apto',
        decisionDate: new Date().toISOString(),
      })
      .expect(400);
    await api('admin')
      .post(`/adoptions/${ids.approved}/decision`, {
        result: 'APROBADA',
        notes: 'Apto',
        decisionDate: new Date().toISOString(),
        deliveryDate: new Date().toISOString(),
      })
      .expect(200);
    expect(await animalStatus(ids.animal)).toBe('ADOPTADO');

    const act = (await api('admin').get(`/adoptions/${ids.approved}/act`).expect(200)).body as Body;
    expect((act.animal as Body).id).toBe(ids.animal);
  });

  it('INT-12: el seguimiento solo se registra en solicitudes aprobadas y se lista del más reciente al más antiguo', async () => {
    await api('admin')
      .post(`/adoptions/${ids.request}/followups`, {
        followupDate: new Date().toISOString(),
        animalCondition: 'Bien',
      })
      .expect(409);
    await api('admin')
      .post(`/adoptions/${ids.approved}/followups`, {
        followupDate: new Date(Date.now() + 60_000).toISOString(),
        animalCondition: 'Adaptándose',
      })
      .expect(201);
    await api('admin')
      .post(`/adoptions/${ids.approved}/followups`, {
        followupDate: new Date(Date.now() + 120_000).toISOString(),
        animalCondition: 'Muy bien',
      })
      .expect(201);
    const list = (await api('admin').get(`/adoptions/${ids.approved}/followups`).expect(200))
      .body as Body[];
    expect(list.map((f) => f.animalCondition as string)).toEqual(['Muy bien', 'Adaptándose']);
  });

  it('INT-13: un animal adoptado admite consultas y el reingreso lo vuelve a Ingresado', async () => {
    await api('vet')
      .post(`/animals/${ids.animal}/consultations`, {
        consultationDate: new Date().toISOString(),
        reason: 'Control posterior a la adopción',
      })
      .expect(201);
    await api('admin').post(`/animals/${ids.animal}/readmit`).expect(200);
    expect(await animalStatus(ids.animal)).toBe('INGRESADO');
    await api('admin').post(`/animals/${ids.animal}/readmit`).expect(409);
  });

  it('INT-14: el panel y los seis indicadores de gestión', async () => {
    const dash = (await api('admin').get('/dashboard').expect(200)).body as Body;
    expect((dash.cards as Body).ok).toBe(true);
    expect((dash.byStatus as Body).ok).toBe(true);
    expect(dash).not.toHaveProperty('alerts');

    const res = (await api('admin').get('/kpis?months=6').expect(200)).body as Body;
    const kpis = res.kpis as Body[];
    expect(kpis).toHaveLength(6);
    expect(res.periodMonths).toBe(6);
    for (const k of kpis) {
      expect(['%', 'días', 'animales', 'solicitudes']).toContain(k.unit);
      expect(['sube', 'baja', 'estable']).toContain(k.trend);
    }
    await api('admin').get('/kpis?months=99').expect(400);
    await api('cliente').get('/dashboard').expect(403);
  });

  it('INT-15: el cliente reserva consultas solo para sus animales y ve su historial', async () => {
    const own = await api('admin')
      .post('/animals', nuevoAnimal(`Mascota ${stamp}`, { ownerId: ids.cliente }))
      .expect(201);
    ids.pet = (own.body as Body).id as string;
    const when = new Date(Date.now() + 86_400_000).toISOString();

    const options = (await api('cliente').get('/bookings/options').expect(200)).body as Body;
    expect((options.animals as Body[]).map((a) => a.id as string)).toEqual([ids.pet]);
    expect(options.clients).toEqual([]);

    const booking = await api('cliente')
      .post('/bookings', { animalId: ids.pet, scheduledAt: when, reason: 'Vacuna anual' })
      .expect(201);
    ids.booking = (booking.body as Body).id as string;
    expect((booking.body as Body).status).toBe('PENDIENTE');

    await api('cliente')
      .post('/bookings', { animalId: ids.animal, scheduledAt: when, reason: 'Ajeno' })
      .expect(400);
    await api('cliente')
      .patch(`/bookings/${ids.booking}/status`, { status: 'CONFIRMADA' })
      .expect(403);

    const mine = (await api('cliente').get('/bookings').expect(200)).body as Body[];
    expect(mine.every((b) => (b.client as Body).id === ids.cliente)).toBe(true);

    const pets = (await api('cliente').get('/bookings/my-animals').expect(200)).body as Body[];
    expect(pets).toHaveLength(1);
    expect(pets[0].bookings as Body[]).toHaveLength(1);

    await api('cliente')
      .patch(`/bookings/${ids.booking}/status`, { status: 'CANCELADA' })
      .expect(200);
  });

  it('INT-16: el personal reserva consultas para un cliente registrado y confirma la reserva', async () => {
    const when = new Date(Date.now() + 2 * 86_400_000).toISOString();
    const vetUser = (await api('vet').get('/auth/me').expect(200)).body as Body;
    await api('admin')
      .post('/bookings', {
        animalId: ids.pet,
        clientId: vetUser.id,
        scheduledAt: when,
        reason: 'x',
      })
      .expect(400);
    await api('admin')
      .post('/bookings', { animalId: ids.pet, scheduledAt: when, reason: 'Control' })
      .expect(400);

    const res = await api('admin')
      .post('/bookings', {
        animalId: ids.pet,
        clientId: ids.cliente,
        scheduledAt: when,
        reason: 'Control general',
      })
      .expect(201);
    const id = (res.body as Body).id as string;
    await api('vet').patch(`/bookings/${id}/status`, { status: 'CONFIRMADA' }).expect(200);
    const all = (await api('vet').get('/bookings').expect(200)).body as Body[];
    expect(all.find((b) => b.id === id)?.status).toBe('CONFIRMADA');
    await api('adoptante').get('/bookings').expect(403);
  });
});
