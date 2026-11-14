/**
 * E2E de reglas de negocio: crear animal, HCD, RN-03 a RN-07 y transiciones de estado.
 * Requiere la BD levantada y con seed (`docker compose up -d` + `npm run db:setup`).
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
    ((await api('vet').get(`/animals/${id}`).expect(200)).body as Body).status as string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    setupApp(app);
    await app.init();
    server = app.getHttpServer();
    for (const [role, email] of [
      ['vet', 'vet@zoonosis.test'],
      ['gestion', 'gestion@zoonosis.test'],
      ['admin', 'admin@zoonosis.test'],
    ]) {
      const res = await request(server)
        .post('/api/v1/auth/login')
        .send({ email, password: 'Zoo12345' })
        .expect(200);
      tokens[role] = (res.body as Body).accessToken as string;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  let animalId = '';
  let adopterId = '';

  it('CU03: GESTION registra un animal con código ZOO-AAAA-NNNN en estado INGRESADO', async () => {
    const res = await api('gestion')
      .post('/animals', {
        name: `E2E ${stamp}`,
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
        entryReason: 'Prueba e2e',
      })
      .expect(201);
    const body = res.body as Body;
    expect(body.code).toMatch(/^ZOO-\d{4}-\d{4}$/);
    expect(body.status).toBe('INGRESADO');
    expect(body.requiredDailyHours).toBe(2); // Decimal serializado como número
    animalId = body.id as string;

    // VETERINARIO no puede registrar animales
    await api('vet').post('/animals', {}).expect(403);
    // validación por campo
    const bad = await api('gestion').post('/animals', { species: 'PERRO' }).expect(400);
    expect((bad.body as Body).errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'size' })]),
    );
  });

  it('RN-03: no se habilita para adopción sin consulta registrada', async () => {
    const res = await api('vet').post(`/animals/${animalId}/enable-adoption`).expect(409);
    expect((res.body as Body).errors).toContain('No tiene ninguna consulta veterinaria registrada');
  });

  it('CU06: consulta con validaciones (temperatura 30–45 °C, peso > 0)', async () => {
    const base = {
      consultationDate: new Date().toISOString(),
      reason: 'Control',
      clinicalEvaluation: 'Sano',
    };
    await api('vet')
      .post(`/animals/${animalId}/consultations`, { ...base, temperatureC: 50 })
      .expect(400);
    await api('vet')
      .post(`/animals/${animalId}/consultations`, { ...base, weightKg: 0 })
      .expect(400);
    await api('gestion').post(`/animals/${animalId}/consultations`, base).expect(403);
    await api('vet')
      .post(`/animals/${animalId}/consultations`, { ...base, weightKg: 12.5, temperatureC: 38.5 })
      .expect(201);
  });

  it('CU09: cuarentena activa bloquea RN-03; un solo periodo activo; cierre pide confirmación sin controles', async () => {
    const period = await api('gestion')
      .post(`/animals/${animalId}/periods`, {
        type: 'CUARENTENA',
        reason: 'Prueba',
        startDate: new Date(Date.now() - 3_600_000).toISOString(),
      })
      .expect(201);
    expect(await animalStatus(animalId)).toBe('EN_CUARENTENA');

    await api('vet')
      .post(`/animals/${animalId}/periods`, {
        type: 'OBSERVACION',
        reason: 'x',
        startDate: new Date().toISOString(),
      })
      .expect(409);

    const blocked = await api('vet').post(`/animals/${animalId}/enable-adoption`).expect(409);
    expect((blocked.body as Body).errors).toContain('Tiene cuarentena activa');

    const pid = (period.body as Body).id as string;
    await api('gestion')
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
    expect(await animalStatus(animalId)).toBe('INGRESADO');
  });

  it('CU07: tratamiento activo → EN_TRATAMIENTO; al finalizarlo vuelve a INGRESADO', async () => {
    const consultations = (await api('vet').get(`/animals/${animalId}/consultations`).expect(200))
      .body as Body[];
    const cid = consultations[0].id as string;

    await api('vet')
      .post(`/consultations/${cid}/treatments`, {
        description: 'x',
        instructions: 'y',
        startDate: '2026-02-10',
        endDate: '2026-02-01',
      })
      .expect(400);
    await api('vet')
      .post(`/consultations/${cid}/treatments`, {
        description: 'x',
        instructions: 'y',
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
      .expect(400); // medicamento sin dosis

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
    expect(await animalStatus(animalId)).toBe('EN_TRATAMIENTO');
    const blocked = await api('vet').post(`/animals/${animalId}/enable-adoption`).expect(409);
    expect((blocked.body as Body).errors).toContain('Tiene tratamiento activo');

    await api('vet')
      .patch(`/treatments/${(t.body as Body).id}`, { status: 'FINALIZADO' })
      .expect(200);
    expect(await animalStatus(animalId)).toBe('INGRESADO');
  });

  it('CU05: la línea de tiempo del HCD está en orden cronológico inverso', async () => {
    const res = await api('gestion').get(`/animals/${animalId}/timeline`).expect(200);
    const items = (res.body as Body).data as { date: string; type: string }[];
    expect(items.length).toBeGreaterThanOrEqual(2);
    const dates = items.map((i) => new Date(i.date).getTime());
    expect([...dates].sort((a, b) => b - a)).toEqual(dates);
  });

  it('CU21: con RN-03 cumplida el veterinario habilita para adopción', async () => {
    await api('gestion').post(`/animals/${animalId}/enable-adoption`).expect(403);
    await api('vet').post(`/animals/${animalId}/enable-adoption`).expect(200);
    expect(await animalStatus(animalId)).toBe('DISPONIBLE_ADOPCION');
  });

  it('CU10: adoptante con CI única y horas 0–24', async () => {
    const data = {
      ci: `E2E${stamp}`,
      firstName: 'Prueba',
      lastName: 'E2E',
      phone: '70000000',
      housingType: 'CASA_CON_PATIO',
      hasYard: true,
      hasChildren: false,
      hasOtherAnimals: false,
      availableHoursPerDay: 4,
      experience: 'BASICA',
    };
    await api('gestion')
      .post('/adopters', { ...data, availableHoursPerDay: 30 })
      .expect(400);
    const res = await api('gestion').post('/adopters', data).expect(201);
    adopterId = (res.body as Body).id as string;
    const dup = await api('gestion').post('/adopters', data).expect(409);
    expect(((dup.body as Body).errors as Body).existingAdopterId).toBe(adopterId);
  });

  it('CU13: ranking y par incluyen puntaje, desglose y aviso RN-08', async () => {
    const ranking = (await api('gestion').get(`/recommendations/adopter/${adopterId}`).expect(200))
      .body as Body;
    expect(ranking.disclaimer).toBe(
      'Resultado de apoyo. La decisión final es del personal responsable.',
    );
    const scores = (ranking.data as Body[]).map((r) => r.score as number);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    expect((ranking.data as Body[]).some((r) => (r.animal as Body).id === animalId)).toBe(true);

    const pair = (
      await api('gestion').post('/recommendations', { adopterId, animalId }).expect(201)
    ).body as Body;
    expect(pair.score).toBeGreaterThan(0);
    expect((pair.breakdown as Body).criteria).toHaveLength(5);
  });

  it('RN-04/05/06/07 y máquina de estados de la solicitud', async () => {
    // RN-04: animal no disponible (Bruno está en observación en el seed)
    const animals = (await api('gestion').get('/animals?status=EN_OBSERVACION').expect(200))
      .body as Body;
    if ((animals.data as Body[]).length) {
      await api('gestion')
        .post('/adoptions', { adopterId, animalId: (animals.data as Body[])[0].id })
        .expect(409);
    }

    const r1 = await api('gestion').post('/adoptions', { adopterId, animalId }).expect(201);
    const reqId = (r1.body as Body).id as string;
    expect((r1.body as Body).status).toBe('PENDIENTE');
    expect(await animalStatus(animalId)).toBe('EN_PROCESO_ADOPCION'); // RN-06

    await api('gestion').post('/adoptions', { adopterId, animalId }).expect(409); // RN-05
    await api('gestion')
      .post(`/adoptions/${reqId}/followups`, {
        followupDate: new Date().toISOString(),
        animalCondition: 'Bien',
      })
      .expect(409); // RN-07
    await api('gestion')
      .post(`/adoptions/${reqId}/decision`, {
        result: 'APROBADA',
        notes: 'x',
        decisionDate: new Date().toISOString(),
        deliveryDate: new Date().toISOString(),
      })
      .expect(409); // CU14: solo desde EN_EVALUACION
    await api('gestion').patch(`/adoptions/${reqId}/status`, { status: 'CANCELADA' }).expect(400); // nota obligatoria

    await api('gestion')
      .patch(`/adoptions/${reqId}/status`, { status: 'EN_EVALUACION' })
      .expect(200);
    await api('gestion')
      .patch(`/adoptions/${reqId}/status`, { status: 'EN_EVALUACION' })
      .expect(409);
    await api('gestion')
      .post(`/adoptions/${reqId}/decision`, {
        result: 'RECHAZADA',
        decisionDate: new Date().toISOString(),
      })
      .expect(400); // nota obligatoria
    await api('gestion')
      .post(`/adoptions/${reqId}/decision`, {
        result: 'RECHAZADA',
        notes: 'No apto',
        decisionDate: new Date().toISOString(),
      })
      .expect(200);
    expect(await animalStatus(animalId)).toBe('DISPONIBLE_ADOPCION'); // RN-06
    await api('gestion')
      .patch(`/adoptions/${reqId}/status`, { status: 'CANCELADA', notes: 'x' })
      .expect(409); // final

    // Segunda solicitud → aprobada
    const r2 = await api('gestion').post('/adoptions', { adopterId, animalId }).expect(201);
    const id2 = (r2.body as Body).id as string;
    await api('gestion').patch(`/adoptions/${id2}/status`, { status: 'EN_EVALUACION' }).expect(200);
    await api('gestion')
      .post(`/adoptions/${id2}/decision`, {
        result: 'APROBADA',
        notes: 'Apto',
        decisionDate: new Date().toISOString(),
      })
      .expect(400); // falta fecha de entrega
    await api('gestion')
      .post(`/adoptions/${id2}/decision`, {
        result: 'APROBADA',
        notes: 'Apto',
        decisionDate: new Date().toISOString(),
        deliveryDate: new Date().toISOString(),
      })
      .expect(200);
    expect(await animalStatus(animalId)).toBe('ADOPTADO');

    await api('gestion')
      .post(`/adoptions/${id2}/followups`, {
        followupDate: new Date().toISOString(),
        animalCondition: 'Muy bien',
      })
      .expect(201); // RN-07 cumplida
    const act = (await api('gestion').get(`/adoptions/${id2}/act`).expect(200)).body as Body;
    expect((act.animal as Body).id).toBe(animalId);
  });

  it('CU06/CU22: un animal adoptado no admite consultas; el reingreso lo vuelve a INGRESADO', async () => {
    await api('vet')
      .post(`/animals/${animalId}/consultations`, {
        consultationDate: new Date().toISOString(),
        reason: 'x',
        clinicalEvaluation: 'y',
      })
      .expect(409);
    await api('gestion')
      .post(`/animals/${animalId}/exit`, { type: 'FALLECIDO', date: new Date().toISOString() })
      .expect(409);
    await api('gestion')
      .post(`/animals/${animalId}/readmit`, {
        date: new Date().toISOString(),
        reason: 'Devuelto por el adoptante',
      })
      .expect(200);
    expect(await animalStatus(animalId)).toBe('INGRESADO');

    await api('gestion')
      .post(`/animals/${animalId}/exit`, { type: 'OTRO', date: new Date().toISOString() })
      .expect(400); // falta detalle
    await api('gestion')
      .post(`/animals/${animalId}/exit`, {
        type: 'DEVUELTO',
        date: new Date().toISOString(),
        notes: 'Devuelto a su dueño',
      })
      .expect(200);
    expect(await animalStatus(animalId)).toBe('DEVUELTO');
    // En estado final solo se editan notas
    await api('gestion').patch(`/animals/${animalId}`, { name: 'Otro' }).expect(409);
    await api('gestion').patch(`/animals/${animalId}`, { exitNotes: 'Nota final' }).expect(200);
  });

  it('CU16: los pesos deben sumar 100', async () => {
    await api('admin')
      .post('/algorithm-settings', {
        weights: { time: 30, space: 25, experience: 20, energy: 15, preferences: 5 },
        thresholdHigh: 80,
        thresholdMedium: 60,
      })
      .expect(400);
  });

  it('CU17/CU18/CU23/CU19: panel, alertas, reportes por rol y auditoría', async () => {
    const dash = (await api('gestion').get('/dashboard').expect(200)).body as Body;
    expect((dash.cards as Body).ok).toBe(true);
    const alerts = (await api('vet').get('/alerts').expect(200)).body as Body;
    expect(typeof alerts.total).toBe('number');

    await api('vet').get('/reports/adopciones-por-mes').expect(403);
    await api('vet').get('/reports/vacunaciones-por-periodo').expect(200);
    await api('gestion').get('/reports/ingresos-por-mes?from=2026-05-01&to=2026-01-01').expect(400);
    const csv = await api('admin').get('/reports/ingresos-por-mes/csv').expect(200);
    expect(csv.headers['content-type']).toContain('text/csv');

    await api('gestion').get('/audit').expect(403);
    const audit = (await api('admin').get(`/audit?entityId=${animalId}`).expect(200)).body as Body;
    const actions = (audit.data as Body[]).map((a) => a.action as string);
    expect(actions).toEqual(expect.arrayContaining(['CREATE', 'STATUS_CHANGE']));
  });
});
