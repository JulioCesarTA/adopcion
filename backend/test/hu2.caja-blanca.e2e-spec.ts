/**
 * Prueba de caja blanca — camino básico de la HU2 Registro de Consulta Clínica, siguiendo el diagrama de
 * secuencia del Sprint 1 «Registrar una consulta clínica»: el veterinario envía la consulta, la API la
 * registra, luego un loop de diagnósticos, un loop de tratamientos y, si corresponde, el cambio de estado
 * del animal (opt). C(G) = 4: un caso por camino básico. Se ejecuta contra la base de prueba (`.env.test`),
 * con las mismas peticiones que hace el formulario «Nueva consulta» del frontend.
 */
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/setup-app';

type Body = Record<string, any>;

interface Formulario {
  animalStatus?: string;
  diagnoses: { description: string; observations?: string }[];
  treatments: Body[];
}

describe('HU2 caja blanca — camino básico de Registrar Consulta Clínica', () => {
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
  });
  const estado = async (id: string) =>
    ((await api('vet').get(`/animals/${id}`).expect(200)).body as Body).status as string;

  const animal = async (name: string) => {
    const res = await api('admin')
      .post('/animals', {
        name,
        species: 'PERRO',
        sex: 'HEMBRA',
        size: 'MEDIANO',
        energyLevel: 3,
        goodWithChildren: true,
        goodWithAnimals: true,
        needsYard: false,
        specialCare: false,
        requiredDailyHours: 2,
        entryDate: new Date().toISOString(),
        entryReason: 'Prueba de caja blanca HU2',
      })
      .expect(201);
    expect((res.body as Body).status).toBe('INGRESADO');
    return (res.body as Body).id as string;
  };

  /** Lo que hace el formulario «Nueva consulta» al guardar: consulta, loop de diagnósticos y loop de tratamientos. */
  const registrar = async (animalId: string, f: Formulario) => {
    const created = await api('vet')
      .post(`/animals/${animalId}/consultations`, {
        consultationDate: new Date().toISOString(),
        reason: 'Control de caja blanca',
        weightKg: 12.5,
        temperatureC: 38.5,
        ...(f.animalStatus ? { animalStatus: f.animalStatus } : {}),
      })
      .expect(201);
    const consultationId = (created.body as Body).id as string;
    for (const d of f.diagnoses) {
      await api('vet').post(`/consultations/${consultationId}/diagnoses`, d).expect(201);
    }
    for (const t of f.treatments) {
      await api('vet').post(`/consultations/${consultationId}/treatments`, t).expect(201);
    }
    // Lo que el veterinario ve después de guardar: la consulta en su historia clínica.
    return (await api('vet').get(`/consultations/${consultationId}`).expect(200)).body as Body;
  };

  const tratamiento = {
    description: 'Antibiótico',
    instructions: 'Con comida',
    startDate: new Date().toISOString().slice(0, 10),
    medications: [
      {
        name: 'Amoxicilina',
        dose: '250 mg',
        administrationRoute: 'Oral',
        frequency: 'c/12h',
        duration: '7 días',
      },
    ],
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    setupApp(app);
    await app.init();
    server = app.getHttpServer();
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
  });

  afterAll(async () => {
    await app.close();
  });

  it('C1 (1-2-3-4-5-6-8-10-11-13-14-15-16) consulta sin diagnósticos, sin tratamientos y sin cambio de estado', async () => {
    const animalId = await animal(`CB2 Uno ${stamp}`);
    const c = await registrar(animalId, { diagnoses: [], treatments: [] });
    expect(c.diagnoses).toHaveLength(0);
    expect(c.treatments).toHaveLength(0);
    expect(await estado(animalId)).toBe('INGRESADO');
  });

  it('C2 (1-2-3-4-5-6-7-6-8-10-11-13-14-15-16) consulta con un diagnóstico', async () => {
    const animalId = await animal(`CB2 Dos ${stamp}`);
    const c = await registrar(animalId, {
      diagnoses: [{ description: 'Otitis externa', observations: 'Oído izquierdo' }],
      treatments: [],
    });
    expect(c.diagnoses).toHaveLength(1);
    expect((c.diagnoses as Body[])[0].description).toBe('Otitis externa');
    expect(c.treatments).toHaveLength(0);
    expect(await estado(animalId)).toBe('INGRESADO');
  });

  it('C3 (1-2-3-4-5-6-8-9-8-10-11-12-13-14-15-16) consulta con un tratamiento: el animal pasa a En tratamiento', async () => {
    const animalId = await animal(`CB2 Tres ${stamp}`);
    const c = await registrar(animalId, { diagnoses: [], treatments: [tratamiento] });
    expect(c.diagnoses).toHaveLength(0);
    expect(c.treatments).toHaveLength(1);
    expect((c.treatments as Body[])[0].medications).toHaveLength(1);
    expect(await estado(animalId)).toBe('EN_TRATAMIENTO');
  });

  it('C4 (1-2-3-4-5-6-8-10-11-12-13-14-15-16) consulta que cambia el estado del animal a En observación', async () => {
    const animalId = await animal(`CB2 Cuatro ${stamp}`);
    const c = await registrar(animalId, {
      animalStatus: 'EN_OBSERVACION',
      diagnoses: [],
      treatments: [],
    });
    expect(c.diagnoses).toHaveLength(0);
    expect(c.treatments).toHaveLength(0);
    expect(await estado(animalId)).toBe('EN_OBSERVACION');
  });
});
